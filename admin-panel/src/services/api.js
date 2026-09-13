// Layanan komunikasi HTTP ke Backend AriPay (/api/admin)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'aripay_admin_token';
const USER_KEY = 'aripay_admin_user';

/**
 * 1. Login Admin
 * Endpoint resmi: POST /api/admin/login
 * Body: { username_or_email, password }
 */
export async function loginAdmin(username_or_email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username_or_email: username_or_email.trim(),
        password,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Login gagal. Periksa kredensial admin Anda.');
    }

    // Simpan token & profil admin ke localStorage
    if (result.data?.token) {
      localStorage.setItem(TOKEN_KEY, result.data.token);
    }
    if (result.data?.admin) {
      localStorage.setItem(USER_KEY, JSON.stringify(result.data.admin));
    }

    return result;
  } catch (error) {
    // Tangani error koneksi jaringan jika backend offline
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Gagal terhubung ke server backend AriPay. Pastikan backend sedang berjalan.');
    }
    throw error;
  }
}

/**
 * 2. Ambil token admin yang tersimpan
 */
export function getStoredAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 3. Ambil data profil admin yang tersimpan
 */
export function getStoredAdminUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 4. Logout Admin (Hapus Token & Sesi)
 */
export function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * 5. Ambil Metrik Statistik Dashboard (GET /api/admin/dashboard-stats)
 */
export async function fetchDashboardStats() {
  const token = getStoredAdminToken();
  const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal memuat data statistik dashboard.');
  }
  return result.data;
}

/**
 * 6. Ambil Daftar Transaksi Terbaru (GET /api/admin/transactions)
 */
export async function fetchTransactions(params = {}) {
  const token = getStoredAdminToken();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/admin/transactions?${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal memuat data transaksi.');
  }
  return result.data;
}

/**
 * 7. Ambil Daftar Permintaan Penarikan (GET /api/admin/withdrawals)
 */
export async function fetchWithdrawals(params = {}) {
  const token = getStoredAdminToken();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/admin/withdrawals?${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal memuat data penarikan saldo.');
  }
  return result;
}

/**
 * 8. Ambil Ringkasan Saldo & Penarikan (GET /api/admin/withdrawals/summary)
 */
export async function fetchWithdrawalSummary() {
  const token = getStoredAdminToken();
  const response = await fetch(`${API_BASE_URL}/admin/withdrawals/summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal memuat ringkasan saldo.');
  }
  return result.data;
}

/**
 * 9. Setujui Penarikan Saldo (POST /api/admin/withdrawals/:id/approve)
 */
export async function approveWithdrawal(id) {
  const token = getStoredAdminToken();
  const response = await fetch(`${API_BASE_URL}/admin/withdrawals/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal menyetujui permohonan penarikan.');
  }
  return result;
}

/**
 * 10. Tolak Penarikan Saldo (POST /api/admin/withdrawals/:id/reject)
 */
export async function rejectWithdrawal(id, reason) {
  const token = getStoredAdminToken();
  const response = await fetch(`${API_BASE_URL}/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal menolak permohonan penarikan.');
  }
  return result;
}

/**
 * 11. Ambil Laporan & Rekapitulasi Keuangan (GET /api/admin/reports)
 */
export async function fetchFinancialReports(params = {}) {
  const token = getStoredAdminToken();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/admin/reports?${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal memuat data laporan keuangan.');
  }
  return result;
}

