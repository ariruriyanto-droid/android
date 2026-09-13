const crypto = require('crypto');
const { pool } = require('../config/db');
const walletService = require('../services/walletService');

/**
 * Helper validasi Signature Digiflazz Buyer Webhook v1:
 * - Header wajib: X-Hub-Signature: sha1=<40 hex characters>
 * - Algoritma: HMAC-SHA1 terhadap req.rawBody (Buffer)
 * - Anti-timing attack dengan crypto.timingSafeEqual
 */
function verifyDigiflazzSignature(rawBodyBuffer, signatureHeader, secretKey) {
  if (!signatureHeader || typeof signatureHeader !== 'string' || !secretKey) {
    return { valid: false, code: 401, message: 'Missing or invalid webhook signature header' };
  }

  // 1. Validasi prefix wajib sha1=
  if (!signatureHeader.startsWith('sha1=')) {
    return { valid: false, code: 401, message: 'Invalid signature format (must start with sha1=)' };
  }

  const incomingHash = signatureHeader.slice(5).trim();

  // 2. Validasi panjang tepat 40 karakter dan hanya karakter hexadecimal
  const HEX_40_REGEX = /^[0-9a-fA-F]{40}$/;
  if (!HEX_40_REGEX.test(incomingHash)) {
    return { valid: false, code: 401, message: 'Malformed signature (must be 40 hex characters)' };
  }

  // 3. Pastikan raw body bertipe Buffer
  if (!rawBodyBuffer || !Buffer.isBuffer(rawBodyBuffer)) {
    return { valid: false, code: 400, message: 'Raw request body buffer is required for signature verification' };
  }

  try {
    // 4. Hitung HMAC-SHA1 resmi Digiflazz
    const calculatedHash = crypto
      .createHmac('sha1', secretKey)
      .update(rawBodyBuffer)
      .digest('hex');

    // 5. Decode hex menjadi Buffer (panjang 20 bytes untuk SHA-1)
    const incomingBuf = Buffer.from(incomingHash, 'hex');
    const calculatedBuf = Buffer.from(calculatedHash, 'hex');

    if (incomingBuf.length !== 20 || calculatedBuf.length !== 20) {
      return { valid: false, code: 401, message: 'Invalid signature byte length' };
    }

    const isValid = crypto.timingSafeEqual(incomingBuf, calculatedBuf);
    if (!isValid) {
      return { valid: false, code: 401, message: 'Akses ditolak: Validasi signature webhook Digiflazz gagal (Unauthorized).' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, code: 401, message: 'Signature verification processing failed' };
  }
}

/**
 * Logika Inti Pemrosesan Transaksi PPOB Digiflazz (Atomic & Idempotent)
 */
async function processDigiflazzTransactionLogic({ invoiceNumber, rawStatus, snToken, message, supplierRefId }) {
  if (!invoiceNumber) {
    return { status: 400, success: false, message: 'Atribut invoice_number / ref_id tidak ditemukan pada payload.' };
  }

  // Normalisasi status ke format baku AriPay
  let targetStatus = 'PENDING';
  if (['sukses', 'success', '00', 'berhasil'].includes(rawStatus)) {
    targetStatus = 'SUCCESS';
  } else if (['gagal', 'failed', 'batal', 'rejected'].includes(rawStatus)) {
    targetStatus = 'FAILED';
  }

  // A. JIKA STATUS SUPPLIER = SUCCESS
  if (targetStatus === 'SUCCESS') {
    const updateRes = await pool.query(
      `UPDATE transactions 
       SET status = 'SUCCESS', 
           sn_token = COALESCE($1, sn_token, 'SN-AUTO-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS')), 
           supplier_ref_id = COALESCE($2, supplier_ref_id), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE invoice_number = $3 AND status = 'PENDING'
       RETURNING *`,
      [snToken, supplierRefId, invoiceNumber]
    );

    if (updateRes.rows.length === 0) {
      const checkExisting = await pool.query(
        'SELECT status FROM transactions WHERE invoice_number = $1',
        [invoiceNumber]
      );
      if (checkExisting.rows[0]?.status === 'FAILED' || checkExisting.rows[0]?.status === 'REFUNDED') {
        console.warn(`[Dispute Anomaly] Transaksi ${invoiceNumber} sudah di-refund tetapi supplier mengirim callback SUCCESS.`);
      }
      return {
        status: 200,
        success: true,
        message: 'Callback diterima. Status transaksi sudah final sebelumnya (Idempotent OK).',
      };
    }

    const tx = updateRes.rows[0];
    return {
      status: 200,
      success: true,
      message: `Transaksi ${tx.invoice_number} berhasil diselesaikan (SUCCESS). SN tersimpan.`,
      data: {
        invoice_number: tx.invoice_number,
        status: tx.status,
        sn_token: tx.sn_token,
      },
    };
  }

  // B. JIKA STATUS SUPPLIER = FAILED (MEMICU AUTO-REFUND ATOMIK & IDEMPOTENT)
  if (targetStatus === 'FAILED') {
    const failureReason = message || 'Transaksi ditolak atau gagal dari pihak operator/supplier.';

    // Atomic conditional update: Hanya ubah jika status saat ini masih PENDING atau PROCESSING
    const updateRes = await pool.query(
      `UPDATE transactions 
       SET status = 'FAILED', 
           failure_reason = $1, 
           supplier_ref_id = COALESCE($2, supplier_ref_id), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE invoice_number = $3 AND status IN ('PENDING', 'PROCESSING')
       RETURNING *`,
      [failureReason, supplierRefId, invoiceNumber]
    );

    if (updateRes.rows.length === 0) {
      return {
        status: 200,
        success: true,
        message: 'Callback diterima. Transaksi sudah diproses sebelumnya (Idempotent OK).',
      };
    }

    const tx = updateRes.rows[0];
    const refundRef = `REFUND:${tx.invoice_number}`;

    // Eksekusi pengembalian saldo via walletService (terdapat pencegahan duplikasi mutasi)
    try {
      await walletService.creditBalance({
        userId: tx.user_id,
        amount: parseFloat(tx.price),
        referenceType: 'REFUND',
        referenceId: refundRef,
        description: `Auto-refund transaksi ${tx.invoice_number} gagal: ${failureReason}`,
      });

      // Tandai status akhir transaksi sebagai REFUNDED
      await pool.query(
        "UPDATE transactions SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE invoice_number = $1",
        [tx.invoice_number]
      );
    } catch (refundErr) {
      if (
        refundErr.code === '23505' ||
        refundErr.message?.includes('sudah pernah diproses') ||
        refundErr.message?.includes('duplicate key') ||
        refundErr.message?.includes('uq_mutations_tx_refund')
      ) {
        console.warn(`[Auto-Refund Idempotent] Mutasi refund untuk ${refundRef} sudah tercatat sebelumnya (Constraint Safe).`);
      } else {
        console.error(`[Auto-Refund Error] Gagal memproses refund untuk ${refundRef}: ${refundErr.message}`);
        throw refundErr;
      }
    }

    return {
      status: 200,
      success: true,
      message: `Transaksi ${tx.invoice_number} berstatus FAILED. Saldo Rp${parseFloat(tx.price).toLocaleString('id-ID')} telah dikembalikan secara otomatis.`,
      data: {
        invoice_number: tx.invoice_number,
        status: 'REFUNDED',
        refund_reference: refundRef,
      },
    };
  }

  // C. STATUS MASIH PROSES / PENDING
  return {
    status: 200,
    success: true,
    message: `Status transaksi ${invoiceNumber} saat ini masih dalam proses (PENDING). Tidak ada perubahan saldo.`,
  };
}

/**
 * Logika Inti Pemrosesan Deposit Payment Gateway (Atomic & Idempotent)
 */
async function processPaymentDepositLogic({ depNum, paymentStatus }) {
  if (!depNum) {
    return { status: 400, success: false, message: 'Nomor deposit (deposit_number) wajib disertakan.' };
  }

  if (['SUCCESS', 'PAID', 'SETTLED', 'COMPLETED'].includes(paymentStatus)) {
    // 1. Atomic conditional update: Hanya ubah jika status saat ini masih PENDING
    const updateRes = await pool.query(
      `UPDATE deposits 
       SET status = 'SUCCESS', updated_at = CURRENT_TIMESTAMP 
       WHERE deposit_number = $1 AND status = 'PENDING' 
       RETURNING *`,
      [depNum]
    );

    if (updateRes.rows.length === 0) {
      return {
        status: 200,
        success: true,
        message: 'Tiket deposit sudah diproses sebelumnya (Idempotent OK).',
      };
    }

    const deposit = updateRes.rows[0];
    const creditAmount = parseFloat(deposit.amount);

    // 2. Tambah saldo pengguna secara otomatis
    await walletService.creditBalance({
      userId: deposit.user_id,
      amount: creditAmount,
      referenceType: 'DEPOSIT',
      referenceId: deposit.deposit_number,
      description: `Top-up saldo otomatis via QRIS/VA: ${deposit.deposit_number}`,
    });

    return {
      status: 200,
      success: true,
      message: `Tiket deposit ${deposit.deposit_number} berhasil dilunasi. Saldo Rp${creditAmount.toLocaleString('id-ID')} telah ditambahkan.`,
      data: deposit,
    };
  }

  return {
    status: 200,
    success: true,
    message: `Notifikasi diterima untuk status ${paymentStatus}. Tidak ada mutasi saldo.`,
  };
}

/**
 * 1. POST /api/webhook/digiflazz
 * Menerima callback asinkron status transaksi PPOB dari Digiflazz.
 * Endpoint publik ini WAJIB memverifikasi header resmi X-Hub-Signature (HMAC-SHA1).
 */
async function handleDigiflazzWebhook(req, res) {
  try {
    // 1. Ambil Header Resmi Digiflazz Buyer Webhook v1: X-Hub-Signature (sha1=<hash>)
    const signature = req.headers['x-hub-signature'];

    if (!signature) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak: Header signature webhook (X-Hub-Signature) wajib disertakan.',
      });
    }

    // 2. Ambil Secret Key murni dari Environment Variable
    const secretKey = process.env.DIGIFLAZZ_WEBHOOK_SECRET || process.env.DIGIFLAZZ_API_KEY;
    if (!secretKey) {
      console.error('[Security Critical] DIGIFLAZZ_WEBHOOK_SECRET environment variable belum disetel.');
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi keamanan webhook server belum lengkap.',
      });
    }

    // 3. Verifikasi HMAC-SHA1 Timing-Safe terhadap req.rawBody Buffer
    const verification = verifyDigiflazzSignature(req.rawBody, signature, secretKey);
    if (!verification.valid) {
      return res.status(verification.code || 401).json({
        success: false,
        message: verification.message || 'Akses ditolak: Validasi signature webhook Digiflazz gagal (Unauthorized).',
      });
    }

    // 5. Ekstraksi atribut transaksi
    const payload = req.body || {};
    const data = payload.data || payload;
    const invoiceNumber = data.ref_id || payload.ref_id || payload.invoice_number;
    const rawStatus = (data.status || payload.status || '').toString().toLowerCase();
    const snToken = data.sn || payload.sn || payload.sn_token || null;
    const message = data.message || payload.message || payload.failure_reason || null;
    const supplierRefId = data.buyer_sku_code || payload.supplier_ref_id || null;

    const result = await processDigiflazzTransactionLogic({
      invoiceNumber,
      rawStatus,
      snToken,
      message,
      supplierRefId,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Error saat memproses webhook Digiflazz:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 2. POST /api/webhook/payment
 * Menerima notifikasi pelunasan deposit dari Payment Gateway (QRIS / Virtual Account).
 * Endpoint publik ini WAJIB memverifikasi signature HMAC-SHA256 tanpa bypass.
 */
async function handlePaymentWebhook(req, res) {
  try {
    const signature = req.headers['x-callback-signature'] || req.headers['x-signature'];

    // 1. Validasi keberadaan Header Signature
    if (!signature) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak: Header signature pembayaran (x-callback-signature) wajib disertakan.',
      });
    }

    // 2. Ambil Secret Key murni dari Environment Variable
    const secretKey = process.env.PAYMENT_GATEWAY_SECRET;
    if (!secretKey) {
      console.error('[Security Critical] PAYMENT_GATEWAY_SECRET environment variable belum disetel.');
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi keamanan payment gateway server belum lengkap.',
      });
    }

    // 3. Gunakan Raw Request Body murni
    const rawPayload = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    // 4. Verifikasi HMAC-SHA256 Timing-Safe
    const isValid = verifySignature(rawPayload, signature, secretKey);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak: Validasi signature payment gateway gagal (Unauthorized).',
      });
    }

    const { deposit_number, order_id, status } = req.body || {};
    const depNum = deposit_number || order_id;
    const paymentStatus = (status || '').toString().toUpperCase();

    const result = await processPaymentDepositLogic({ depNum, paymentStatus });
    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Error saat memproses payment webhook:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. POST /api/admin/webhook/simulate
 * Endpoint internal khusus Admin untuk mensimulasikan callback PPOB atau Deposit.
 * Terlindungi oleh JWT Middleware: verifyToken & requireRole('ADMIN').
 * Tidak dapat diakses oleh publik ataupun pengguna biasa.
 */
