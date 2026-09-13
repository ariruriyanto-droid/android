const crypto = require('crypto');

/**
 * Supplier Service - Digiflazz Buyer API v1 Integration
 * 
 * Aturan Strict Sesuai Kesepakatan Step 6.12:
 * 1. ref_id = invoice_number asli (kekal, tanpa nomor baru).
 * 2. Signature transaksi & inquiry: md5(username + apiKey + ref_id).
 * 3. Timeout 15 detik menggunakan AbortController.
 * 4. Panggilan HTTP SELALU di luar transaksi database.
 * 5. Timeout/Network Error/HTTP 5xx/UNKNOWN -> STATUS TETAP PENDING, JANGAN REFUND.
 * 6. Hanya status resmi 'Gagal' -> FAILED -> REFUND.
 * 7. Pemisahan eksplisit: 'production' vs 'development' / 'test' (mock simulator terkontrol).
 * 8. Sanitasi supplier_response aman untuk audit: tanpa credential/secret, dibatasi panjang teksnya.
 */

const DIGIFLAZZ_BASE_URL = 'https://api.digiflazz.com/v1/transaction';
const HTTP_TIMEOUT_MS = 15000; // 15 detik

/**
 * Helper untuk menghitung MD5 signature Digiflazz
 */
function generateDigiflazzSign(username, apiKey, refId) {
  if (!username || !apiKey || !refId) {
    throw new Error('Username, apiKey, dan refId wajib disediakan untuk generate signature Digiflazz');
  }
  return crypto.createHash('md5').update(`${username}${apiKey}${refId}`).digest('hex');
}

/**
 * Sanitasi dan pemotongan response mentah supplier agar aman disimpan di DB
 */
function sanitizeSupplierResponse(rawResponse) {
  if (!rawResponse) return null;
  try {
    const sensitiveKeys = new Set(['apikey', 'api_key', 'sign', 'signature', 'secret', 'password', 'token']);
    
    function cleanObject(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(cleanObject);
      
      const cleaned = {};
      for (const [k, v] of Object.entries(obj)) {
        if (sensitiveKeys.has(k.toLowerCase())) {
          cleaned[k] = '[REDACTED]';
        } else if (typeof v === 'object') {
          cleaned[k] = cleanObject(v);
        } else {
          cleaned[k] = v;
        }
      }
      return cleaned;
    }

    const dataCopy = typeof rawResponse === 'object' ? JSON.parse(JSON.stringify(rawResponse)) : { raw: String(rawResponse) };
    const safeData = cleanObject(dataCopy);

    const str = JSON.stringify(safeData);
    // Batasi maksimum 1500 karakter untuk mencegah bloating
    return str.length > 1500 ? str.substring(0, 1500) + '...[TRUNCATED]' : str;
  } catch (e) {
    return String(rawResponse).substring(0, 500);
  }
}

/**
 * Normalisasi status resmi Digiflazz
 * Response Digiflazz: { data: { ref_id, buyer_sku_code, customer_no, status, rc, sn, message, ... } }
 * status: "Sukses" | "Pending" | "Gagal"
 */
function parseDigiflazzResult(responseData) {
  const data = responseData && responseData.data ? responseData.data : responseData;
  if (!data || typeof data !== 'object') {
    return {
      status: 'PENDING',
      isFinal: false,
      rc: 'UNKNOWN',
      message: 'Format respon supplier tidak dikenali',
      sn: null,
      raw: responseData,
    };
  }

  const supplierStatus = String(data.status || '').trim().toLowerCase();
  const rc = String(data.rc || '').trim();
  const sn = data.sn ? String(data.sn).trim() : null;
  const message = data.message ? String(data.message).trim() : '';

  if (supplierStatus === 'sukses' || rc === '00') {
    return {
      status: 'SUCCESS',
      isFinal: true,
      rc,
      message: message || 'Transaksi Sukses',
      sn,
      raw: data,
    };
  }

  if (supplierStatus === 'gagal') {
    return {
      status: 'FAILED',
      isFinal: true,
      rc,
      message: message || 'Transaksi Gagal Definitif dari Supplier',
      sn: null,
      raw: data,
    };
  }

  // Jika status 'Pending' atau RC '03' atau belum ada kepastian
  return {
    status: 'PENDING',
    isFinal: false,
    rc: rc || '03',
    message: message || 'Transaksi Sedang Diproses Supplier',
    sn: null,
    raw: data,
  };
}

