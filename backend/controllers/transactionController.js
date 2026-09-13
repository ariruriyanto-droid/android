const crypto = require('crypto');
const { pool } = require('../config/db');
const walletService = require('../services/walletService');
const supplierService = require('../services/supplierService');

/**
 * Helper untuk menghasilkan Invoice Number unik yang aman dan berurutan
 * Format: INV-YYYYMMDD-XXXXXX
 */
function generateInvoiceNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${dateStr}-${randomHex}`;
}

/**
 * 1. POST /api/transactions/create
 * Pemesanan produk PPOB dengan Atomic Database Transaction & Snapshot Finansial
 */
async function createTransaction(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
  }

  const { product_id, target_number } = req.body;

  if (!product_id || !target_number) {
    return res.status(400).json({
      success: false,
      message: 'Parameter product_id dan target_number wajib diisi.',
    });
  }

  const cleanTarget = String(target_number).trim().replace(/[^0-9+]/g, '');
  if (cleanTarget.length < 8 || cleanTarget.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'Nomor tujuan tidak valid. Minimal 8 digit dan maksimal 20 digit angka.',
    });
  }

  // 1. Ambil detail produk dari Product Catalog
  const productRes = await pool.query(
    'SELECT id, sku_code, name, category, brand, price_cost, price_sell, is_active FROM products WHERE id = $1',
    [product_id]
  );

  if (productRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Produk tidak ditemukan dalam etalase katalog.',
    });
  }

  const product = productRes.rows[0];

  // 2. Validasi status produk aktif
  if (!product.is_active) {
    return res.status(400).json({
      success: false,
      message: `Produk '${product.name}' (${product.sku_code}) sedang dinonaktifkan atau dalam gangguan pemeliharaan.`,
    });
  }

  // 3. Snapshot nilai finansial riil
  const priceSell = parseFloat(product.price_sell);
  const priceCost = parseFloat(product.price_cost);
  const margin = priceSell - priceCost;

  if (priceSell < priceCost) {
    return res.status(400).json({
      success: false,
      message: 'Proteksi Margin: Transaksi ditolak karena harga jual di bawah harga modal.',
    });
  }

  const invoiceNumber = generateInvoiceNumber();
  const client = await pool.connect();

  let createdTx = null;
  let userBalanceAfter = 0;

  try {
    await client.query('BEGIN');

    // A. Kunci baris user secara eksklusif (Row-level lock FOR UPDATE)
    const userRes = await client.query(
      'SELECT id, full_name, phone_number, balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Akun pengguna tidak ditemukan.' });
    }

    const currentBalance = parseFloat(userRes.rows[0].balance);

    // B. Validasi saldo cukup
    if (currentBalance < priceSell) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Saldo tidak mencukupi. Saldo saat ini: Rp${currentBalance.toLocaleString('id-ID')}, dibutuhkan: Rp${priceSell.toLocaleString('id-ID')}.`,
      });
    }

    userBalanceAfter = currentBalance - priceSell;

    // C. Potong saldo user
    await client.query(
      'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [userBalanceAfter, userId]
    );

    // D. Catat mutasi DEBIT di buku kas balance_mutations
    const desc = `Pembelian ${product.name} ke nomor ${cleanTarget}`;
    await client.query(
      `INSERT INTO balance_mutations 
        (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'DEBIT', $2, $3, $4, 'TRANSACTION', $5, $6)`,
      [userId, priceSell, currentBalance, userBalanceAfter, invoiceNumber, desc]
    );

    // E. Simpan transaksi PENDING dengan data SNAPSHOT lengkap
    const txInsertRes = await client.query(
      `INSERT INTO transactions 
        (invoice_number, user_id, product_id, target_number, price, price_cost, margin, supplier, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'DIGIFLAZZ', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [invoiceNumber, userId, product.id, cleanTarget, priceSell, priceCost, margin]
    );

    await client.query('COMMIT');
    createdTx = txInsertRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505' || error.message?.includes('uq_mutations_tx_debit')) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_TRANSACTION',
        message: 'Transaksi dengan nomor invoice ini sudah pernah dicatat atau sedang diproses.',
      });
    }
    return res.status(500).json({
      success: false,
      message: `Gagal memproses transaksi: ${error.message}`,
    });
  } finally {
    client.release();
  }

  // 4. Komunikasi HTTP ke Supplier dilakukan DI LUAR database transaction
  // Menggunakan ref_id = invoice_number asli (kekal)
  // Jika timeout atau gagal jaringan, JANGAN REFUND! Status tetap PENDING.
  try {
    const supplierRes = await supplierService.sendTransaction({
      invoiceNumber,
      skuCode: product.sku_code,
      customerNo: target_number,
    });

    if (supplierRes && supplierRes.status === 'SUCCESS') {
      // Transisi atomik ke SUCCESS
      const updateRes = await pool.query(
        `UPDATE transactions 
         SET status = 'SUCCESS', 
             sn_token = COALESCE($1, sn_token), 
             supplier_response = $2,
             updated_at = NOW() 
         WHERE invoice_number = $3 AND status = 'PENDING' 
         RETURNING *`,
        [supplierRes.sn, supplierRes.sanitizedRaw, invoiceNumber]
      );
      if (updateRes.rows.length > 0) {
        createdTx.status = 'SUCCESS';
        createdTx.sn_token = supplierRes.sn;
      }
    } else if (supplierRes && supplierRes.status === 'FAILED') {
      // Hanya jika supplier merespon GAGAL DEFINITIF (misal: nomor salah / gangguan)
      // Transisi atomik PENDING -> FAILED
      const failRes = await pool.query(
        `UPDATE transactions 
         SET status = 'FAILED', 
             failure_reason = $1, 
             supplier_response = $2,
             updated_at = NOW() 
         WHERE invoice_number = $3 AND status = 'PENDING' 
         RETURNING *`,
        [supplierRes.message || 'Transaksi ditolak oleh provider', supplierRes.sanitizedRaw, invoiceNumber]
      );

      if (failRes.rows.length > 0) {
        createdTx.status = 'FAILED';
        createdTx.failure_reason = supplierRes.message;

        // Auto-refund saldo pengguna (dilindungi constraint Step 6.11)
        try {
          const refundResult = await walletService.creditBalance({
            userId,
            amount: productPrice,
            referenceType: 'REFUND',
            referenceId: invoiceNumber,
            description: `Pengembalian dana transaksi ${invoiceNumber} (Gagal: ${supplierRes.message || 'Ditolak Provider'})`,
          });

          await pool.query(
            `UPDATE transactions SET status = 'REFUNDED', updated_at = NOW() WHERE invoice_number = $1`,
            [invoiceNumber]
          );
          createdTx.status = 'REFUNDED';
          userBalanceAfter = refundResult.balanceAfter;
        } catch (refundErr) {
          console.error(`[Auto-Refund Error] Gagal refund untuk ${invoiceNumber}:`, refundErr.message);
        }
      }
    } else {
      // Status 'PENDING' atau UNKNOWN dari supplier
      // Update snapshot respons tanpa mengubah status transaksi (tetap PENDING)
      await pool.query(
        `UPDATE transactions 
         SET supplier_response = $1, updated_at = NOW() 
         WHERE invoice_number = $2 AND status = 'PENDING'`,
        [supplierRes.sanitizedRaw, invoiceNumber]
      );
    }
  } catch (supplierErr) {
    console.warn(`[Supplier HTTP Warning] Komunikasi ke supplier timeout/tertunda untuk ${invoiceNumber}:`, supplierErr.message);
    // Timeout/koneksi putus: JANGAN REFUND! Status transaksi TETAP PENDING.
  }

  return res.status(201).json({
    success: true,
    message: `Pemesanan ${product.name} berhasil dibuat. Sedang diproses oleh provider.`,
    data: {
      ...createdTx,
      product_name: product.name,
      product_sku: product.sku_code,
      user_balance_after: userBalanceAfter,
    },
  });
}

/**
 * 2. GET /api/transactions/my
 * Riwayat transaksi milik pengguna yang sedang terautentikasi
 */
async function getMyTransactions(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
  }

  try {
    const query = `
      SELECT 
        t.id,
        t.invoice_number,
        t.user_id,
        t.product_id,
        p.name AS product_name,
        p.sku_code AS product_sku,
        p.category AS product_category,
        p.brand AS product_brand,
        t.target_number,
        t.price,
        t.price_cost,
        t.margin,
        t.status,
        t.sn_token,
        t.supplier_ref_id,
        t.failure_reason,
        t.created_at,
        t.updated_at
      FROM transactions t
      LEFT JOIN products p ON t.product_id = p.id
      WHERE t.user_id = $1
      ORDER BY t.id DESC
      LIMIT 100
    `;
    const result = await pool.query(query, [userId]);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map((row) => ({
        ...row,
        price: parseFloat(row.price),
        price_cost: row.price_cost ? parseFloat(row.price_cost) : 0,
        margin: row.margin ? parseFloat(row.margin) : 0,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. GET /api/transactions/:invoiceNumber
 * Detail transaksi berdasarkan nomor invoice
 */
async function getTransactionDetail(req, res) {
  const { invoiceNumber } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    const query = `
      SELECT 
        t.id,
        t.invoice_number,
        t.user_id,
        u.full_name AS user_name,
        u.phone_number AS user_phone,
        t.product_id,
        p.name AS product_name,
        p.sku_code AS product_sku,
        p.category AS product_category,
        p.brand AS product_brand,
        t.target_number,
        t.price,
        t.price_cost,
        t.margin,
        t.supplier,
        t.status,
        t.sn_token,
        t.supplier_ref_id,
        t.failure_reason,
        t.created_at,
        t.updated_at
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN products p ON t.product_id = p.id
      WHERE t.invoice_number = $1
    `;
    const result = await pool.query(query, [invoiceNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }

    const tx = result.rows[0];

    // Batasi akses: pengguna hanya bisa melihat transaksi miliknya kecuali ADMIN
    if (userRole !== 'ADMIN' && tx.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak ke transaksi ini.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...tx,
        price: parseFloat(tx.price),
        price_cost: tx.price_cost ? parseFloat(tx.price_cost) : 0,
        margin: tx.margin ? parseFloat(tx.margin) : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. POST /api/transactions/:invoiceNumber/inquiry
 * Cek status transaksi PPOB ke supplier dengan Atomic Fencing Claim Token
 * 
 * Aturan Strict Sesuai Kesepakatan:
 * 1. Tidak menahan database row lock selama HTTP request.
 * 2. Menggunakan inquiry_claim_id (UUID) sebagai fencing token unik.
 * 3. Jika Request A berhasil claim, Request B langsung mendapat HTTP 409 Conflict tanpa call supplier.
 * 4. Cooldown 60 detik (HTTP 429 jika < 60s).
 * 5. Hasil supplier hanya boleh ditulis oleh pemegang claim yang sama (inquiry_claim_id).
 * 6. Ownership-protected: hanya pemilik transaksi atau ADMIN yang boleh inquiry.
 * 7. Timeout / HTTP 5xx / UNKNOWN -> tetap PENDING, tanpa refund.
 * 8. Hanya Gagal definitif -> FAILED -> REFUNDED via walletService.creditBalance (dilindungi Step 6.11).
 */
async function inquiryTransaction(req, res) {
  const { invoiceNumber } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
  }

  // 1. Cek kepemilikan dan validitas transaksi terlebih dahulu
  const checkQuery = `
    SELECT 
      t.id, t.invoice_number, t.user_id, t.product_id, t.price, t.status, 
      t.target_number, t.inquiry_status, t.inquiry_claim_id, t.last_inquiry_at,
      p.sku_code AS product_sku, p.name AS product_name
    FROM transactions t
    LEFT JOIN products p ON t.product_id = p.id
    WHERE t.invoice_number = $1
  `;
  const existingRes = await pool.query(checkQuery, [invoiceNumber]);
  if (existingRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
  }

  const tx = existingRes.rows[0];

  // Ownership verification
  if (userRole !== 'ADMIN' && Number(tx.user_id) !== Number(userId)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak ke transaksi ini.' });
  }

  // Hanya transaksi PENDING yang boleh di-inquiry ke supplier
  if (tx.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      code: 'TRANSACTION_ALREADY_FINAL',
      message: `Transaksi sudah berstatus ${tx.status}. Inquiry hanya untuk transaksi PENDING.`,
      data: { status: tx.status },
    });
  }

  // Generate fencing claim token unik
  const claimToken = crypto.randomUUID();

  // 2. ATOMIC CLAIM QUERY (Single Statement Database Atomic Claim)
  // Menjamin hanya 1 request yang berhasil merebut claim
  const claimQuery = `
    UPDATE transactions
    SET inquiry_status = 'PROCESSING',
        inquiry_claim_id = $1,
        last_inquiry_at = NOW()
    WHERE invoice_number = $2
      AND status = 'PENDING'
      AND inquiry_status = 'IDLE'
      AND (last_inquiry_at IS NULL OR last_inquiry_at <= NOW() - INTERVAL '60s')
    RETURNING id, invoice_number, status, inquiry_status, inquiry_claim_id, last_inquiry_at;
  `;

  const claimRes = await pool.query(claimQuery, [claimToken, invoiceNumber]);

  if (claimRes.rows.length === 0) {
    // Gagal claim. Identifikasi penyebab secara presisi:
    const statusCheck = await pool.query(
      `SELECT status, inquiry_status, last_inquiry_at FROM transactions WHERE invoice_number = $1`,
      [invoiceNumber]
    );
    const current = statusCheck.rows[0];

    if (current && current.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        code: 'TRANSACTION_ALREADY_FINAL',
        message: `Transaksi telah selesai dengan status ${current.status}.`,
        data: { status: current.status },
      });
    }

    if (current && current.inquiry_status === 'PROCESSING') {
      // Sedang ada proses inquiry lain yang berjalan
      return res.status(409).json({
        success: false,
        code: 'INQUIRY_IN_FLIGHT',
        message: 'Pengecekan status transaksi sedang berlangsung. Mohon tunggu beberapa saat.',
      });
    }

    if (current && current.last_inquiry_at) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(current.last_inquiry_at).getTime()) / 1000);
      const remaining = Math.max(0, 60 - elapsedSeconds);
      if (remaining > 0) {
        return res.status(429).json({
          success: false,
          code: 'INQUIRY_COOLDOWN',
          message: `Pengecekan status terlalu sering. Mohon tunggu ${remaining} detik sebelum cek status kembali.`,
          retry_after_seconds: remaining,
        });
      }
    }

    return res.status(409).json({
      success: false,
      code: 'CLAIM_FAILED',
      message: 'Gagal mengklaim antrean inquiry transaksi.',
    });
  }

  // 3. OUTBOUND CALL KE SUPPLIER DI LUAR DATABASE TRANSACTION
  // Hanya pemegang claimToken valid yang mengeksekusi blok ini
  let supplierRes = null;
  let networkTimeoutOccurred = false;

  try {
    supplierRes = await supplierService.inquiryStatus({
      invoiceNumber: tx.invoice_number,
      skuCode: tx.product_sku,
      customerNo: tx.target_number,
    });
  } catch (err) {
    networkTimeoutOccurred = true;
    console.warn(`[Inquiry Supplier Warning] Panggilan inquiry timeout/gagal untuk ${invoiceNumber}:`, err.message);
  }

  // 4. ATOMIC FENCED RELEASE & RESULT WRITE
  // Hanya proses dengan claimToken yang cocok yang diizinkan menulis hasil
  try {
    if (supplierRes && supplierRes.status === 'SUCCESS') {
      // Transisi PENDING -> SUCCESS
      const writeRes = await pool.query(
        `UPDATE transactions
         SET inquiry_status = 'IDLE',
             inquiry_claim_id = NULL,
             status = 'SUCCESS',
             sn_token = COALESCE($1, sn_token),
             supplier_response = $2,
             updated_at = NOW()
         WHERE invoice_number = $3
           AND inquiry_status = 'PROCESSING'
           AND inquiry_claim_id = $4
         RETURNING *`,
        [supplierRes.sn, supplierRes.sanitizedRaw, invoiceNumber, claimToken]
      );

      if (writeRes.rows.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Status transaksi berhasil diperbarui: SUKSES.',
          data: {
            invoice_number: invoiceNumber,
            status: 'SUCCESS',
            sn_token: supplierRes.sn,
          },
        });
      }
    } else if (supplierRes && supplierRes.status === 'FAILED') {
      // Transisi PENDING -> FAILED
      const failRes = await pool.query(
        `UPDATE transactions
         SET inquiry_status = 'IDLE',
             inquiry_claim_id = NULL,
             status = 'FAILED',
             failure_reason = $1,
             supplier_response = $2,
             updated_at = NOW()
         WHERE invoice_number = $3
           AND inquiry_status = 'PROCESSING'
           AND inquiry_claim_id = $4
         RETURNING *`,
        [supplierRes.message || 'Transaksi Ditolak Supplier', supplierRes.sanitizedRaw, invoiceNumber, claimToken]
      );

      if (failRes.rows.length > 0) {
        // Auto-refund saldo user (dilindungi constraint uq_mutations_tx_refund Step 6.11)
        try {
          await walletService.creditBalance({
            userId: tx.user_id,
            amount: parseFloat(tx.price),
            referenceType: 'REFUND',
            referenceId: invoiceNumber,
            description: `Pengembalian dana transaksi ${invoiceNumber} (Gagal Inquiry: ${supplierRes.message || 'Ditolak Provider'})`,
          });

          await pool.query(
            `UPDATE transactions SET status = 'REFUNDED', updated_at = NOW() WHERE invoice_number = $1`,
            [invoiceNumber]
          );
        } catch (refundErr) {
          console.error(`[Inquiry Refund Error] Gagal refund untuk ${invoiceNumber}:`, refundErr.message);
        }

        return res.status(200).json({
          success: true,
          message: 'Transaksi dinyatakan Gagal oleh provider dan dana telah dikembalikan (REFUNDED).',
          data: {
            invoice_number: invoiceNumber,
            status: 'REFUNDED',
            failure_reason: supplierRes.message,
          },
        });
      }
    } else {
      // Respons Pending, Network Timeout, HTTP 5xx, atau UNKNOWN
      // Status transaksi TETAP PENDING, JANGAN REFUND!
      // Release claim token secara aman
      await pool.query(
        `UPDATE transactions
         SET inquiry_status = 'IDLE',
             inquiry_claim_id = NULL,
             supplier_response = COALESCE($1, supplier_response),
             updated_at = NOW()
         WHERE invoice_number = $2
           AND inquiry_status = 'PROCESSING'
           AND inquiry_claim_id = $3`,
        [supplierRes ? supplierRes.sanitizedRaw : null, invoiceNumber, claimToken]
      );

      return res.status(200).json({
        success: true,
        message: networkTimeoutOccurred 
          ? 'Koneksi ke provider sedang lambat. Status transaksi tetap PENDING.' 
          : 'Transaksi masih dalam antrean pemrosesan oleh provider (PENDING).',
        data: {
          invoice_number: invoiceNumber,
          status: 'PENDING',
        },
      });
    }
  } catch (releaseErr) {
    // Safeguard release jika terjadi error tak terduga
    await pool.query(
      `UPDATE transactions
       SET inquiry_status = 'IDLE', inquiry_claim_id = NULL
       WHERE invoice_number = $1 AND inquiry_claim_id = $2`,
      [invoiceNumber, claimToken]
    );
    throw releaseErr;
  }

  return res.status(200).json({
    success: true,
    message: 'Pengecekan status selesai.',
    data: { invoice_number: invoiceNumber, status: 'PENDING' },
  });
}

module.exports = {
  createTransaction,
  getMyTransactions,
  getTransactionDetail,
  inquiryTransaction,
};
