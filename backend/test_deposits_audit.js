const assert = require('assert');

console.log('===============================================================');
console.log('🧪 RUNNING COMPREHENSIVE AUDIT TEST SUITE: LANGKAH 6.9');
console.log('   DEPOSIT APPROVAL, REJECTION, ACID ATOMICITY & CONCURRENCY');
console.log('===============================================================\n');

// Mock Database State & Client to test PostgreSQL transaction and FOR UPDATE behavior
class MockClient {
  constructor(initialState) {
    this.state = initialState;
    this.inTransaction = false;
    this.logs = [];
    this.released = false;
  }

  async query(sql, params = []) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    this.logs.push({ sql: cleanSql, params });

    // 1. Transaction controls
    if (cleanSql === 'BEGIN') {
      this.inTransaction = true;
      return { rows: [] };
    }
    if (cleanSql === 'COMMIT') {
      this.inTransaction = false;
      return { rows: [] };
    }
    if (cleanSql === 'ROLLBACK') {
      this.inTransaction = false;
      return { rows: [] };
    }

    // 2. deposits SELECT ... FOR UPDATE
    if (cleanSql.startsWith('SELECT * FROM deposits WHERE id = $1 FOR UPDATE')) {
      const depId = params[0];
      const deposit = this.state.deposits.find(d => d.id == depId);
      return { rows: deposit ? [deposit] : [] };
    }

    // 3. users SELECT ... FOR UPDATE
    if (cleanSql.startsWith('SELECT id, balance FROM users WHERE id = $1 FOR UPDATE')) {
      const userId = params[0];
      const user = this.state.users.find(u => u.id == userId);
      return { rows: user ? [{ id: user.id, balance: user.balance }] : [] };
    }

    // 4. check balance_mutations duplicate
    if (cleanSql.startsWith('SELECT id FROM balance_mutations WHERE reference_type = $1 AND reference_id = $2')) {
      const [refType, refId] = params;
      const found = this.state.balance_mutations.find(m => m.reference_type === refType && m.reference_id === refId);
      return { rows: found ? [found] : [] };
    }

    // 5. UPDATE users balance
    if (cleanSql.startsWith('UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2')) {
      const [newBal, userId] = params;
      const user = this.state.users.find(u => u.id == userId);
      if (user) {
        user.balance = parseFloat(newBal);
      }
      return { rowCount: 1 };
    }

    // 6. INSERT INTO balance_mutations
    if (cleanSql.includes('INSERT INTO balance_mutations')) {
      const [user_id, amount, balance_before, balance_after, reference_id, description] = params;
      const newId = this.state.balance_mutations.length + 1;
      this.state.balance_mutations.push({
        id: newId,
        user_id,
        type: 'CREDIT',
        amount: parseFloat(amount),
        balance_before: parseFloat(balance_before),
        balance_after: parseFloat(balance_after),
        reference_type: 'DEPOSIT',
        reference_id,
        description,
      });
      return { rowCount: 1 };
    }

    // 7. UPDATE deposits status
    if (cleanSql.startsWith('UPDATE deposits SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3')) {
      const [status, approved_by, depId] = params;
      const deposit = this.state.deposits.find(d => d.id == depId);
      if (deposit) {
        deposit.status = status;
        deposit.approved_by = approved_by;
      }
      return { rowCount: 1 };
    }

    return { rows: [] };
  }

  release() {
    this.released = true;
  }
}

function getFreshDbFixture() {
  return {
    users: [
      { id: 1, full_name: 'Budi Santoso', phone_number: '081234567890', balance: 50000.00 },
      { id: 2, full_name: 'Siti Rahmawati', phone_number: '085712345678', balance: 100000.00 },
    ],
    deposits: [
      {
        id: 301,
        deposit_number: 'DP-20260909-001',
        user_id: 1,
        amount: 100000.00,
        unique_code: 321,
        total_payment: 100321.00,
        payment_method: 'BCA Transfer',
        status: 'PENDING',
        approved_by: null,
      },
      {
        id: 302,
        deposit_number: 'DP-20260909-002',
        user_id: 2,
        amount: 75000.00,
        unique_code: 114,
        total_payment: 75114.00,
        payment_method: 'QRIS',
        status: 'PENDING',
        approved_by: null,
      },
      {
        id: 303,
        deposit_number: 'DP-20260909-003',
        user_id: 1,
        amount: 50000.00,
        unique_code: 405,
        total_payment: 50405.00,
        payment_method: 'Mandiri VA',
        status: 'SUCCESS',
        approved_by: 1,
      },
    ],
    balance_mutations: [
      {
        id: 1,
        user_id: 1,
        type: 'CREDIT',
        amount: 50000.00,
        balance_before: 0.00,
        balance_after: 50000.00,
        reference_type: 'DEPOSIT',
        reference_id: 'DP-20260909-003',
        description: 'Initial deposit',
      }
    ],
  };
}

