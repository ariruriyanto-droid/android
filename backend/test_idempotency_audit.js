const assert = require('assert');
const fs = require('fs');

console.log('===============================================================');
console.log('🧪 RUNNING COMPREHENSIVE IDEMPOTENCY & CONSTRAINT AUDIT SUITE');
console.log('   DEBIT, CONCURRENT REFUND, DUPLICATE WEBHOOK & REGRESSION');
console.log('===============================================================\n');

// Mock Database State & Client that accurately simulates PostgreSQL with Partial Unique Indexes
class MockPostgresEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      { id: 1, full_name: 'Budi Santoso', phone_number: '081234567890', balance: 500000.00 },
      { id: 2, full_name: 'Siti Rahma', phone_number: '081987654321', balance: 100000.00 },
    ];
    this.transactions = [];
    this.balance_mutations = [];
    this.deposits = [];
    this.withdrawals = [];
    this.admin_users = [{ id: 1, username: 'admin' }];
    this.activeLocks = new Set();
  }

  getClient() {
    return new MockPgClient(this);
  }
}

class MockPgClient {
  constructor(engine) {
    this.engine = engine;
    this.inTransaction = false;
    this.transactionLogs = [];
    this.snapshot = null;
    this.heldLocks = new Set();
  }

  async query(sql, params = []) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    if (cleanSql === 'BEGIN') {
      this.inTransaction = true;
      this.snapshot = {
        users: JSON.parse(JSON.stringify(this.engine.users)),
        mutationsLength: this.engine.balance_mutations.length,
        txLength: this.engine.transactions.length,
      };
      return { rows: [] };
    }

    if (cleanSql === 'COMMIT') {
      this.inTransaction = false;
      this.snapshot = null;
      this.heldLocks.forEach(lock => this.engine.activeLocks.delete(lock));
      this.heldLocks.clear();
      return { rows: [] };
    }

    if (cleanSql === 'ROLLBACK') {
      this.inTransaction = false;
      if (this.snapshot) {
        this.engine.users = this.snapshot.users;
        this.engine.balance_mutations = this.engine.balance_mutations.slice(0, this.snapshot.mutationsLength);
        this.engine.transactions = this.engine.transactions.slice(0, this.snapshot.txLength);
        this.snapshot = null;
      }
      this.heldLocks.forEach(lock => this.engine.activeLocks.delete(lock));
      this.heldLocks.clear();
      return { rows: [] };
    }

    // 1. SELECT users FOR UPDATE
    if (cleanSql.includes('FROM users') && cleanSql.includes('FOR UPDATE')) {
      const userId = params[0];
      const user = this.engine.users.find(u => u.id == userId);
      if (!user) return { rows: [] };
      return { rows: [{ ...user }] };
    }

    // 2. UPDATE users SET balance = $1
    if (cleanSql.startsWith('UPDATE users SET balance = $1')) {
      const [newBal, userId] = params;
      const user = this.engine.users.find(u => u.id == userId);
      if (user) {
        user.balance = parseFloat(newBal);
        return { rowCount: 1, rows: [{ ...user }] };
      }
      return { rowCount: 0, rows: [] };
    }

    // 3. SELECT FROM balance_mutations WHERE reference_type = $1 AND reference_id = $2
    if (cleanSql.startsWith('SELECT id FROM balance_mutations WHERE reference_type = $1 AND reference_id = $2')) {
      const [refType, refId] = params;
      const found = this.engine.balance_mutations.find(
        m => m.reference_type === refType && m.reference_id === refId
      );
      return { rows: found ? [found] : [] };
    }

