import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  GitBranch,
  Network,
  ShieldCheck,
  X,
  Sparkles,
  ArrowDownToLine,
} from 'lucide-react';
import type { AdminUser, AdminTab } from '../types';

interface AdminSidebarProps {
  admin: AdminUser;
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  transactionCount: number;
  userCount: number;
  pendingWdCount: number;
  pendingDepoCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  admin,
  activeTab,
  setActiveTab,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
  transactionCount,
  userCount,
  pendingWdCount,
  pendingDepoCount = 0,
}) => {
  const mainNavItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'transactions' as AdminTab,
      label: 'Transaksi',
      icon: Receipt,
      badge: transactionCount > 0 ? transactionCount : null,
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    {
      id: 'users' as AdminTab,
      label: 'Pengguna',
      icon: Users,
      badge: userCount > 0 ? userCount : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    },
    {
      id: 'products' as AdminTab,
      label: 'Produk & Layanan',
      icon: Package,
      badge: null,
    },
    {
      id: 'deposits' as AdminTab,
      label: 'Deposit & Kas',
      icon: ArrowDownToLine,
      badge: pendingDepoCount > 0 ? `${pendingDepoCount} Pending` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    },
    {
      id: 'withdrawals' as AdminTab,
      label: 'Saldo & Penarikan',
      icon: Wallet,
      badge: pendingWdCount > 0 ? `${pendingWdCount} Pending` : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
    },
    {
      id: 'reports' as AdminTab,
      label: 'Laporan',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings' as AdminTab,
      label: 'Pengaturan',
      icon: Settings,
      badge: null,
    },
  ];

  const systemNavItems = [
    {
      id: 'workflow' as AdminTab,
      label: 'Diagram Alur (Workflow)',
      icon: GitBranch,
    },
    {
      id: 'architecture' as AdminTab,
      label: 'Arsitektur & Database',
      icon: Network,
    },
  ];

  const handleSelect = (tab: AdminTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header / Brand Logo */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              AP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-wide">AriPay</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Portal Pengawasan Sistem</p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Main Menu Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-white/20 text-white border-white/30'
                            : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* System & Architecture Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Sistem & Arsitektur</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>
            <nav className="space-y-1">
              {systemNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Admin Profile & Logout */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold flex items-center justify-center text-xs">
              {admin.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white truncate">{admin.username}</p>
              </div>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {admin.role}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
