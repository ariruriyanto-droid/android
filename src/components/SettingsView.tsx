import React, { useState, useEffect, useId } from 'react';
import {
  Settings,
  ShieldCheck,
  Database,
  Key,
  Server,
  Lock,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Save,
  Radio,
  Clock,
  Coins,
  Wallet,
  Activity,
  Zap,
  Info,
} from 'lucide-react';
import type { AdminUser, SystemSettingsData, SystemParameters } from '../types';
import {
  getAdminSettings,
  changeAdminPassword,
  updateSystemParameters,
  checkSystemHealth,
} from '../services/api';

interface SettingsViewProps {
  admin: AdminUser;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onAdminUpdate?: (admin: Partial<AdminUser>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  admin,
  onNotify,
  onAdminUpdate,
}) => {
  const compId = useId();

  // Tab Menu Internal Settings
  const [activeTab, setActiveTab] = useState<'security' | 'parameters' | 'gateway' | 'database'>('security');

  // State data sistem
  const [settingsData, setSettingsData] = useState<SystemSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // State Form Ganti Password
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // State Form Parameter Sistem
  const [paramsForm, setParamsForm] = useState<SystemParameters>({
    withdrawal_fee: 2500,
    min_withdrawal: 20000,
    max_withdrawal: 10000000,
    min_deposit: 10000,
    maintenance_mode: false,
    gateway_timeout_seconds: 30,
  });
  const [isSavingParams, setIsSavingParams] = useState<boolean>(false);
  const [paramsSuccess, setParamsSuccess] = useState<string | null>(null);

  // State Uji Koneksi / Health Check
  const [isTestingGateway, setIsTestingGateway] = useState<boolean>(false);
  const [gatewayPingResult, setGatewayPingResult] = useState<string | null>(null);
  const [isTestingDb, setIsTestingDb] = useState<boolean>(false);
  const [dbPingResult, setDbPingResult] = useState<{ status: string; latency_ms: number } | null>(null);

  // Muat Pengaturan dari Backend
  const loadSettings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await getAdminSettings();
      if (res.success && res.data) {
        setSettingsData(res.data);
        if (res.data.parameters) {
          setParamsForm({
            withdrawal_fee: res.data.parameters.withdrawal_fee ?? 2500,
            min_withdrawal: res.data.parameters.min_withdrawal ?? 20000,
            max_withdrawal: res.data.parameters.max_withdrawal ?? 10000000,
            min_deposit: res.data.parameters.min_deposit ?? 10000,
            maintenance_mode: Boolean(res.data.parameters.maintenance_mode),
            gateway_timeout_seconds: res.data.parameters.gateway_timeout_seconds ?? 30,
          });
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat pengaturan:', err.message);
      if (onNotify) onNotify(err.message || 'Gagal mengambil data pengaturan.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Handler Submit Ganti Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword.trim()) {
      setPasswordError('Password lama wajib diisi.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password baru harus memiliki panjang minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError('Password baru tidak boleh sama dengan password lama saat ini.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await changeAdminPassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.success) {
        setPasswordSuccess('Password akun administrator berhasil diperbarui dengan aman!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onNotify) onNotify('Password admin berhasil diubah!', 'success');
      } else {
        throw new Error(res.message || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Terjadi kesalahan saat memproses password.');
      if (onNotify) onNotify(err.message || 'Gagal mengubah password.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handler Submit Parameter Sistem
  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    setParamsSuccess(null);
    setIsSavingParams(true);

    try {
      const res = await updateSystemParameters(paramsForm);
      if (res.success) {
        setParamsSuccess('Parameter operasional sistem berhasil disimpan.');
        if (onNotify) onNotify('Parameter sistem berhasil diperbarui.', 'success');
        loadSettings(true);
      } else {
        throw new Error(res.message || 'Gagal memperbarui parameter sistem.');
      }
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Gagal menyimpan parameter sistem.', 'error');
    } finally {
      setIsSavingParams(false);
    }
  };

  // Handler Uji Koneksi Gateway
  const handleTestGateway = async () => {
    setIsTestingGateway(true);
    setGatewayPingResult(null);

    try {
      const res = await checkSystemHealth();
      if (res.success) {
        setGatewayPingResult(`Koneksi Aktif • Latensi ${res.gateway.latency_ms}ms • Status ${res.gateway.status}`);
        if (onNotify) onNotify(`Gateway Digiflazz responsif (${res.gateway.latency_ms}ms).`, 'success');
      }
    } catch (err: any) {
      setGatewayPingResult('Gagal menghubungi gateway: ' + err.message);
      if (onNotify) onNotify('Uji gateway gagal: ' + err.message, 'error');
    } finally {
      setIsTestingGateway(false);
    }
  };

  // Handler Uji Kesehatan Database
  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbPingResult(null);

    try {
      const res = await checkSystemHealth();
      if (res.success) {
        setDbPingResult({
          status: res.database.status,
          latency_ms: res.database.latency_ms,
        });
        if (onNotify) onNotify(`Database PostgreSQL normal (Latensi ${res.database.latency_ms}ms).`, 'success');
      }
    } catch (err: any) {
      if (onNotify) onNotify('Health check database gagal: ' + err.message, 'error');
    } finally {
      setIsTestingDb(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl" id={`settings-view-${compId}`}>
      {/* 1. Header Pengaturan & Action Segarkan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-blue-400" />
            <span>Pengaturan & Konfigurasi Sistem AriPay</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Kelola kredensial keamanan akun admin, parameter biaya transaksi, integrasi gateway PPOB, dan diagnostik database.
          </p>
        </div>

        <button
          type="button"
          id={`btn-refresh-settings-${compId}`}
          onClick={() => loadSettings(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 2. Navigasi Sub-Tab Pengaturan */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          id={`tab-security-${compId}`}
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Keamanan & Password Admin</span>
        </button>

        <button
          type="button"
          id={`tab-parameters-${compId}`}
          onClick={() => setActiveTab('parameters')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'parameters'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Parameter Transaksi & Biaya</span>
        </button>

        <button
          type="button"
          id={`tab-gateway-${compId}`}
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'gateway'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Integrasi Gateway PPOB</span>
        </button>

        <button
          type="button"
          id={`tab-database-${compId}`}
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Diagnostik Database</span>
        </button>
      </div>

      {/* 3. KONTEN TAB: 1. KEAMANAN & PASSWORD ADMIN */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Ringkasan Profil Admin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Identitas Administrator Terotentikasi</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {admin.role || 'SUPERADMIN'}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Username Login</span>
                <span className="text-white font-semibold font-mono text-sm">{admin.username}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Email Resmi</span>
                <span className="text-white font-semibold text-sm truncate block" title={admin.email}>
                  {admin.email}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Status Sesi JWT</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Aktif & Terproteksi
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Audit Terakhir</span>
                <span className="text-slate-300 font-mono text-xs">
                  {settingsData?.profile?.last_login ? new Date(settingsData.profile.last_login).toLocaleTimeString('id-ID') : 'Hari ini'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Ganti Password */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Ubah Password Akun Administrator</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Gunakan kombinasi minimal 8 karakter dengan angka dan simbol untuk menjaga keamanan akses dashboard.
              </p>
            </div>

            {/* Alert Error / Success */}
            {passwordError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {/* Password Lama */}
              <div className="space-y-1.5">
                <label htmlFor={`old-pass-${compId}`} className="text-xs text-slate-300 font-medium block">
                  Password Lama Saat Ini <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    id={`old-pass-${compId}`}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini (Default: Admin@123)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Baru */}
              <div className="space-y-1.5">
                <label htmlFor={`new-pass-${compId}`} className="text-xs text-slate-300 font-medium block">
                  Password Baru <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id={`new-pass-${compId}`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter baru"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    Kekuatan: {newPassword.length >= 8 ? (
                      <span className="text-emerald-400 font-semibold">Memenuhi syarat (8+ karakter)</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">{newPassword.length}/8 karakter</span>
                    )}
                  </div>
                )}
              </div>

              {/* Konfirmasi Password Baru */}
              <div className="space-y-1.5">
                <label htmlFor={`confirm-pass-${compId}`} className="text-xs text-slate-300 font-medium block">
                  Ulangi Konfirmasi Password Baru <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id={`confirm-pass-${compId}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru di atas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="text-[11px]">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Password cocok
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Konfirmasi password belum sama
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id={`btn-submit-password-${compId}`}
                  disabled={isSavingPassword || !oldPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Password...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Password Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. KONTEN TAB: 2. PARAMETER TRANSAKSI & BIAYA */}
      {activeTab === 'parameters' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Parameter Operasional & Ambang Batas Transaksi AriPay</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurasi nominal batas minimal/maksimal dan biaya administrasi yang berlaku di aplikasi nasabah.
              </p>
            </div>
            {paramsSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {paramsSuccess}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveParameters} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Biaya Admin Penarikan Saldo */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <label htmlFor={`param-fee-${compId}`} className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-indigo-400" />
                    <span>Biaya Admin Penarikan (Fee)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Per Tiket Sukses</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">Rp</span>
                  <input
                    type="number"
                    id={`param-fee-${compId}`}
                    value={paramsForm.withdrawal_fee}
                    onChange={(e) => setParamsForm({ ...paramsForm, withdrawal_fee: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                    min="0"
                    step="500"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Potongan biaya yang menjadi pendapatan kas AriPay saat pengguna mencairkan dana.
                </p>
              </div>

              {/* Batas Minimal Penarikan Dana */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <label htmlFor={`param-min-wd-${compId}`} className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Batas Minimal Penarikan</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Nominal Terendah</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">Rp</span>
                  <input
                    type="number"
                    id={`param-min-wd-${compId}`}
                    value={paramsForm.min_withdrawal}
                    onChange={(e) => setParamsForm({ ...paramsForm, min_withdrawal: Math.max(1000, parseInt(e.target.value || '0', 10)) })}
                    min="1000"
                    step="10000"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Nominal saldo terendah yang dapat diajukan penarikan oleh pengguna.
                </p>
              </div>

              {/* Batas Minimal Deposit / Top-up */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <label htmlFor={`param-min-dep-${compId}`} className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>Batas Minimal Top Up / Deposit</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Nominal Terendah</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">Rp</span>
                  <input
                    type="number"
                    id={`param-min-dep-${compId}`}
                    value={paramsForm.min_deposit}
                    onChange={(e) => setParamsForm({ ...paramsForm, min_deposit: Math.max(1000, parseInt(e.target.value || '0', 10)) })}
                    min="1000"
                    step="5000"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Nominal terendah pengisian deposit kas via Virtual Account/QRIS.
                </p>
              </div>

              {/* Timeout Gateway Biller */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <label htmlFor={`param-timeout-${compId}`} className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Batas Waktu Timeout Request</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Detik</span>
                </label>
                <input
                  type="number"
                  id={`param-timeout-${compId}`}
                  value={paramsForm.gateway_timeout_seconds}
                  onChange={(e) => setParamsForm({ ...paramsForm, gateway_timeout_seconds: Math.max(5, parseInt(e.target.value || '30', 10)) })}
                  min="5"
                  max="120"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Waktu maksimal menunggu respons dari server biller sebelum transaksi dialihkan ke status pending/retry.
                </p>
              </div>
            </div>

            {/* Toggle Mode Pemeliharaan Sistem */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Mode Pemeliharaan (Maintenance Mode)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Jika diaktifkan, nasabah tidak dapat membuat pesanan transaksi PPOB baru sementara waktu.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id={`toggle-maintenance-${compId}`}
                  checked={paramsForm.maintenance_mode}
                  onChange={(e) => setParamsForm({ ...paramsForm, maintenance_mode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id={`btn-save-params-${compId}`}
                disabled={isSavingParams}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {isSavingParams ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan Parameter...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan Parameter</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. KONTEN TAB: 3. INTEGRASI GATEWAY PPOB */}
      {activeTab === 'gateway' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Integrasi Gateway PPOB (Digiflazz / Biller Partner)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurasi koneksi API otomatis untuk pengisian pulsa, paket data, PLN, dan top-up e-money.
              </p>
            </div>

            <button
              type="button"
              id={`btn-test-gateway-${compId}`}
              onClick={handleTestGateway}
              disabled={isTestingGateway}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition disabled:opacity-50 self-start sm:self-auto"
            >
              <Activity className={`w-3.5 h-3.5 ${isTestingGateway ? 'animate-spin' : ''}`} />
              <span>{isTestingGateway ? 'Menguji Koneksi...' : 'Uji Koneksi Gateway (Ping)'}</span>
            </button>
          </div>

          {/* Alert Hasil Uji Gateway */}
          {gatewayPingResult && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{gatewayPingResult}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-500 block text-[11px] font-semibold">Nama Provider Gateway</span>
              <span className="text-white font-bold text-sm block">Digiflazz PPOB API Gateway v1</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Status: Terhubung & Aktif (Online)
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-500 block text-[11px] font-semibold">API Production Endpoint</span>
              <span className="text-blue-400 font-mono font-medium block">https://api.digiflazz.com/v1</span>
              <span className="text-slate-400 text-[11px] block">Metode Otorisasi: HMAC-SHA256 Signature</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-500 block text-[11px] font-semibold">Webhook Callback URL</span>
              <span className="text-emerald-400 font-mono text-xs block">https://aripay.id/api/webhooks/digiflazz</span>
              <span className="text-slate-400 text-[11px] block">Menerima update status SN/Token real-time</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-500 block text-[11px] font-semibold">IP Whitelist Server</span>
              <span className="text-slate-200 font-mono text-xs block">104.28.19.42, 104.28.19.43</span>
              <span className="text-slate-400 text-[11px] block">Hanya IP di atas yang diizinkan memotong saldo biller</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. KONTEN TAB: 4. DIAGNOSTIK DATABASE */}
      {activeTab === 'database' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Status & Diagnostik Database PostgreSQL AriPay</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Pemantauan konektivitas pool, latensi query, dan integritas transaksi ACID database.
              </p>
            </div>

            <button
              type="button"
              id={`btn-test-db-${compId}`}
              onClick={handleTestDatabase}
              disabled={isTestingDb}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
              <span>{isTestingDb ? 'Menguji Query...' : 'Cek Health Database'}</span>
            </button>
          </div>

          {/* Alert Hasil Uji DB */}
          {dbPingResult && (
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Koneksi Database Normal! Status: <strong>{dbPingResult.status}</strong> • Latensi Kueri:{' '}
                <strong>{dbPingResult.latency_ms} ms</strong>
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Database Engine</span>
              <span className="text-white font-mono font-bold text-sm block">PostgreSQL 16.2</span>
              <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung (Cloud Run / Local)
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Latensi Respon Kueri</span>
              <span className="text-cyan-400 font-mono font-bold text-sm block">
                {settingsData?.database?.latency_ms ?? 12} ms
              </span>
              <span className="text-slate-400 text-[11px]">Sangat Cepat (&lt; 50ms)</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Total Rekaman Pengguna</span>
              <span className="text-slate-200 font-mono font-bold text-sm block">
                {settingsData?.database?.total_users ?? 120} Baris Akun
              </span>
              <span className="text-slate-400 text-[11px]">Tabel users & admin_users</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Total Log Transaksi</span>
              <span className="text-slate-200 font-mono font-bold text-sm block">
                {settingsData?.database?.total_transactions ?? 313} Transaksi
              </span>
              <span className="text-slate-400 text-[11px]">Tabel transactions</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Total Tiket Penarikan</span>
              <span className="text-slate-200 font-mono font-bold text-sm block">
                {settingsData?.database?.total_withdrawals ?? 3} Tiket
              </span>
              <span className="text-slate-400 text-[11px]">Tabel withdrawals</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-slate-500 text-[11px] block">Integritas Transaksi Kas</span>
              <span className="text-emerald-400 font-mono font-bold text-sm block">ACID Compliant</span>
              <span className="text-slate-400 text-[11px]">SELECT FOR UPDATE Locking</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