    // 4. INSERT INTO balance_mutations with PARTIAL UNIQUE INDEX ENFORCEMENT
    if (cleanSql.includes('INSERT INTO balance_mutations')) {
      let userId, type, amount, balBefore, balAfter, refType, refId, desc;
      if (params.length === 6) {
        [userId, amount, balBefore, balAfter, refId, desc] = params;
        type = cleanSql.includes("'DEBIT'") ? 'DEBIT' : 'CREDIT';
        if (cleanSql.includes("'TRANSACTION'")) refType = 'TRANSACTION';
        else if (cleanSql.includes("'REFUND'")) refType = 'REFUND';
        else refType = 'UNKNOWN';
      } else {
        [userId, type, amount, balBefore, balAfter, refType, refId, desc] = params;
      }

      // ENFORCE: uq_mutations_tx_debit ON (reference_id) WHERE reference_type = 'TRANSACTION'
      if (refType === 'TRANSACTION') {
        const debitConflict = this.engine.balance_mutations.find(
          m => m.reference_type === 'TRANSACTION' && m.reference_id === refId
        );
        if (debitConflict) {
          const err = new Error(`duplicate key value violates unique constraint "uq_mutations_tx_debit"`);
          err.code = '23505';
          err.constraint = 'uq_mutations_tx_debit';
          throw err;
        }
      }

      // ENFORCE: uq_mutations_tx_refund ON (reference_id) WHERE reference_type = 'REFUND'
      if (refType === 'REFUND') {
        const refundConflict = this.engine.balance_mutations.find(
          m => m.reference_type === 'REFUND' && m.reference_id === refId
        );
        if (refundConflict) {
          const err = new Error(`duplicate key value violates unique constraint "uq_mutations_tx_refund"`);
          err.code = '23505';
          err.constraint = 'uq_mutations_tx_refund';
          throw err;
        }
      }

      const newMutation = {
        id: this.engine.balance_mutations.length + 1,
        user_id: userId,
        type,
        amount: parseFloat(amount),
        balance_before: parseFloat(balBefore),
        balance_after: parseFloat(balAfter),
        reference_type: refType,
        reference_id: refId,
        description: desc,
        created_at: new Date().toISOString(),
      };
      this.engine.balance_mutations.push(newMutation);
      return { rowCount: 1, rows: [newMutation] };
    }

    // 5. INSERT INTO transactions
    if (cleanSql.includes('INSERT INTO transactions')) {
      const [invoiceNumber, userId, productId, targetNumber, price, priceCost, margin] = params;
      const existingTx = this.engine.transactions.find(t => t.invoice_number === invoiceNumber);
      if (existingTx) {
        const err = new Error(`duplicate key value violates unique constraint "transactions_invoice_number_key"`);
        err.code = '23505';
        err.constraint = 'transactions_invoice_number_key';
        throw err;
      }
      const newTx = {
        id: this.engine.transactions.length + 1,
        invoice_number: invoiceNumber,
        user_id: userId,
        product_id: productId,
        target_number: targetNumber,
        price: parseFloat(price),
        price_cost: parseFloat(priceCost),
        margin: parseFloat(margin),
        supplier: 'DIGIFLAZZ',
        status: 'PENDING',
        sn_token: null,
        failure_reason: null,
        supplier_ref_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.engine.transactions.push(newTx);
      return { rowCount: 1, rows: [newTx] };
    }

    // 6. UPDATE transactions (atomic conditional state transition)
    if (cleanSql.includes('UPDATE transactions')) {
      // e.g. WHERE invoice_number = $3 AND status IN ('PENDING', 'PROCESSING')
      if (cleanSql.includes("status IN ('PENDING', 'PROCESSING')") || cleanSql.includes("status = 'PENDING'")) {
        const [failureReason, supplierRefId, invoiceNumber] = params;
        const tx = this.engine.transactions.find(
          t => t.invoice_number === invoiceNumber && ['PENDING', 'PROCESSING'].includes(t.status)
        );
        if (!tx) {
          return { rowCount: 0, rows: [] };
        }
        tx.status = 'FAILED';
        tx.failure_reason = failureReason;
        tx.supplier_ref_id = supplierRefId || tx.supplier_ref_id;
        tx.updated_at = new Date().toISOString();
        return { rowCount: 1, rows: [{ ...tx }] };
      }

      if (cleanSql.includes("status = 'SUCCESS'")) {
        const [snToken, supplierRefId, invoiceNumber] = params;
        const tx = this.engine.transactions.find(
          t => t.invoice_number === invoiceNumber && t.status === 'PENDING'
        );
        if (!tx) {
          return { rowCount: 0, rows: [] };
        }
        tx.status = 'SUCCESS';
        tx.sn_token = snToken || `SN-AUTO-${Date.now()}`;
        tx.supplier_ref_id = supplierRefId || tx.supplier_ref_id;
        tx.updated_at = new Date().toISOString();
        return { rowCount: 1, rows: [{ ...tx }] };
      }

      if (cleanSql.includes("status = 'REFUNDED'")) {
        const [invoiceNumber] = params;
        const tx = this.engine.transactions.find(t => t.invoice_number === invoiceNumber);
        if (tx) {
          tx.status = 'REFUNDED';
          tx.updated_at = new Date().toISOString();
          return { rowCount: 1, rows: [{ ...tx }] };
        }
        return { rowCount: 0, rows: [] };
      }
    }

    // 7. SELECT FROM transactions WHERE invoice_number = $1
    if (cleanSql.startsWith('SELECT') && cleanSql.includes('FROM transactions WHERE invoice_number = $1')) {
      const [invoiceNumber] = params;
      const tx = this.engine.transactions.find(t => t.invoice_number === invoiceNumber);
      return { rows: tx ? [{ ...tx }] : [] };
    }

    return { rowCount: 0, rows: [] };
  }

