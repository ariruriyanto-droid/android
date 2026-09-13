const { pool } = require('../config/db');

/**
 * 1. TAMBAH SALDO (TOP UP / CREDIT)
 */
async function creditBalance({ userId, amount, referenceType, referenceId, description }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Nominal penambahan saldo harus lebih dari 0.');
    }

    // A. Pencegahan Duplikasi (Idempotency Check)
    const existingMutation = await client.query(
      'SELECT id FROM balance_mutations WHERE reference_type = $1 AND reference_id = $2',
      [referenceType, referenceId]
    );
    if (existingMutation.rows.length > 0) {
      throw new Error(`Operasi dengan referensi '${referenceId}' sudah pernah diproses sebelumnya.`);
    }

    // B. Kunci baris user (Row-level lock FOR UPDATE)
    const userRes = await client.query(
      'SELECT id, balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const currentBalance = parseFloat(userRes.rows[0].balance);
    const newBalance = currentBalance + numAmount;

    // C. Perbarui saldo
    await client.query(
      'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, userId]
    );

    // D. Catat di balance_mutations
    const mutationQuery = `
      INSERT INTO balance_mutations 
        (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
      VALUES ($1, 'CREDIT', $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const mutationRes = await client.query(mutationQuery, [
      userId,
      numAmount,
      currentBalance,
      newBalance,
      referenceType,
      referenceId,
      description,
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      balance_before: currentBalance,
      balance_after: newBalance,
      mutation: mutationRes.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 2. POTONG SALDO (DEBIT)
 */
async function debitBalance({ userId, amount, referenceType, referenceId, description }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Nominal pengurangan saldo harus lebih besar dari 0.');
    }

    // A. Idempotency Check
    const existingMutation = await client.query(
      'SELECT id FROM balance_mutations WHERE reference_type = $1 AND reference_id = $2',
      [referenceType, referenceId]
    );
    if (existingMutation.rows.length > 0) {
      throw new Error(`Transaksi dengan referensi '${referenceId}' sudah pernah dipotong sebelumnya.`);
    }

    // B. Kunci baris user (FOR UPDATE)
    const userRes = await client.query(
      'SELECT id, balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const currentBalance = parseFloat(userRes.rows[0].balance);

    // C. Validasi Saldo Cukup
    if (currentBalance < numAmount) {
      throw new Error(
        `Saldo tidak mencukupi. Saldo saat ini: Rp${currentBalance.toLocaleString('id-ID')}, dibutuhkan: Rp${numAmount.toLocaleString('id-ID')}.`
      );
    }

    const newBalance = currentBalance - numAmount;

    // D. Perbarui saldo
    await client.query(
      'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, userId]
    );

    // E. Catat mutasi DEBIT
    const mutationQuery = `
      INSERT INTO balance_mutations 
        (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
      VALUES ($1, 'DEBIT', $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const mutationRes = await client.query(mutationQuery, [
      userId,
      numAmount,
      currentBalance,
      newBalance,
      referenceType,
      referenceId,
      description,
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      balance_before: currentBalance,
      balance_after: newBalance,
      mutation: mutationRes.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  creditBalance,
  debitBalance,
};
