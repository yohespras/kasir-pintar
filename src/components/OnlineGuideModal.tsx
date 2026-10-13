import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Cloud,
  Server,
  Share2,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  Wifi,
  WifiOff,
  Database,
  HardDrive,
  Terminal,
  FolderArchive,
  Printer,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';

interface OnlineGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const OnlineGuideModal: React.FC<OnlineGuideModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<'offline' | 'deploy' | 'hp' | 'sheets' | 'multi'>('offline');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBuildCmd, setCopiedBuildCmd] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [appUrl, setAppUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setAppUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl || window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyDeployConfig = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyBuildCmd = () => {
    navigator.clipboard.writeText('npm run build');
    setCopiedBuildCmd(true);
    setTimeout(() => setCopiedBuildCmd(false), 2500);
  };

  const vercelConfig = `{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md transition-all">
      <div
        className={`relative w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/20'
        }`}
      >
        {/* Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              {isOnline ? (
                <Wifi className="w-6 h-6 text-emerald-200 animate-pulse" />
              ) : (
                <WifiOff className="w-6 h-6 text-amber-300 animate-bounce" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Pusat Hosting & Mode Offline Kasir</h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-slate-950 animate-ping' : 'bg-slate-950'}`} />
                  {isOnline ? 'Online Aktif' : 'Mode Offline Aktif'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Kasir siap berjalan tanpa kuota (offline) dan siap di-hosting ke domain sendiri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live URL & Status Bar Strip */}
        <div
          className={`px-6 py-3.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Status Saat Ini: {isOnline ? 'Tersambung Internet (Cloud Siap)' : 'Offline (Data Aman di Memori Lokal)'}
              </div>
              <div className="font-mono text-xs font-semibold truncate text-emerald-400">
                {appUrl || 'Sedang memuat link aplikasi...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                copiedLink
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Web'}</span>
            </button>
            <a
              href={appUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tab Baru</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b px-6 gap-2 overflow-x-auto shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/50'
          }`}
        >
          <button
            onClick={() => setActiveTab('offline')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'offline'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>1. Cara Pakai Offline (Tanpa Internet)</span>
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>2. Panduan Hosting Sendiri (Vercel / cPanel)</span>
          </button>
          <button
            onClick={() => setActiveTab('hp')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'hp'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span>3. Buka & Pasang di HP (PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4 text-teal-400" />
            <span>4. Cloud Sync Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab('multi')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'multi'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>5. Pengaturan Multi-Kasir</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CARA PAKAI OFFLINE */}
          {activeTab === 'offline' && (
            <div className="space-y-6">
              <div
                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  isDark
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-amber-400">
                    Aplikasi Ini 100% Siap Beroperasi Tanpa Internet (Admin & Kasir)
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    Sistem telah dilengkapi <strong>Local Database</strong>. Admin dan Kasir dapat bertransaksi, cek inventaris, dan mencetak nota secara normal saat offline. Ketika internet kembali online, seluruh data transaksi akan <strong>otomatis disinkronkan ke Google Sheets!</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400 mb-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Scan Barcode & Kasir</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kamera scan barcode produk, cari nama barang, tambah keranjang belanja, hitung diskon serta kembalian berjalan normal 100% offline.
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400 mb-2">
                    <Printer className="w-4 h-4 shrink-0" />
                    <span>Cetak Struk Thermal</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Struk belanja thermal (58mm/80mm) dan cetak nota fisik melalui printer bluetooth/kabel tetap berfungsi normal tanpa internet.
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400 mb-2">
                    <Cloud className="w-4 h-4 shrink-0" />
                    <span>Auto-Sync ke Google Sheets</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Setiap transaksi offline tersimpan di antrean aman, dan langsung <strong>otomatis disinkronkan ke Google Sheets</strong> begitu HP/laptop kembali tersambung ke WiFi/internet!
                  </p>
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm flex items-center gap-2 text-emerald-400">
                  <Zap className="w-4 h-4" />
                  <span>3 Langkah Menggunakan Kasir Secara Offline:</span>
                </h4>
                <ol
                  className={`list-decimal list-inside space-y-2 text-xs font-medium pl-1 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <li>
                    <strong>Buka aplikasi minimal 1 kali saat online</strong> (atau pasang via tombol <em>&quot;Pasang Kasir di HP&quot;</em> / PWA). Browser otomatis menyimpan cache seluruh kode aplikasi kasir.
                  </li>
                  <li>
                    <strong>Saat internet mati / offline:</strong> Buka kasir seperti biasa. Baik Admin maupun Kasir dapat login dengan PIN, bertransaksi, dan mengelola toko normal.
                  </li>
                  <li>
                    <strong>Saat internet tersambung kembali:</strong> Sistem secara otomatis mendeteksi koneksi online dan langsung menyinkronkan seluruh transaksi tertunda ke Google Sheets tanpa perlu tindakan manual!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: PANDUAN HOSTING */}
          {activeTab === 'deploy' && (
            <div className="space-y-6">
              <div
                className={`p-5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-emerald-400">
                  <Server className="w-4 h-4" />
                  <span>Bagaimana Cara Memasang (Hosting) Kasir ke Web / Domain Sendiri?</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aplikasi ini merupakan aplikasi web modern (React + Vite SPA) yang sangat ringan dan tidak membutuhkan server database berat. Anda bisa menghostingnya secara <strong>GRATIS</strong> di Vercel, Netlify, Firebase Hosting, atau ke cPanel hosting web toko Anda sendiri!
                </p>
              </div>

              {/* Build Command Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Perintah Build Produksi (Menghasilkan folder dist/):
                  </div>
                  <div className="font-mono text-sm text-emerald-400 font-bold mt-0.5">
                    $ npm run build
                  </div>
                </div>
                <button
                  onClick={handleCopyBuildCmd}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedBuildCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBuildCmd ? 'Perintah Tersalin!' : 'Salin Perintah'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vercel */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-1.5 text-emerald-400">
                      <span>▲</span> Vercel (Paling Direkomendasikan)
                    </span>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      Gratis
                    </span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
                    <li>Upload kode ini ke repositori <strong>GitHub</strong> Anda.</li>
                    <li>Buka <strong>vercel.com</strong> dan login dengan akun GitHub Anda.</li>
                    <li>Klik <strong>&quot;Add New Project&quot;</strong> lalu pilih repositori kasir.</li>
                    <li>Klik <strong>Deploy</strong>. Selesai dalam 1 menit! Anda bisa pasang domain kustom toko Anda.</li>
                  </ol>
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                      <span>File vercel.json:</span>
                      <button
                        onClick={() => handleCopyDeployConfig(vercelConfig)}
                        className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Salin</span>
                      </button>
                    </div>
                    <pre
                      className={`p-2.5 rounded-xl text-[10px] font-mono overflow-x-auto ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {vercelConfig}
                    </pre>
                  </div>
                </div>

                {/* Netlify */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-1.5 text-teal-400">
                      <FolderArchive className="w-4 h-4" /> Netlify (Drag-and-Drop)
                    </span>
                    <span className="text-[10px] bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full font-bold">
                      Mudah
                    </span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
                    <li>Jalankan <code>npm run build</code> di komputer Anda.</li>
                    <li>Akan tercipta folder <strong>dist/</strong>.</li>
                    <li>Buka <strong>netlify.com/drop</strong> di browser.</li>
                    <li>Cukup tarik (drag & drop) folder <strong>dist/</strong> tersebut ke browser Netlify!</li>
                    <li>Website kasir langsung online dan mendapatkan link publik gratis serta SSL HTTPS.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUKA & PASANG DI HP */}
          {activeTab === 'hp' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* QR Code Section */}
              <div
                className={`md:col-span-5 p-5 rounded-2xl border text-center flex flex-col items-center ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Scan Cepat dengan Kamera HP
                </div>
                {qrCodeDataUrl ? (
                  <div className="bg-white p-3 rounded-2xl shadow-xl inline-block border-4 border-emerald-500/30">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code KasirPintar"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-500">
                    Membuat QR Code...
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-3 font-medium">
                  Arahkan kamera HP kasir Anda ke barcode di atas untuk langsung membuka kasir di ponsel.
                </p>
                <button
                  onClick={handleCopyLink}
                  className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim Link via WhatsApp / Catatan</span>
                </button>
              </div>

              {/* Step by step installation */}
              <div className="md:col-span-7 space-y-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Aplikasi ini adalah PWA (Progressive Web App)</span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Bisa di-install langsung dari browser ke layar depan HP tanpa perlu download dari Google Play Store atau App Store!
                  </p>
                  <div className="mt-3">
                    <PWAInstallButton variant="hero" isDark={isDark} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-black">
                      A
                    </span>
                    <span>Untuk HP Android (Google Chrome):</span>
                  </h4>
                  <ol
                    className={`list-decimal list-inside space-y-2 text-xs pl-2 font-medium leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <li>Buka link aplikasi di browser <strong>Google Chrome</strong> di HP kasir.</li>
                    <li>Ketuk tombol <strong>titik tiga (⋮)</strong> di sudut kanan atas browser.</li>
                    <li>Pilih menu <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (atau <em>&quot;Instal Aplikasi&quot;</em>).</li>
                    <li>Beri nama <strong>Salsabila Mart</strong> lalu tekan <strong>Instal</strong>.</li>
                    <li>Ikon kasir akan muncul di menu HP Anda dan langsung berjalan layar penuh!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLOUD SYNC GOOGLE SHEETS */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              <div
                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-400">
                    Otomatisasi Cloud ke Google Sheets Pemilik Toko
                  </h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Dengan mengaktifkan sinkronisasi Google Sheets, setiap kali kasir menyelesaikan transaksi di HP atau komputer mana pun, rincian penjualan, keuntungan bersih, dan stok barang akan langsung tersimpan di file Google Sheets akun Google Drive Anda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                    Buka Menu Sheets
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Masuk ke menu <strong>&quot;Database Google Sheets&quot;</strong> di sidebar kiri aplikasi.
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">2</span>
                    Hubungkan Akun Google
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tekan tombol <strong>&quot;Sambungkan Sekarang&quot;</strong> dan masuk dengan akun Google <strong>salsabilamart684@gmail.com</strong>.
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">3</span>
                    Sinkron Otomatis
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sistem akan membuat spreadsheet dan menyinkronkan seluruh transaksi dan inventaris secara real-time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MULTI-PENGGUNA & KASIR */}
          {activeTab === 'multi' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm mb-1 text-emerald-400">
                  Cara Kasir & Pemilik Toko Menggunakan dari Perangkat Berbeda
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Setiap staf toko memiliki peran dan PIN login masing-masing untuk menjaga keamanan kasir:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-sm">Role Admin (Pemilik Toko)</div>
                      <div className="text-[11px] text-slate-400">Akses Penuh</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bisa melihat laporan keuangan, mengatur harga & stok barang, mengelola user kasir, dan menghubungkan Google Sheets.
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-sm">Role Kasir (Staf Penjualan)</div>
                      <div className="text-[11px] text-slate-400">Khusus Transaksi POS</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tampilan disederhanakan: Hanya kasir penjualan dan pengecekan sisa stok barang, tanpa menu keuangan sensitif.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border text-xs text-slate-400 leading-relaxed flex items-center gap-3 ${
                  isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <Info className="w-5 h-5 shrink-0" />
                <span>
                  Tip: Anda bisa menambah petugas kasir baru dengan nama dan PIN khusus di menu <strong>&quot;Manajemen Pengguna&quot;</strong>.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 hidden sm:block">
            Semua fitur kasir, barcode, cetak struk, dan pencatatan stok siap dipakai offline maupun online.
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