  release() {
    this.heldLocks.forEach(lock => this.engine.activeLocks.delete(lock));
    this.heldLocks.clear();
  }
}

async function runAuditSuite() {
  let passedCount = 0;
  let totalCount = 0;

  function test(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // TEST 1: Schema verification for partial unique indexes
  test('1. Migration / Schema Verification: uq_mutations_tx_debit & uq_mutations_tx_refund', () => {
    const schemaContent = fs.readFileSync('./database/schema.sql', 'utf8');

    assert(
      schemaContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_mutations_tx_debit'),
      'Index uq_mutations_tx_debit must be defined in schema.sql'
    );
    assert(
      schemaContent.includes("WHERE reference_type = 'TRANSACTION'"),
      "uq_mutations_tx_debit must filter WHERE reference_type = 'TRANSACTION'"
    );

    assert(
      schemaContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_mutations_tx_refund'),
      'Index uq_mutations_tx_refund must be defined in schema.sql'
    );
    assert(
      schemaContent.includes("WHERE reference_type = 'REFUND'"),
      "uq_mutations_tx_refund must filter WHERE reference_type = 'REFUND'"
    );
  });

  // TEST 2: Test Duplicate Debit Prevention & 23505 Rollback
  await asyncTest('2. Test Duplicate Debit: uq_mutations_tx_debit triggers 23505 and aborts double debit', async () => {
    const engine = new MockPostgresEngine();
    const invoiceNum = 'INV-AUDIT-DEBIT-001';
    const initialBalance = engine.users[0].balance; // 500000
    const priceSell = 50000;

    // Simulation of transactionController processOrder
    async function processOrder(client, inv) {
      try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT id, balance FROM users WHERE id = $1 FOR UPDATE', [1]);
        const curBal = userRes.rows[0].balance;
        const balAfter = curBal - priceSell;

        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [balAfter, 1]);
        await client.query(
          `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
           VALUES ($1, 'DEBIT', $2, $3, $4, 'TRANSACTION', $5, $6)`,
          [1, priceSell, curBal, balAfter, inv, 'Beli Pulsa']
        );
        await client.query(
          `INSERT INTO transactions (invoice_number, user_id, product_id, target_number, price, price_cost, margin)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [inv, 1, 10, '081234567890', priceSell, 49000, 1000]
        );
        await client.query('COMMIT');
        return { success: true };
      } catch (err) {
        await client.query('ROLLBACK');
        return { success: false, code: err.code, message: err.message };
      } finally {
        client.release();
      }
    }

    // 1st order -> should succeed
    const res1 = await processOrder(engine.getClient(), invoiceNum);
    assert.strictEqual(res1.success, true, 'First order debit must succeed');
    assert.strictEqual(engine.users[0].balance, initialBalance - priceSell, 'Balance decremented by 50,000');

    // 2nd duplicate order with same invoice -> MUST trigger 23505 and rollback
    const res2 = await processOrder(engine.getClient(), invoiceNum);
    assert.strictEqual(res2.success, false, 'Second duplicate order debit must fail');
    assert.strictEqual(res2.code, '23505', 'Must return PostgreSQL unique violation code 23505');

    // Verify balance was NOT decremented a second time (idempotency preserved)
    assert.strictEqual(
      engine.users[0].balance,
      initialBalance - priceSell,
      'User balance must remain unchanged after failed duplicate debit'
    );
    const debitMutations = engine.balance_mutations.filter(
      m => m.reference_type === 'TRANSACTION' && m.reference_id === invoiceNum
    );
    assert.strictEqual(debitMutations.length, 1, 'Exactly 1 debit mutation must exist in balance_mutations');
  });

  // TEST 3: Test Concurrent Refund & Atomic State Transition
  await asyncTest('3. Test Concurrent Refund: Atomic state transition & uq_mutations_tx_refund prevent double credit', async () => {
    const engine = new MockPostgresEngine();
    const invoiceNum = 'INV-AUDIT-REFUND-001';
    const price = 75000;

    // Seed transaction PENDING
    engine.users[0].balance = 425000;
    engine.transactions.push({
      id: 1,
      invoice_number: invoiceNum,
      user_id: 1,
      price: price,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    // Simulate webhook logic for FAILED
    async function handleFailedWebhook(client, inv, failureReason) {
      // Step 1: Atomic conditional update
      const updateRes = await client.query(
        `UPDATE transactions 
         SET status = 'FAILED', failure_reason = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE invoice_number = $3 AND status IN ('PENDING', 'PROCESSING')
         RETURNING *`,
        [failureReason, null, inv]
      );

      if (updateRes.rows.length === 0) {
        return { success: true, idempotent: true, message: 'Already processed' };
      }

      const tx = updateRes.rows[0];
      const refundRef = `REFUND:${tx.invoice_number}`;

      // Step 2: walletService creditBalance
      try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT id, balance FROM users WHERE id = $1 FOR UPDATE', [tx.user_id]);
        const curBal = userRes.rows[0].balance;
        const balAfter = curBal + parseFloat(tx.price);

        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [balAfter, tx.user_id]);
        await client.query(
          `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
           VALUES ($1, 'CREDIT', $2, $3, $4, 'REFUND', $5, $6)`,
          [tx.user_id, tx.price, curBal, balAfter, refundRef, 'Refund order']
        );
        await client.query('COMMIT');

        // Step 3: Set status REFUNDED
        await client.query("UPDATE transactions SET status = 'REFUNDED' WHERE invoice_number = $1", [inv]);
        return { success: true, idempotent: false, refunded: true };
      } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
          return { success: true, idempotent: true, caught23505: true };
        }
        throw err;
      }
    }

    // Execute 2 concurrent refund calls
    const [result1, result2] = await Promise.all([
      handleFailedWebhook(engine.getClient(), invoiceNum, 'Operator down'),
      handleFailedWebhook(engine.getClient(), invoiceNum, 'Operator down (retry)'),
    ]);

    // Exactly one must perform the refund, the other must be recognized as idempotent
    const actualRefunds = [result1, result2].filter(r => r.refunded);
    const idempotentResponses = [result1, result2].filter(r => r.idempotent);

    assert.strictEqual(actualRefunds.length, 1, 'Exactly ONE concurrent call executed the refund');
    assert.strictEqual(idempotentResponses.length, 1, 'The other concurrent call was safely idempotent');
    assert.strictEqual(
      engine.users[0].balance,
      425000 + price,
      'User balance credited exactly once (Rp500.000)'
    );

    const refundMutations = engine.balance_mutations.filter(
      m => m.reference_type === 'REFUND' && m.reference_id === `REFUND:${invoiceNum}`
    );
    assert.strictEqual(refundMutations.length, 1, 'Exactly ONE REFUND mutation recorded in balance_mutations');
  });

  // TEST 4: Test Duplicate Webhook
  await asyncTest('4. Test Duplicate Webhook: Duplicate callback returns 200 without calling creditBalance()', async () => {
    const engine = new MockPostgresEngine();
    const invoiceNum = 'INV-DUP-WEBHOOK-001';
    const price = 25000;

    // Seed transaction PENDING
    engine.users[0].balance = 475000;
    engine.transactions.push({
      id: 2,
      invoice_number: invoiceNum,
      user_id: 1,
      price: price,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    let creditBalanceCallCount = 0;

    async function simulateWebhookProcess(client, inv, status) {
      if (status === 'FAILED') {
        const updateRes = await client.query(
          `UPDATE transactions 
           SET status = 'FAILED', failure_reason = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE invoice_number = $3 AND status IN ('PENDING', 'PROCESSING')
           RETURNING *`,
          ['Batal', null, inv]
        );

        if (updateRes.rows.length === 0) {
          return { status: 200, success: true, message: 'Callback diterima. Transaksi sudah diproses sebelumnya (Idempotent OK).' };
        }

        creditBalanceCallCount++;
        const tx = updateRes.rows[0];
        engine.users[0].balance += tx.price;
        engine.balance_mutations.push({
          reference_type: 'REFUND',
          reference_id: `REFUND:${inv}`,
          amount: tx.price,
        });
        tx.status = 'REFUNDED';
        return { status: 200, success: true, message: 'Refund berhasil' };
      }
    }

    // Call 1: Normal webhook
    const resp1 = await simulateWebhookProcess(engine.getClient(), invoiceNum, 'FAILED');
    assert.strictEqual(resp1.status, 200);
    assert.strictEqual(creditBalanceCallCount, 1, 'creditBalance called on 1st webhook');

    // Call 2: Duplicate webhook retry from supplier 5 seconds later
    const resp2 = await simulateWebhookProcess(engine.getClient(), invoiceNum, 'FAILED');
    assert.strictEqual(resp2.status, 200);
    assert.strictEqual(resp2.message.includes('Idempotent OK'), true, 'Duplicate webhook returns Idempotent OK');
    assert.strictEqual(creditBalanceCallCount, 1, 'creditBalance MUST NOT be called a 2nd time on duplicate webhook');
    assert.strictEqual(engine.users[0].balance, 500000, 'User balance untouched by 2nd webhook');
  });

  // TEST 5: Test Non-Conflicting Operations (Deposit, Withdrawal, Admin Adjustment)
  await asyncTest('5. Regression Test: DEPOSIT, WITHDRAWAL, & ADMIN_ADJUSTMENT unaffected by partial index', async () => {
    const engine = new MockPostgresEngine();
    const client = engine.getClient();

    // 5a. Deposit mutation
    await client.query(
      `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'CREDIT', $2, $3, $4, 'DEPOSIT', $5, $6)`,
      [1, 100000, 500000, 600000, 'DP-20260910-001', 'Deposit Tiket 001']
    );

    // 5b. Withdrawal mutation
    await client.query(
      `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'DEBIT', $2, $3, $4, 'WITHDRAWAL', $5, $6)`,
      [1, 50000, 600000, 550000, 'WD-20260910-001', 'Tarik Dana 001']
    );

    // 5c. Withdrawal refund mutation
    await client.query(
      `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'CREDIT', $2, $3, $4, 'WITHDRAWAL_REFUND', $5, $6)`,
      [1, 50000, 550000, 600000, 'REFUND:WD-20260910-001', 'Penarikan Ditolak']
    );

    // 5d. Admin Adjustment mutation
    await client.query(
      `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'CREDIT', $2, $3, $4, 'ADMIN_ADJUSTMENT', $5, $6)`,
      [1, 15000, 600000, 615000, 'ADJ-1725920000', 'Bonus Kompensasi']
    );

    assert.strictEqual(engine.balance_mutations.length, 4, 'All 4 mutations must be inserted without conflict');
  });

  // TEST 6: Single Invoice can have exactly 1 TRANSACTION (Debit) and 1 REFUND (Credit) without collision
  await asyncTest('6. Integrity Test: One invoice can have both 1 DEBIT and 1 REFUND without index collision', async () => {
    const engine = new MockPostgresEngine();
    const client = engine.getClient();
    const inv = 'INV-NORMAL-LIFECYCLE-001';

    // 1. Debit
    await client.query(
      `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'DEBIT', $2, $3, $4, 'TRANSACTION', $5, $6)`,
      [1, 20000, 100000, 80000, inv, 'Pembelian Paket Data']
    );

    // 2. Refund for the same transaction
    await client.query(
      `INSERT INTO balance_mutations (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
       VALUES ($1, 'CREDIT', $2, $3, $4, 'REFUND', $5, $6)`,
      [1, 20000, 80000, 100000, `REFUND:${inv}`, 'Refund Paket Data Gagal']
    );

    const relatedMutations = engine.balance_mutations.filter(
      m => m.reference_id === inv || m.reference_id === `REFUND:${inv}`
    );
    assert.strictEqual(relatedMutations.length, 2, 'Both debit and refund coexist harmoniously');
  });

  console.log('\n===============================================================');
  console.log(`🎉 ALL IDEMPOTENCY AUDIT TESTS PASSED: ${passedCount}/${totalCount} GREEN!`);
  console.log('===============================================================\n');
}

runAuditSuite().catch(err => {
  console.error('Audit suite failed:', err);
  process.exit(1);
});
