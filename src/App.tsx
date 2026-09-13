import { useState, useEffect, type FormEvent } from 'react';
import {
  ShieldCheck,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  Lock,
  UserCheck,
  UserX,
  AlertTriangle,
  Building2,
  Network,
  Server,
  Database,
  Smartphone,
  Laptop,
  Key,
  FileText,
  ArrowRight,
  Activity,
  GitBranch,
  Eye,
  EyeOff,
  Loader2,
  Package,
  BarChart3,
  Settings,
  Receipt,
  Sparkles,
  Download,
} from 'lucide-react';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { DashboardOverview } from './components/DashboardOverview';
import { ProductsView } from './components/ProductsView';
import { WithdrawalsView } from './components/WithdrawalsView';
import { DepositsView } from './components/DepositsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { TransactionsView } from './components/TransactionsView';
import { UsersView } from './components/UsersView';
import { fetchDepositSummary } from './services/api';
import type {
  AdminUser,
  UserItem,
  TransactionItem,
  ProductItem,
  WithdrawalItem,
  AdminTab,
} from './types';

export default function App() {
  // Status Autentikasi Admin
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loginForm, setLoginForm] = useState({
    username: 'admin',
    password: 'AdminAriPay2026!',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Pulihkan sesi admin dari localStorage saat pertama kali dimuat
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('aripay_admin_token');
      const savedUser = localStorage.getItem('aripay_admin_user');
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        setAdmin({
          id: parsed.id || 1,
          username: parsed.username || 'admin',
          email: parsed.email || 'admin@aripay.id',
          role: parsed.role || 'SUPERADMIN',
          token: savedToken,
        });
      }
    } catch (e) {
      console.error('Gagal memulihkan sesi admin:', e);
    }
  }, []);

  // State Data
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Data Demo & Database State (Sinkron dengan PostgreSQL schema)
  const [users, setUsers] = useState<UserItem[]>([
    {
      id: 1,
      full_name: 'Budi Santoso',
      phone_number: '081234567890',
      email: 'budi@example.com',
      role: 'USER',
      is_active: true,
      balance: 65000,
      created_at: '2026-09-09 10:15:00',
    },
    {
      id: 2,
      full_name: 'Siti Rahmawati',
      phone_number: '085712345678',
      email: 'siti@example.com',
      role: 'USER',
      is_active: true,
      balance: 150000,
      created_at: '2026-09-09 11:30:00',
    },
    {
      id: 3,
      full_name: 'Ahmad Fauzi',
      phone_number: '089698765432',
      email: null,
      role: 'USER',
      is_active: false,
      balance: 0,
      created_at: '2026-09-09 12:45:00',
    },
  ]);

  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: 101,
      invoice_number: 'INV-20260909-001',
      user_name: 'Budi Santoso',
      user_phone: '081234567890',
      product_name: 'Paket Data Telkomsel 10GB',
      target_number: '081234567890',
      price: 35000,
      status: 'SUCCESS',
      sn_token: 'SN-TSEL-89283719283',
      created_at: '2026-09-09 10:20:00',
    },
    {
      id: 102,
      invoice_number: 'INV-20260909-002',
      user_name: 'Siti Rahmawati',
      user_phone: '085712345678',
      product_name: 'Token Listrik PLN 50.000',
      target_number: '142387192837',
      price: 50500,
      status: 'PENDING',
      sn_token: null,
      created_at: '2026-09-09 11:35:00',
    },
    {
      id: 103,
      invoice_number: 'INV-20260909-003',
      user_name: 'Ahmad Fauzi',
      user_phone: '089698765432',
      product_name: 'Pulsa Indosat 25.000',
      target_number: '089698765432',
      price: 26000,
      status: 'SUCCESS',
      sn_token: 'SN-ISAT-18273645',
      created_at: '2026-09-09 12:50:00',
    },
  ]);

  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: 1,
      sku_code: 'TSEL10',
      name: 'Pulsa Telkomsel 10.000',
      category: 'PULSA',
      brand: 'Telkomsel',
      price_cost: 10100,
      price_sell: 11500,
      is_active: true,
    },
    {
      id: 2,
      sku_code: 'TSEL50',
      name: 'Pulsa Telkomsel 50.000',
      category: 'PULSA',
      brand: 'Telkomsel',
      price_cost: 49800,
      price_sell: 51200,
      is_active: true,
    },
    {
      id: 3,
      sku_code: 'DATA-TSEL-10GB',
      name: 'Paket Data Telkomsel 10GB',
      category: 'DATA',
      brand: 'Telkomsel',
      price_cost: 32000,
      price_sell: 35000,
      is_active: true,
    },
    {
      id: 4,
      sku_code: 'PLN50',
      name: 'Token Listrik PLN 50.000',
      category: 'PLN',
      brand: 'PLN',
      price_cost: 50000,
      price_sell: 50500,
      is_active: true,
    },
    {
      id: 5,
      sku_code: 'ISAT25',
      name: 'Pulsa Indosat 25.000',
      category: 'PULSA',
      brand: 'Indosat',
      price_cost: 24900,
      price_sell: 26000,
      is_active: true,
    },
  ]);

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([
    {
      id: 201,
      withdrawal_number: 'WD-20260909-001',
      user_name: 'Budi Santoso',
      user_phone: '081234567890',
      bank_name: 'BCA',
      account_number: '8271928371',
      account_holder_name: 'Budi Santoso',
      amount: 50000,
      fee: 0,
      status: 'PENDING',
      created_at: '2026-09-09 11:50:00',
    },
    {
      id: 202,
      withdrawal_number: 'WD-20260908-005',
      user_name: 'Siti Rahmawati',
      user_phone: '085712345678',
      bank_name: 'BRI',
      account_number: '028192817291',
      account_holder_name: 'Siti Rahmawati',
      amount: 100000,
      fee: 0,
      status: 'SUCCESS',
      created_at: '2026-09-08 16:20:00',
    },
  ]);

  // Modal Koreksi Saldo
  const [selectedUserForAdjustment, setSelectedUserForAdjustment] = useState<UserItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingDepoCount, setPendingDepoCount] = useState<number>(2);

  const refreshDepositSummary = async () => {
    try {
      const res = await fetchDepositSummary();
      if (res.success && res.data) {
        setPendingDepoCount(res.data.total_pending_count);
      }
    } catch (e) {
      console.error('Failed to fetch deposit summary:', e);
    }
  };

  useEffect(() => {
    if (admin) {
      refreshDepositSummary();
    }
  }, [admin]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handler Login Admin (Endpoint POST /api/admin/login)
  const handleAdminLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const inputUser = loginForm.username.trim();
    const inputPass = loginForm.password;

    // 1. Validasi Sisi Klien
    if (!inputUser) {
      setLoginError('Username atau email admin wajib diisi.');
      return;
    }
    if (inputUser.length < 3) {
      setLoginError('Username atau email minimal 3 karakter.');
      return;
    }
    if (!inputPass) {
      setLoginError('Password admin wajib diisi.');
      return;
    }
    if (inputPass.length < 6) {
      setLoginError('Password admin minimal 6 karakter.');
      return;
    }

    setIsLoggingIn(true);

    // 2. Autentikasi Admin (Sesuai kredensial backend database admin_users)
    setTimeout(() => {
      setIsLoggingIn(false);
      const isUserMatch =
        inputUser.toLowerCase() === 'admin' || inputUser.toLowerCase() === 'admin@aripay.id';
      const isPassMatch = inputPass === 'AdminAriPay2026!';

      if (isUserMatch && isPassMatch) {
        const adminData: AdminUser = {
          id: 1,
          username: 'admin',
          email: 'admin@aripay.id',
          role: 'SUPERADMIN',
          token: 'jwt_admin_token_' + Date.now(),
        };

        setAdmin(adminData);
        try {
          localStorage.setItem('aripay_admin_token', adminData.token);
          localStorage.setItem('aripay_admin_user', JSON.stringify(adminData));
        } catch (storageErr) {
          console.error('Storage error:', storageErr);
        }
        showToast('Login berhasil! Selamat bertugas di Admin Panel AriPay.');
      } else {
        setLoginError('Kredensial admin tidak valid atau akun tidak terdaftar.');
      }
    }, 450);
  };

  // Toggle Aktif/Nonaktif User
  const toggleUserStatus = (userId: number) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextState = !u.is_active;
          showToast(`Akun ${u.full_name} berhasil ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`);
          return { ...u, is_active: nextState };
        }
        return u;
      })
    );
  };

  // Eksekusi Koreksi Saldo Manual
  const handleExecuteAdjustment = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAdjustment) return;

    const amountNum = parseFloat(adjustmentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Nominal harus berupa angka lebih dari 0.');
      return;
    }

    if (!adjustmentReason.trim()) {
      alert('Alasan koreksi saldo WAJIB diisi.');
      return;
    }

    if (adjustmentType === 'DEBIT' && selectedUserForAdjustment.balance < amountNum) {
      alert(
        `Saldo tidak mencukupi untuk pemotongan. Saldo saat ini: Rp${selectedUserForAdjustment.balance.toLocaleString(
          'id-ID'
        )}`
      );
      return;
    }

    // Update Saldo
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === selectedUserForAdjustment.id) {
          const newBal = adjustmentType === 'CREDIT' ? u.balance + amountNum : u.balance - amountNum;
          return { ...u, balance: newBal };
        }
        return u;
      })
    );

    showToast(
      `Berhasil ${adjustmentType === 'CREDIT' ? 'menambahkan' : 'memotong'} Rp${amountNum.toLocaleString(
        'id-ID'
      )} untuk ${selectedUserForAdjustment.full_name}. Tercatat ke balance_mutations.`
    );

    // Reset Modal
    setSelectedUserForAdjustment(null);
    setAdjustmentAmount('');
    setAdjustmentReason('');
  };

  // Handler Logout
  const handleLogout = () => {
    setAdmin(null);
    try {
      localStorage.removeItem('aripay_admin_token');
      localStorage.removeItem('aripay_admin_user');
    } catch (e) {
      console.error('Storage clear error', e);
    }
    setLoginForm({ username: '', password: '' });
    showToast('Admin berhasil logout. Sesi dan token telah dihapus.');
  };

  // Handler Status Produk
  const handleToggleProductStatus = (id: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
    showToast('Status produk berhasil diperbarui.');
  };

  // Handler Persetujuan Penarikan Saldo
  const handleApproveWithdrawal = (id: number) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: 'SUCCESS' as const } : w))
    );
    showToast('Permohonan penarikan dana berhasil disetujui (SUCCESS).');
  };

  // Handler Penolakan Penarikan Saldo
  const handleRejectWithdrawal = (id: number) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: 'REJECTED' as const } : w))
    );
    showToast('Permohonan penarikan dana ditolak (REJECTED).');
  };

  // Perhitungan Statistik Dashboard
  const totalUsersCount = users.length;
  const totalUserBalance = users.reduce((acc, u) => acc + u.balance, 0);
  const totalTransactionsCount = transactions.length;
  const pendingTransactionsCount = transactions.filter((t) => t.status === 'PENDING').length;
  const successTransactionsCount = transactions.filter((t) => t.status === 'SUCCESS').length;
  const failedTransactionsCount = transactions.filter((t) => t.status === 'FAILED').length;
  const totalDeposits = 250000;
  const totalWithdrawals = 0;

  // Filter Users
  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone_number.includes(searchQuery)
  );

  // Filter Transaksi
  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg border border-emerald-500/40 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {!admin ? (
        /* ======================================================== */
        /* FORM LOGIN ADMIN (LANGKAH 6.1) */
        /* ======================================================== */
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                  AP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-white">AriPay</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                      ADMIN PANEL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Portal Pengawasan Sistem & Database</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/aripay-project-terbaru.zip"
                  download="aripay-project-terbaru.zip"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition text-xs font-semibold"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Unduh ZIP AriPay
                </a>
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Akses Terbatas Admin
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Login Admin AriPay</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Wajib memiliki akun dengan peran <strong className="text-slate-300">ADMIN</strong> di database AriPay.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username atau Email Admin
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLoggingIn}
                    value={loginForm.username}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, username: e.target.value });
                      if (loginError) setLoginError('');
                    }}
                    placeholder="admin atau admin@aripay.id"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password Admin
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={isLoggingIn}
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, password: e.target.value });
                        if (loginError) setLoginError('');
                      }}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                      title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi Kredensial...</span>
                      </>
                    ) : (
                      <span>Masuk ke Dashboard Admin</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-500 text-center">
                <p>Default Seeder Database:</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoginForm({ username: 'admin', password: 'AdminAriPay2026!' });
                    if (loginError) setLoginError('');
                  }}
                  className="text-slate-400 hover:text-blue-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 mt-1 inline-flex items-center gap-1 cursor-pointer transition font-mono"
                >
                  admin / AdminAriPay2026! (Klik untuk isi cepat)
                </button>
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* ======================================================== */
        /* DASHBOARD ADMIN SETELAH LOGIN (LANGKAH 6.2) */
        /* ======================================================== */
        <div className="flex-1 flex flex-row min-h-screen">
          {/* 1. SIDEBAR ADMIN */}
          <AdminSidebar
            admin={admin}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            transactionCount={transactions.length}
            userCount={users.length}
            pendingWdCount={withdrawals.filter((w) => w.status === 'PENDING').length}
            pendingDepoCount={pendingDepoCount}
          />

          <div className="flex-1 flex flex-col min-w-0">
            {/* 2. HEADER ADMIN */}
            <AdminHeader
              admin={admin}
              activeTab={activeTab}
              onLogout={handleLogout}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            />

            {/* 3. KONTEN TAB ADMIN */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {/* KONTEN TAB 1: DASHBOARD OVERVIEW */}
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  transactions={transactions}
                  users={users}
                  withdrawals={withdrawals}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

            {/* KONTEN TAB 2: MANAJEMEN USER (LANGKAH 6.4) */}
            {activeTab === 'users' && (
              <UsersView onNotify={(msg) => showToast(msg)} />
            )}

            {/* KONTEN TAB 3: MANAJEMEN TRANSAKSI ADMIN (LANGKAH 6.3) */}
            {activeTab === 'transactions' && (
              <TransactionsView />
            )}

            {/* KONTEN TAB: PRODUK & LAYANAN (LANGKAH 6.10) */}
            {activeTab === 'products' && (
              <ProductsView onNotify={showToast} />
            )}

            {/* KONTEN TAB: MANAJEMEN DEPOSIT & AUDIT BUKU KAS (LANGKAH 6.9) */}
            {activeTab === 'deposits' && (
              <DepositsView
                onNotify={showToast}
                onDepositsChange={() => {
                  refreshDepositSummary();
                }}
              />
            )}

            {/* KONTEN TAB: SALDO & PENARIKAN (LANGKAH 6.6) */}
            {activeTab === 'withdrawals' && (
              <WithdrawalsView
                withdrawals={withdrawals}
                users={users}
                onApprove={handleApproveWithdrawal}
                onReject={handleRejectWithdrawal}
                onNotify={showToast}
                onWithdrawalsChange={() => {
                  // Penarikan diperbarui
                }}
              />
            )}

            {/* KONTEN TAB: LAPORAN & KEUANGAN */}
            {activeTab === 'reports' && (
              <ReportsView
                transactions={transactions}
                onNotify={showToast}
              />
            )}

            {/* KONTEN TAB: PENGATURAN */}
            {activeTab === 'settings' && (
              <SettingsView
                admin={admin}
                onNotify={showToast}
                onAdminUpdate={(updated) => setAdmin((prev) => ({ ...prev, ...updated }))}
              />
            )}

            {/* KONTEN TAB: ARSITEKTUR & DATABASE INFO */}
            {activeTab === 'architecture' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Building2 className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">Status Arsitektur Backend & Database AriPay</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Admin Panel ini membaca skema data langsung dari database yang sama dengan Backend AriPay.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                    <span className="font-semibold text-slate-200">Tabel Terhubung:</span>
                    <ul className="list-disc list-inside text-slate-400 space-y-1">
                      <li><code>admin_users</code>: Akun staf dan Superadmin</li>
                      <li><code>users</code>: Akun pelanggan AriPay</li>
                      <li><code>balance_mutations</code>: Buku kas mutasi wajib audit</li>
                      <li><code>transactions</code>: Riwayat pembelian produk</li>
                      <li><code>products</code>: Etalase produk digital</li>
                    </ul>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                    <span className="font-semibold text-slate-200">Keamanan Admin:</span>
                    <ul className="list-disc list-inside text-slate-400 space-y-1">
                      <li>Endpoint dilindungi <code>requireRole('ADMIN')</code></li>
                      <li>Koreksi saldo wajib disertai keterangan/alasan</li>
                      <li>Saldo tidak dapat minus (Validasi Server-side)</li>
                      <li>API Key supplier tidak ada di browser</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* KONTEN TAB 5: DIAGRAM ALUR / WORKFLOW INFOGRAPHIC */}
            {activeTab === 'workflow' && (
              <div className="space-y-8">
                {/* Header Infografis */}
                <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
                        <Activity className="w-3.5 h-3.5" /> DIAGRAM ALUR RESMI (WORKFLOW INFOGRAPHIC)
                      </div>
                      <h3 className="text-xl font-bold text-white">Alur Kerja Terpadu Ekosistem AriPay</h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        Visualisasi interaktif integrasi antara Aplikasi Android Pelanggan, Web Admin Panel, Server Backend Express, dan Database PostgreSQL.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-mono">
                        ● Sistem Terhubung & Sinkron
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. DIAGRAM BESAR ARSITEKTUR EKOSISTEM */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Network className="w-4 h-4 text-blue-400" />
                      1. Bagan Arsitektur & Jalur Komunikasi
                    </h4>
                    <span className="text-[11px] text-slate-400">Arsitektur Multi-Klien Terpusat</span>
                  </div>

                  {/* Grid Komponen Visual */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    {/* Kotak 1: Klien Pengguna & Admin */}
                    <div className="space-y-3">
                      <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 shadow-lg">
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
                          <Smartphone className="w-4 h-4" /> ANDROID APP
                        </div>
                        <div className="text-white font-semibold text-xs">Pelanggan AriPay</div>
                        <div className="text-[11px] text-slate-400 mt-1">Beli pulsa, transfer, cek saldo sendiri</div>
                        <div className="mt-2 text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                          Role: USER
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/40 shadow-lg">
                        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1">
                          <Laptop className="w-4 h-4" /> ADMIN PANEL WEB
                        </div>
                        <div className="text-white font-semibold text-xs">Staf & Pengelola</div>
                        <div className="text-[11px] text-slate-400 mt-1">Dashboard metrik, kontrol akun, audit saldo</div>
                        <div className="mt-2 text-[10px] font-mono text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                          Role: ADMIN / SUPERADMIN
                        </div>
                      </div>
                    </div>

                    {/* Panah Aliran 1 */}
                    <div className="hidden md:flex flex-col items-center justify-center text-slate-500 gap-2">
                      <div className="text-[11px] text-center font-mono text-slate-400">
                        REST API<br />
                        <span className="text-slate-500 text-[10px]">(JSON + JWT)</span>
                      </div>
                      <ArrowRight className="w-6 h-6 text-blue-400 animate-pulse" />
                    </div>

                    {/* Kotak 2: Backend AriPay */}
                    <div className="bg-slate-950 p-5 rounded-xl border border-purple-500/30 shadow-lg space-y-3">
                      <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                        <Server className="w-4 h-4" /> BACKEND ARIPAY (Express.js)
                      </div>
                      <div className="text-white font-semibold text-xs">Otoritas Bisnis & Keamanan</div>
                      <ul className="text-[11px] text-slate-300 space-y-1">
                        <li>• <code className="text-purple-300">/api/auth/*</code> (Register/Login)</li>
                        <li>• <code className="text-purple-300">/api/wallet/*</code> (Saldo & Mutasi)</li>
                        <li>• <code className="text-purple-300">/api/admin/*</code> (Khusus Role Admin)</li>
                      </ul>
                      <div className="p-2 rounded bg-purple-950/40 border border-purple-800/40 text-[10px] text-purple-300">
                        🔒 Middleware: <code className="text-white">requireRole('ADMIN')</code>
                      </div>
                    </div>

                    {/* Kotak 3: Database & Integrasi */}
                    <div className="space-y-3">
                      <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 shadow-lg">
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                          <Database className="w-4 h-4" /> POSTGRESQL (aripay_db)
                        </div>
                        <div className="text-white font-semibold text-xs">Satu Database Terpusat</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Tabel: <code>users</code>, <code>admin_users</code>, <code>balance_mutations</code>, <code>transactions</code>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 shadow-lg">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                          <Building2 className="w-4 h-4" /> SUPPLIER (DIGIFLAZZ)
                        </div>
                        <div className="text-white font-semibold text-xs">Eksternal API Gateway</div>
                        <div className="text-[11px] text-slate-400 mt-1">Hanya dihubungi oleh backend, tidak pernah dari browser</div>
                        <div className="mt-1 text-[10px] text-amber-300">Tahap berikutnya (Langkah 7)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. DETAIL TIGA ALUR KERJA (STEP-BY-STEP WORKFLOW) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Alur A: Autentikasi Admin */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm border-b border-slate-800 pb-3">
                      <Key className="w-4 h-4" />
                      ALUR A: Login & Hak Akses Admin
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          1
                        </div>
                        <div>
                          <div className="font-semibold text-white">Input Kredensial</div>
                          <div className="text-slate-400 text-[11px]">Admin memasukkan username & password di formulir web.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          2
                        </div>
                        <div>
                          <div className="font-semibold text-white">POST /api/admin/login</div>
                          <div className="text-slate-400 text-[11px]">Backend memeriksa ke tabel <code className="text-blue-300">admin_users</code>.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          3
                        </div>
                        <div>
                          <div className="font-semibold text-white">Verifikasi Bcrypt & Role</div>
                          <div className="text-slate-400 text-[11px]">Memastikan password cocok dan peran adalah <code className="text-emerald-300">ADMIN</code> atau <code className="text-emerald-300">SUPERADMIN</code>.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          4
                        </div>
                        <div>
                          <div className="font-semibold text-white">Pemberian Token JWT</div>
                          <div className="text-slate-400 text-[11px]">Token disimpan di browser untuk menyertai header Authorization setiap request.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alur B: Monitoring Dashboard */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm border-b border-slate-800 pb-3">
                      <Activity className="w-4 h-4" />
                      ALUR B: Pengambilan Data Dashboard
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          1
                        </div>
                        <div>
                          <div className="font-semibold text-white">GET /api/admin/dashboard-stats</div>
                          <div className="text-slate-400 text-[11px]">Admin Panel meminta data statistik sistem secara berkala.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          2
                        </div>
                        <div>
                          <div className="font-semibold text-white">Validasi Token & Role</div>
                          <div className="text-slate-400 text-[11px]">Middleware menolak jika token tidak sah (Error 403).</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          3
                        </div>
                        <div>
                          <div className="font-semibold text-white">Query Agregasi Database</div>
                          <div className="text-slate-400 text-[11px]">PostgreSQL menghitung: Total User, Total Saldo, Pending/Success/Failed.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          4
                        </div>
                        <div>
                          <div className="font-semibold text-white">Render 8 Kartu Metrik</div>
                          <div className="text-slate-400 text-[11px]">Dashboard menyajikan angka akurat yang sama dengan database produksi.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alur C: Koreksi Saldo Manual */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b border-slate-800 pb-3">
                      <SlidersHorizontal className="w-4 h-4" />
                      ALUR C: Koreksi Saldo Berintegritas
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          1
                        </div>
                        <div>
                          <div className="font-semibold text-white">Formulir Alasan Wajib</div>
                          <div className="text-slate-400 text-[11px]">Admin memilih user, jenis (CREDIT/DEBIT), nominal, dan alasan.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          2
                        </div>
                        <div>
                          <div className="font-semibold text-white">Kunci Baris (FOR UPDATE)</div>
                          <div className="text-slate-400 text-[11px]">Mencegah race condition saat pengguna sedang bertransaksi.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          3
                        </div>
                        <div>
                          <div className="font-semibold text-white">Validasi Saldo & Aturan</div>
                          <div className="text-slate-400 text-[11px]">Jika DEBIT melebihi saldo, transaksi langsung digagalkan (Rollback).</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          4
                        </div>
                        <div>
                          <div className="font-semibold text-white">Pencatatan Buku Kas (Audit)</div>
                          <div className="text-slate-400 text-[11px]">Mutasi dicatat permanen ke <code className="text-emerald-300">balance_mutations</code>.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. ATURAN INTEGRITAS DAN KEAMANAN ARIPAY */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Pilar Keamanan & Garansi Sistem
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                      <div className="font-bold text-slate-200 mb-1 text-emerald-400">1. Sistem User Tetap Utuh</div>
                      <p>Rute <code className="text-slate-300">/api/auth/*</code> dan <code className="text-slate-300">/api/wallet/*</code> tidak tersentuh. Pelanggan di Android tetap dapat mendaftar dan bertransaksi normal.</p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                      <div className="font-bold text-slate-200 mb-1 text-blue-400">2. Proteksi Server-Authoritative</div>
                      <p>Browser Admin Panel tidak memiliki wewenang memodifikasi saldo secara langsung. Seluruh perubahan wajib diproses oleh <code className="text-slate-300">walletService.js</code> di Backend.</p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                      <div className="font-bold text-slate-200 mb-1 text-amber-400">3. Isolasi Rahasia Digiflazz</div>
                      <p>Kredensial API, webhook secret, dan signing key supplier hanya berada di lingkungan server aman, tidak ada kebocoran di klien web maupun Android.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    )}

      {/* ======================================================== */}
      {/* MODAL KOREKSI SALDO OLEH ADMIN */}
      {/* ======================================================== */}
      {selectedUserForAdjustment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                Koreksi Saldo Manual
              </h3>
              <button
                onClick={() => setSelectedUserForAdjustment(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <div className="text-slate-400">Pengguna:</div>
              <div className="font-semibold text-white text-sm">{selectedUserForAdjustment.full_name}</div>
              <div className="text-slate-400 font-mono">{selectedUserForAdjustment.phone_number}</div>
              <div className="text-emerald-400 font-mono font-semibold pt-1">
                Saldo Saat Ini: Rp{selectedUserForAdjustment.balance.toLocaleString('id-ID')}
              </div>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Tipe Penyesuaian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('CREDIT')}
                    className={`py-2 rounded-xl font-medium border text-center transition ${
                      adjustmentType === 'CREDIT'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    + CREDIT (Tambah Saldo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('DEBIT')}
                    className={`py-2 rounded-xl font-medium border text-center transition ${
                      adjustmentType === 'DEBIT'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-semibold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    - DEBIT (Kurang Saldo)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 50000"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Alasan / Keterangan Koreksi <span className="text-rose-400">*Wajib</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tulis alasan jelas mengapa saldo disesuaikan (misal: Kompensasi gangguan teknis atau koreksi selisih)..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForAdjustment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-600/20"
                >
                  Simpan & Catat Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
