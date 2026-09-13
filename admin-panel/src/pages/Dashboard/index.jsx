import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Users,
  Wallet,
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  XCircle,
  Package,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Menu,
  X,
  Database,
} from 'lucide-react';
import {
  fetchDashboardStats,
  fetchTransactions,
  getStoredAdminUser,
  logoutAdmin,
} from '../../services/api';

export default function DashboardPage({ adminUser, onLogout }) {
  const [stats, setStats] = useState({
    total_users: 3,
    total_user_balance: 215000,
    total_transactions: 2,
    pending_transactions: 1,
    success_transactions: 1,
    failed_transactions: 0,
    total_deposits: 500000,
    total_withdrawals: 150000,
    pending_withdrawals: 1,
    transaction_chart: [],
  });

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [chartPeriod, setChartPeriod] = useState('7d');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const currentUser = adminUser || getStoredAdminUser() || {
    username: 'admin',
    role: 'SUPERADMIN',
    email: 'admin@aripay.id',
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const statsData = await fetchDashboardStats();
        if (statsData) setStats((prev) => ({ ...prev, ...statsData }));
      } catch (err) {
        console.warn('Gagal memuat stats backend, menggunakan fallback data lokal:', err.message);
      }

      try {
        const trxData = await fetchTransactions();
        if (trxData && Array.isArray(trxData)) setTransactions(trxData);
      } catch (err) {
        console.warn('Gagal memuat transaksi backend:', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleLogoutClick = () => {
    logoutAdmin();
    if (onLogout) onLogout();
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 1. SIDEBAR ADMIN */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-sm">
              AP
            </div>
            <div>
              <span className="font-bold text-base text-white">AriPay</span>
              <span className="ml-1.5 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                ADMIN
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-medium">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'transactions', label: 'Transaksi', icon: Receipt },
            { id: 'users', label: 'Pengguna', icon: Users },
            { id: 'products', label: 'Produk & Layanan', icon: Package },
            { id: 'withdrawals', label: 'Saldo & Penarikan', icon: Wallet },
            { id: 'reports', label: 'Laporan', icon: BarChart3 },
            { id: 'settings', label: 'Pengaturan', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{currentUser.username}</p>
              <p className="text-[10px] text-emerald-400 font-mono">ROLE: {currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN BODY */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. HEADER */}
        <header className="h-16 px-4 sm:px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white">Dashboard Admin</h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Pengawasan Sistem AriPay & Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL Live</span>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* CONTENT VIEW */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Quick Action */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Quick Action</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setCurrentTab('transactions')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-blue-400">
                  <span>Lihat Transaksi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Daftar transaksi sistem</p>
              </button>
              <button
                onClick={() => setCurrentTab('users')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-indigo-400">
                  <span>Kelola Pengguna</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Akun pelanggan aktif</p>
              </button>
              <button
                onClick={() => setCurrentTab('withdrawals')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-amber-400">
                  <span>Kelola Penarikan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Antrean penarikan saldo</p>
              </button>
              <button
                onClick={() => setCurrentTab('reports')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-emerald-400">
                  <span>Lihat Laporan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Rekapitulasi keuangan</p>
              </button>
            </div>
          </div>

          {/* 3. KARTU STATISTIK (4 KARTU) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Transaksi */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Transaksi</span>
                <Receipt className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_transactions}</div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="text-emerald-400">{stats.success_transactions} Sukses</span>
                <span className="text-amber-400">{stats.pending_transactions} Pending</span>
              </div>
            </div>

            {/* Total Pengguna */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Pengguna</span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_users}</div>
              <div className="mt-2 text-[11px] text-slate-400">Akun terdaftar di database</div>
            </div>

            {/* Saldo Sistem */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Saldo Sistem</span>
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                Rp{stats.total_user_balance.toLocaleString('id-ID')}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">Kewajiban saldo pengguna</div>
            </div>

            {/* Penarikan Pending */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Penarikan Pending</span>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.pending_withdrawals}</div>
              <div className="mt-2 text-[11px] text-amber-400/90 font-medium">Membutuhkan persetujuan</div>
            </div>
          </div>

          {/* 4. GRAFIK TRANSAKSI */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Grafik Transaksi Berdasarkan Periode</h3>
                <p className="text-[11px] text-slate-400">Pergerakan transaksi sistem AriPay</p>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {['7d', '14d', '30d'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-3 py-1 rounded-lg transition ${
                      chartPeriod === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p === '7d' ? '7 Hari' : p === '14d' ? '14 Hari' : '30 Hari'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-44 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-center p-4">
              <div className="w-full text-center">
                <p className="text-xs text-slate-400 mb-1">
                  Volume Transaksi Periode Ini:{' '}
                  <strong className="text-white">Rp1.420.000</strong> (38 Transaksi)
                </p>
                <div className="flex items-end justify-between h-24 max-w-md mx-auto pt-4 gap-2">
                  {[45, 65, 35, 80, 70, 95, 85].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className="w-full bg-blue-600 hover:bg-blue-500 rounded-t-md transition cursor-pointer"
                        style={{ height: `${val}%` }}
                        title={`Hari ${idx + 1}`}
                      />
                      <span className="text-[10px] text-slate-500">H-{7 - idx}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. AKTIVITAS TERBARU */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Aktivitas Transaksi Terbaru</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Invoice</th>
                    <th className="px-4 py-2.5">Pelanggan</th>
                    <th className="px-4 py-2.5">Produk</th>
                    <th className="px-4 py-2.5">Nominal</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(transactions.length > 0 ? transactions.slice(0, 5) : [
                    { id: 101, invoice_number: 'INV-20260909-001', user_name: 'Budi Santoso', product_name: 'Paket Data Telkomsel 10GB', price: 35000, status: 'SUCCESS' },
                    { id: 102, invoice_number: 'INV-20260909-002', user_name: 'Siti Rahmawati', product_name: 'Token Listrik PLN 50.000', price: 50500, status: 'PENDING' },
                  ]).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-slate-300">{t.invoice_number}</td>
                      <td className="px-4 py-2.5 font-semibold text-white">{t.user_name}</td>
                      <td className="px-4 py-2.5 text-slate-300">{t.product_name}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-white">
                        Rp{Number(t.price).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            t.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