async function simulateWebhook(req, res) {
  const { type, invoice_number, deposit_number, status, sn_token, failure_reason } = req.body;

  if (type === 'PPOB') {
    if (!invoice_number || !status) {
      return res.status(400).json({ success: false, message: 'invoice_number dan status wajib diisi.' });
    }
    const result = await processDigiflazzTransactionLogic({
      invoiceNumber: invoice_number,
      rawStatus: status.toLowerCase(),
      snToken: sn_token,
      message: failure_reason,
      supplierRefId: null,
    });
    return res.status(result.status).json(result);
  }

  if (type === 'DEPOSIT') {
    if (!deposit_number || !status) {
      return res.status(400).json({ success: false, message: 'deposit_number dan status wajib diisi.' });
    }
    const result = await processPaymentDepositLogic({
      depNum: deposit_number,
      paymentStatus: status.toUpperCase(),
    });
    return res.status(result.status).json(result);
  }

  return res.status(400).json({ success: false, message: "Tipe simulasi tidak valid. Pilih 'PPOB' atau 'DEPOSIT'." });
}

module.exports = {
  verifyDigiflazzSignature,
  handleDigiflazzWebhook,
  handlePaymentWebhook,
  simulateWebhook,
  processDigiflazzTransactionLogic,
  processPaymentDepositLogic,
};
