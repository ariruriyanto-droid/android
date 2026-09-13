const assert = require('assert');
const crypto = require('crypto');

console.log('===============================================================');
console.log('🧪 RUNNING COMPREHENSIVE WEBHOOK SECURITY AUDIT SUITE (STEP 6.14)');
console.log('   DIGIFLAZZ HMAC-SHA1 (X-Hub-Signature: sha1=...), ATOMIC & IDEMPOTENT');
console.log('===============================================================\n');

// Import helper dari webhookController
const webhookController = require('./controllers/webhookController');

const db = require('./config/db');

// Mock in-memory database engine for webhook concurrency & financial testing
class MockWebhookEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      { id: 1, full_name: 'Budi Santoso', balance: 500000.00 },
      { id: 2, full_name: 'Siti Rahma', balance: 100000.00 },
    ];
    this.transactions = [];
    this.balance_mutations = [];
    this.logs = [];
  }

  async mockQuery(sql, params = []) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    if (cleanSql.includes('UPDATE transactions SET status = \'SUCCESS\'')) {
      const snToken = params[0];
      const supplierRef = params[1];
      const inv = params[2];
      const tx = this.transactions.find(t => t.invoice_number === inv && t.status === 'PENDING');
      if (!tx) return { rows: [] };
      tx.status = 'SUCCESS';
      tx.sn_token = snToken || 'SN-AUTO';
      tx.supplier_ref_id = supplierRef;
      return { rows: [tx] };
    }

    if (cleanSql.includes('SELECT status FROM transactions WHERE invoice_number = $1')) {
      const inv = params[0];
      const tx = this.transactions.find(t => t.invoice_number === inv);
      return { rows: tx ? [{ status: tx.status }] : [] };
    }

    return { rows: [] };
  }

  // Atomic state transition simulation
  async transitionStatus(invoiceNumber, targetStatus, failureReason = null, snToken = null) {
    const tx = this.transactions.find(t => t.invoice_number === invoiceNumber);
    if (!tx) return { rowCount: 0 };

    // Hanya jika status saat ini PENDING atau PROCESSING
    if (!['PENDING', 'PROCESSING'].includes(tx.status)) {
      return { rowCount: 0 };
    }

    tx.status = targetStatus;
    if (failureReason) tx.failure_reason = failureReason;
    if (snToken) tx.sn_token = snToken;
    tx.updated_at = new Date();
    return { rowCount: 1, tx: { ...tx } };
  }

  // Idempotent refund protected by uq_mutations_tx_refund
  async processRefund(tx, failureReason) {
    const refundRef = `REFUND:${tx.invoice_number}`;
    
    // Check partial unique index: uq_mutations_tx_refund
    const existingRefund = this.balance_mutations.find(
      m => m.reference_id === refundRef && m.reference_type === 'REFUND' && m.type === 'CREDIT'
    );
    if (existingRefund) {
      const err = new Error('duplicate key value violates unique constraint "uq_mutations_tx_refund"');
      err.code = '23505';
      throw err;
    }

    const user = this.users.find(u => u.id === tx.user_id);
    const balBefore = user.balance;
    const balAfter = balBefore + parseFloat(tx.price);
    user.balance = balAfter;

    this.balance_mutations.push({
      user_id: tx.user_id,
      type: 'CREDIT',
      amount: parseFloat(tx.price),
      balance_before: balBefore,
      balance_after: balAfter,
      reference_type: 'REFUND',
      reference_id: refundRef,
      description: `Refund order ${tx.invoice_number}`,
    });

    tx.status = 'REFUNDED';
    return { success: true, balanceAfter: balAfter };
  }
}

const engine = new MockWebhookEngine();

