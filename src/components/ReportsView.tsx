import React, { useState, useEffect, useId } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type {
  TransactionItem,
  FinancialReportData,
  FinancialReportFilterParams,
} from '../types';
import { getAdminFinancialReports } from '../services/api';

interface ReportsViewProps {
  transactions?: TransactionItem[];
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions = [], onNotify }) => {
  const compId = useId();
  const [filterPreset, setFilterPreset] = useState<'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [reportData, setReportData] = useState<FinancialReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preset Date Helper
  const applyPreset = (preset: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month') => {
    setFilterPreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = fmt(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'last_7_days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      setStartDate(fmt(past7));
      setEndDate(fmt(now));
    } else if (preset === 'last_30_days') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      setStartDate(fmt(past30));
      setEndDate(fmt(now));
    } else if (preset === 'this_month') {
      const startM = new Date(now.getFullYear(), now.getMonth(), 1);
      const endM = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(fmt(startM));
      setEndDate(fmt(endM));
    } else if (preset === 'last_month') {
      const startLM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLM = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(fmt(startLM));
      setEndDate(fmt(endLM));
    }
  };

  const loadFinancialReport = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const params: FinancialReportFilterParams = {
        preset: filterPreset,
        start_date: startDate,
        end_date: endDate,
        category: categoryFilter,
      };
      const res = await getAdminFinancialReports(params);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        throw new Error(res.message || 'Gagal memuat rekapitulasi data keuangan.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghubungi server pelaporan keuangan.');
      if (onNotify) onNotify(err.message || 'Gagal mengambil data laporan.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinancialReport();
  }, [startDate, endDate, categoryFilter]);

  // Handler Ekspor CSV
  const handleExportCSV = () => {
    if (!reportData) return;
    try {
      const headers = ['Kategori', 'Jumlah Transaksi', 'Total Volume (Omset)', 'Estimasi Modal (COGS)', 'Laba Kotor', 'Kontribusi (%)'];
      const rows = reportData.categories.map((c) => [
        `"${c.category_name}"`,
        c.total_count,
        c.total_volume,
        c.estimated_cogs,
        c.gross_profit,
        `${c.percentage}%`,
      ]);

      const summaryHeader = ['', '', '', '', '', ''];
      const summaryRows = [
        ['RINGKASAN KEUANGAN ARIPAY', '', '', '', '', ''],
        ['Periode', `${reportData.period.start_date} s/d ${reportData.period.end_date}`, '', '', '', ''],
        ['Total Omset Penjualan (Gross)', reportData.summary.gross_revenue, '', '', '', ''],
        ['Estimasi Modal Produk (COGS)', reportData.summary.total_cogs, '', '', '', ''],
        ['Laba Kotor Produk', reportData.summary.gross_profit, '', '', '', ''],
        ['Pendapatan Biaya Admin Penarikan', reportData.summary.withdrawal_fee_revenue, '', '', '', ''],
        ['Total Laba Bersih AriPay', reportData.summary.net_profit, '', '', '', ''],
        ['Total Dana Dicairkan Pengguna', reportData.summary.withdrawal_disbursed, '', '', '', ''],
        ['Transaksi Sukses', reportData.summary.successful_transactions_count, '', '', '', ''],
        ['Transaksi Gagal', reportData.summary.failed_transactions_count, '', '', '', ''],
      ];

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          summaryRows.map((e) => e.join(',')).join('\n'),
          '\n--- DETAIL PER KATEGORI PRODUK ---\n',
          headers.join(','),
          ...rows.map((e) => e.join(',')),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Laporan_Keuangan_AriPay_${startDate}_sd_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onNotify) onNotify('Laporan keuangan format CSV berhasil diunduh.', 'success');
    } catch (err: any) {
      if (onNotify) onNotify('Gagal mengekspor laporan CSV: ' + err.message, 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Hitung metrik turunan
  const summary = reportData?.summary;
  const grossMarginPct =
    summary && summary.gross_revenue > 0
      ? ((summary.gross_profit / summary.gross_revenue) * 100).toFixed(1)
      : '0.0';

  const txSuccessRate =
    summary && summary.total_transactions_count > 0
      ? Math.round((summary.successful_transactions_count / summary.total_transactions_count) * 100)
      : 100;

  return (
    <div className="space-y-6" id={`reports-view-${compId}`}>
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Laporan & Rekapitulasi Keuangan AriPay</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Audit laba rugi riil, omset penjualan PPOB, pendapatan biaya admin, serta analitik performa kategori.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id={`btn-refresh-reports-${compId}`}
            onClick={() => loadFinancialReport(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Muat ulang laporan"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            id={`btn-print-reports-${compId}`}
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Cetak / PDF</span>
          </button>

          <button
            type="button"
            id={`btn-export-csv-${compId}`}
            onClick={handleExportCSV}
            disabled={isLoading || !reportData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Date Range Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Periode:</span>
            </span>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'last_7_days', label: '7 Hari Terakhir' },
              { id: 'last_30_days', label: '30 Hari Terakhir' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'last_month', label: 'Bulan Lalu' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                id={`preset-${p.id}-${compId}`}
                onClick={() => applyPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  filterPreset === p.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Kategori:</span>
            </span>
            <select
              id={`select-category-${compId}`}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setFilterPreset('custom');
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">Semua Kategori Produk</option>
              <option value="pulsa">Pulsa Reguler</option>
              <option value="data">Paket Data Internet</option>
              <option value="pln">Token Listrik PLN</option>
              <option value="emoney">Top Up E-Money</option>
            </select>
          </div>
        </div>

        {/* Custom Date Input Bar */}
        <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor={`start-date-${compId}`} className="text-xs text-slate-400 font-medium">
              Tanggal Mulai:
            </label>
            <input
              type="date"
              id={`start-date-${compId}`}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFilterPreset('custom');
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor={`end-date-${compId}`} className="text-xs text-slate-400 font-medium">
              Tanggal Akhir:
            </label>
            <input
              type="date"
              id={`end-date-${compId}`}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFilterPreset('custom');
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="text-[11px] text-slate-500 italic ml-auto">
            Menampilkan data rentang <span className="text-slate-300 font-mono">{startDate}</span> s/d{' '}
            <span className="text-slate-300 font-mono">{endDate}</span>
          </div>
        </div>
      </div>

      {/* Error Alert State */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => loadFinancialReport()}
            className="px-3 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/40 text-red-200 font-semibold transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Ringkasan 6 Metrik Finansial Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metrik 1: Omset Penjualan (Gross Revenue) */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Omset Penjualan</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white font-mono">
              Rp{(summary?.gross_revenue || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3 h-3" /> Transaksi sukses
            </p>
          </div>
        </div>

        {/* Metrik 2: Modal Produk (COGS) */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Modal Produk (COGS)</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-200 font-mono">
              Rp{(summary?.total_cogs || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Beban pokok suplier</p>
          </div>
        </div>

        {/* Metrik 3: Laba Kotor Produk */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Laba Kotor Produk</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-blue-400 font-mono">
              Rp{(summary?.gross_profit || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-blue-400 mt-1 font-medium">Margin {grossMarginPct}%</p>
          </div>
        </div>

        {/* Metrik 4: Biaya Admin Penarikan */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fee Admin Penarikan</span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-indigo-300 font-mono">
              Rp{(summary?.withdrawal_fee_revenue || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-indigo-400 mt-1 font-medium">Dari pencairan saldo</p>
          </div>
        </div>

        {/* Metrik 5: Total Laba Bersih */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Total Laba Bersih</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-400 font-mono">
              Rp{(summary?.net_profit || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-emerald-300 mt-1 font-medium">Produk + Fee Admin</p>
          </div>
        </div>

        {/* Metrik 6: Total Pencairan Keluar */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dana Dicairkan</span>
            <TrendingUp className="w-4 h-4 text-purple-400 rotate-180" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-purple-300 font-mono">
              Rp{(summary?.withdrawal_disbursed || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-purple-400 mt-1 font-medium">
              {summary?.successful_withdrawals_count || 0} transfer sukses
            </p>
          </div>
        </div>
      </div>

      {/* 4. Rekapitulasi Status Transaksi & Visualisasi Tren */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Statistik Transaksi & SLA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Status Transaksi PPOB</span>
            <span className="text-xs text-slate-400 font-normal">
              Total {summary?.total_transactions_count || 0} trx
            </span>
          </h4>

          <div className="space-y-3">
            {/* Berhasil */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-200">Transaksi Berhasil</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {summary?.successful_transactions_count || 0}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {txSuccessRate}% sukses
                </span>
              </div>
            </div>

            {/* Pending */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-200">Dalam Antrean / Pending</span>
              </div>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {summary?.pending_transactions_count || 0}
              </span>
            </div>

            {/* Gagal */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium text-slate-200">Gagal / Dibatalkan</span>
              </div>
              <span className="text-sm font-bold text-red-400 font-mono">
                {summary?.failed_transactions_count || 0}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-200/90 leading-relaxed flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              Kalkulasi omset dan laba hanya memperhitungkan transaksi dengan status{' '}
              <strong className="text-emerald-400">SUCCESS</strong>. Transaksi gagal tidak memotong modal atau menambah omset.
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Tren Pendapatan & Laba Harian */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Tren Omset & Laba Harian</h4>
              <p className="text-xs text-slate-400">Fluktuasi performa penjualan dalam rentang waktu yang dipilih.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Omset
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Laba
              </span>
            </div>
          </div>

          {/* Simple Clean Bar Chart Visualizer */}
          <div className="h-44 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
            {reportData?.daily_trend && reportData.daily_trend.length > 0 ? (
              reportData.daily_trend.map((point) => {
                const maxRev = Math.max(...reportData.daily_trend.map((p) => p.revenue), 1);
                const heightPct = Math.max(10, Math.round((point.revenue / maxRev) * 100));
                return (
                  <div key={point.date} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition mb-1 font-mono">
                      Rp{(point.profit / 1000).toFixed(0)}k
                    </div>
                    <div className="w-full bg-slate-950 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: `${heightPct}%` }}>
                      <div className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 h-full rounded-t-lg group-hover:brightness-125 transition relative">
                        <div
                          className="w-full bg-emerald-400 absolute bottom-0"
                          style={{ height: `${Math.max(15, Math.round((point.profit / point.revenue) * 100 * 3))}%` }}
                          title={`Laba: Rp${point.profit.toLocaleString('id-ID')}`}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 font-mono whitespace-nowrap">
                      {point.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                Tidak ada data tren untuk periode ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Tabel Kontribusi & Laba per Kategori Produk */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white">Rincian Performa & Laba per Kategori Produk</h4>
            <p className="text-xs text-slate-400">
              Perbandingan total transaksi, modal, laba kotor, dan proporsi kontribusi terhadap omset.
            </p>
          </div>
        </div>

        {/* Category Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Kategori Produk</th>
                <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                <th className="py-3 px-4 text-right">Total Omset (Volume)</th>
                <th className="py-3 px-4 text-right">Estimasi Modal (COGS)</th>
                <th className="py-3 px-4 text-right">Laba Kotor</th>
                <th className="py-3 px-4 text-center">Kontribusi Omset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Memuat rincian laporan kategori...</span>
                    </div>
                  </td>
                </tr>
              ) : reportData?.categories && reportData.categories.length > 0 ? (
                reportData.categories.map((cat) => (
                  <tr key={cat.category_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{cat.category_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{cat.total_count} trx</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                      Rp{cat.total_volume.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      Rp{cat.estimated_cogs.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      Rp{cat.gross_profit.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-300">{cat.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi produk pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Total Row */}
            {reportData?.categories && reportData.categories.length > 0 && (
              <tfoot className="bg-slate-950 text-xs font-bold text-white border-t-2 border-slate-800">
                <tr>
                  <td className="py-3 px-4">TOTAL KESELURUHAN</td>
                  <td className="py-3 px-4 text-center font-mono">
                    {reportData.categories.reduce((s, c) => s + c.total_count, 0)} trx
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    Rp{reportData.categories.reduce((s, c) => s + c.total_volume, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">
                    Rp{reportData.categories.reduce((s, c) => s + c.estimated_cogs, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    Rp{reportData.categories.reduce((s, c) => s + c.gross_profit, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
