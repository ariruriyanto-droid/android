import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  User,
  Phone,
  Mail,
  Zap,
  Tag,
  Hash,
  ArrowUpDown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { TransactionItem } from '../types';
import {
  getAdminTransactions,
  simulateWebhookCallback,
  FetchTransactionsParams,
  FetchTransactionsResponse,
} from '../services/api';

interface TransactionsViewProps {
  onRefreshStats?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onRefreshStats }) => {
  // State Filter & Pencarian
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);

  // State Data & Status Request
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<FetchTransactionsResponse['pagination']>({
    current_page: 1,
    per_page: 10,
    total_records: 0,
    total_pages: 1,
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // State Modal Detail Transaksi
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // State Double-Submit Guard untuk aksi transaksi/callback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset pesan aksi saat modal transaksi ditutup atau berganti
  useEffect(() => {
    setActionMessage(null);
  }, [selectedTx]);

  // Debounce input pencarian
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1); // Reset ke halaman 1 saat keyword berubah
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fungsi fetch data dari API Backend
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: FetchTransactionsParams = {
      search: debouncedSearch,
      status: selectedStatus,
      category: selectedCategory,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page: currentPage,
      limit: perPage,
    };

    try {
      const res = await getAdminTransactions(params);
      if (res && res.success) {
        setTransactions(res.data);
        setResponseMeta(res.pagination);
      } else {
        setError('Gagal memuat daftar transaksi dari server.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan jaringan saat mengambil data transaksi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, selectedStatus, selectedCategory, startDate, endDate, currentPage, perPage]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadTransactions();
    if (onRefreshStats) onRefreshStats();
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedStatus('ALL');
    setSelectedCategory('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== '' ||
    selectedStatus !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Handler Aksi Transaksi dengan Double-Submit Guard Ketat
  const handleResolveTransaction = async (targetStatus: 'SUCCESS' | 'FAILED') => {
    // Cegah double submit dari rapid clicking jika sedang memproses
    if (!selectedTx || isSubmitting) return;

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await simulateWebhookCallback({
        type: 'PPOB',
        invoice_number: selectedTx.invoice_number,
        status: targetStatus,
        sn_token: targetStatus === 'SUCCESS' ? `SN-${Date.now()}` : undefined,
        failure_reason: targetStatus === 'FAILED' ? 'Dibatalkan oleh Admin (Simulasi Pengujian)' : undefined,
      });

      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: res.message || `Status transaksi berhasil diubah ke ${targetStatus}.`,
        });

        // Mutasi status lokal murni mengikuti respons backend
        setSelectedTx((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: targetStatus === 'FAILED' ? 'REFUNDED' : 'SUCCESS',
            sn_token: targetStatus === 'SUCCESS' ? (res.data?.sn_token || `SN-${Date.now()}`) : prev.sn_token,
            failure_reason: targetStatus === 'FAILED' ? 'Dibatalkan oleh Admin (Simulasi Pengujian)' : prev.failure_reason,
          };
        });

        // Muat ulang daftar transaksi & statistik admin
        loadTransactions();
        if (onRefreshStats) onRefreshStats();
      } else {
        setActionMessage({
          type: 'error',
          text: res.message || 'Gagal memproses pembaruan status transaksi.',
        });
      }
    } catch (err: any) {
      // Pulihkan kontrol jika request gagal
      setActionMessage({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan komunikasi dengan server saat memproses transaksi.',
      });
    } finally {
      // Tombol selalu dipulihkan baik sukses maupun gagal
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: TransactionItem['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            REFUNDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (category?: string) => {
    const cat = (category || 'LAINNYA').toUpperCase();
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    if (cat === 'PULSA') bg = 'bg-sky-50 text-sky-700 border-sky-200';
    if (cat === 'DATA') bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (cat === 'PLN') bg = 'bg-amber-50 text-amber-800 border-amber-200';
    if (cat === 'EMONEY') bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${bg}`}>
        {cat}
      </span>
    );
  };

  return (
    <div id="admin-transactions-view" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Manajemen Transaksi
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Live Data API
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Pantau seluruh riwayat transaksi produk digital & PPOB, verifikasi status, dan audit metadata secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="refresh-transactions-btn"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50"
              title="Sinkronisasi data langsung dengan backend PostgreSQL"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
              <span>{refreshing ? 'Menyinkronkan...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
          {/* Pencarian */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pencarian (ID, Invoice, Pengguna, Target)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-transactions-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari ID, INV-..., Nama, atau No. HP..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Status */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status Transaksi
            </label>
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUCCESS">SUCCESS (Berhasil)</option>
              <option value="PENDING">PENDING (Menunggu)</option>
              <option value="FAILED">FAILED (Gagal)</option>
              <option value="REFUNDED">REFUNDED (Dikembalikan)</option>
            </select>
          </div>

          {/* Filter Jenis Transaksi */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Jenis Transaksi
            </label>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="PULSA">Pulsa Reguler</option>
              <option value="DATA">Paket Data</option>
              <option value="PLN">Token Listrik PLN</option>
              <option value="EMONEY">E-Money / Dompet Digital</option>
            </select>
          </div>

          {/* Rentang Tanggal Mulai */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Rentang Tanggal Selesai */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {hasActiveFilters && (
                <button
                  id="reset-filters-btn"
                  onClick={handleResetFilters}
                  title="Reset Semua Filter"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex-shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informasi Filter Aktif */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-dashed border-slate-100 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Filter Aktif:</span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                Pencarian: "{debouncedSearch}"
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                Status: {selectedStatus}
              </span>
            )}
            {selectedCategory !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                Jenis: {selectedCategory}
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                Periode: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline ml-1"
            >
              Hapus Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* State: Error */}
        {error && (
          <div className="p-6 bg-rose-50 border-b border-rose-200 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-rose-900">Gagal Mengambil Data Transaksi</h4>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
                <button
                  onClick={loadTransactions}
                  className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Coba Muat Ulang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Loading Skeleton */}
        {loading && (
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
            </div>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="space-y-2 w-1/4">
                  <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-24 animate-pulse" />
                </div>
                <div className="space-y-2 w-1/4">
                  <div className="h-4 bg-slate-200 rounded w-28 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-20 animate-pulse" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
                <div className="h-6 bg-slate-200 rounded-full w-24 animate-pulse" />
                <div className="h-8 bg-slate-200 rounded-lg w-16 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* State: Empty Data */}
        {!loading && !error && transactions.length === 0 && (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {hasActiveFilters ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Tidak ditemukan data transaksi yang sesuai dengan parameter pencarian atau filter yang Anda pilih.'
                : 'Saat ini belum ada data transaksi yang tersimpan di sistem AriPay.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter Pencarian
              </button>
            )}
          </div>
        )}

        {/* State: Data Ready (Tabel Transaksi) */}
        {!loading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">ID & Invoice</th>
                  <th className="py-3.5 px-4 font-semibold">Waktu Transaksi</th>
                  <th className="py-3.5 px-4 font-semibold">Pengguna</th>
                  <th className="py-3.5 px-4 font-semibold">Produk & Jenis</th>
                  <th className="py-3.5 px-4 font-semibold">Nomor Tujuan</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Nominal</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* ID & Invoice */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs font-mono">
                        {tx.invoice_number}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: #{tx.id}
                      </div>
                    </td>

                    {/* Waktu */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs text-slate-800 font-medium">
                        {formatDate(tx.created_at)}
                      </div>
                    </td>

                    {/* Pengguna */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {tx.user_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {tx.user_phone}
                      </div>
                    </td>

                    {/* Produk & Jenis */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800 truncate max-w-[180px]" title={tx.product_name}>
                        {tx.product_name}
                      </div>
                      <div className="mt-1">
                        {getCategoryBadge(tx.product_category)}
                      </div>
                    </td>

                    {/* Nomor Tujuan */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {tx.target_number}
                    </td>

                    {/* Nominal */}
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 text-xs font-mono whitespace-nowrap">
                      {formatRupiah(tx.price)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(tx.status)}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        id={`btn-detail-tx-${tx.id}`}
                        onClick={() => setSelectedTx(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && !error && transactions.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Menampilkan{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(
                    (responseMeta.current_page - 1) * responseMeta.per_page + 1,
                    responseMeta.total_records
                  )}
                </span>{' '}
                -{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(
                    responseMeta.current_page * responseMeta.per_page,
                    responseMeta.total_records
                  )}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-slate-800">
                  {responseMeta.total_records}
                </span>{' '}
                transaksi
              </span>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5">
                <span>Per halaman:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={responseMeta.current_page <= 1}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors"
                title="Halaman Pertama"
              >
                Pertama
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={responseMeta.current_page <= 1}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-300 rounded">
                Halaman {responseMeta.current_page} dari {responseMeta.total_pages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(responseMeta.total_pages, p + 1))}
                disabled={responseMeta.current_page >= responseMeta.total_pages}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
                title="Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(responseMeta.total_pages)}
                disabled={responseMeta.current_page >= responseMeta.total_pages}
                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors"
                title="Halaman Terakhir"
              >
                Terakhir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Transaksi */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-slate-400">Detail Transaksi</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    ID #{selectedTx.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight mt-0.5 font-mono">
                  {selectedTx.invoice_number}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(selectedTx.status)}
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Box Status Ringkasan */}
              <div
                className={`p-4 rounded-xl border ${
                  selectedTx.status === 'SUCCESS'
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : selectedTx.status === 'PENDING'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : selectedTx.status === 'FAILED'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                    : 'bg-blue-50/60 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">Status Terverifikasi:</span>
                    <span className="font-bold text-sm">{selectedTx.status}</span>
                  </div>
                  <div className="text-xs font-mono">
                    Nominal: <strong className="text-sm font-bold">{formatRupiah(selectedTx.price)}</strong>
                  </div>
                </div>

                {/* Keterangan SN atau Failure Reason */}
                {selectedTx.sn_token && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-emerald-700 font-medium">Serial Number / SN Token:</span>
                      <div className="font-mono font-bold text-emerald-900 text-sm mt-0.5">
                        {selectedTx.sn_token}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedTx.sn_token || '', 'sn')}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 bg-white/80 px-2 py-1 rounded border border-emerald-300 transition-colors"
                    >
                      {copiedField === 'sn' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'sn' ? 'Tersalin' : 'Salin SN'}
                    </button>
                  </div>
                )}

                {selectedTx.failure_reason && (
                  <div className="mt-3 pt-3 border-t border-rose-200/80 text-xs">
                    <span className="text-rose-700 font-semibold">Alasan Kegagalan:</span>
                    <p className="text-rose-900 mt-0.5">{selectedTx.failure_reason}</p>
                  </div>
                )}
              </div>

              {/* Grid 2 Kolom: Info Produk & Info Pengguna */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kolom 1: Rincian Produk */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    Informasi Produk
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Nama Produk</span>
                      <span className="font-semibold text-slate-800 text-sm">{selectedTx.product_name}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-slate-400 block">Kategori</span>
                        <div className="mt-0.5">{getCategoryBadge(selectedTx.product_category)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Brand / Operator</span>
                        <span className="font-medium text-slate-700">{selectedTx.product_brand || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SKU Code</span>
                        <span className="font-mono text-slate-700 font-semibold">{selectedTx.product_sku || '-'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Nomor Tujuan:</span>
                        <button
                          onClick={() => copyToClipboard(selectedTx.target_number, 'target')}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-[11px]"
                        >
                          {copiedField === 'target' ? 'Tersalin' : 'Salin'}
                        </button>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {selectedTx.target_number}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kolom 2: Rincian Pengguna */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    Informasi Pengguna
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 block">Nama Pengguna</span>
                      <span className="font-semibold text-slate-800 text-sm">{selectedTx.user_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-slate-400 text-[11px] block">Nomor Telepon Akun</span>
                        <span className="font-mono font-medium text-slate-700">{selectedTx.user_phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-slate-400 text-[11px] block">Alamat Email</span>
                        <span className="font-medium text-slate-700">
                          {selectedTx.user_email || 'Tidak terdaftar'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                      ID Pengguna di Database: <span className="font-mono font-semibold">#{selectedTx.user_id || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Aksi Khusus Transaksi PENDING dengan Double-Submit Guard */}
              {selectedTx.status === 'PENDING' && (
                <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Tindakan Penyelesaian Transaksi (Admin Guard)
                    </div>
                    <span className="text-[11px] text-amber-700 font-medium">
                      Status Menunggu Konfirmasi Supplier
                    </span>
                  </div>

                  <p className="text-xs text-amber-800">
                    Gunakan aksi di bawah untuk mensimulasikan respons webhook supplier secara aman. Sistem dilengkapi <strong>Double-Submit Guard</strong> untuk mencegah duplikasi eksekusi.
                  </p>

                  {/* Feedback Notifikasi Aksi */}
                  {actionMessage && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                        actionMessage.type === 'success'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {actionMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{actionMessage.text}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleResolveTransaction('SUCCESS')}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isSubmitting ? 'Memproses ke Backend...' : 'Set Sukses (SUCCESS)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResolveTransaction('FAILED')}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{isSubmitting ? 'Memproses ke Backend...' : 'Gagalkan & Auto-Refund (FAILED)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Metadata Teknis Transaksi */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Hash className="w-3.5 h-3.5 text-slate-600" />
                  Metadata & Log Transaksi
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Waktu Dibuat</span>
                    <span className="font-medium text-slate-700">{formatDate(selectedTx.created_at)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Terakhir Diperbarui</span>
                    <span className="font-medium text-slate-700">
                      {selectedTx.updated_at ? formatDate(selectedTx.updated_at) : formatDate(selectedTx.created_at)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Ref Supplier ID</span>
                    <span className="font-mono text-slate-700">
                      {selectedTx.supplier_ref_id || '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Tabel Database</span>
                    <span className="font-mono text-slate-700">transactions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Catatan: Data divalidasi langsung oleh backend AriPay.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    const textSummary = `[ARIPAY TRANSAKSI]\nInvoice: ${selectedTx.invoice_number}\nID: #${selectedTx.id}\nPengguna: ${selectedTx.user_name} (${selectedTx.user_phone})\nProduk: ${selectedTx.product_name}\nTujuan: ${selectedTx.target_number}\nNominal: ${formatRupiah(selectedTx.price)}\nStatus: ${selectedTx.status}\nSN/Token: ${selectedTx.sn_token || '-'}\nWaktu: ${selectedTx.created_at}`;
                    copyToClipboard(textSummary, 'summary');
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                >
                  {copiedField === 'summary' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedField === 'summary' ? 'Ringkasan Tersalin' : 'Salin Ringkasan'}
                </button>

                <button
                  onClick={() => setSelectedTx(null)}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
