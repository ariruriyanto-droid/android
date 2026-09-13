import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Edit3,
  Layers,
  Percent,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
} from 'lucide-react';
import type { ProductItem, ProductSummary } from '../types';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  toggleAdminProductStatus,
} from '../services/api';

interface ProductsViewProps {
  onNotify?: (msg: string) => void;
}

const CATEGORIES = ['ALL', 'PULSA', 'DATA', 'PLN', 'EMONEY', 'VOUCHER'];
const BRANDS = ['ALL', 'Telkomsel', 'Indosat', 'XL', 'PLN', 'GoPay', 'DANA', 'OVO'];

export const ProductsView: React.FC<ProductsViewProps> = ({ onNotify }) => {
  // State Data Produk
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [summary, setSummary] = useState<ProductSummary>({
    total_products: 0,
    active_products: 0,
    inactive_products: 0,
    average_margin: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // State Filter & Pagination
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // State Modal Tambah Produk
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addForm, setAddForm] = useState({
    sku_code: '',
    name: '',
    category: 'PULSA',
    brand: 'Telkomsel',
    price_cost: '',
    price_sell: '',
    is_active: true,
  });
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // State Modal Edit Produk
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'PULSA',
    brand: '',
    price_cost: '',
    price_sell: '',
    is_active: true,
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Fetch Data dari API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminProducts({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        brand: brandFilter !== 'ALL' ? brandFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
        page: currentPage,
        limit: 10,
      });

      if (res && res.success) {
        setProducts(res.data || []);
        setSummary(
          res.summary || {
            total_products: 0,
            active_products: 0,
            inactive_products: 0,
            average_margin: 0,
          }
        );
        setTotalPages(res.pagination?.total_pages || 1);
        setTotalRecords(res.pagination?.total_records || 0);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      if (onNotify) {
        onNotify('Gagal memuat daftar produk: ' + (err.message || 'Kesalahan jaringan.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, brandFilter, statusFilter, search, currentPage, onNotify]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handler Toggle Status Aktif/Nonaktif
  const handleToggleStatus = async (prod: ProductItem) => {
    const nextState = !prod.is_active;
    setActionLoadingId(prod.id);
    try {
      const res = await toggleAdminProductStatus(prod.id, nextState);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, is_active: nextState } : p))
        );
        setSummary((prev) => ({
          ...prev,
          active_products: nextState ? prev.active_products + 1 : prev.active_products - 1,
          inactive_products: nextState ? prev.inactive_products - 1 : prev.inactive_products + 1,
        }));
        if (onNotify) {
          onNotify(`Status SKU '${prod.sku_code}' berhasil diubah ke ${nextState ? 'AKTIF' : 'NONAKTIF'}.`);
        }
      }
    } catch (err: any) {
      if (onNotify) {
        onNotify('Gagal mengubah status produk: ' + err.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler Buka Modal Tambah
  const openAddModal = () => {
    setAddForm({
      sku_code: '',
      name: '',
      category: 'PULSA',
      brand: 'Telkomsel',
      price_cost: '',
      price_sell: '',
      is_active: true,
    });
    setAddFormError(null);
    setIsAddModalOpen(true);
  };

  // Handler Simpan Tambah Produk
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    const sku = addForm.sku_code.trim().toUpperCase();
    const name = addForm.name.trim();
    const cost = parseFloat(addForm.price_cost);
    const sell = parseFloat(addForm.price_sell);

    if (!sku || !name || isNaN(cost) || isNaN(sell)) {
      setAddFormError('Semua kolom data produk wajib diisi dengan benar.');
      return;
    }

    if (cost <= 0) {
      setAddFormError('Harga modal (HPP) harus lebih besar dari Rp0.');
      return;
    }

    if (sell < cost) {
      setAddFormError('Proteksi Margin: Harga jual tidak boleh lebih rendah dari harga modal (mencegah kerugian).');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await createAdminProduct({
        sku_code: sku,
        name,
        category: addForm.category,
        brand: addForm.brand.trim(),
        price_cost: cost,
        price_sell: sell,
        is_active: addForm.is_active,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        if (onNotify) {
          onNotify(`Produk baru '${name}' (${sku}) berhasil ditambahkan ke etalase katalog.`);
        }
        fetchProducts();
      }
    } catch (err: any) {
      setAddFormError(err.message || 'Gagal menambahkan produk baru.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handler Buka Modal Edit
  const openEditModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    setEditForm({
      name: prod.name,
      category: prod.category,
      brand: prod.brand,
      price_cost: prod.price_cost.toString(),
      price_sell: prod.price_sell.toString(),
      is_active: prod.is_active,
    });
    setEditFormError(null);
  };

  // Handler Simpan Edit Produk
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditFormError(null);

    const name = editForm.name.trim();
    const cost = parseFloat(editForm.price_cost);
    const sell = parseFloat(editForm.price_sell);

    if (!name || isNaN(cost) || isNaN(sell)) {
      setEditFormError('Nama produk, harga modal, dan harga jual wajib diisi.');
      return;
    }

    if (cost <= 0) {
      setEditFormError('Harga modal (HPP) harus lebih besar dari Rp0.');
      return;
    }

    if (sell < cost) {
      setEditFormError('Proteksi Margin: Harga jual tidak boleh lebih rendah dari harga modal (mencegah kerugian).');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await updateAdminProduct(editingProduct.id, {
        name,
        category: editForm.category,
        brand: editForm.brand.trim(),
        price_cost: cost,
        price_sell: sell,
        is_active: editForm.is_active,
      });

      if (res.success) {
        setEditingProduct(null);
        if (onNotify) {
          onNotify(`Detail dan harga produk '${name}' (${editingProduct.sku_code}) berhasil diperbarui.`);
        }
        fetchProducts();
      }
    } catch (err: any) {
      setEditFormError(err.message || 'Gagal memperbarui detail produk.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Kalkulasi Margin Realtime untuk Form Tambah
  const addCostNum = parseFloat(addForm.price_cost) || 0;
  const addSellNum = parseFloat(addForm.price_sell) || 0;
  const addMargin = addSellNum - addCostNum;
  const addMarginPct = addCostNum > 0 ? ((addMargin / addCostNum) * 100).toFixed(1) : '0';

  // Kalkulasi Margin Realtime untuk Form Edit
  const editCostNum = parseFloat(editForm.price_cost) || 0;
  const editSellNum = parseFloat(editForm.price_sell) || 0;
  const editMargin = editSellNum - editCostNum;
  const editMarginPct = editCostNum > 0 ? ((editMargin / editCostNum) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* 1. KARTU RINGKASAN METRIK PRODUK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Produk */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Produk Digital</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{summary.total_products}</div>
          <div className="text-[11px] text-slate-500 mt-1">SKU terdaftar dalam database</div>
        </div>

        {/* Produk Aktif */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400">Produk Siap Jual</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{summary.active_products}</div>
          <div className="text-[11px] text-slate-500 mt-1">Aktif di etalase aplikasi Android</div>
        </div>

        {/* Produk Gangguan / Nonaktif */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400">Produk Nonaktif / Gangguan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{summary.inactive_products}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ditutup sementara dari pembelian</div>
        </div>

        {/* Rata-rata Margin Laba */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-400">Rata-rata Margin Laba</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            Rp{Math.round(summary.average_margin).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Keuntungan kotor rata-rata per SKU</div>
        </div>
      </div>

      {/* 2. HEADER TABEL & KONTROL FILTER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Etalase Produk & Pengaturan Margin</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola daftar SKU, harga modal supplier Digiflazz, harga jual pelanggan, dan kendali margin keuntungan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          {/* Pencarian */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari SKU, nama, atau brand..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Brand */}
          <div>
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Semua Provider / Brand</option>
              {BRANDS.filter((b) => b !== 'ALL').map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Etalase</option>
              <option value="ACTIVE">Hanya Produk Aktif</option>
              <option value="INACTIVE">Hanya Produk Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TABEL DAFTAR PRODUK */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Kode SKU</th>
                <th className="px-4 py-3.5">Nama Produk</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Provider</th>
                <th className="px-4 py-3.5">Harga Modal (HPP)</th>
                <th className="px-4 py-3.5">Harga Jual</th>
                <th className="px-4 py-3.5">Margin Keuntungan</th>
                <th className="px-4 py-3.5">Status Etalase</th>
                <th className="px-4 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Memuat data katalog produk dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada produk yang cocok dengan parameter filter saat ini.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const margin = prod.price_sell - prod.price_cost;
                  const marginPct = prod.price_cost > 0 ? ((margin / prod.price_cost) * 100).toFixed(1) : '0';
                  const isProcessing = actionLoadingId === prod.id;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">
                        {prod.sku_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-white max-w-[240px] truncate">
                        {prod.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950 text-slate-300 border border-slate-800">
                          {prod.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{prod.brand}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        Rp{prod.price_cost.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        Rp{prod.price_sell.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div className="text-cyan-400 font-semibold">
                          +Rp{margin.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ({marginPct}% margin)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          disabled={isProcessing}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            prod.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {prod.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-blue-500 text-xs font-semibold transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Menampilkan <span className="font-semibold text-white">{products.length}</span> dari{' '}
            <span className="font-semibold text-white">{totalRecords}</span> produk terdaftar
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              Halaman {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MODAL TAMBAH PRODUK BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Plus className="w-5 h-5" />
                <span>Tambah Produk Digital Baru</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              {addFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{addFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: TSEL100"
                    value={addForm.sku_code}
                    onChange={(e) => setAddForm({ ...addForm, sku_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 uppercase"
                  />
                  <span className="text-[10px] text-slate-500">Unik & huruf kapital</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori *</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pulsa Telkomsel 100.000"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand / Provider *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Telkomsel"
                    value={addForm.brand}
                    onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Modal (HPP) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="99000"
                      value={addForm.price_cost}
                      onChange={(e) => setAddForm({ ...addForm, price_cost: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Harga beli dari Digiflazz</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Jual Pelanggan *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="101500"
                      value={addForm.price_sell}
                      onChange={(e) => setAddForm({ ...addForm, price_sell: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Harga debit ke saldo user</span>
                </div>
              </div>

              {/* Kalkulasi Margin Otomatis */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Kalkulasi Margin Laba:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      addMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {addMargin >= 0 ? '+' : ''}Rp{addMargin.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Persentase Keuntungan:</span>
                  <span className="font-mono text-cyan-400">{addMarginPct}%</span>
                </div>
                {addMargin < 0 && (
                  <p className="text-[11px] text-rose-400 pt-1">
                    ⚠️ Peringatan: Harga jual di bawah modal akan menyebabkan kerugian finansial pada AriPay!
                  </p>
                )}
              </div>

              {/* Status Awal */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300 font-medium">Status Etalase Langsung Aktif:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.is_active}
                    onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold transition cursor-pointer"
                >
                  {isSubmittingAdd ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Produk</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL EDIT PRODUK & MARGIN */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Edit3 className="w-5 h-5" />
                <span>Edit Produk & Margin ({editingProduct.sku_code})</span>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kode SKU</label>
                  <input
                    type="text"
                    disabled
                    value={editingProduct.sku_code}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-500 font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">Kode SKU sistem tidak dapat diubah</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand / Provider *</label>
                  <input
                    type="text"
                    required
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Modal (HPP) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editForm.price_cost}
                      onChange={(e) => setEditForm({ ...editForm, price_cost: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Jual Pelanggan *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editForm.price_sell}
                      onChange={(e) => setEditForm({ ...editForm, price_sell: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Kalkulasi Margin Realtime */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Margin Laba Baru:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      editMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {editMargin >= 0 ? '+' : ''}Rp{editMargin.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Persentase Keuntungan:</span>
                  <span className="font-mono text-cyan-400">{editMarginPct}%</span>
                </div>
                {editMargin < 0 && (
                  <p className="text-[11px] text-rose-400 pt-1">
                    ⚠️ Proteksi Margin: Harga jual tidak boleh lebih rendah dari modal.
                  </p>
                )}
              </div>

              {/* Status Aktif */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300 font-medium">Status Etalase Aktif:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold transition cursor-pointer"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memperbarui...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
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
