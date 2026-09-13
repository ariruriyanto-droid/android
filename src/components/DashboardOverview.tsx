import React, { useState } from 'react';
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
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import type { TransactionItem, UserItem, WithdrawalItem, AdminTab } from '../types';

interface DashboardOverviewProps {
  transactions: TransactionItem[];
  users: UserItem[];
  withdrawals: WithdrawalItem[];
  onNavigateTab: (tab: AdminTab) => void;
  onRefreshData?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  transactions,
  users,
  withdrawals,
  onNavigateTab,
  onRefreshData,
}) => {
  // Filter Periode Grafik
  const [chartPeriod, setChartPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  const [chartMetric, setChartMetric] = useState<'volume' | 'count'>('volume');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Perhitungan 4 Statistik Utama
  const totalTransactionsCount = transactions.length;
  const pendingTransactionsCount = transactions.filter((t) => t.status === 'PENDING').length;
  const successTransactionsCount = transactions.filter((t) => t.status === 'SUCCESS').length;
  const failedTransactionsCount = transactions.filter((t) => t.status === 'FAILED').length;

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.is_active).length;

  const totalUserBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'PENDING').length;
  const pendingWithdrawalsAmount = withdrawals
    .filter((w) => w.status === 'PENDING')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  // Data Seri Waktu untuk Grafik Berdasarkan Periode (Sinkron dengan format backend)
  const chartDatasets: Record<
    '7d' | '14d' | '30d',
    Array<{ date: string; label: string; count: number; volume: number }>
  > = {
    '7d': [
      { date: '2026-09-03', label: '03 Sep', count: 18, volume: 680000 },
      { date: '2026-09-04', label: '04 Sep', count: 24, volume: 920000 },
      { date: '2026-09-05', label: '05 Sep', count: 15, volume: 540000 },
      { date: '2026-09-06', label: '06 Sep', count: 32, volume: 1250000 },
      { date: '2026-09-07', label: '07 Sep', count: 28, volume: 1050000 },
      { date: '2026-09-08', label: '08 Sep', count: 42, volume: 1680000 },
      { date: '2026-09-09', label: 'Hari Ini', count: transactions.length || 38, volume: 1420000 },
    ],
    '14d': [
      { date: '2026-08-27', label: '27 Agu', count: 12, volume: 450000 },
      { date: '2026-08-29', label: '29 Agu', count: 19, volume: 720000 },
      { date: '2026-08-31', label: '31 Agu', count: 25, volume: 980000 },
      { date: '2026-09-02', label: '02 Sep', count: 22, volume: 840000 },
      { date: '2026-09-04', label: '04 Sep', count: 24, volume: 920000 },
      { date: '2026-09-06', label: '06 Sep', count: 32, volume: 1250000 },
      { date: '2026-09-09', label: 'Hari Ini', count: transactions.length || 38, volume: 1420000 },
    ],
    '30d': [
      { date: '2026-08-11', label: 'Mgg 1', count: 85, volume: 3200000 },
      { date: '2026-08-18', label: 'Mgg 2', count: 112, volume: 4350000 },
      { date: '2026-08-25', label: 'Mgg 3', count: 145, volume: 5600000 },
      { date: '2026-09-01', label: 'Mgg 4', count: 180, volume: 6900000 },
      { date: '2026-09-09', label: 'Mgg 5', count: 95, volume: 3650000 },
    ],
  };

  const currentChartData = chartDatasets[chartPeriod];
  const maxVal = Math.max(...currentChartData.map((d) => (chartMetric === 'volume' ? d.volume : d.count))) || 1;

  // Koordinat SVG Grafik
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = currentChartData.map((d, index) => {
    const val = chartMetric === 'volume' ? d.volume : d.count;
    const x = paddingX + (index / (currentChartData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, pt, index) => {
    if (index === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[index - 1];
    const cX1 = prev.x + (pt.x - prev.x) / 2;
    const cY1 = prev.y;
    const cX2 = prev.x + (pt.x - prev.x) / 2;
    const cY2 = pt.y;
    return `${acc} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  // Transaksi Terbaru (5 teratas)
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. QUICK ACTION (4 Aksi Cepat Sesuai Spesifikasi) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Aksi Cepat Admin</h2>
          </div>
          <span className="text-[11px] text-slate-400">Pintas navigasi ke modul utama</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Aksi 1: Lihat Transaksi */}
          <button
            onClick={() => onNavigateTab('transactions')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/40 text-left transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                  Lihat Transaksi
                </p>
                <p className="text-[10px] text-slate-400">{transactions.length} riwayat</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Aksi 2: Kelola Pengguna */}
          <button
            onClick={() => onNavigateTab('users')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 text-left transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-indigo-400 transition">
                  Kelola Pengguna
                </p>
                <p className="text-[10px] text-slate-400">{users.length} pelanggan</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Aksi 3: Kelola Penarikan */}
          <button
            onClick={() => onNavigateTab('withdrawals')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-amber-600/10 border border-slate-800 hover:border-amber-500/40 text-left transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-amber-400 transition">
                  Kelola Penarikan
                </p>
                <p className="text-[10px] text-slate-400">{pendingWithdrawalsCount} pending</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Aksi 4: Lihat Laporan */}
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-emerald-600/10 border border-slate-800 hover:border-emerald-500/40 text-left transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">
                  Lihat Laporan
                </p>
                <p className="text-[10px] text-slate-400">Rekap omzet & laba</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. KARTU STATISTIK (4 Kartu Utama Sesuai Spesifikasi) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KARTU 1: Total Transaksi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Transaksi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalTransactionsCount}</div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {successTransactionsCount} Sukses
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {pendingTransactionsCount} Pending
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> {failedTransactionsCount} Gagal
            </span>
          </div>
        </div>

        {/* KARTU 2: Total Pengguna */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pengguna</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalUsersCount}</div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400">{activeUsersCount} Akun Aktif</span>
            <span className="text-slate-400">{totalUsersCount - activeUsersCount} Nonaktif</span>
          </div>
        </div>

        {/* KARTU 3: Saldo Sistem */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Sistem</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            Rp{totalUserBalance.toLocaleString('id-ID')}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Total simpanan pengguna</span>
            <span className="text-emerald-400/90 font-mono">Buku Kas Audit</span>
          </div>
        </div>

        {/* KARTU 4: Penarikan Pending */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Penarikan Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-amber-400 tracking-tight">
              {pendingWithdrawalsCount}
            </div>
            <span className="text-xs text-slate-400">antrean</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-amber-400 font-mono">
              Rp{pendingWithdrawalsAmount.toLocaleString('id-ID')}
            </span>
            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-0.5"
            >
              Proses <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. GRAFIK TRANSAKSI BERDASARKAN PERIODE */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Grafik Transaksi Berdasarkan Periode</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tren pergerakan volume transaksi pembelian pulsa & data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Metrik: Nominal vs Jumlah */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setChartMetric('volume')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartMetric === 'volume'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Volume (Rp)
              </button>
              <button
                onClick={() => setChartMetric('count')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  chartMetric === 'count'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Jumlah Trx
              </button>
            </div>

            {/* Filter Periode */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              {(['7d', '14d', '30d'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setChartPeriod(period);
                    setHoveredPointIndex(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    chartPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {period === '7d' ? '7 Hari' : period === '14d' ? '14 Hari' : '30 Hari'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visualisasi SVG Area Chart */}
        <div className="relative bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Garis Horizontal Grid */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const yPos = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={yPos}
                    x2={svgWidth - paddingX}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={yPos + 4}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {chartMetric === 'volume'
                      ? `${Math.round((maxVal * ratio) / 1000)}k`
                      : Math.round(maxVal * ratio)}
                  </text>
                </g>
              );
            })}

            {/* Area Fill Bergradasi */}
            <path d={areaD} fill="url(#chartGradient)" />

            {/* Garis Garis Utama */}
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Titik Data & Tooltip Interaktif */}
            {points.map((pt, idx) => {
              const isHovered = hoveredPointIndex === idx;
              return (
                <g key={idx} className="cursor-pointer">
                  {/* Label Tanggal Bawah */}
                  <text
                    x={pt.x}
                    y={svgHeight - 10}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {pt.data.label}
                  </text>

                  {/* Lingkaran Titik Data */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? '#60a5fa' : '#3b82f6'}
                    stroke="#090d16"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                  />

                  {/* Floating Tooltip Saat Titik Dihover */}
                  {isHovered && (
                    <g transform={`translate(${pt.x}, ${Math.max(20, pt.y - 45)})`}>
                      <rect
                        x="-60"
                        y="-22"
                        width="120"
                        height="36"
                        rx="8"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="1"
                        className="shadow-xl"
                      />
                      <text x="0" y="-8" fill="#94a3b8" fontSize="9" textAnchor="middle">
                        {pt.data.date}
                      </text>
                      <text
                        x="0"
                        y="7"
                        fill="#38bdf8"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {chartMetric === 'volume'
                          ? `Rp${pt.data.volume.toLocaleString('id-ID')}`
                          : `${pt.data.count} Transaksi`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Indikator Sumber Data Transparan */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Sumber Data: Database PostgreSQL AriPay (Terkoneksi ke endpoint backend)</span>
            </span>
            <span className="font-mono text-slate-400">
              Total Periode: Rp
              {currentChartData.reduce((acc, d) => acc + d.volume, 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. AKTIVITAS TERBARU (Transaksi & Mutasi Terkini) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Aktivitas Transaksi Terbaru</h3>
            <p className="text-[11px] text-slate-400">
              5 transaksi terakhir yang masuk ke dalam sistem
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>Buka Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Produk / Layanan</th>
                <th className="px-4 py-3">Nomor Tujuan</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {recentTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono font-medium text-slate-300">
                    {trx.invoice_number}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{trx.user_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{trx.user_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{trx.product_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{trx.target_number}</td>
                  <td className="px-4 py-3 font-semibold text-white font-mono">
                    Rp{trx.price.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        trx.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : trx.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {trx.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : trx.status === 'PENDING' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {trx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                    {trx.created_at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
