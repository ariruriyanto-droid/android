const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Set environment variable sebelum modul lain dimuat
process.env.DIGIFLAZZ_WEBHOOK_SECRET = 'super_secure_webhook_secret_for_test_2026';
process.env.PAYMENT_GATEWAY_SECRET = 'super_secure_payment_secret_for_test_2026';
process.env.JWT_SECRET = 'aripay_super_secret_jwt_key_2026';

const { pool } = require('./backend/config/db');

// Mock pool.query untuk pengujian hermetis/unit test
pool.query = async (text, params) => {
  if (text.includes('UPDATE transactions') && text.includes("SET status = 'SUCCESS'")) {
    return {
      rows: [
        {
          invoice_number: params[2] || 'INV-SEC-001',
          status: 'SUCCESS',
          sn_token: params[0] || 'SN-TEST-VALID-01',
        },
      ],
    };
  }
  if (text.includes('UPDATE transactions') && text.includes("SET status = 'FAILED'")) {
    return {
      rows: [
        {
          invoice_number: params[2] || 'INV-SEC-002',
          status: 'FAILED',
          user_id: 1,
          price: 15000,
        },
      ],
    };
  }
  return { rows: [] };
};

const { verifySignature, handleDigiflazzWebhook, simulateWebhook } = require('./backend/controllers/webhookController');
const { verifyToken, requireRole } = require('./backend/middlewares/authMiddleware');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function runSecurityTestSuite() {
  console.log('================================================================');
  console.log('🧪 SUITE PENGUJIAN KEAMANAN WEBHOOK & SIMULASI ADMIN (LANGKAH 6.11)');
  console.log('================================================================\n');

  const secretKey = process.env.DIGIFLAZZ_WEBHOOK_SECRET;
  let allPass = true;

  // TEST 1: Signature Valid
  {
    const rawPayload = JSON.stringify({
      data: {
        ref_id: 'INV-SEC-001',
        status: 'Sukses',
        sn: 'SN-TEST-VALID-01',
        buyer_sku_code: 'DIGI-01',
      },
    });
    const validSignature = crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex');

    const req = {
      headers: {
        'x-digiflazz-signature': validSignature,
      },
      rawBody: Buffer.from(rawPayload, 'utf8'),
      body: JSON.parse(rawPayload),
    };
    const res = createMockRes();

    await handleDigiflazzWebhook(req, res);

    const pass = res.statusCode === 200 && res.body?.success === true;
    console.log(`[TEST 1] Signature Valid: ${pass ? '✅ PASS' : '❌ FAIL'} (Status: ${res.statusCode}, Success: ${res.body?.success})`);
    if (!pass) allPass = false;
  }

  // TEST 2: Signature Tidak Ada (Missing Signature)
  {
    const rawPayload = JSON.stringify({
      data: {
        ref_id: 'INV-SEC-002',
        status: 'Gagal',
      },
    });

    const req = {
      headers: {}, // Tidak ada header x-digiflazz-signature
      rawBody: Buffer.from(rawPayload, 'utf8'),
      body: JSON.parse(rawPayload),
    };
    const res = createMockRes();

    await handleDigiflazzWebhook(req, res);

    const pass = res.statusCode === 401 && res.body?.success === false;
    console.log(`[TEST 2] Signature Tidak Ada: ${pass ? '✅ PASS' : '❌ FAIL'} (Expected 401, Got: ${res.statusCode}, Msg: "${res.body?.message}")`);
    if (!pass) allPass = false;
  }

  // TEST 3: Signature Salah (Invalid Signature)
  {
    const rawPayload = JSON.stringify({
      data: {
        ref_id: 'INV-SEC-003',
        status: 'Sukses',
      },
    });
    const wrongSignature = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef';

    const req = {
      headers: {
        'x-digiflazz-signature': wrongSignature,
      },
      rawBody: Buffer.from(rawPayload, 'utf8'),
      body: JSON.parse(rawPayload),
    };
    const res = createMockRes();

    await handleDigiflazzWebhook(req, res);

    const pass = res.statusCode === 401 && res.body?.success === false;
    console.log(`[TEST 3] Signature Salah: ${pass ? '✅ PASS' : '❌ FAIL'} (Expected 401, Got: ${res.statusCode}, Msg: "${res.body?.message}")`);
    if (!pass) allPass = false;
  }

  // TEST 4: Raw Body Berubah (Payload Tampered)
  {
    const originalPayload = JSON.stringify({
      data: {
        ref_id: 'INV-SEC-004',
        status: 'Gagal',
      },
    });
    // Signature dibuat dari payload asli
    const signatureForOriginal = crypto.createHmac('sha256', secretKey).update(originalPayload).digest('hex');

    // Namun attacker mengubah isi body (misalnya mengubah status menjadi Sukses)
    const tamperedPayload = JSON.stringify({
      data: {
        ref_id: 'INV-SEC-004',
        status: 'Sukses',
      },
    });

    const req = {
      headers: {
        'x-digiflazz-signature': signatureForOriginal,
      },
      rawBody: Buffer.from(tamperedPayload, 'utf8'),
      body: JSON.parse(tamperedPayload),
    };
    const res = createMockRes();

    await handleDigiflazzWebhook(req, res);

    const pass = res.statusCode === 401 && res.body?.success === false;
    console.log(`[TEST 4] Raw Body Berubah: ${pass ? '✅ PASS' : '❌ FAIL'} (Expected 401, Got: ${res.statusCode}, Msg: "${res.body?.message}")`);
    if (!pass) allPass = false;
  }

  // TEST 5: Akses Rute Simulasi Tanpa JWT Admin
  {
    const req = {
      headers: {}, // Tanpa Authorization header
      body: {
        type: 'PPOB',
        invoice_number: 'INV-SEC-005',
        status: 'SUCCESS',
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    verifyToken(req, res, () => { nextCalled = true; });

    const pass = res.statusCode === 401 && !nextCalled;
    console.log(`[TEST 5] Akses Rute Simulasi Tanpa JWT: ${pass ? '✅ PASS' : '❌ FAIL'} (Expected 401, Got: ${res.statusCode}, Msg: "${res.body?.message}")`);
    if (!pass) allPass = false;
  }

  // TEST 6: Akses Rute Simulasi Oleh Non-Admin (User Biasa)
  {
    const nonAdminToken = jwt.sign(
      { id: 999, phone_number: '081299998888', role: 'MEMBER' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = {
      headers: {
        authorization: `Bearer ${nonAdminToken}`,
      },
      body: {
        type: 'PPOB',
        invoice_number: 'INV-SEC-006',
        status: 'FAILED',
      },
    };
    const resAuth = createMockRes();
    let authPassed = false;

    // Step 1: verifyToken
    verifyToken(req, resAuth, () => { authPassed = true; });

    // Step 2: requireRole('ADMIN')
    const resRole = createMockRes();
    let rolePassed = false;
    if (authPassed) {
      requireRole('ADMIN')(req, resRole, () => { rolePassed = true; });
    }

    const pass = authPassed && resRole.statusCode === 403 && !rolePassed;
    console.log(`[TEST 6] Akses Rute Simulasi Oleh Non-Admin: ${pass ? '✅ PASS' : '❌ FAIL'} (Expected 403, Got: ${resRole.statusCode}, Msg: "${resRole.body?.message}")`);
    if (!pass) allPass = false;
  }

  // TEST 7: Akses Rute Simulasi Oleh Admin yang Valid
  {
    const adminToken = jwt.sign(
      { id: 1, phone_number: '081234567890', role: 'ADMIN' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      body: {
        type: 'PPOB',
        invoice_number: 'INV-SEC-007',
        status: 'SUCCESS',
        sn_token: 'SN-ADMIN-SIM-007',
      },
    };
    const resAuth = createMockRes();
    let authPassed = false;
    verifyToken(req, resAuth, () => { authPassed = true; });

    const resRole = createMockRes();
    let rolePassed = false;
    if (authPassed) {
      requireRole('ADMIN')(req, resRole, () => { rolePassed = true; });
    }

    const resHandler = createMockRes();
    if (rolePassed) {
      await simulateWebhook(req, resHandler);
    }

    const pass = authPassed && rolePassed && resHandler.statusCode === 200 && resHandler.body?.success === true;
    console.log(`[TEST 7] Akses Rute Simulasi Admin Valid: ${pass ? '✅ PASS' : '❌ FAIL'} (Status: ${resHandler.statusCode}, Success: ${resHandler.body?.success})`);
    if (!pass) allPass = false;
  }

  // TEST 8: Uji Timing-Safe Equal Functionality
  {
    const payload = 'TEST_TIMING_SAFE_PAYLOAD';
    const sig = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    const isExactMatch = verifySignature(payload, sig, secretKey);
    const isWrongSig = verifySignature(payload, 'wrong_hex_signature', secretKey);
    const isWrongLength = verifySignature(payload, 'abc', secretKey);
    const pass = isExactMatch && !isWrongSig && !isWrongLength;
    console.log(`[TEST 8] Timing-Safe Equal Protection: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) allPass = false;
  }

  console.log('\n================================================================');
  if (allPass) {
    console.log('🎉 SELURUH TEST KEAMANAN WEBHOOK BERHASIL (ALL 7 TESTS PASS)');
  } else {
    console.log('❌ TERDAPAT TEST YANG GAGAL. SILAKAN PERIKSA DETAIL LOG.');
  }
  console.log('================================================================');
}

runSecurityTestSuite().catch((err) => {
  console.error('Fatal Error in Test:', err);
  process.exit(1);
});
