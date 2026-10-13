import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  QrCode,
  CheckCircle,
  Barcode,
  ShoppingBag,
  Zap,
  Receipt,
  Tag,
  Check,
  ArrowRight,
} from 'lucide-react';
import { CartItem, Product, StoreProfile, Transaction, UserProfile } from '../types';
import { formatRupiah } from '../services/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { QRISModal } from './QRISModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface POSProps {
  products: Product[];
  storeProfile: StoreProfile;
  currentUser: UserProfile;
  onCompleteSale: (transaction: Transaction, updatedProducts: Product[]) => void;
  onOpenLowStock: () => void;
  isDark: boolean;
}

export const POS: React.FC<POSProps> = ({
  products,
  storeProfile,
  currentUser,
  onCompleteSale,
  onOpenLowStock,
  isDark,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [discountNominal, setDiscountNominal] = useState<number>(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  // Mobile / Small screen tab switch between 'catalog' and 'cart'
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isQRISModalOpen, setIsQRISModalOpen] = useState(false);
  const [lastCompletedTx, setLastCompletedTx] = useState<Transaction | null>(null);

  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const barcodeInputFieldRef = useRef<HTMLInputElement | null>(null);

  // Web Audio Beep Sound effect on barcode scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // AudioContext fallback
    }
  };

  // Hardware USB/Bluetooth Barcode Scanner Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target === barcodeInputFieldRef.current) {
        return;
      }
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 120) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          handleBarcodeScanned(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  const categories = ['Semua', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  // Core Add to Cart
  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      alert(`Stok barang "${product.name}" sudah HABIS! Tidak dapat ditambahkan.`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
          alert(`Maksimal stok tersedia untuk "${product.name}" adalah ${product.stock} ${product.unit}.`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.product.price - existing.discount,
        };
        return updated;
      } else {
        if (quantity > product.stock) {
          alert(`Maksimal stok tersedia untuk "${product.name}" adalah ${product.stock} ${product.unit}.`);
          return prevCart;
        }
        return [
          ...prevCart,
          {
            product,
            quantity,
            subtotal: quantity * product.price,
            discount: 0,
          },
        ];
      }
    });

    playBeep();
    setLastScannedFeedback(`+ ${product.name}`);
    setTimeout(() => setLastScannedFeedback(null), 1800);
  };

  const handleBarcodeScanned = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) return;

    let found = products.find(
      (p) => p.barcode.toLowerCase() === clean || p.id.toLowerCase() === clean
    );

    if (!found) {
      const alphanumeric = clean.replace(/[^a-z0-9]/g, '');
      if (alphanumeric.length >= 3) {
        found = products.find(
          (p) => p.barcode.replace(/[^a-z0-9]/g, '').toLowerCase() === alphanumeric
        );
      }
    }

    if (!found) {
      found = products.find((p) => p.name.toLowerCase().includes(clean));
    }

    if (found) {
      addToCart(found, 1);
      setBarcodeInput('');
    } else {
      alert(
        `Barcode "${code}" tidak ditemukan dalam daftar inventaris toko! Silakan periksa kembali atau tambah barang di menu Inventaris.`
      );
    }
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeScanned(barcodeInput.trim());
    }
  };

  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (newQty > prod.stock) {
      alert(`Stok hanya tersisa ${prod.stock} ${prod.unit}.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.product.price - item.discount,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Kosongkan semua barang dari keranjang belanja?')) {
      setCart([]);
      setDiscountNominal(0);
      setCashGiven('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const total = Math.max(0, subtotal - discountNominal);
  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cashAmount = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashAmount - total);
  const isCashSufficient = cashAmount >= total;

  // Checkout process
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong! Tambahkan barang terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'TUNAI') {
      if (!isCashSufficient) {
        alert(
          `Jumlah uang tunai yang diberikan (${formatRupiah(cashAmount)}) kurang dari total tagihan (${formatRupiah(total)})!`
        );
        return;
      }
      executeSale('TUNAI');
    } else {
      setIsQRISModalOpen(true);
    }
  };

  const executeSale = (method: 'TUNAI' | 'QRIS', qrisRef?: string) => {
    const txId = `TRX-${Date.now().toString().slice(-8)}`;
    const newTransaction: Transaction = {
      id: txId,
      date: new Date().toISOString(),
      cashierName: currentUser.name,
      cashierRole: currentUser.role,
      items: cart.map((c) => ({
        productId: c.product.id,
        barcode: c.product.barcode,
        name: c.product.name,
        price: c.product.price,
        costPrice: c.product.costPrice,
        quantity: c.quantity,
        subtotal: c.subtotal,
      })),
      subtotal,
      discount: discountNominal,
      total,
      paymentMethod: method,
      amountPaid: method === 'TUNAI' ? cashAmount : total,
      change: method === 'TUNAI' ? change : 0,
      qrisRef: method === 'QRIS' ? qrisRef : undefined,
      syncedToSheet: false,
    };

    // Deduct stock from inventory
    const updatedProducts = products.map((prod) => {
      const cartItem = cart.find((c) => c.product.id === prod.id);
      if (cartItem) {
        const remaining = Math.max(0, prod.stock - cartItem.quantity);
        return {
          ...prod,
          stock: remaining,
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    onCompleteSale(newTransaction, updatedProducts);

    // Open receipt modal
    setLastCompletedTx(newTransaction);

    // Reset local POS state
    setCart([]);
    setDiscountNominal(0);
    setCashGiven('');
    setIsQRISModalOpen(false);

    // Check if any product reached minStock
    const lowStockAfter = updatedProducts.filter((p) => p.stock <= p.minStock);
    if (lowStockAfter.length > 0) {
      setTimeout(() => {
        onOpenLowStock();
      }, 700);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Mobile Screen Tab Toggle */}
      <div className="md:hidden flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'catalog'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Katalog Produk</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Keranjang ({cart.length})</span>
          {cart.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping ml-0.5" />
          )}
        </button>
      </div>

      {/* Main Grid: Catalog Left (7 cols) + Cart Right (5 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: CATALOG & BARCODE SCANNER BAR */}
        <div
          className={`md:col-span-7 lg:col-span-7 xl:col-span-8 flex flex-col rounded-3xl border shadow-sm transition-all overflow-hidden ${
            mobileTab === 'cart' ? 'hidden md:flex' : 'flex'
          } ${
            isDark
              ? 'bg-slate-900/90 border-slate-800/90'
              : 'bg-white border-slate-200/90'
          }`}
        >
          {/* Top Barcode Input & Scanner Bar */}
          <div
            className={`p-4 border-b space-y-3 ${
              isDark
                ? 'bg-slate-950/60 border-slate-800/80'
                : 'bg-gradient-to-r from-slate-50 to-emerald-50/40 border-slate-200/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Manual Barcode Form */}
              <form onSubmit={handleManualBarcodeSubmit} className="flex-1 relative flex items-center">
                <div className="absolute left-3.5 text-emerald-500 flex items-center pointer-events-none">
                  <Barcode className="w-4 h-4" />
                </div>
                <input
                  ref={barcodeInputFieldRef}
                  type="text"
                  placeholder="Scan barcode fisik atau ketik kode barang lalu tekan Enter..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className={`w-full pl-10 pr-24 py-2.5 text-xs rounded-xl border font-mono font-medium focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:outline-hidden transition-all shadow-inner ${
                    isDark
                      ? 'bg-slate-900 border-slate-700/80 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!barcodeInput.trim()}
                  className={`absolute right-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    barcodeInput.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Input
                </button>
              </form>

              {/* Camera Scanner Trigger Button */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer shrink-0"
                title="Buka Kamera untuk scan barcode secara langsung"
              >
                <Camera className="w-4 h-4 text-emerald-100" />
                <span>Pindai Kamera</span>
              </button>
            </div>

            {/* Quick Click Barcodes Simulator */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold shrink-0 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Scan Cepat:
              </span>
              {products.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleBarcodeScanned(p.barcode)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border whitespace-nowrap transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:border-emerald-500'
                      : 'bg-white hover:bg-emerald-50/80 border-slate-200 text-slate-700 hover:border-emerald-400 shadow-2xs'
                  }`}
                >
                  <span className="text-emerald-500 font-bold">{p.barcode}</span>
                  <span className="text-slate-400 font-sans ml-1">({p.name.split(' ')[0]})</span>
                </button>
              ))}
            </div>

            {/* Visual feedback popup when item scanned */}
            {lastScannedFeedback && (
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Berhasil ditambahkan ke keranjang: <strong>{lastScannedFeedback}</strong></span>
              </div>
            )}
          </div>

          {/* Search & Categories Bar */}
          <div className={`p-3.5 border-b flex flex-wrap items-center gap-2.5 ${isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-100 bg-slate-50/40'}`}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama barang, barcode, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-600/30'
                      : isDark
                      ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[62vh]">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock <= p.minStock && !isOutOfStock;
              const inCart = cart.find((c) => c.product.id === p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`group relative p-3.5 rounded-2xl border flex flex-col justify-between text-left transition-all duration-200 ${
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed ' +
                        (isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-100 border-slate-200')
                      : isDark
                      ? 'bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/80 border-slate-700/70 cursor-pointer shadow-xs hover:shadow-emerald-950/40'
                      : 'bg-white hover:border-emerald-500 hover:shadow-md cursor-pointer border-slate-200/90 shadow-2xs'
                  }`}
                >
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in border-2 border-white dark:border-slate-900">
                      {inCart.quantity}
                    </span>
                  )}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono text-emerald-500 font-semibold">{p.barcode}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-medium text-[9px] uppercase tracking-wide ${
                          isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.category}
                      </span>
                    </div>
                    <h4
                      className={`font-bold text-xs mt-2 line-clamp-2 leading-snug group-hover:text-emerald-500 transition-colors ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {p.name}
                    </h4>
                  </div>

                  <div
                    className={`mt-3 pt-2.5 border-t flex items-center justify-between ${
                      isDark ? 'border-slate-700/60' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <div
                        className={`text-xs font-black tracking-tight ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(p.price)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Stok:{' '}
                        <span
                          className={
                            isOutOfStock
                              ? 'text-rose-500 font-bold'
                              : isLowStock
                              ? 'text-amber-500 font-bold'
                              : 'font-semibold'
                          }
                        >
                          {p.stock} {p.unit}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`p-1.5 rounded-xl transition-all ${
                        isOutOfStock
                          ? 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                          : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 shadow-2xs'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: KERANJANG TRANSAKSI & CHECKOUT */}
        <div
          className={`md:col-span-5 lg:col-span-5 xl:col-span-4 flex flex-col rounded-3xl border shadow-lg overflow-hidden transition-all ${
            mobileTab === 'catalog' ? 'hidden md:flex' : 'flex'
          } ${
            isDark
              ? 'bg-slate-900 border-slate-750 shadow-black/40'
              : 'bg-white border-slate-300 shadow-slate-200'
          }`}
        >
          {/* Cart Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs shadow-inner">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-wide text-white">
                  KERANJANG TRANSAKSI
                </h3>
                <p className="text-[11px] text-emerald-100 font-medium">
                  {cart.length} Jenis Barang ({totalItemCount} Total Unit)
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="px-2.5 py-1 text-[11px] bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Hapus semua barang dari keranjang"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="overflow-y-auto p-3 space-y-2 min-h-[170px] max-h-[34vh] bg-slate-50/60 dark:bg-slate-950/40">
            {cart.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-2.5">
                  <ShoppingBag className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                </div>
                <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Keranjang Masih Kosong
                </p>
                <p className="text-[11px] text-slate-500 max-w-[220px] mt-1 leading-relaxed">
                  Scan barcode barang atau klik produk dari katalog sebelah kiri untuk memulai transaksi kasir.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all shadow-2xs ${
                    isDark
                      ? 'bg-slate-850 border-slate-700/80 text-white'
                      : 'bg-white border-slate-200/90 text-slate-900'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs truncate leading-snug">{item.product.name}</h5>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        {formatRupiah(item.product.price)}
                      </span>
                      <span className="text-[10px] text-slate-400">×</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {item.quantity}
                      </span>
                      <span className="text-[10px] text-slate-400">=</span>
                      <span
                        className={`text-xs font-black font-mono ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controller Buttons */}
                  <div
                    className={`flex items-center gap-1 shrink-0 rounded-xl p-1 border shadow-2xs ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-black text-xs font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Item Button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Hapus item ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Tagihan Showcase */}
          <div
            className={`p-4 border-t space-y-3.5 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/90 border-slate-200'
            }`}
          >
            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>Subtotal ({totalItemCount} pcs)</span>
                <span className={`font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatRupiah(subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>Potongan Diskon (Rp)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discountNominal || ''}
                  onChange={(e) => setDiscountNominal(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`w-28 px-2 py-1 text-xs border rounded-xl text-right font-mono font-bold focus:outline-hidden ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* OPULENT TOTAL TAGIHAN DISPLAY BOX */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-md shadow-emerald-900/20">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                    TOTAL TAGIHAN KASIR
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tight">
                    {formatRupiah(total)}
                  </span>
                </div>
                <Receipt className="w-8 h-8 text-emerald-200 opacity-90" />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TUNAI')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    paymentMethod === 'TUNAI'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Tunai (Cash)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    paymentMethod === 'QRIS'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QRIS Digital</span>
                </button>
              </div>
            </div>

            {/* If TUNAI selected: Quick Denomination Buttons & Change Calculation */}
            {paymentMethod === 'TUNAI' && (
              <div className="space-y-2 pt-0.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Uang Diterima dari Pelanggan:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      placeholder="Masukkan nominal uang..."
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 text-sm font-bold border rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashGiven(String(total))}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven('20000')}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    20.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven('50000')}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven('100000')}
                    className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    100.000
                  </button>
                </div>

                {/* Kembalian Box */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Kembalian:</span>
                  <span
                    className={`font-mono text-sm font-black ${
                      isCashSufficient ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {formatRupiah(change)}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  : paymentMethod === 'TUNAI'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-emerald-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-blue-600/30'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {paymentMethod === 'TUNAI'
                  ? `Selesaikan Bayar Tunai (${formatRupiah(total)})`
                  : `Buka QRIS Pembayaran (${formatRupiah(total)})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING QUICK CART NOTIFICATION BAR (For mobile viewport) */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-30 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full py-3 px-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-900/30 flex items-center justify-between font-bold text-xs cursor-pointer border border-emerald-500"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>
                {cart.length} Barang di Keranjang ({totalItemCount} unit)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black bg-emerald-700 px-2 py-0.5 rounded-lg">
                {formatRupiah(total)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          products={products}
          onDetected={handleBarcodeScanned}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* QRIS Modal */}
      {isQRISModalOpen && (
        <QRISModal
          total={total}
          transactionId={`TRX-${Date.now().toString().slice(-6)}`}
          storeProfile={storeProfile}
          onSuccess={(ref) => executeSale('QRIS', ref)}
          onCancel={() => setIsQRISModalOpen(false)}
        />
      )}

      {/* Instant Receipt Modal on Sale Completion */}
      {lastCompletedTx && (
        <ThermalReceiptModal
          transaction={lastCompletedTx}
          storeProfile={storeProfile}
          onClose={() => setLastCompletedTx(null)}
        />
      )}
    </div>
  );
};