/**
 * Kirim transaksi baru ke Digiflazz
 */
async function sendTransaction({ invoiceNumber, skuCode, customerNo, testing = false, mockResult = null }) {
  const mode = process.env.DIGIFLAZZ_MODE || 'development';
  const username = process.env.DIGIFLAZZ_USERNAME;
  const apiKey = process.env.DIGIFLAZZ_API_KEY;

  // Jika di mode test / development atau ada mock injection khusus testing
  if (mode === 'test' || mode === 'development' || mockResult) {
    if (mockResult) {
      if (mockResult instanceof Error || mockResult.code === 'ETIMEDOUT') {
        throw mockResult;
      }
      return {
        success: mockResult.status === 'SUCCESS',
        ...mockResult,
        sanitizedRaw: sanitizeSupplierResponse(mockResult.raw || mockResult),
      };
    }

    // Default simulator mode development jika kredensial kosong
    if (!username || !apiKey) {
      // Simulasikan sukses jika nomor berakhiran 00, gagal jika 99, timeout jika 88, selain itu sukses
      if (customerNo.endsWith('88')) {
        const timeoutErr = new Error('Simulated network timeout connecting to Digiflazz');
        timeoutErr.code = 'ETIMEDOUT';
        throw timeoutErr;
      }

      if (customerNo.endsWith('99')) {
        const failedData = {
          ref_id: invoiceNumber,
          buyer_sku_code: skuCode,
          customer_no: customerNo,
          status: 'Gagal',
          rc: '40',
          sn: '',
          message: 'Nomor tujuan tidak terdaftar / salah (Simulasi)',
        };
        return {
          ...parseDigiflazzResult(failedData),
          sanitizedRaw: sanitizeSupplierResponse(failedData),
        };
      }

      const successData = {
        ref_id: invoiceNumber,
        buyer_sku_code: skuCode,
        customer_no: customerNo,
        status: 'Sukses',
        rc: '00',
        sn: `SN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        message: 'Transaksi Berhasil (Simulasi Dev)',
      };
      return {
        ...parseDigiflazzResult(successData),
        sanitizedRaw: sanitizeSupplierResponse(successData),
      };
    }
  }

  // Production HTTP Request
  const sign = generateDigiflazzSign(username, apiKey, invoiceNumber);
  const payload = {
    username,
    buyer_sku_code: skuCode,
    customer_no: customerNo,
    ref_id: invoiceNumber,
    sign,
    testing: Boolean(testing),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const res = await fetch(DIGIFLAZZ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    let data = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      data = { message: `HTTP status ${res.status}` };
    }

    const parsed = parseDigiflazzResult(data);
    return {
      ...parsed,
      sanitizedRaw: sanitizeSupplierResponse(data),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Identifikasi timeout atau network drop
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      const err = new Error(`Koneksi ke supplier timeout / terputus: ${error.message}`);
      err.code = 'ETIMEDOUT';
      err.isNetworkTimeout = true;
      throw err;
    }

    throw error;
  }
}

/**
 * Cek status transaksi (Inquiry Prepaid) ke Digiflazz menggunakan ref_id (invoice asli)
 */
async function inquiryStatus({ invoiceNumber, skuCode, customerNo, mockResult = null }) {
  // Mekanisme inquiry resmi Digiflazz prepaid menggunakan endpoint transaksi yang sama persis
  // dengan ref_id yang sama dan sign yang sama. Digiflazz secara idempoten mengembalikan status terkini.
  return sendTransaction({
    invoiceNumber,
    skuCode,
    customerNo,
    mockResult,
  });
}

module.exports = {
  generateDigiflazzSign,
  sanitizeSupplierResponse,
  parseDigiflazzResult,
  sendTransaction,
  inquiryStatus,
  HTTP_TIMEOUT_MS,
};