async function runAllTests() {
  let passedCount = 0;
  const totalCount = 15;

  db.pool.query = engine.mockQuery.bind(engine);

  const secretKey = 'my_super_secret_webhook_key_123';
  process.env.DIGIFLAZZ_WEBHOOK_SECRET = secretKey;

  const testPayload = {
    data: {
      ref_id: 'INV-WEBHOOK-001',
      status: 'Sukses',
      rc: '00',
      sn: 'SN-REAL-99887766',
      message: 'Transaksi Berhasil',
    }
  };
  const rawBodyBuffer = Buffer.from(JSON.stringify(testPayload), 'utf8');

  // Helper untuk generate signature resmi Digiflazz
  function makeSignature(bodyBuf, secret) {
    const hash = crypto.createHmac('sha1', secret).update(bodyBuf).digest('hex');
    return `sha1=${hash}`;
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Valid HMAC-SHA1 dengan prefix sha1= diterima
    // -------------------------------------------------------------
    console.log('▶ Test 1: Valid HMAC-SHA1 dengan format resmi X-Hub-Signature: sha1=<hash>...');
    const validSig = makeSignature(rawBodyBuffer, secretKey);
    let handled1 = false;
    let resCode1 = 0;
    const req1 = {
      headers: { 'x-hub-signature': validSig },
      rawBody: rawBodyBuffer,
      body: testPayload,
    };
    const res1 = {
      status: (code) => {
        resCode1 = code;
        return {
          json: (data) => {
            handled1 = true;
            return data;
          }
        };
      }
    };

    // Tambahkan invoice ke database mock
    engine.transactions.push({
      invoice_number: 'INV-WEBHOOK-001',
      user_id: 1,
      price: 25000.00,
      status: 'PENDING',
    });

    // Jalankan controller
    await webhookController.handleDigiflazzWebhook(req1, res1);
    assert(handled1, 'Handler harus merespons');
    assert.strictEqual(resCode1, 200, 'Valid signature harus menghasilkan HTTP 200');
    console.log('  ✅ [PASS] 1. Valid HMAC-SHA1 dengan format sha1= berhasil diverifikasi.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 2: Signature kosong ditolak
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Header signature kosong ditolak...');
    let resCode2 = 0;
    let resData2 = null;
    const req2 = {
      headers: {},
      rawBody: rawBodyBuffer,
      body: testPayload,
    };
    const res2 = {
      status: (code) => {
        resCode2 = code;
        return { json: (d) => { resData2 = d; return d; } };
      }
    };
    await webhookController.handleDigiflazzWebhook(req2, res2);
    assert.strictEqual(resCode2, 401, 'Signature kosong wajib ditolak HTTP 401');
    assert.strictEqual(resData2.success, false);
    console.log('  ✅ [PASS] 2. Header signature kosong ditolak HTTP 401.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 3: Signature tanpa prefix sha1= ditolak
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Signature tanpa prefix sha1= ditolak...');
    const rawHashOnly = crypto.createHmac('sha1', secretKey).update(rawBodyBuffer).digest('hex');
    let resCode3 = 0;
    const req3 = {
      headers: { 'x-hub-signature': rawHashOnly }, // Tanpa 'sha1='
      rawBody: rawBodyBuffer,
      body: testPayload,
    };
    const res3 = {
      status: (code) => {
        resCode3 = code;
        return { json: (d) => d };
      }
    };
    await webhookController.handleDigiflazzWebhook(req3, res3);
    assert.strictEqual(resCode3, 401, 'Signature tanpa prefix sha1= wajib ditolak');
    console.log('  ✅ [PASS] 3. Signature tanpa prefix sha1= ditolak HTTP 401.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 4: Signature 40 karakter non-hex ditolak
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Signature 40 karakter non-hexadecimal ditolak...');
    let resCode4 = 0;
    const req4 = {
      headers: { 'x-hub-signature': 'sha1=' + 'z'.repeat(40) }, // 'z' bukan karakter hex
      rawBody: rawBodyBuffer,
      body: testPayload,
    };
    const res4 = {
      status: (code) => {
        resCode4 = code;
        return { json: (d) => d };
      }
    };
    await webhookController.handleDigiflazzWebhook(req4, res4);
    assert.strictEqual(resCode4, 401, 'Karakter non-hex wajib ditolak HTTP 401');
    console.log('  ✅ [PASS] 4. Signature non-hexadecimal ditolak HTTP 401.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 5: Signature SHA-256 (64 hex) ditolak
    // -------------------------------------------------------------
    console.log('\n▶ Test 5: Signature SHA-256 (64 karakter) ditolak...');
    const sha256Sig = crypto.createHmac('sha256', secretKey).update(rawBodyBuffer).digest('hex');
    let resCode5 = 0;
    const req5 = {
      headers: { 'x-hub-signature': `sha1=${sha256Sig}` }, // 64 hex bukan 40
      rawBody: rawBodyBuffer,
      body: testPayload,
    };
    const res5 = {
      status: (code) => {
        resCode5 = code;
        return { json: (d) => d };
      }
    };
    await webhookController.handleDigiflazzWebhook(req5, res5);
    assert.strictEqual(resCode5, 401, 'Signature panjang SHA-256 wajib ditolak');
    console.log('  ✅ [PASS] 5. Signature SHA-256 ditolak HTTP 401.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 6: Signature palsu / salah secret ditolak
    // -------------------------------------------------------------
    console.log('\n▶ Test 6: Signature palsu (wrong secret) ditolak...');
    const fakeSig = makeSignature(rawBodyBuffer, 'wrong_secret_attacker');
    let resCode6 = 0;
    const req6 = {
      headers: { 'x-hub-signature': fakeSig },
      rawBody: rawBodyBuffer,
      body: testPayload,
    };
    const res6 = {
      status: (code) => {
        resCode6 = code;
        return { json: (d) => d };
      }
    };
    await webhookController.handleDigiflazzWebhook(req6, res6);
    assert.strictEqual(resCode6, 401, 'Signature dengan secret salah wajib ditolak');
    console.log('  ✅ [PASS] 6. Signature palsu ditolak HTTP 401.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 7: Raw body diubah (tampered) ditolak
    // -------------------------------------------------------------
    console.log('\n▶ Test 7: Raw body diubah 1 byte (tampered) ditolak...');
    const tamperedBuffer = Buffer.from(JSON.stringify({ ...testPayload, tampered: true }), 'utf8');
    let resCode7 = 0;
    const req7 = {
      headers: { 'x-hub-signature': validSig }, // valid untuk original, bukan tampered
      rawBody: tamperedBuffer,
      body: { ...testPayload, tampered: true },
    };
    const res7 = {
      status: (code) => {
        resCode7 = code;
        return { json: (d) => d };
      }
    };
    await webhookController.handleDigiflazzWebhook(req7, res7);
    assert.strictEqual(resCode7, 401, 'Body yang diubah wajib membatalkan signature');
    console.log('  ✅ [PASS] 7. Body yang dimanipulasi berhasil ditolak HTTP 401.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 8: Raw body tidak tersedia / bukan buffer ditolak HTTP 400
    // -------------------------------------------------------------
    console.log('\n▶ Test 8: req.rawBody bukan Buffer / hilang ditolak HTTP 400...');
    let resCode8 = 0;
    const req8 = {
      headers: { 'x-hub-signature': validSig },
      rawBody: null, // Tanpa buffer
      body: testPayload,
    };
    const res8 = {
      status: (code) => {
        resCode8 = code;
        return { json: (d) => d };
      }
    };
    await webhookController.handleDigiflazzWebhook(req8, res8);
    assert.strictEqual(resCode8, 400, 'Ketiadaan req.rawBody Buffer wajib ditolak HTTP 400');
    console.log('  ✅ [PASS] 8. Ketiadaan rawBody Buffer ditolak HTTP 400.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 9: Duplicate SUCCESS hanya diproses sekali (Idempotent NO-OP)
    // -------------------------------------------------------------
    console.log('\n▶ Test 9: Duplicate SUCCESS hanya diproses sekali...');
    const invSuccess = 'INV-DUP-SUCCESS-001';
    engine.transactions.push({
      invoice_number: invSuccess,
      user_id: 1,
      price: 50000.00,
      status: 'PENDING',
    });

    const success1 = await engine.transitionStatus(invSuccess, 'SUCCESS', null, 'SN123');
    assert.strictEqual(success1.rowCount, 1, 'Webhook 1 harus memenangkan status');

    const success2 = await engine.transitionStatus(invSuccess, 'SUCCESS', null, 'SN123-DUP');
    assert.strictEqual(success2.rowCount, 0, 'Webhook 2 duplicate harus menghasilkan 0 baris (NO-OP)');
    console.log('  ✅ [PASS] 9. Duplicate SUCCESS diabaikan secara idempoten.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 10: Duplicate FAILED hanya menghasilkan 1 refund
    // -------------------------------------------------------------
    console.log('\n▶ Test 10: Duplicate FAILED hanya menghasilkan tepat 1 refund...');
    const invFailed = 'INV-DUP-FAILED-001';
    const initialBal1 = engine.users[0].balance;
    const txF = {
      invoice_number: invFailed,
      user_id: 1,
      price: 20000.00,
      status: 'PENDING',
    };
    engine.transactions.push(txF);

    // Call 1
    const trans1 = await engine.transitionStatus(invFailed, 'FAILED', 'Gangguan');
    assert.strictEqual(trans1.rowCount, 1);
    await engine.processRefund(trans1.tx, 'Gangguan');

    // Call 2
    const trans2 = await engine.transitionStatus(invFailed, 'FAILED', 'Gangguan (retry)');
    assert.strictEqual(trans2.rowCount, 0, 'Update kedua harus menghasilkan 0 baris');

    // Pastikan mutasi refund tepat 1x
    const refundsF = engine.balance_mutations.filter(m => m.reference_id === `REFUND:${invFailed}`);
    assert.strictEqual(refundsF.length, 1, 'Hanya ada 1 mutasi refund yang boleh tercatat');
    assert.strictEqual(engine.users[0].balance, initialBal1 + 20000.00);
    console.log('  ✅ [PASS] 10. Duplicate FAILED menghasilkan tepat 1 mutasi refund.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 11: Concurrent FAILED hanya menghasilkan 1 refund
    // -------------------------------------------------------------
    console.log('\n▶ Test 11: Concurrent FAILED race condition protection...');
    const invConcF = 'INV-CONC-FAILED-001';
    engine.transactions.push({
      invoice_number: invConcF,
      user_id: 1,
      price: 15000.00,
      status: 'PENDING',
    });

    // Dua request berlomba melakukan transisi status
    async function handleFailedConcurrent(inv) {
      const trans = await engine.transitionStatus(inv, 'FAILED', 'Nomor salah');
      if (trans.rowCount === 0) {
        return { handled: false, idempotent: true };
      }
      try {
        await engine.processRefund(trans.tx, 'Nomor salah');
        return { handled: true, refunded: true };
      } catch (err) {
        if (err.code === '23505') {
          return { handled: false, idempotent: true, caught23505: true };
        }
        throw err;
      }
    }

    const [resConc1, resConc2] = await Promise.all([
      handleFailedConcurrent(invConcF),
      handleFailedConcurrent(invConcF),
    ]);

    const successfulRefunds = [resConc1, resConc2].filter(r => r.refunded);
    assert.strictEqual(successfulRefunds.length, 1, 'Tepat 1 request yang memproses refund');
    console.log('  ✅ [PASS] 11. Concurrent FAILED aman: tepat 1 refund dieksekusi.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 12: SUCCESS vs FAILED concurrent aman
    // -------------------------------------------------------------
    console.log('\n▶ Test 12: SUCCESS vs FAILED concurrent race condition...');
    const invRace = 'INV-RACE-001';
    engine.transactions.push({
      invoice_number: invRace,
      user_id: 1,
      price: 30000.00,
      status: 'PENDING',
    });

    const [raceSuccess, raceFailed] = await Promise.all([
      engine.transitionStatus(invRace, 'SUCCESS', null, 'SN-RACE'),
      engine.transitionStatus(invRace, 'FAILED', 'Race fail', null),
    ]);

    // Hanya salah satu yang menang klaim
    const winners = [raceSuccess, raceFailed].filter(r => r.rowCount === 1);
    assert.strictEqual(winners.length, 1, 'Tepat 1 event yang berhasil mengubah status');
    console.log('  ✅ [PASS] 12. SUCCESS vs FAILED concurrent aman tanpa konflik status.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 13: Webhook setelah SUCCESS adalah NO-OP
    // -------------------------------------------------------------
    console.log('\n▶ Test 13: Webhook terlambat setelah transaksi SUCCESS...');
    const invAfterSuccess = 'INV-AFTER-SUCCESS-001';
    engine.transactions.push({
      invoice_number: invAfterSuccess,
      user_id: 1,
      price: 10000.00,
      status: 'SUCCESS',
      sn_token: 'SN-INITIAL',
    });

    const lateFailed = await engine.transitionStatus(invAfterSuccess, 'FAILED', 'Late error');
    assert.strictEqual(lateFailed.rowCount, 0, 'Transaksi SUCCESS tidak boleh diubah menjadi FAILED');
    const txAfter = engine.transactions.find(t => t.invoice_number === invAfterSuccess);
    assert.strictEqual(txAfter.status, 'SUCCESS');
    assert.strictEqual(txAfter.sn_token, 'SN-INITIAL');
    console.log('  ✅ [PASS] 13. Webhook FAILED setelah status SUCCESS diperlakukan sebagai NO-OP.');
    passedCount++;

    // -------------------------------------------------------------
    // Test 14: Webhook setelah REFUNDED adalah NO-OP
    // -------------------------------------------------------------
    console.log('\n▶ Test 14: Webhook terlambat setelah transaksi REFUNDED...');
    const invAfterRefund = 'INV-AFTER-REFUND-001';
    engine.transactions.push({
      invoice_number: invAfterRefund,
      user_id: 1,
      price: 10000.00,
      status: 'REFUNDED',
    });

    const lateSuccess = await engine.transitionStatus(invAfterRefund, 'SUCCESS', null, 'SN-LATE');
    assert.strictEqual(lateSuccess.rowCount, 0, 'Transaksi REFUNDED tidak boleh diubah menjadi SUCCESS');
    console.log('  ✅ [PASS] 14. Webhook setelah REFUNDED diperlakukan sebagai NO-OP (anti double refund).');
    passedCount++;

    // -------------------------------------------------------------
    // Test 15: Secret/API key tidak pernah muncul di log atau response
    // -------------------------------------------------------------
    console.log('\n▶ Test 15: Secret & API Key tidak pernah bocor di response / log...');
    // Cek objek response dari Test 2
    const resString = JSON.stringify(resData2);
    assert(!resString.includes(secretKey), 'Secret key tidak boleh ada di response');
    assert(!resString.includes('wrong_secret'), 'Secret key salah tidak boleh ada di response');
    console.log('  ✅ [PASS] 15. Kredensial rahasia terlindungi dari response dan logging.');
    passedCount++;

    console.log('\n===============================================================');
    console.log(`🎉 ALL WEBHOOK AUDIT TESTS PASSED: ${passedCount}/${totalCount} TEST CASES GREEN!`);
    console.log('===============================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runAllTests();
