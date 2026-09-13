import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  Check,
  X,
  AlertCircle,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  User,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  Info,
  Copy,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import type { WithdrawalItem, UserItem, BalanceSummary } from '../types';
import {
  getAdminWithdrawals,
  getAdminBalanceSummary,
  approveAdminWithdrawal,
  rejectAdminWithdrawal,
} from '../services/api';

interface WithdrawalsViewProps {
  withdrawals?: WithdrawalItem[];
  users?: UserItem[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onNotify?: (message: string) => void;
  onWithdrawalsChange?: () => void;
}

export const WithdrawalsView: React.FC<WithdrawalsViewProps> = ({
  withdrawals: propWithdrawals,
  users: propUsers = [],
  onApprove: propOnApprove,
  onReject: propOnReject,
  onNotify,
  onWithdrawalsChange,
}) => {
  // 1. Filter and Pagination States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SUCCESS' | 'REJECTED'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 2. Data & Loading States
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [summary, setSummary] = useState<BalanceSummary>({
    total_user_balance: 0,
    total_system_balance: 0,
    total_in_process: 0,
    total_pending_count: 0,
    total_pending_amount: 0,
    total_success_count: 0,
    total_success_amount: 0,
    total_rejected_count: 0,
    total_rejected_amount: 0,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Modal / Dialog States
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [approveConfirmItem, setApproveConfirmItem] = useState<WithdrawalItem | null>(null);
  const [rejectConfirmItem, setRejectConfirmItem] = useState<WithdrawalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper Toast / Notify
  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  // 4. Fetch Withdrawals & Summary from Backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminWithdrawals({
        search,
        status: statusFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: currentPage,
        limit: pageSize,
      });

      if (res.success) {
        setWithdrawals(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.total_pages);
          setTotalRecords(res.pagination.total_records);
        }
      } else {
        throw new Error(res.message || 'Gagal memuat data penarikan dari backend.');
      }
    } catch (err: any) {
      console.error('Error fetching admin withdrawals:', err);
      setError(err.message || 'Terjadi gangguan saat mengambil data penarikan.');
      // Fallback to props if available
      if (propWithdrawals && propWithdrawals.length > 0) {
        setWithdrawals(propWithdrawals);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, startDate, endDate, currentPage, pageSize, propWithdrawals]);

  // Initial load and on filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Search submit / reset
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    notify(`Nomor ${label} (${text}) disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format currency helper
  const formatRupiah = (val: number | undefined) => {
    if (typeof val !== 'number' || isNaN(val)) return 'Rp0';
    return `Rp${val.toLocaleString('id-ID')}`;
  };

  // 5. Open Detail Modal
  const handleOpenDetail = (wd: WithdrawalItem) => {
    setSelectedWithdrawal(wd);
    setIsDetailModalOpen(true);
  };

  // 6. Action: Open Approve Modal
  const handleOpenApproveModal = (wd: WithdrawalItem) => {
    if (wd.status !== 'PENDING' && wd.status !== 'PROCESSING') {
      notify(`Tiket ${wd.withdrawal_number} sudah berstatus ${wd.status} dan tidak dapat diproses lagi.`);
      return;
    }
    setApproveConfirmItem(wd);
  };

  // Confirm Approve Execution
  const handleExecuteApprove = async () => {
    if (!approveConfirmItem || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await approveAdminWithdrawal(approveConfirmItem.id);
      if (res.success) {
        notify(`Penarikan ${approveConfirmItem.withdrawal_number} sebesar ${formatRupiah(approveConfirmItem.amount)} berhasil disetujui.`);
        setApproveConfirmItem(null);
        if (isDetailModalOpen) setIsDetailModalOpen(false);
        if (propOnApprove) propOnApprove(approveConfirmItem.id);
        if (onWithdrawalsChange) onWithdrawalsChange();
        loadData();
      } else {
        notify(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      notify(`Kesalahan server: ${err.message || 'Gagal menyetujui penarikan.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Action: Open Reject Modal
  const handleOpenRejectModal = (wd: WithdrawalItem) => {
    if (wd.status !== 'PENDING' && wd.status !== 'PROCESSING') {
      notify(`Tiket ${wd.withdrawal_number} sudah berstatus ${wd.status} dan tidak dapat diproses lagi.`);
      return;
    }
    setRejectConfirmItem(wd);
    setRejectionReason('');
    setRejectionError('');
  };

  // Confirm Reject Execution
  const handleExecuteReject = async () => {
    if (!rejectConfirmItem || isSubmitting) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setRejectionError('Alasan penolakan wajib diisi (minimal 3 karakter).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rejectAdminWithdrawal(rejectConfirmItem.id, rejectionReason.trim());
      if (res.success) {
        notify(`Penarikan ${rejectConfirmItem.withdrawal_number} berhasil ditolak. Alasan: "${rejectionReason.trim()}".`);
        setRejectConfirmItem(null);
        setRejectionReason('');
        if (isDetailModalOpen) setIsDetailModalOpen(false);
        if (propOnReject) propOnReject(rejectConfirmItem.id);
        if (onWithdrawalsChange) onWithdrawalsChange();
        loadData();
      } else {
        setRejectionError(res.message || 'Gagal menolak permohonan penarikan.');
      }
    } catch (err: any) {
      setRejectionError(err.message || 'Gagal menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <Wallet className="w-5 h-5" />
            <h2 className="text-xl font-bold text-white">Saldo & Manajemen Penarikan</h2>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Langkah 6.6
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Verifikasi mutasi penarikan dana perbankan/e-wallet nasabah AriPay, monitoring likuiditas sistem, dan audit transaksi perbankan secara aman.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
            title="Refresh Data Penarikan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isLoading ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* A. RINGKASAN SALDO (6 METRIK RESMI DARI BACKEND) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Total Saldo Pengguna */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Saldo Nasabah
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {formatRupiah(summary.total_user_balance)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Total simpanan aktif</p>
          </div>
        </div>

        {/* 2. Total Saldo Sistem */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cadangan Sistem
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400 font-mono">
              {formatRupiah(summary.total_system_balance)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Kas operasional AriPay</p>
          </div>
        </div>

        {/* 3. Saldo Sedang Diproses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Sedang Diproses
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-indigo-300 font-mono">
              {formatRupiah(summary.total_in_process)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Nominal pending antrean</p>
          </div>
        </div>

        {/* 4. Penarikan Pending */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Penarikan Pending
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-amber-400 font-mono">
                {summary.total_pending_count}
              </span>
              <span className="text-xs text-slate-400">Tiket</span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-mono font-semibold mt-0.5">
              {formatRupiah(summary.total_pending_amount)}
            </p>
          </div>
        </div>

        {/* 5. Penarikan Berhasil */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Penarikan Berhasil
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white font-mono">
                {summary.total_success_count}
              </span>
              <span className="text-xs text-slate-400">Selesai</span>
            </div>
            <p className="text-[10px] text-emerald-400/90 font-mono font-semibold mt-0.5">
              {formatRupiah(summary.total_success_amount)}
            </p>
          </div>
        </div>

        {/* 6. Penarikan Ditolak */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Penarikan Ditolak
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-rose-300 font-mono">
                {summary.total_rejected_count}
              </span>
              <span className="text-xs text-slate-400">Ditolak</span>
            </div>
            <p className="text-[10px] text-rose-400/90 font-mono font-semibold mt-0.5">
              {formatRupiah(summary.total_rejected_amount)}
            </p>
          </div>
        </div>
      </div>

      {/* B. FILTER & PENCARIAN BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Input Pencarian */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari ID, No. Penarikan, nama pengguna, no. HP, bank, atau rekening..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tanggal Mulai */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                title="Tanggal Mulai"
              />
            </div>
            <span className="text-slate-500 text-xs">s/d</span>
            {/* Filter Tanggal Akhir */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                title="Tanggal Akhir"
              />
            </div>
          </div>

          {(search || startDate || endDate || statusFilter !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Filter Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs">
            {(
              [
                { key: 'ALL', label: 'Semua Status' },
                { key: 'PENDING', label: 'Pending' },
                { key: 'SUCCESS', label: 'Berhasil' },
                { key: 'REJECTED', label: 'Ditolak' },
              ] as const
            ).map((st) => (
              <button
                key={st.key}
                onClick={() => {
                  setStatusFilter(st.key);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === st.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>
              Total: <strong className="text-white">{totalRecords}</strong> permintaan penarikan
            </span>
            <span className="text-slate-600">|</span>
            <label className="flex items-center gap-1.5">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* C. TABEL DAFTAR PERMINTAAN PENARIKAN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 font-semibold">ID / No. Penarikan</th>
                <th className="px-4 py-3.5 font-semibold">Pelanggan</th>
                <th className="px-4 py-3.5 font-semibold">Nominal Penarikan</th>
                <th className="px-4 py-3.5 font-semibold">Metode & Tujuan Transfer</th>
                <th className="px-4 py-3.5 font-semibold">Waktu Pengajuan</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Aksi Verifikasi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <p className="text-xs font-medium">Memuat data permohonan penarikan...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-rose-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <p className="text-xs font-semibold">{error}</p>
                      <button
                        onClick={() => loadData()}
                        className="px-3 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg text-xs mt-1"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Wallet className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">Tidak ada data penarikan ditemukan</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Sesuaikan kata kunci pencarian atau bersihkan filter status untuk melihat transaksi lainnya.
                      </p>
                      {(search || startDate || endDate || statusFilter !== 'ALL') && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition"
                        >
                          Hapus Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                withdrawals.map((wd) => {
                  const isPending = wd.status === 'PENDING' || wd.status === 'PROCESSING';
                  const isSuccess = wd.status === 'SUCCESS';
                  const isRejected = wd.status === 'REJECTED';

                  return (
                    <tr key={wd.id} className="hover:bg-slate-800/40 transition">
                      {/* 1. ID & No. Penarikan */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-400">{wd.withdrawal_number}</span>
                          <button
                            onClick={() => handleCopy(wd.withdrawal_number, 'No. Penarikan')}
                            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
                            title="Salin No. Penarikan"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Tiket #{wd.id}</span>
                      </td>

                      {/* 2. Pelanggan */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-white">{wd.user_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{wd.user_phone}</p>
                        {typeof wd.user_balance === 'number' && (
                          <span className="text-[10px] text-emerald-400/90 font-mono">
                            Saldo: {formatRupiah(wd.user_balance)}
                          </span>
                        )}
                      </td>

                      {/* 3. Nominal Penarikan */}
                      <td className="px-4 py-3.5 font-mono">
                        <p className="font-bold text-emerald-400 text-sm">{formatRupiah(wd.amount)}</p>
                        {wd.fee > 0 && (
                          <p className="text-[10px] text-slate-400">Biaya: {formatRupiah(wd.fee)}</p>
                        )}
                      </td>

                      {/* 4. Bank & Rekening Tujuan */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-[10px]">
                            {wd.bank_name}
                          </span>
                          <span className="font-mono text-slate-300">{wd.account_number}</span>
                          <button
                            onClick={() => handleCopy(wd.account_number, 'Rekening')}
                            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
                            title="Salin Nomor Rekening"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">a.n. {wd.account_holder_name}</p>
                      </td>

                      {/* 5. Waktu Pengajuan */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {wd.created_at}
                      </td>

                      {/* 6. Status Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isPending ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{wd.status}</span>
                        </span>
                        {isRejected && wd.rejection_reason && (
                          <p className="text-[10px] text-rose-400/90 mt-1 max-w-xs truncate" title={wd.rejection_reason}>
                            {wd.rejection_reason}
                          </p>
                        )}
                        {isSuccess && wd.approved_by_name && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Oleh: @{wd.approved_by_name}
                          </p>
                        )}
                      </td>

                      {/* 7. Tombol Aksi Verifikasi */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Tombol Lihat Detail */}
                          <button
                            onClick={() => handleOpenDetail(wd)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Lihat Rincian Penarikan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isPending ? (
                            <>
                              {/* Tombol Setujui */}
                              <button
                                onClick={() => handleOpenApproveModal(wd)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition"
                                title="Setujui Penarikan"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>

                              {/* Tombol Tolak */}
                              <button
                                onClick={() => handleOpenRejectModal(wd)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium text-xs transition"
                                title="Tolak Penarikan"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 px-2 py-1 italic">
                              {isSuccess ? 'Ditransfer' : 'Dibatalkan'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong> ({totalRecords} total data)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-2 font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL C: DETAIL PENARIKAN (DETAIL DRAWER / MODAL) */}
      {isDetailModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {selectedWithdrawal.withdrawal_number}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedWithdrawal.status === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : selectedWithdrawal.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {selectedWithdrawal.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">Rincian Permohonan Penarikan</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Data Pelanggan */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <User className="w-3.5 h-3.5" />
                  <span>Informasi Akun Pemohon</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Nama Lengkap</span>
                    <strong className="text-white text-xs">{selectedWithdrawal.user_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Nomor HP</span>
                    <span className="font-mono text-white text-xs">{selectedWithdrawal.user_phone}</span>
                  </div>
                  {selectedWithdrawal.user_email && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Email Terdaftar</span>
                      <span className="text-slate-300">{selectedWithdrawal.user_email}</span>
                    </div>
                  )}
                  {typeof selectedWithdrawal.user_balance === 'number' && (
                    <div className="col-span-2 pt-1 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Saldo Aktif Akun Saat Ini</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        {formatRupiah(selectedWithdrawal.user_balance)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Rekening Tujuan */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Tujuan Transfer Bank / E-Wallet</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Penyedia / Bank</span>
                    <strong className="text-white">{selectedWithdrawal.bank_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Nomor Rekening / Akun</span>
                    <div className="flex items-center gap-1 font-mono text-white">
                      <span>{selectedWithdrawal.account_number}</span>
                      <button
                        onClick={() => handleCopy(selectedWithdrawal.account_number, 'Rekening')}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 block">Atas Nama Pemilik Rekening</span>
                    <strong className="text-amber-300">{selectedWithdrawal.account_holder_name}</strong>
                  </div>
                </div>
              </div>

              {/* Nominal & Biaya */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Nominal Transaksi</span>
                </div>
                <div className="space-y-1.5 pt-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nominal Penarikan Diajukan:</span>
                    <strong className="font-mono text-white">{formatRupiah(selectedWithdrawal.amount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Biaya Administrasi:</span>
                    <span className="font-mono text-slate-300">{formatRupiah(selectedWithdrawal.fee)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-800">
                    <span className="font-semibold text-white">Total Dana Ditransfer:</span>
                    <strong className="font-mono text-emerald-400 text-sm">
                      {formatRupiah(
                        selectedWithdrawal.net_amount ||
                          selectedWithdrawal.amount - (selectedWithdrawal.fee || 0)
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Jejak Waktu & Verifikator */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Waktu Pengajuan:</span>
                  <span className="font-mono text-slate-200">{selectedWithdrawal.created_at}</span>
                </div>
                {selectedWithdrawal.updated_at && (
                  <div className="flex justify-between">
                    <span>Terakhir Diperbarui:</span>
                    <span className="font-mono text-slate-200">{selectedWithdrawal.updated_at}</span>
                  </div>
                )}
                {selectedWithdrawal.approved_by_name && (
                  <div className="flex justify-between">
                    <span>Admin Verifikator:</span>
                    <strong className="text-blue-400">@{selectedWithdrawal.approved_by_name}</strong>
                  </div>
                )}
                {selectedWithdrawal.rejection_reason && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-rose-400 font-semibold block mb-0.5">Alasan Penolakan:</span>
                    <p className="text-rose-300 italic bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      "{selectedWithdrawal.rejection_reason}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>

              {(selectedWithdrawal.status === 'PENDING' || selectedWithdrawal.status === 'PROCESSING') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenRejectModal(selectedWithdrawal);
                    }}
                    className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition"
                  >
                    Tolak Penarikan
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenApproveModal(selectedWithdrawal);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    Setujui & Transfer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL D.1: KONFIRMASI APPROVE / SETUJUI PENARIKAN */}
      {approveConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Konfirmasi Persetujuan Penarikan</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pastikan transfer dana perbankan telah siap sebelum menyetujui transaksi ini.
                </p>
              </div>

              {/* Rincian Konfirmasi */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Penarikan:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {approveConfirmItem.withdrawal_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pelanggan:</span>
                  <span className="font-semibold text-white">{approveConfirmItem.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tujuan Transfer:</span>
                  <span className="text-slate-200">
                    {approveConfirmItem.bank_name} - {approveConfirmItem.account_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Atas Nama:</span>
                  <span className="text-amber-300 font-semibold">
                    {approveConfirmItem.account_holder_name}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="font-bold text-white">Nominal Yang Disetujui:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {formatRupiah(approveConfirmItem.amount)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Tindakan ini akan memvalidasi status <strong>SUCCESS</strong> dan mencatat transaksi ke mutasi saldo secara permanen di database. Tindakan tidak dapat dibatalkan.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveConfirmItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteApprove}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Ya, Setujui Penarikan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D.2: KONFIRMASI REJECT / PENOLAKAN DENGAN ALASAN */}
      {rejectConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tolak Permohonan Penarikan</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {rejectConfirmItem.withdrawal_number}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Nominal yang akan ditolak: <strong className="text-rose-400 font-mono">{formatRupiah(rejectConfirmItem.amount)}</strong> untuk pengguna <strong className="text-white">{rejectConfirmItem.user_name}</strong>.
              </p>

              {/* Form Input Alasan Penolakan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Alasan Penolakan (Wajib Diisi):
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError('');
                  }}
                  placeholder="Contoh: Nomor rekening tidak sesuai dengan nama pemilik akun KTP, atau rekening tujuan sedang diblokir oleh pihak bank."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition resize-none"
                />
                {rejectionError && (
                  <p className="text-[11px] text-rose-400 font-semibold">{rejectionError}</p>
                )}
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <span>
                  Jika saldo nasabah sempat terpotong saat tiket diajukan, penolakan ini akan secara atomik melakukan <strong>REFUND</strong> saldo kembali ke akun pengguna.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectConfirmItem(null);
                  setRejectionReason('');
                  setRejectionError('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Konfirmasi Penolakan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default WithdrawalsView;
