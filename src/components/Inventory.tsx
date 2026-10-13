import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  PackagePlus,
  Camera,
  CheckCircle,
} from 'lucide-react';
import { Product, UserRole } from '../types';
import { formatRupiah } from '../services/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface InventoryProps {
  products: Product[];
  userRole: UserRole;
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickRestock: (productId: string, addQty: number) => void;
  isDark?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({
  products,
  userRole,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onQuickRestock,
  isDark = false,
}) => {
  const isAdmin = userRole === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Dedicated Barcode Scanning States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanPurpose, setScanPurpose] = useState<'quick_add' | 'form_barcode'>('quick_add');
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: 'Sembako',
    price: 10000,
    costPrice: 8000,
    stock: 20,
    minStock: 5,
    unit: 'pcs',
  });

  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Hardware USB/Bluetooth Barcode Scanner Listener while inside Form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFormOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('name') !== 'barcode') {
        return;
      }
      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 120) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          setFormData((prev) => ({ ...prev, barcode: barcodeBufferRef.current }));
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen]);

  const categories = ['Semua', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock <= p.minStock && p.stock > 0;
    if (stockFilter === 'out') matchesStock = p.stock <= 0;
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Financial summary of inventory
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalAssetCost = products.reduce((sum, p) => sum + (p.costPrice || 0) * p.stock, 0);
  const totalAssetValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const handleOpenAddModal = (initialBarcode = '') => {
    setEditingProduct(null);
    setFormData({
      barcode: initialBarcode || `${Math.floor(899000000000 + Math.random() * 99999999)}`,
      name: '',
      category: 'Sembako',
      price: 10000,
      costPrice: 8000,
      stock: 20,
      minStock: 5,
      unit: 'pcs',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      barcode: prod.barcode,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      costPrice: prod.costPrice,
      stock: prod.stock,
      minStock: prod.minStock,
      unit: prod.unit,
    });
    setIsFormOpen(true);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;
    if (scanPurpose === 'form_barcode') {
      setFormData((prev) => ({ ...prev, barcode: clean }));
      setIsScannerOpen(false);
      return;
    }
    // Quick Add Mode
    const existing = products.find(
      (p) => p.barcode.toLowerCase() === clean.toLowerCase() || p.id.toLowerCase() === clean.toLowerCase()
    );
    if (existing) {
      setScannerNotification(`Barang "${existing.name}" ditemukan! Membuka form edit stok...`);
      setTimeout(() => setScannerNotification(null), 3000);
      handleOpenEditModal(existing);
    } else {
      setScannerNotification(`Barcode "${clean}" baru! Membuka form tambah barang baru...`);
      setTimeout(() => setScannerNotification(null), 3000);
      handleOpenAddModal(clean);
    }
    setIsScannerOpen(false);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama barang wajib diisi!');
      return;
    }
    if (!formData.barcode.trim()) {
      alert('Kode barcode wajib diisi!');
      return;
    }
    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddProduct({
        ...formData,
      });
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Inventaris & Manajemen Stok
            </h1>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isAdmin
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isAdmin ? 'Akses Admin (Full)' : 'Akses Kasir (Lihat Saja)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Kelola katalog produk, tambah barang dengan scan barcode, edit harga HPP, dan restock otomatis.'
              : 'Pengecekan stok barang toko secara langsung untuk pelayanan pelanggan.'}
          </p>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setScanPurpose('quick_add');
                setIsScannerOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
              title="Pindai barcode barang baru atau barang yang ada"
            >
              <Camera className="w-4 h-4 text-blue-100" />
              <span>Scan Barcode Produk</span>
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang</span>
            </button>
          </div>
        )}
      </div>

      {/* Notification banner when barcode scanned */}
      {scannerNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{scannerNotification}</span>
        </div>
      )}

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Jenis Produk
          </span>
          <div className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {products.length} <span className="text-xs font-medium text-slate-400">SKU</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalStockUnits.toLocaleString('id-ID')} Total Unit Fisik
          </span>
        </div>
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Modal Aset (HPP)
          </span>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {formatRupiah(totalAssetCost)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total biaya pokok persediaan</span>
        </div>
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Nilai Jual Inventaris
          </span>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-500 mt-1">
            {formatRupiah(totalAssetValue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Estimasi potensi omset total
          </span>
        </div>
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            lowStockCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
              : isDark
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">
            Stok Menipis / Kritis
          </span>
          <div className="text-2xl font-black mt-1">
            {lowStockCount} <span className="text-xs font-medium">Barang</span>
          </div>
          <span className="text-[11px] mt-1 block font-medium">
            {lowStockCount > 0 ? 'Perlu tindakan restock segera' : 'Semua stok dalam batas aman'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-3xl border shadow-sm space-y-3 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama barang, barcode, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-3 py-2.5 text-xs rounded-2xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-850 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
          {/* Quick Stock Filters */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Stok Kritis ({products.filter((p) => p.stock <= p.minStock && p.stock > 0).length})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'out'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Habis ({products.filter((p) => p.stock <= 0).length})
            </button>
          </div>
        </div>
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-slate-850 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Products Table */}
      <div
        className={`rounded-3xl border shadow-sm overflow-hidden ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <th className="py-3.5 px-4">Barcode & Nama Produk</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-3">Harga Jual</th>
                {isAdmin && <th className="py-3.5 px-3">HPP Modal</th>}
                {isAdmin && <th className="py-3.5 px-3">Margin</th>}
                <th className="py-3.5 px-3">Stok Saat Ini</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="py-12 text-center text-slate-400">
                    Tidak ada produk yang cocok dengan pencarian atau filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock <= p.minStock && !isOutOfStock;
                  const marginRp = p.price - (p.costPrice || 0);
                  const marginPercent = p.price > 0 ? Math.round((marginRp / p.price) * 100) : 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-500 shrink-0">
                            <Barcode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs leading-snug">{p.name}</div>
                            <div className="font-mono text-[10px] text-emerald-500 font-semibold mt-0.5">
                              {p.barcode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold font-mono">
                        {formatRupiah(p.price)}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-3 text-slate-400 font-mono">
                          {formatRupiah(p.costPrice || 0)}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] font-bold text-blue-500 font-mono">
                            +{marginPercent}%
                          </span>
                        </td>
                      )}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-black font-mono text-sm ${
                              isOutOfStock
                                ? 'text-rose-500'
                                : isLowStock
                                ? 'text-amber-500'
                                : isDark
                                ? 'text-white'
                                : 'text-slate-900'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-slate-400 text-[10px]">{p.unit}</span>
                          <span className="text-slate-400 text-[10px]">
                            (min: {p.minStock})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {isOutOfStock ? (
                          <span className="bg-rose-500/15 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            Kritis
                          </span>
                        ) : (
                          <span className="bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => onQuickRestock(p.id, 10)}
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                title="Tambah +10 stok barang ini"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors cursor-pointer"
                                title="Edit data barang"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Yakin ingin menghapus produk "${p.name}"?`)) {
                                    onDeleteProduct(p.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Hapus produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Hanya Lihat
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
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingProduct ? 'Edit Barang' : 'Tambah Barang Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input informasi barcode, harga, dan persediaan barang
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold block mb-1">
                  Barcode Produk *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="barcode"
                      required
                      placeholder="Contoh: 899123456789"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                        isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScanPurpose('form_barcode');
                      setIsScannerOpen(true);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Pindai kamera untuk mengisi barcode ini"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Minyak Goreng Bimoli 2L"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Kategori</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Satuan (Unit)</label>
                  <input
                    type="text"
                    required
                    placeholder="pcs / pack / btl"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    HPP Modal (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Stok Tersedia *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Batas Minimum Stok *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 0 })}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Simpan Barang Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          products={products}
          onDetected={handleBarcodeScanned}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};
