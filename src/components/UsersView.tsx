import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  UserCheck,
  UserX,
  Eye,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Receipt,
  Phone,
  Mail,
  User as UserIcon,
  X,
  ArrowRightLeft,
  Wallet,
} from 'lucide-react';
import { UserItem, TransactionItem } from '../types';
import {
  getAdminUsers,
  toggleAdminUserStatus,
  adjustAdminUserBalance,
  getUserTransactions,
  FetchUsersParams,
} from '../services/api';

interface UsersViewProps {
  onNotify?: (message: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ onNotify }) => {
  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State Data & UI
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Detail Pengguna
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserItem | null>(null);
  const [userTransactions, setUserTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Modal Konfirmasi Toggle Status
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    user: UserItem;
    nextState: boolean;
  } | null>(null);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);

  // Modal Koreksi Saldo Manual (Endpoint POST /api/admin/adjust-balance)
  const [adjustmentModalUser, setAdjustmentModalUser] = useState<UserItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isProcessingAdjustment, setIsProcessingAdjustment] = useState(false);

  // Clipboard copy feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Toast internal helper
  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    notify(`${label} disalin ke papan klip.`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Fetch data pengguna dari API
  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const params: FetchUsersParams = {
      search: searchQuery.trim(),
      status: statusFilter,
      start_date: startDate,
      end_date: endDate,
      page: currentPage,
      limit: pageSize,
    };

    try {
      const res = await getAdminUsers(params);
      if (res.success) {
        setUsers(res.data);
        setTotalRecords(res.pagination.total_records);
        setTotalPages(res.pagination.total_pages);
      } else {
        setErrorMessage(res.message || 'Gagal memuat data pengguna.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch ketika filter atau paginasi berubah
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, startDate, endDate, currentPage, pageSize]);

  // Buka detail pengguna dan muat riwayat transaksinya
  const handleOpenDetail = async (user: UserItem) => {
    setSelectedUserForDetail(user);
    setIsLoadingTransactions(true);
    try {
      const txs = await getUserTransactions(user.id);
      setUserTransactions(txs);
    } catch (err) {
      console.error('Error fetching transactions for user', err);
      setUserTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Eksekusi perubahan status akun (Aktif / Nonaktif)
  const handleConfirmToggleStatus = async () => {
    if (!confirmStatusModal) return;
    const { user, nextState } = confirmStatusModal;
    setIsProcessingStatus(true);

    try {
      const res = await toggleAdminUserStatus(user.id, nextState);
      if (res.success) {
        notify(res.message || `Status akun ${user.full_name} berhasil diperbarui.`);
        // Perbarui state lokal seketika
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, is_active: nextState, updated_at: new Date().toISOString() } : u
          )
        );
        if (selectedUserForDetail && selectedUserForDetail.id === user.id) {
          setSelectedUserForDetail({ ...selectedUserForDetail, is_active: nextState });
        }
      } else {
        alert(res.message || 'Gagal mengubah status pengguna.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat memproses status.');
    } finally {
      setIsProcessingStatus(false);
      setConfirmStatusModal(null);
    }
  };

  // Eksekusi koreksi saldo manual
  const handleExecuteAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustmentModalUser) return;

    const amountNum = parseFloat(adjustmentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Nominal harus berupa angka valid lebih dari 0.');
      return;
    }

    if (!adjustmentReason.trim()) {
      alert('Alasan koreksi saldo WAJIB diisi.');
      return;
    }

    if (adjustmentType === 'DEBIT' && adjustmentModalUser.balance < amountNum) {
      alert(
        `Saldo akun tidak mencukupi untuk pemotongan. Saldo saat ini: Rp${adjustmentModalUser.balance.toLocaleString(
          'id-ID'
        )}`
      );
      return;
    }

    setIsProcessingAdjustment(true);

    try {
      const res = await adjustAdminUserBalance({
        userId: adjustmentModalUser.id,
        type: adjustmentType,
        amount: amountNum,
        reason: adjustmentReason.trim(),
      });

      if (res.success) {
        notify(res.message);
        // Refresh daftar data
        fetchUsers();
        if (selectedUserForDetail && selectedUserForDetail.id === adjustmentModalUser.id) {
          const newBal =
            adjustmentType === 'CREDIT'
              ? selectedUserForDetail.balance + amountNum
              : selectedUserForDetail.balance - amountNum;
          setSelectedUserForDetail({ ...selectedUserForDetail, balance: newBal });
        }
        setAdjustmentModalUser(null);
        setAdjustmentAmount('');
        setAdjustmentReason('');
      } else {
        alert(res.message || 'Gagal melakukan koreksi saldo.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat koreksi saldo.');
    } finally {
      setIsProcessingAdjustment(false);
    }
  };

  // Reset semua filter
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-tight">Manajemen Pengguna</h3>
            <span className="bg-blue-500/10 text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/20 font-mono">
              {totalRecords} Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data pengguna riil dari tabel <code>users</code> PostgreSQL. Kelola status akun dan informasi saldo terintegrasi.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Panel Pencarian & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Input Pencarian */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari ID, Nama, No. HP, atau Email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Status Akun */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-xs text-white focus:outline-none py-1 cursor-pointer font-medium"
              >
                <option value="ALL" className="bg-slate-900 text-white">Semua Status</option>
                <option value="ACTIVE" className="bg-slate-900 text-emerald-400">Aktif</option>
                <option value="INACTIVE" className="bg-slate-900 text-rose-400">Nonaktif / Suspended</option>
              </select>
            </div>
          </div>

          {/* Filter Rentang Tanggal Bergabung */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 flex items-center gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 flex items-center gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Hingga:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
              />
            </div>

            {(searchQuery || statusFilter !== 'ALL' || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                title="Reset Semua Filter"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Data Pengguna */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-4 py-3.5 font-semibold">ID</th>
                <th className="px-4 py-3.5 font-semibold">Profil Pengguna</th>
                <th className="px-4 py-3.5 font-semibold">Kontak & Email</th>
                <th className="px-4 py-3.5 font-semibold">Saldo Akun</th>
                <th className="px-4 py-3.5 font-semibold">Status Akun</th>
                <th className="px-4 py-3.5 font-semibold">Bergabung</th>
                <th className="px-4 py-3.5 font-semibold text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded w-8"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded w-32 mb-1.5"></div>
                      <div className="h-3 bg-slate-800/60 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded w-28 mb-1.5"></div>
                      <div className="h-3 bg-slate-800/60 rounded w-36"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 bg-slate-800 rounded-full w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-7 bg-slate-800 rounded-xl w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : errorMessage ? (
                // Error state
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold text-white">Gagal Memuat Data Pengguna</div>
                      <div className="text-xs text-slate-400 max-w-sm">{errorMessage}</div>
                      <button
                        onClick={fetchUsers}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md shadow-blue-600/20"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold text-white">Tidak Ada Pengguna Ditemukan</div>
                      <div className="text-xs text-slate-400">
                        Tidak ada data pengguna yang cocok dengan kriteria pencarian atau filter yang dipilih.
                      </div>
                      {(searchQuery || statusFilter !== 'ALL' || startDate || endDate) && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4"
                        >
                          Bersihkan filter pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition group">
                    {/* ID Pengguna */}
                    <td className="px-4 py-3.5 font-mono text-slate-400 font-semibold">
                      #{user.id}
                    </td>

                    {/* Profil Pengguna */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition flex items-center gap-1.5">
                        {user.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">Role: {user.role}</div>
                    </td>

                    {/* Kontak & Email */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-200 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {user.phone_number}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {user.email || <span className="text-slate-600 italic">Tidak ada email</span>}
                      </div>
                    </td>

                    {/* Saldo Akun */}
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                      Rp{user.balance.toLocaleString('id-ID')}
                    </td>

                    {/* Status Akun */}
                    <td className="px-4 py-3.5">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Tanggal Bergabung */}
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(user.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Tindakan Admin */}
                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Tombol Detail */}
                      <button
                        onClick={() => handleOpenDetail(user)}
                        title="Lihat Detail Profil & Riwayat Transaksi"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition text-xs font-medium border border-slate-700/60"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Detail</span>
                      </button>

                      {/* Tombol Koreksi Saldo */}
                      <button
                        onClick={() => {
                          setAdjustmentModalUser(user);
                          setAdjustmentAmount('');
                          setAdjustmentReason('');
                          setAdjustmentType('CREDIT');
                        }}
                        title="Koreksi Saldo Manual Berizin"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition text-xs font-medium"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Koreksi Saldo</span>
                      </button>

                      {/* Tombol Aktif / Nonaktifkan */}
                      <button
                        onClick={() =>
                          setConfirmStatusModal({
                            user,
                            nextState: !user.is_active,
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition text-xs font-medium border ${
                          user.is_active
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Nonaktifkan</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aktifkan</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Kontrol Paginasi */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Menampilkan <span className="font-semibold text-white font-mono">{users.length}</span> dari{' '}
            <span className="font-semibold text-white font-mono">{totalRecords}</span> pengguna
          </div>

          <div className="flex items-center gap-3">
            {/* Limit Per Halaman */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Navigasi Halaman */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg">
                {currentPage} / {totalPages || 1}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: DETAIL PENGGUNA & RIWAYAT TRANSAKSI               */}
      {/* ========================================================= */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedUserForDetail.full_name}
                    {selectedUserForDetail.is_active ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        Nonaktif
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">User ID: #{selectedUserForDetail.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informasi Profil Lengkap (Sesuai field database) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Nomor Handphone (Kontak):</div>
                <div className="font-semibold text-white font-mono flex items-center justify-between">
                  <span>{selectedUserForDetail.phone_number}</span>
                  <button
                    onClick={() => copyToClipboard(selectedUserForDetail.phone_number, 'Nomor HP')}
                    className="text-slate-500 hover:text-blue-400"
                    title="Salin No HP"
                  >
                    {copiedText === 'Nomor HP' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Alamat Email:</div>
                <div className="font-semibold text-white truncate">
                  {selectedUserForDetail.email || <span className="text-slate-600 italic">Belum didaftarkan</span>}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Saldo Akun Dompet:</div>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  Rp{selectedUserForDetail.balance.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Peran Akun (Role):</div>
                <div className="font-semibold text-white font-mono flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                    {selectedUserForDetail.role}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Waktu Bergabung:</div>
                <div className="font-mono text-slate-300">
                  {selectedUserForDetail.created_at}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Pembaruan Terakhir:</div>
                <div className="font-mono text-slate-300">
                  {selectedUserForDetail.updated_at || selectedUserForDetail.created_at}
                </div>
              </div>
            </div>

            {/* Riwayat Transaksi Pengguna */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  Riwayat Transaksi Pengguna Ini
                </h5>
                <span className="text-[11px] text-slate-400 font-mono">
                  {userTransactions.length} Transaksi Ditemukan
                </span>
              </div>

              {isLoadingTransactions ? (
                <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Memuat riwayat transaksi dari backend...</span>
                </div>
              ) : userTransactions.length === 0 ? (
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
                  Pengguna ini belum pernah melakukan pembelian produk digital.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {userTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{tx.product_name}</div>
                        <div className="text-slate-500 font-mono text-[11px] flex items-center gap-2 mt-0.5">
                          <span>{tx.invoice_number}</span>
                          <span>•</span>
                          <span>Tujuan: {tx.target_number}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-semibold text-white">
                          Rp{tx.price.toLocaleString('id-ID')}
                        </div>
                        <div className="mt-0.5">
                          {tx.status === 'SUCCESS' && (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              SUCCESS
                            </span>
                          )}
                          {tx.status === 'PENDING' && (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              PENDING
                            </span>
                          )}
                          {tx.status === 'FAILED' && (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              FAILED
                            </span>
                          )}
                          {tx.status === 'REFUNDED' && (
                            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              REFUNDED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  const u = selectedUserForDetail;
                  setSelectedUserForDetail(null);
                  setConfirmStatusModal({ user: u, nextState: !u.is_active });
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition ${
                  selectedUserForDetail.is_active
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                {selectedUserForDetail.is_active ? 'Nonaktifkan Akun Ini' : 'Aktifkan Akun Ini'}
              </button>

              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: KONFIRMASI PERUBAHAN STATUS AKUN (LANGKAH 6.4)    */}
      {/* ========================================================= */}
      {confirmStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  confirmStatusModal.nextState
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {confirmStatusModal.nextState ? 'Aktifkan Akun Pengguna?' : 'Nonaktifkan Akun Pengguna?'}
                </h4>
                <p className="text-xs text-slate-400">Konfirmasi tindakan administratif</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pengguna:</span>
                <span className="font-semibold text-white">{confirmStatusModal.user.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">No. Handphone:</span>
                <span className="font-mono text-slate-300">{confirmStatusModal.user.phone_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Baru:</span>
                <span
                  className={`font-semibold ${
                    confirmStatusModal.nextState ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {confirmStatusModal.nextState ? 'AKTIF' : 'NONAKTIF / SUSPENDED'}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              {confirmStatusModal.nextState
                ? 'Setelah diaktifkan, pengguna dapat kembali login ke aplikasi Android AriPay dan melakukan transaksi pembelian serta penarikan saldo secara normal.'
                : 'Peringatan: Menonaktifkan akun akan mencegah pengguna ini untuk login dan bertransaksi di aplikasi AriPay hingga diaktifkan kembali oleh Admin.'}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isProcessingStatus}
                onClick={() => setConfirmStatusModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingStatus}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg ${
                  confirmStatusModal.nextState
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {isProcessingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, {confirmStatusModal.nextState ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: KOREKSI SALDO MANUAL (POST /api/admin/adjust-balance) */}
      {/* ========================================================= */}
      {adjustmentModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-white text-sm">Koreksi Saldo Manual Berizin</h4>
              </div>
              <button
                onClick={() => setAdjustmentModalUser(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Pengguna Target:</div>
              <div className="font-semibold text-white text-sm">{adjustmentModalUser.full_name}</div>
              <div className="text-slate-400 font-mono">{adjustmentModalUser.phone_number}</div>
              <div className="text-emerald-400 font-mono font-semibold pt-1">
                Saldo Saat Ini: Rp{adjustmentModalUser.balance.toLocaleString('id-ID')}
              </div>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Tipe Penyesuaian Saldo</label>
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
                    - DEBIT (Potong Saldo)
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
                  Alasan / Keterangan Koreksi <span className="text-rose-400">*Wajib Diisi</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan resmi penyesuaian saldo (misal: Kompensasi kendala teknis atau pengembalian selisih)..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isProcessingAdjustment}
                  onClick={() => setAdjustmentModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAdjustment}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  {isProcessingAdjustment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan & Catat Mutasi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
