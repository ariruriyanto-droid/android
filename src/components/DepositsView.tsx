import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  AlertCircle,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  Copy,
  AlertTriangle,
  BookOpen,
  Filter,
  RotateCcw,
} from 'lucide-react';
import type {
  DepositItem,
  DepositSummary,
  BalanceMutationItem,
} from '../types';
import {
  fetchDeposits,
  approveDeposit,
  rejectDeposit,
  fetchBalanceMutations,
} from '../services/api';

interface DepositsViewProps {
  onNotify?: (message: string) => void;
  onDepositsChange?: () => void;
}

export const DepositsView: React.FC<DepositsViewProps> = ({
  onNotify,
  onDepositsChange,
}) => {
  // Navigation Tabs: 'deposits' (Antrean Tiket) vs 'ledger' (Buku Kas Mutasi)
  const [activeSubTab, setActiveSubTab] = useState<'deposits' | 'ledger'>('deposits');

  // --- TAB 1: ANTREAN DEPOSIT STATES ---
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SUCCESS' | 'REJECTED' | 'EXPIRED'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [summary, setSummary] = useState<DepositSummary>({
    total_success_amount: 0,
    total_success_count: 0,
    total_pending_amount: 0,
    total_pending_count: 0,
    total_rejected_amount: 0,
    total_rejected_count: 0,
    total_expired_count: 0,
    verification_rate: 100,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedDeposit, setSelectedDeposit] = useState<DepositItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [approveConfirmItem, setApproveConfirmItem] = useState<DepositItem | null>(null);
  const [rejectConfirmItem, setRejectConfirmItem] = useState<DepositItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- TAB 2: BUKU KAS MUTASI (BALANCE MUTATIONS) STATES ---
  const [mutSearch, setMutSearch] = useState('');
  const [mutTypeFilter, setMutTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [mutRefTypeFilter, setMutRefTypeFilter] = useState<string>('ALL');
  const [mutStartDate, setMutStartDate] = useState('');
  const [mutEndDate, setMutEndDate] = useState('');
  const [mutPage, setMutPage] = useState(1);
  const [mutLimit, setMutLimit] = useState(15);

  const [mutations, setMutations] = useState<BalanceMutationItem[]>([]);
  const [mutSummary, setMutSummary] = useState<{
    total_credit: number;
    total_debit: number;
    count_credit: number;
    count_debit: number;
  }>({
    total_credit: 0,
    total_debit: 0,
    count_credit: 0,
    count_debit: 0,
  });
  const [mutTotalPages, setMutTotalPages] = useState(1);
  const [mutTotalRecords, setMutTotalRecords] = useState(0);
  const [isMutLoading, setIsMutLoading] = useState(false);

  // Helper notification
  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify(`Teks "${text}" berhasil disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- FETCH DEPOSIT QUEUE ---
  const loadDeposits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDeposits({
        search,
        status: statusFilter,
        payment_method: methodFilter,
        start_date: startDate,
        end_date: endDate,
        page: currentPage,
        limit: pageSize,
      });

      if (res.success) {
        setDeposits(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.total_pages);
          setTotalRecords(res.pagination.total_records);
        }
      }
    } catch (err: any) {
      console.error('Error fetching deposits:', err);
      setError(err.message || 'Gagal mengambil data tiket deposit.');
      notify(err.message || 'Gagal memuat antrean tiket deposit.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, methodFilter, startDate, endDate, currentPage, pageSize]);

  // --- FETCH BALANCE MUTATIONS ---
  const loadMutations = useCallback(async () => {
    setIsMutLoading(true);
    try {
      const res = await fetchBalanceMutations({
        search: mutSearch,
        type: mutTypeFilter,
        reference_type: mutRefTypeFilter,
        start_date: mutStartDate,
        end_date: mutEndDate,
        page: mutPage,
        limit: mutLimit,
      });

      if (res.success) {
        setMutations(res.data);
        if (res.summary) {
          setMutSummary(res.summary);
        }
        if (res.pagination) {
          setMutTotalPages(res.pagination.total_pages);
          setMutTotalRecords(res.pagination.total_records);
        }
      }
    } catch (err: any) {
      console.error('Error fetching balance mutations:', err);
      notify(err.message || 'Gagal memuat data buku kas mutasi.');
    } finally {
      setIsMutLoading(false);
    }
  }, [mutSearch, mutTypeFilter, mutRefTypeFilter, mutStartDate, mutEndDate, mutPage, mutLimit]);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  useEffect(() => {
    if (activeSubTab === 'ledger') {
      loadMutations();
    }
  }, [activeSubTab, loadMutations]);

  // --- ACTIONS: APPROVE DEPOSIT ---
  const handleApprove = async () => {
    if (!approveConfirmItem) return;
    setIsSubmitting(true);
    try {
      const res = await approveDeposit(approveConfirmItem.id);
      if (res.success) {
        notify(res.message || `Deposit #${approveConfirmItem.deposit_number} berhasil disetujui.`);
        setApproveConfirmItem(null);
        loadDeposits();
        if (onDepositsChange) onDepositsChange();
      }
    } catch (err: any) {
      notify(err.message || 'Gagal menyetujui tiket deposit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTIONS: REJECT DEPOSIT ---
  const handleReject = async () => {
    if (!rejectConfirmItem) return;
    const cleanReason = rejectionReason.trim();
    if (!cleanReason || cleanReason.length < 5) {
      setRejectionError('Alasan penolakan wajib diisi minimal 5 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await rejectDeposit(rejectConfirmItem.id, cleanReason);
      if (res.success) {
        notify(res.message || `Deposit #${rejectConfirmItem.deposit_number} berhasil ditolak.`);
        setRejectConfirmItem(null);
        setRejectionReason('');
        setRejectionError('');
        loadDeposits();
        if (onDepositsChange) onDepositsChange();
      }
    } catch (err: any) {
      notify(err.message || 'Gagal menolak tiket deposit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleResetMutFilters = () => {
    setMutSearch('');
    setMutTypeFilter('ALL');
    setMutRefTypeFilter('ALL');
    setMutStartDate('');
    setMutEndDate('');
    setMutPage(1);
  };

  return (
    <div id="deposits-view-container" className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div id="deposits-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Manajemen Deposit & Buku Kas Saldo</h1>
              <p className="text-sm text-slate-400">
                Verifikasi tiket top-up saldo nasabah, eksekusi kredit atomik, dan audit buku kas mutasi
              </p>
            </div>
          </div>
        </div>

        {/* Subtab Navigation Buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            id="tab-btn-deposits"
            onClick={() => setActiveSubTab('deposits')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Antrean Deposit</span>
            {summary.total_pending_count > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                {summary.total_pending_count}
              </span>
            )}
          </button>
          <button
            id="tab-btn-ledger"
            onClick={() => setActiveSubTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Buku Kas Mutasi</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS SECTION */}
      <div id="deposits-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Deposit Sukses */}
        <div id="card-total-success-deposit" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Deposit Sukses</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Rp{summary.total_success_amount.toLocaleString('id-ID')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">{summary.total_success_count} Transaksi</span>
              <span>kredit disetujui</span>
            </p>
          </div>
        </div>

        {/* Card 2: Antrean Menunggu Verifikasi */}
        <div id="card-pending-deposit-queue" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Antrean Pending</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className={`w-5 h-5 ${summary.total_pending_count > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-amber-400 tracking-tight">
              Rp{summary.total_pending_amount.toLocaleString('id-ID')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-amber-400 font-semibold">{summary.total_pending_count} Tiket</span>
              <span>menunggu approval</span>
            </p>
          </div>
        </div>

        {/* Card 3: Ditolak & Expired */}
        <div id="card-rejected-expired-deposit" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ditolak & Kedaluwarsa</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {summary.total_rejected_count + summary.total_expired_count} Tiket
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-rose-400 font-medium">{summary.total_rejected_count} Ditolak</span>
              <span>•</span>
              <span className="text-slate-400 font-medium">{summary.total_expired_count} Expired</span>
            </p>
          </div>
        </div>

        {/* Card 4: Tingkat Verifikasi Kas */}
        <div id="card-verification-rate" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tingkat Verifikasi</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-blue-400 tracking-tight">
              {summary.verification_rate}%
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{summary.total_success_count + summary.total_rejected_count} tiket</span>
              <span>telah diproses verifikator</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. MAIN TAB CONTENT */}
      {activeSubTab === 'deposits' ? (
        /* ================= SUBTAB 1: ANTREAN TIKET DEPOSIT ================= */
        <div id="deposits-queue-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Filter Bar */}
          <div id="deposits-filter-bar" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="deposit-search-input"
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari No. Deposit, Nama, No. HP..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                id="deposit-status-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">PENDING (Menunggu)</option>
                <option value="SUCCESS">SUCCESS (Disetujui)</option>
                <option value="REJECTED">REJECTED (Ditolak)</option>
                <option value="EXPIRED">EXPIRED (Kedaluwarsa)</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <select
                id="deposit-method-select"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">Semua Metode</option>
                <option value="BCA">BCA Transfer</option>
                <option value="Mandiri">Mandiri</option>
                <option value="BRI">BRI</option>
                <option value="BNI">BNI</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                id="deposit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Action Buttons: Refresh & Reset */}
            <div className="flex items-center gap-2">
              <button
                id="deposit-reset-btn"
                onClick={handleResetFilters}
                title="Reset Filter"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                id="deposit-refresh-btn"
                onClick={() => loadDeposits()}
                title="Muat Ulang Data"
                className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Message if any */}
          {error && (
            <div id="deposits-error-banner" className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => loadDeposits()}
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Table Container */}
          <div id="deposits-table-wrapper" className="overflow-x-auto rounded-xl border border-slate-800">
            <table id="deposits-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">No. Tiket Deposit</th>
                  <th className="py-3.5 px-4">Data Nasabah</th>
                  <th className="py-3.5 px-4">Nominal & Transfer</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Waktu Pengajuan</th>
                  <th className="py-3.5 px-4 text-center">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                        <span>Memuat data antrean tiket deposit...</span>
                      </div>
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ArrowDownToLine className="w-8 h-8 text-slate-600" />
                        <span className="font-medium text-slate-300">Tidak ada tiket deposit ditemukan</span>
                        <span className="text-xs text-slate-500">Sesuaikan filter atau kata kunci pencarian Anda.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  deposits.map((item) => {
                    const isPending = item.status === 'PENDING';
                    const isSuccess = item.status === 'SUCCESS';
                    const isRejected = item.status === 'REJECTED';
                    const isExpired = item.status === 'EXPIRED';

                    return (
                      <tr
                        key={item.id}
                        id={`deposit-row-${item.id}`}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Tiket Deposit */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-200">
                              {item.deposit_number}
                            </span>
                            <button
                              onClick={() => handleCopy(item.deposit_number, `dep-${item.id}`)}
                              title="Salin No. Tiket"
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {copiedId === `dep-${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-xs text-slate-500">ID Database #{item.id}</span>
                        </td>

                        {/* 2. Data Nasabah */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">{item.user_name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{item.user_phone}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono">
                              Saldo: Rp{(item.user_balance || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </td>

                        {/* 3. Nominal Pokok & Kode Unik */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">
                            Rp{item.amount.toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>Kode: +{item.unique_code}</span>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold">
                              Total: Rp{item.total_payment.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </td>

                        {/* 4. Metode Bayar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <CreditCard className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-sm">{item.payment_method}</span>
                          </div>
                        </td>

                        {/* 5. Status Badge */}
                        <td className="py-3.5 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              SUCCESS
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              REJECTED
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
                              <AlertCircle className="w-3 h-3" />
                              EXPIRED
                            </span>
                          )}
                          {item.approved_by_name && (
                            <div className="text-[11px] text-slate-500 mt-1">
                              Oleh: {item.approved_by_name}
                            </div>
                          )}
                        </td>

                        {/* 6. Waktu Pengajuan */}
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          <div>{item.created_at.replace('T', ' ').slice(0, 19)}</div>
                          {item.updated_at && item.updated_at !== item.created_at && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Update: {item.updated_at.replace('T', ' ').slice(0, 19)}
                            </div>
                          )}
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Detail */}
                            <button
                              id={`btn-view-detail-${item.id}`}
                              onClick={() => {
                                setSelectedDeposit(item);
                                setIsDetailModalOpen(true);
                              }}
                              title="Lihat Detail Tiket"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Approve (Only if PENDING) */}
                            {isPending ? (
                              <button
                                id={`btn-approve-${item.id}`}
                                onClick={() => setApproveConfirmItem(item)}
                                title="Setujui Deposit & Tambah Saldo"
                                className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : null}

                            {/* Reject (Only if PENDING) */}
                            {isPending ? (
                              <button
                                id={`btn-reject-${item.id}`}
                                onClick={() => {
                                  setRejectConfirmItem(item);
                                  setRejectionReason('');
                                  setRejectionError('');
                                }}
                                title="Tolak Tiket Deposit"
                                className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div id="deposits-pagination" className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-400">
              Menampilkan <span className="font-semibold text-white">{deposits.length}</span> dari{' '}
              <span className="font-semibold text-white">{totalRecords}</span> tiket deposit
            </div>

            <div className="flex items-center gap-2">
              <button
                id="deposit-prev-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-300 px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                id="deposit-next-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SUBTAB 2: BUKU KAS MUTASI SALDO ================= */
        <div id="mutations-ledger-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Summary Mini Cards for Mutations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Kredit (Kas Masuk)</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                +Rp{mutSummary.total_credit.toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-slate-500">{mutSummary.count_credit} mutasi kredit</span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Debit (Kas Keluar)</span>
              <div className="text-xl font-bold text-rose-400 mt-1">
                -Rp{mutSummary.total_debit.toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-slate-500">{mutSummary.count_debit} mutasi debit</span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Arus Kas Bersih (Net Cashflow)</span>
              <div className={`text-xl font-bold mt-1 ${mutSummary.total_credit >= mutSummary.total_debit ? 'text-blue-400' : 'text-amber-400'}`}>
                Rp{(mutSummary.total_credit - mutSummary.total_debit).toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-slate-500">Saldo kredit - saldo debit</span>
            </div>
          </div>

          {/* Filter Bar for Mutations */}
          <div id="mutations-filter-bar" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="mut-search-input"
                type="text"
                value={mutSearch}
                onChange={(e) => {
                  setMutSearch(e.target.value);
                  setMutPage(1);
                }}
                placeholder="Cari Referensi, Keterangan, Nasabah..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                id="mut-type-select"
                value={mutTypeFilter}
                onChange={(e) => {
                  setMutTypeFilter(e.target.value as any);
                  setMutPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="ALL">Semua Tipe Mutasi</option>
                <option value="CREDIT">CREDIT (Masuk)</option>
                <option value="DEBIT">DEBIT (Keluar)</option>
              </select>
            </div>

            {/* Reference Type Filter */}
            <div>
              <select
                id="mut-ref-select"
                value={mutRefTypeFilter}
                onChange={(e) => {
                  setMutRefTypeFilter(e.target.value);
                  setMutPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="ALL">Semua Referensi</option>
                <option value="DEPOSIT">DEPOSIT</option>
                <option value="TRANSACTION">TRANSACTION</option>
                <option value="WITHDRAWAL">WITHDRAWAL</option>
                <option value="MANUAL_ADJUSTMENT">MANUAL ADJUSTMENT</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <input
                id="mut-start-date"
                type="date"
                value={mutStartDate}
                onChange={(e) => {
                  setMutStartDate(e.target.value);
                  setMutPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Reset & Refresh */}
            <div className="flex items-center gap-2">
              <button
                id="mut-reset-btn"
                onClick={handleResetMutFilters}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                id="mut-refresh-btn"
                onClick={() => loadMutations()}
                className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isMutLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mutations Table */}
          <div id="mutations-table-wrapper" className="overflow-x-auto rounded-xl border border-slate-800">
            <table id="mutations-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Nasabah</th>
                  <th className="py-3.5 px-4">Tipe & Nominal</th>
                  <th className="py-3.5 px-4">Rekonsiliasi Saldo</th>
                  <th className="py-3.5 px-4">Referensi</th>
                  <th className="py-3.5 px-4">Keterangan Buku Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {isMutLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                        <span>Memuat buku kas mutasi saldo...</span>
                      </div>
                    </td>
                  </tr>
                ) : mutations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BookOpen className="w-8 h-8 text-slate-600" />
                        <span className="font-medium text-slate-300">Belum ada catatan mutasi saldo</span>
                        <span className="text-xs text-slate-500">Mutasi otomatis tercatat saat deposit disetujui atau transaksi dieksekusi.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  mutations.map((m) => (
                    <tr key={m.id} id={`mutation-row-${m.id}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                        {m.created_at.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{m.user_name || `User #${m.user_id}`}</div>
                        <div className="text-xs text-slate-500">{m.user_phone || `ID: ${m.user_id}`}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.type === 'CREDIT' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-bold text-emerald-400 font-mono">
                              +Rp{m.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-rose-500/10 text-rose-400 rounded">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-bold text-rose-400 font-mono">
                              -Rp{m.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="text-slate-400">Sebelum: Rp{m.balance_before.toLocaleString('id-ID')}</div>
                        <div className="text-slate-200 font-semibold mt-0.5">Sesudah: Rp{m.balance_after.toLocaleString('id-ID')}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {m.reference_type}
                        </span>
                        <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                          <span>{m.reference_id}</span>
                          <button
                            onClick={() => handleCopy(m.reference_id, `mut-${m.id}`)}
                            title="Salin Referensi"
                            className="text-slate-500 hover:text-slate-300"
                          >
                            {copiedId === `mut-${m.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs truncate" title={m.description}>
                        {m.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for Mutations */}
          <div id="mutations-pagination" className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-400">
              Menampilkan <span className="font-semibold text-white">{mutations.length}</span> dari{' '}
              <span className="font-semibold text-white">{mutTotalRecords}</span> mutasi saldo
            </div>

            <div className="flex items-center gap-2">
              <button
                id="mut-prev-page-btn"
                onClick={() => setMutPage((p) => Math.max(1, p - 1))}
                disabled={mutPage <= 1 || isMutLoading}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-300 px-2">
                Halaman {mutPage} dari {mutTotalPages}
              </span>
              <button
                id="mut-next-page-btn"
                onClick={() => setMutPage((p) => Math.min(mutTotalPages, p + 1))}
                disabled={mutPage >= mutTotalPages || isMutLoading}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: DETAIL DEPOSIT ================= */}
      {isDetailModalOpen && selectedDeposit && (
        <div
          id="modal-deposit-detail-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-deposit-detail-content"
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Detail Tiket Deposit</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    #{selectedDeposit.deposit_number}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400">Nama Nasabah:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedDeposit.user_name}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Nomor Telepon:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedDeposit.user_phone}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Saldo Terkini Akun:</span>
                  <p className="font-semibold text-emerald-400 mt-0.5">
                    Rp{(selectedDeposit.user_balance || 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Metode Bayar:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedDeposit.payment_method}</p>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Nominal Pokok:</span>
                  <span className="font-mono text-white text-sm font-semibold">
                    Rp{selectedDeposit.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Kode Unik Transfer:</span>
                  <span className="font-mono text-amber-400 text-sm font-semibold">
                    +{selectedDeposit.unique_code}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Total Tagihan Transfer:</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    Rp{selectedDeposit.total_payment.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Status Tiket:</span>
                  <span className="font-semibold text-white">{selectedDeposit.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu Pengajuan:</span>
                  <span className="text-slate-300 font-mono">{selectedDeposit.created_at}</span>
                </div>
                {selectedDeposit.approved_by_name && (
                  <div className="flex justify-between">
                    <span>Verifikator:</span>
                    <span className="text-emerald-400 font-semibold">{selectedDeposit.approved_by_name}</span>
                  </div>
                )}
                {selectedDeposit.rejection_reason && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 mt-2">
                    <span className="font-semibold block mb-1">Alasan Penolakan:</span>
                    {selectedDeposit.rejection_reason}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-close-detail-modal"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: KONFIRMASI APPROVE ================= */}
      {approveConfirmItem && (
        <div
          id="modal-approve-confirm-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-approve-confirm-content"
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Konfirmasi Persetujuan Deposit</h3>
                <p className="text-xs text-slate-400">Verifikasi manual dana nasabah masuk</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">No. Tiket:</span>
                <span className="font-mono font-bold text-white">{approveConfirmItem.deposit_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Nasabah:</span>
                <span className="font-semibold text-white">{approveConfirmItem.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Kredit Saldo:</span>
                <span className="font-mono font-bold text-emerald-400">
                  Rp{approveConfirmItem.amount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Metode Bayar:</span>
                <span className="text-slate-200">{approveConfirmItem.payment_method}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Sistem akan mengkredit saldo nasabah secara atomik (ACID) dan otomatis mencatat mutasi kas masuk (CREDIT).
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-cancel-approve"
                type="button"
                onClick={() => setApproveConfirmItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-confirm-approve"
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Ya, Setujui & Tambah Saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: KONFIRMASI REJECT ================= */}
      {rejectConfirmItem && (
        <div
          id="modal-reject-confirm-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="modal-reject-confirm-content"
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Tolak Tiket Deposit</h3>
                <p className="text-xs text-slate-400">
                  Tiket #{rejectConfirmItem.deposit_number} (Rp{rejectConfirmItem.amount.toLocaleString('id-ID')})
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="rejection-reason-input" className="block text-xs font-semibold text-slate-300">
                Alasan Penolakan Tiket <span className="text-rose-400">*</span> (Minimal 5 karakter)
              </label>
              <textarea
                id="rejection-reason-input"
                rows={3}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (e.target.value.trim().length >= 5) setRejectionError('');
                }}
                placeholder="Contoh: Bukti mutasi transfer bank tidak ditemukan di rekening penerima..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              <div className="flex justify-between items-center text-xs">
                <span className={rejectionError ? 'text-rose-400' : 'text-slate-500'}>
                  {rejectionError || `${rejectionReason.trim().length}/5 karakter minimum`}
                </span>
                <span className="text-slate-500 text-[11px]">Saldo user tidak akan berubah</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-cancel-reject"
                type="button"
                onClick={() => {
                  setRejectConfirmItem(null);
                  setRejectionReason('');
                  setRejectionError('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-confirm-reject"
                type="button"
                onClick={handleReject}
                disabled={isSubmitting || rejectionReason.trim().length < 5}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menolak...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Tolak Deposit</span>
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
