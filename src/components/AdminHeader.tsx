import React from 'react';
import {
  Menu,
  ShieldCheck,
  LogOut,
  ArrowDownLeft,
  Database,
  Activity,
} from 'lucide-react';
import type { AdminUser, AdminTab } from '../types';

interface AdminHeaderProps {
  admin: AdminUser;
  activeTab: AdminTab;
  onLogout: () => void;
  onOpenMobileSidebar: () => void;
}

const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Utama',
    subtitle: 'Ringkasan Statistik Sistem, Arus Transaksi, & Aktivitas Pengguna',
  },
  transactions: {
    title: 'Manajemen Transaksi',
    subtitle: 'Daftar Riwayat Pembelian Pulsa, Token PLN, & Paket Data',
  },
  users: {
    title: 'Manajemen Pengguna',
    subtitle: 'Kelola Status Akun Pelanggan & Penyesuaian Saldo Kas Berizin',
  },
  products: {
    title: 'Produk & Layanan',
    subtitle: 'Katalog Pulsa, Paket Data, & Token Listrik PLN',
  },
  deposits: {
    title: 'Manajemen Deposit & Kas',
    subtitle: 'Verifikasi Tiket Top-Up Saldo, Eksekusi Kredit Atomik, & Audit Buku Kas Mutasi',
  },
  withdrawals: {
    title: 'Saldo & Penarikan',
    subtitle: 'Verifikasi Pengajuan Penarikan Dana & Audit Mutasi Saldo',
  },
  reports: {
    title: 'Laporan & Keuangan',
    subtitle: 'Rekapitulasi Omzet Penjualan & Margin Keuntungan Sistem',
  },
  settings: {
    title: 'Pengaturan Admin',
    subtitle: 'Konfigurasi Keamanan, Profil Admin, & Parameter Sistem',
  },
  workflow: {
    title: 'Diagram Alur (Workflow)',
    subtitle: 'Visualisasi Sequence Diagram & Arus Mutasi Saldo AriPay',
  },
  architecture: {
    title: 'Arsitektur & Database',
    subtitle: 'Spesifikasi Multi-Tier Backend Node.js & Skema PostgreSQL',
  },
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  admin,
  activeTab,
  onLogout,
  onOpenMobileSidebar,
}) => {
  const current = tabTitles[activeTab] || {
    title: 'Admin Panel',
    subtitle: 'Pengawasan Sistem AriPay',
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition"
            title="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
              <span>{current.title}</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions, Database Status, Admin Identity & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Status Database */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Database className="w-3 h-3 ml-0.5" />
            <span>PostgreSQL: Aktif</span>
          </div>

          {/* Unduh ZIP */}
          <a
            href="/aripay-project-terbaru.zip"
            download="aripay-project-terbaru.zip"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition text-xs font-semibold"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Unduh ZIP</span>
          </a>

          {/* Identitas Admin */}
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {admin.username.substring(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 leading-tight">
                {admin.username}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 leading-tight">
                <ShieldCheck className="w-2.5 h-2.5" /> {admin.role}
              </span>
            </div>
          </div>

          {/* Tombol Logout Jelas & Mudah Ditemukan */}
          <button
            onClick={onLogout}
            title="Keluar dari sesi Admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