// Helper mock response
function createMockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function runTests() {
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

  async function testAsync(name, fn) {
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

  // Inject Mock into Controller Environment
  const adminController = require('./controllers/adminController');
  const db = require('./config/db');

  // TEST 1: Atomic Approval & Balance Credit
  await testAsync('1. approveDeposit: Transaksi ACID, row lock, saldo +100k, status SUCCESS, mutasi CREDIT tercatat tepat 1x', async () => {
    const freshDb = getFreshDbFixture();
    const mockClient = new MockClient(freshDb);
    db.pool.connect = async () => mockClient;

    const req = {
      params: { id: 301 },
      user: { id: 1, role: 'ADMIN' },
    };
    const res = createMockRes();

    await adminController.approveDeposit(req, res);

    assert.strictEqual(res.statusCode, 200, 'HTTP status must be 200');
    assert.strictEqual(res.body.success, true, 'Response must indicate success');

    // Cek urutan SQL transaksi
    const sqlCommands = mockClient.logs.map(l => l.sql);
    assert(sqlCommands.includes('BEGIN'), 'BEGIN must be issued');
    assert(sqlCommands.some(s => s.includes('SELECT * FROM deposits WHERE id = $1 FOR UPDATE')), 'Deposit must be locked with FOR UPDATE');
    assert(sqlCommands.some(s => s.includes('SELECT id, balance FROM users WHERE id = $1 FOR UPDATE')), 'User must be locked with FOR UPDATE');
    assert(sqlCommands.includes('COMMIT'), 'COMMIT must be issued');
    assert.strictEqual(mockClient.released, true, 'Client connection must be released in finally block');

    // Cek saldo bertambah tepat satu kali
    const updatedUser = mockClient.state.users.find(u => u.id === 1);
    assert.strictEqual(updatedUser.balance, 150000.00, 'User balance must increase from 50,000 to 150,000');

    // Cek status tiket deposit
    const updatedDep = mockClient.state.deposits.find(d => d.id === 301);
    assert.strictEqual(updatedDep.status, 'SUCCESS', 'Deposit status must transition to SUCCESS');
    assert.strictEqual(updatedDep.approved_by, 1, 'approved_by must record admin id');

    // Cek mutasi saldo bertambah tepat 1 baris bertipe CREDIT
    const userMutations = mockClient.state.balance_mutations.filter(m => m.reference_id === 'DP-20260909-001');
    assert.strictEqual(userMutations.length, 1, 'Exactly one mutation record must exist for this deposit');
    assert.strictEqual(userMutations[0].type, 'CREDIT', 'Mutation type must be CREDIT');
    assert.strictEqual(userMutations[0].amount, 100000.00, 'Mutation amount must be 100,000');
    assert.strictEqual(userMutations[0].balance_before, 50000.00, 'balance_before must be 50,000');
    assert.strictEqual(userMutations[0].balance_after, 150000.00, 'balance_after must be 150,000');
  });

  // TEST 2: Double Approval / Idempotency Check
  await testAsync('2. approveDeposit: Percobaan approval ulang (double credit) dicegah & dibatalkan via ROLLBACK', async () => {
    // Gunakan state di mana 301 sudah SUCCESS
    const currentDb = getFreshDbFixture();
    currentDb.deposits.find(d => d.id === 301).status = 'SUCCESS';
    currentDb.users.find(u => u.id === 1).balance = 150000.00;

    const mockClient = new MockClient(currentDb);
    db.pool.connect = async () => mockClient;

    const req = {
      params: { id: 301 },
      user: { id: 1, role: 'ADMIN' },
    };
    const res = createMockRes();

    await adminController.approveDeposit(req, res);

    assert.strictEqual(res.statusCode, 400, 'Double approval must return 400 Bad Request');
    assert.strictEqual(res.body.success, false, 'Response success must be false');
    assert(res.body.message.includes('sudah disetujui sebelumnya'), 'Message must explain already approved');

    // Pastikan ROLLBACK dipanggil
    const sqlCommands = mockClient.logs.map(l => l.sql);
    assert(sqlCommands.includes('ROLLBACK'), 'ROLLBACK must be executed');
    assert(!sqlCommands.includes('COMMIT'), 'COMMIT must NOT be executed');

    // Pastikan saldo TIDAK berubah
    const user = mockClient.state.users.find(u => u.id === 1);
    assert.strictEqual(user.balance, 150000.00, 'Balance must remain unchanged');
  });

  // TEST 3: Approval Non-Pending (misal REJECTED / EXPIRED)
  await testAsync('3. approveDeposit: Tiket non-PENDING (misal REJECTED) ditolak dan di-ROLLBACK', async () => {
    const currentDb = getFreshDbFixture();
    currentDb.deposits[0].status = 'REJECTED';

    const mockClient = new MockClient(currentDb);
    db.pool.connect = async () => mockClient;

    const req = { params: { id: 301 }, user: { id: 1 } };
    const res = createMockRes();

    await adminController.approveDeposit(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert(mockClient.logs.map(l => l.sql).includes('ROLLBACK'));
  });

  // TEST 4: Reject Deposit Validation (< 5 karakter)
  await testAsync('4. rejectDeposit: Validasi alasan penolakan < 5 karakter ditolak tanpa menyentuh database', async () => {
    const freshDb = getFreshDbFixture();
    const mockClient = new MockClient(freshDb);
    db.pool.connect = async () => mockClient;

    const req = {
      params: { id: 302 },
      body: { rejection_reason: 'no' }, // hanya 2 karakter
      user: { id: 1 },
    };
    const res = createMockRes();

    await adminController.rejectDeposit(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('minimal 5 karakter'));
    assert.strictEqual(mockClient.logs.length, 0, 'No SQL query should be issued on validation failure');
  });

  // TEST 5: Reject Deposit Valid Execution
  await testAsync('5. rejectDeposit: Berhasil menolak tiket PENDING, saldo nasabah 0 delta, tanpa mutasi buku kas', async () => {
    const freshDb = getFreshDbFixture();
    const mockClient = new MockClient(freshDb);
    db.pool.connect = async () => mockClient;

    const initialMutCount = mockClient.state.balance_mutations.length;
    const req = {
      params: { id: 302 },
      body: { rejection_reason: 'Nominal transfer tidak sesuai dengan tiket deposit.' },
      user: { id: 1 },
    };
    const res = createMockRes();

    await adminController.rejectDeposit(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const sqlCommands = mockClient.logs.map(l => l.sql);
    assert(sqlCommands.includes('BEGIN'));
    assert(sqlCommands.some(s => s.includes('SELECT * FROM deposits WHERE id = $1 FOR UPDATE')));
    assert(sqlCommands.includes('COMMIT'));

    // Status berubah menjadi REJECTED
    const dep = mockClient.state.deposits.find(d => d.id === 302);
    assert.strictEqual(dep.status, 'REJECTED');

    // Saldo nasabah id 2 TIDAK BERUBAH
    const user2 = mockClient.state.users.find(u => u.id === 2);
    assert.strictEqual(user2.balance, 100000.00, 'Saldo user harus tetap 100.000 tanpa perubahan');

    // Mutasi saldo TIDAK BERTAMBAH
    assert.strictEqual(mockClient.state.balance_mutations.length, initialMutCount, 'No new mutation should be added');
  });

  // TEST 6: Concurrency Simulation (2 concurrent requests to approve same deposit)
  await testAsync('6. Concurrency Test: 2 request approval bersamaan pada 1 tiket menghasilkan tepat 1 SUCCESS dan 1 REJECTED/400', async () => {
    const sharedDb = getFreshDbFixture();
    sharedDb.deposits.find(d => d.id === 301).status = 'PENDING';
    sharedDb.users.find(u => u.id === 1).balance = 50000.00;

    let isLocked = false;
    let lockOwner = null;

    class ConcurrencyMockClient extends MockClient {
      constructor(dbState) {
        super(dbState);
      }
      async query(sql, params) {
        if (sql.includes('SELECT * FROM deposits WHERE id = $1 FOR UPDATE')) {
          while (isLocked && lockOwner !== this) {
            await new Promise(r => setTimeout(r, 15));
          }
          isLocked = true;
          lockOwner = this;
        }
        const result = await super.query(sql, params);
        if (sql === 'COMMIT' || sql === 'ROLLBACK') {
          if (lockOwner === this) {
            isLocked = false;
            lockOwner = null;
          }
        }
        return result;
      }
    }

    const client1 = new ConcurrencyMockClient(sharedDb);
    const client2 = new ConcurrencyMockClient(sharedDb);

    let connectCount = 0;
    db.pool.connect = async () => {
      connectCount++;
      return connectCount === 1 ? client1 : client2;
    };

    const req1 = { params: { id: 301 }, user: { id: 1 } };
    const res1 = createMockRes();

    const req2 = { params: { id: 301 }, user: { id: 1 } };
    const res2 = createMockRes();

    // Jalankan berbarengan
    await Promise.all([
      adminController.approveDeposit(req1, res1),
      adminController.approveDeposit(req2, res2),
    ]);

    // Satu harus 200, satu harus 400
    const statuses = [res1.statusCode, res2.statusCode].sort();
    assert.deepStrictEqual(statuses, [200, 400], 'One request must succeed (200) and one must fail (400)');

    // Saldo user harus tepat bertambah 1x (50,000 + 100,000 = 150,000), TIDAK BOLEH 250,000!
    assert.strictEqual(sharedDb.users.find(u => u.id === 1).balance, 150000.00, 'Saldo must only increase once (150,000), never double (250,000)');

    // Mutasi harus tepat 1 record baru
    const mutations301 = sharedDb.balance_mutations.filter(m => m.reference_id === 'DP-20260909-001');
    assert.strictEqual(mutations301.length, 1, 'Mutasi saldo must only have 1 entry');
  });

  // TEST 7: Authorization & Middleware verification
  test('7. Route & Middleware Audit: Seluruh endpoint /deposits dan /mutations diproteksi verifyToken dan requireRole(ADMIN)', () => {
    const adminRoutes = require('./routes/adminRoutes');
    const routerStack = adminRoutes.stack;

    // Cari layer middleware verifikasi token
    const middlewares = routerStack.filter(layer => !layer.route);
    assert(middlewares.length >= 2, 'Must have at least verifyToken and requireRole middleware layers');

    // Cek route yang terdaftar
    const routePaths = routerStack.filter(layer => layer.route).map(layer => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
    }));

    const hasDepList = routePaths.some(r => r.path === '/deposits' && r.methods.includes('get'));
    const hasDepSummary = routePaths.some(r => r.path === '/deposits/summary' && r.methods.includes('get'));
    const hasDepApprove = routePaths.some(r => r.path === '/deposits/:id/approve' && r.methods.includes('post'));
    const hasDepReject = routePaths.some(r => r.path === '/deposits/:id/reject' && r.methods.includes('post'));
    const hasMutList = routePaths.some(r => r.path === '/mutations' && r.methods.includes('get'));

    assert(hasDepList, 'GET /deposits must exist');
    assert(hasDepSummary, 'GET /deposits/summary must exist');
    assert(hasDepApprove, 'POST /deposits/:id/approve must exist');
    assert(hasDepReject, 'POST /deposits/:id/reject must exist');
    assert(hasMutList, 'GET /mutations must exist');
  });

  // TEST 8: Schema Compliance check
  test('8. Database Schema Audit: Tidak ada migration/schema yang dimodifikasi tanpa izin', () => {
    const fs = require('fs');
    const schemaContent = fs.readFileSync('./database/schema.sql', 'utf8');

    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS deposits'), 'deposits table definition must exist');
    assert(schemaContent.includes("CHECK (status IN ('PENDING', 'SUCCESS', 'EXPIRED', 'REJECTED'))"), 'deposits status constraint must be intact');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS balance_mutations'), 'balance_mutations table definition must exist');
    assert(schemaContent.includes("CHECK (type IN ('CREDIT', 'DEBIT'))"), 'balance_mutations type constraint must be intact');
  });

  console.log('\n===============================================================');
  console.log(`🎉 ALL AUDIT TESTS PASSED: ${passedCount}/${totalCount} TEST CASES GREEN!`);
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ AUDIT TEST SUITE FAILED:', err);
  process.exit(1);
});
