const db = require('../config/db');
const walletService = require('../services/walletService');

// 1. LIHAT SALDO SENDIRI
async function getMyBalance(req, res) {
  try {
    const userId = req.user.id;
    const result = await db.query('SELECT id, full_name, phone_number, balance FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const user = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        user_id: user.id,
        full_name: user.full_name,
        phone_number: user.phone_number,
        balance: parseFloat(user.balance),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 2. LIHAT RIWAYAT MUTASI SENDIRI
async function getMyMutations(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const query = `
      SELECT id, type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at
      FROM balance_mutations
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3;
    `;
    const countQuery = 'SELECT COUNT(*) FROM balance_mutations WHERE user_id = $1';

    const [mutationsRes, countRes] = await Promise.all([
      db.query(query, [userId, limit, offset]),
      db.query(countQuery, [userId]),
    ]);

    const totalRecords = parseInt(countRes.rows[0].count, 10);

    return res.status(200).json({
      success: true,
      pagination: {
        current_page: page,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit),
      },
      data: mutationsRes.rows.map((m) => ({
        id: m.id,
        type: m.type,
        amount: parseFloat(m.amount),
        balance_before: parseFloat(m.balance_before),
        balance_after: parseFloat(m.balance_after),
        reference_type: m.reference_type,
        reference_id: m.reference_id,
        description: m.description,
        created_at: m.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 3. SIMULASI TOP UP (Testing)
async function simulateTopup(req, res) {
  try {
    const userId = req.user.id;
    const { amount, reference_id, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal top up wajib diisi dan harus lebih dari 0.' });
    }

    const refId = reference_id || `SIM-TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await walletService.creditBalance({
      userId,
      amount,
      referenceType: 'DEPOSIT_SIMULATION',
      referenceId: refId,
      description: description || 'Simulasi Pengisian Saldo AriPay',
    });

    return res.status(200).json({
      success: true,
      message: `Top up berhasil! Saldo baru: Rp${result.balance_after.toLocaleString('id-ID')}`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

// 4. SIMULASI POTONG SALDO (Testing)
async function simulateDeduct(req, res) {
  try {
    const userId = req.user.id;
    const { amount, reference_id, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal potongan wajib diisi dan harus lebih dari 0.' });
    }

    const refId = reference_id || `SIM-DEDUCT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await walletService.debitBalance({
      userId,
      amount,
      referenceType: 'PAYMENT_SIMULATION',
      referenceId: refId,
      description: description || 'Simulasi Pemotongan Saldo Pembelian',
    });

    return res.status(200).json({
      success: true,
      message: `Saldo berhasil dipotong! Sisa saldo: Rp${result.balance_after.toLocaleString('id-ID')}`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMyBalance,
  getMyMutations,
  simulateTopup,
  simulateDeduct,
};
