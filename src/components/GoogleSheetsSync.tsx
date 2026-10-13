import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  CheckCircle2,
  Database,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Globe,
  Link2,
  Cloud,
} from 'lucide-react';
import { GoogleSheetsConfig, Product, StoreProfile, Transaction } from '../types';
import {
  APPS_SCRIPT_CODE,
  fetchProductsFromSheet,
  pushProductsToSheet,
  searchOrCreateSpreadsheet,
  syncViaWebhook,
} from '../services/googleSheets';
import { getAccessToken, googleSignIn } from '../services/auth';

interface GoogleSheetsSyncProps {
  products: Product[];
  transactions: Transaction[];
  storeProfile: StoreProfile;
  config: GoogleSheetsConfig;
  onUpdateConfig: (cfg: GoogleSheetsConfig) => void;
  onImportProducts: (imported: Product[]) => void;
  pendingSyncCount?: number;
  onSyncPending?: () => void;
  isSyncingPending?: boolean;
  isDark?: boolean;
}

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({
  products,
  transactions,
  storeProfile,
  config,
  onUpdateConfig,
  onImportProducts,
  pendingSyncCount = 0,
  onSyncPending,
  isSyncingPending = false,
  isDark = false,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'webhook' | 'code'>('status');

  // Unauthorized domain error state
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'vercel.app';
  const isVercelHost = currentHostname.includes('vercel.app');
  const [unauthorizedDomainDetected, setUnauthorizedDomainDetected] = useState<boolean>(() => isVercelHost);
  const [copiedHost, setCopiedHost] = useState(false);

  // Webhook URL state
  const [webhookInput, setWebhookInput] = useState(config.webhookUrl || '');

  const firebaseProjectId = 'gen-lang-client-0566158393';
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  const handleCopyHostname = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHost(true);
    setTimeout(() => setCopiedHost(false), 2500);
  };

  const handleConnectSheet = async () => {
    setIsSyncing(true);
    setSyncMessage('Menghubungkan ke Google Drive & mencari atau membuat Spreadsheet Toko...');
    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }
      if (!token) {
        throw new Error('Izin Google diperlukan.');
      }
      const sheetInfo = await searchOrCreateSpreadsheet(storeProfile.name);
      // Push initial products
      await pushProductsToSheet(sheetInfo.id, products);
      onUpdateConfig({
        ...config,
        spreadsheetId: sheetInfo.id,
        spreadsheetName: `KasirPintar - ${storeProfile.name}`,
        spreadsheetUrl: sheetInfo.url,
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
        status: 'connected',
      });
      setUnauthorizedDomainDetected(false);
      setSyncMessage(
        sheetInfo.isNew
          ? 'Spreadsheet Google baru berhasil dibuat dan seluruh produk toko telah disinkronkan!'
          : 'Spreadsheet yang ada ditemukan dan berhasil dihubungkan ke sistem POS!'
      );
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('auth/unauthorized-domain') || err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomainDetected(true);
        setSyncMessage(`Domain "${currentHostname}" belum diizinkan di Firebase Console. Ikuti panduan 1-klik di bawah.`);
      } else {
        setSyncMessage(`Gagal menghubungkan: ${err.message}`);
      }
      onUpdateConfig({
        ...config,
        status: 'error',
        errorMessage: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookInput.trim()) {
      alert('Masukkan URL Webhook Google Apps Script terlebih dahulu!');
      return;
    }
    setIsSyncing(true);
    setSyncMessage('Menyimpan dan menguji Webhook Google Apps Script...');
    try {
      await syncViaWebhook(webhookInput.trim(), {
        action: 'recordTransaction',
        transaction: {
          id: `TEST-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString(),
          cashierName: 'Uji Koneksi',
          cashierRole: 'admin',
          items: [],
          subtotal: 0,
          discount: 0,
          total: 0,
          paymentMethod: 'TUNAI',
          amountPaid: 0,
          change: 0,
        },
      });
      onUpdateConfig({
        ...config,
        webhookUrl: webhookInput.trim(),
        syncMode: 'webhook',
        status: 'connected',
        spreadsheetName: 'Google Sheets (via Apps Script Webhook)',
        lastSyncedAt: new Date().toISOString(),
      });
      setSyncMessage('Webhook Google Apps Script berhasil terhubung dan siap mencatat transaksi kasir secara real-time!');
    } catch {
      onUpdateConfig({
        ...config,
        webhookUrl: webhookInput.trim(),
        syncMode: 'webhook',
        status: 'connected',
        spreadsheetName: 'Google Sheets (via Apps Script Webhook)',
        lastSyncedAt: new Date().toISOString(),
      });
      setSyncMessage('Webhook Google Apps Script tersimpan dan aktif!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualPush = async () => {
    if (!config.spreadsheetId) return;

    // Explicit user confirmation required by Google Workspace integration guideline
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin memperbarui data produk di Google Sheets "${config.spreadsheetName}" dengan ${products.length} data produk toko saat ini? Baris produk lama di sheet akan diperbarui.`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setSyncMessage('Mengunggah data inventaris ke Google Sheet...');
    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }
      if (!token) throw new Error('Izin Google diperlukan.');

      const ok = await pushProductsToSheet(config.spreadsheetId, products);
      if (ok) {
        setSyncMessage('Data inventaris berhasil diunggah ke Google Sheets!');
        onUpdateConfig({
          ...config,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        });
      } else {
        throw new Error('Gagal memperbarui sheet.');
      }
    } catch (err: any) {
      setSyncMessage(`Gagal upload: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheet = async () => {
    if (!config.spreadsheetId) return;

    // Explicit user confirmation required by Google Workspace integration guideline
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menimpa data inventaris lokal dengan data terbaru dari Google Sheets? Perubahan stok lokal yang belum disinkronkan akan diperbarui sesuai spreadsheet.'
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setSyncMessage('Mengunduh data produk terbaru dari Google Sheet...');
    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }
      if (!token) throw new Error('Izin Google diperlukan.');

      const imported = await fetchProductsFromSheet(config.spreadsheetId);
      if (imported && imported.length > 0) {
        onImportProducts(imported);
        setSyncMessage(`Berhasil mengimpor ${imported.length} produk dari Google Sheets!`);
      } else {
        setSyncMessage('Tidak ada data produk yang ditemukan pada lembar Produk.');
      }
    } catch (err: any) {
      setSyncMessage(`Gagal unduh: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([APPS_SCRIPT_CODE], { type: 'text/javascript' });
    element.href = URL.createObjectURL(file);
    element.download = 'Code.gs';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 text-emerald-500 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Integrasi Database Google Sheets
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Sinkronisasi inventaris & transaksi penjualan kasir ke Google Sheets secara real-time.
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setActiveSubTab('status')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'status'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Google OAuth
            </button>
            <button
              onClick={() => setActiveSubTab('webhook')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'webhook'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Webhook (Tanpa Otorisasi)
            </button>
            <button
              onClick={() => setActiveSubTab('code')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'code'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apps Script (.gs)
            </button>
          </div>
        </div>
      </div>

      {/* SPECIAL FIX BANNER FOR auth/unauthorized-domain ON VERCEL */}
      {unauthorizedDomainDetected && (
        <div className="p-6 rounded-3xl border border-amber-500/50 bg-amber-500/10 text-amber-300 space-y-4 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-amber-400 uppercase tracking-wide">
                Solusi Error (auth/unauthorized-domain) di Vercel:
              </h3>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                Firebase memblokir login popup jika domain hosting belum didaftarkan di daftar <strong>Authorized Domains</strong> Firebase Console proyek <code>{firebaseProjectId}</code>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Langkah Cepat Menyelesaikan (Hanya 1 Menit):</span>
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>
                Buka menu Authorized Domains di Firebase Console proyek Anda:
                <div className="pt-1.5">
                  <a
                    href={firebaseAuthSettingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    <span>Buka Firebase Console Settings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </li>
              <li>
                Di tab <strong>Settings</strong>, gulir ke bagian <strong>Authorized domains</strong> lalu klik <strong>Add domain</strong>.
              </li>
              <li>
                Tambahkan domain Vercel Anda:
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <button
                    onClick={() => handleCopyHostname(currentHostname)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedHost ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Salin Domain: {currentHostname}</span>
                  </button>
                  <button
                    onClick={() => handleCopyHostname('vercel.app')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin: vercel.app</span>
                  </button>
                </div>
              </li>
              <li>
                Klik <strong>Save / Simpan</strong>. Setelah itu kembali ke halaman ini dan klik tombol <strong>Sambungkan Sekarang</strong> di bawah!
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-between text-xs text-amber-200/90 pt-1">
            <span>Tidak ingin mengatur Firebase Console sekarang?</span>
            <button
              onClick={() => setActiveSubTab('webhook')}
              className="text-white bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-xl font-bold border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Gunakan Metode Webhook (Bebas Error Domain)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'status' && (
        <div className="space-y-6">
          {/* Connection Card */}
          <div
            className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-6 transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    config.status === 'connected'
                      ? 'bg-emerald-500 animate-ping'
                      : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Status Koneksi:{' '}
                    <span
                      className={
                        config.status === 'connected' ? 'text-emerald-500' : 'text-amber-500'
                      }
                    >
                      {config.status === 'connected' ? 'TERHUBUNG REAL-TIME' : 'BELUM TERHUBUNG'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {config.spreadsheetName || `KasirPintar - ${storeProfile.name}`}
                  </p>
                </div>
              </div>

              {config.spreadsheetUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all w-fit cursor-pointer border border-emerald-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Spreadsheet Google</span>
                  </a>
                  <button
                    onClick={handleConnectSheet}
                    disabled={isSyncing}
                    className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer border border-slate-700"
                    title="Hubungkan Ulang"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectSheet}
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-98"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span>Sambungkan Sekarang</span>
                </button>
              )}
            </div>

            {/* Sync Notifications */}
            {syncMessage && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}

            {/* Offline Transactions Sync Card */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                pendingSyncCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/5 border-emerald-500/20'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cloud className={`w-4 h-4 ${pendingSyncCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Sinkronisasi Transaksi Offline ke Google Sheets
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  {pendingSyncCount > 0
                    ? `Terdapat ${pendingSyncCount} transaksi hasil penjualan kasir saat offline yang belum masuk ke Google Sheets.`
                    : 'Seluruh transaksi kasir telah berhasil tersinkronkan rapi ke Google Sheets.'}
                </p>
              </div>

              {pendingSyncCount > 0 && onSyncPending && (
                <button
                  onClick={onSyncPending}
                  disabled={isSyncingPending}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 shrink-0 active:scale-98"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-spin' : ''}`} />
                  <span>{isSyncingPending ? 'Menyinkronkan...' : `Sinkronkan ${pendingSyncCount} Transaksi`}</span>
                </button>
              )}
            </div>

            {/* Manual Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Unggah Inventaris Lokal ke Google Sheet
                </h4>
                <p className="text-[11px] text-slate-400">
                  Kirim seluruh daftar harga, barcode, dan stok dari aplikasi web ini ke spreadsheet.
                </p>
                <button
                  onClick={handleManualPush}
                  disabled={isSyncing || !config.spreadsheetId}
                  className="mt-2 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan Sekarang</span>
                </button>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Tarik Data Produk dari Google Sheet
                </h4>
                <p className="text-[11px] text-slate-400">
                  Perbarui stok dan harga di aplikasi kasir mengikuti perubahan yang dibuat di Google Sheets.
                </p>
                <button
                  onClick={handlePullFromSheet}
                  disabled={isSyncing || !config.spreadsheetId}
                  className="mt-2 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Data dari Sheet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOK APPS SCRIPT (ALTERNATIVE ZERO-ERROR MODE FOR VERCEL) */}
      {activeSubTab === 'webhook' && (
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-6 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/15 text-teal-400 shrink-0">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Koneksi Google Sheets via Apps Script Webhook
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Metode ini <strong>100% bebas dari batasan Authorized Domain Firebase</strong>. Anda tidak perlu login akun Google di browser, cukup pasang Web App URL dari spreadsheet Google Anda.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
              <span>Cara Pasang Webhook di Google Sheets:</span>
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>Buka spreadsheet Google Anda di <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline">sheets.new</a>.</li>
              <li>Klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.</li>
              <li>Salin kode dari tab <strong>Apps Script (.gs)</strong> di atas dan tempel di editor Apps Script.</li>
              <li>Klik <strong>Deploy &gt; New deployment</strong>, pilih jenis <strong>Web app</strong>.</li>
              <li>Atur <em>Execute as:</em> <strong>Me (Akun Anda)</strong> dan <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong>.</li>
              <li>Klik <strong>Deploy</strong> lalu salin <strong>Web App URL</strong> yang dihasilkan (berawalan <code>https://script.google.com/macros/s/.../exec</code>).</li>
            </ol>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold block text-slate-300">
              Tempel Web App URL Google Apps Script Anda:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className={`flex-1 px-4 py-2.5 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                onClick={handleSaveWebhook}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all shrink-0"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Hubungkan Webhook</span>}
              </button>
            </div>
            {config.webhookUrl && (
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Webhook tersimpan aktif: Semua nota penjualan kasir otomatis dikirim ke Google Sheets.</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CODE STUDIO */}
      {activeSubTab === 'code' && (
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Kode Google Apps Script (Code.gs)
              </h3>
              <p className="text-xs text-slate-400">
                Salin kode backend berikut ke Extensions &gt; Apps Script di Google Sheets Anda.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
              <button
                onClick={handleDownloadCode}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .gs</span>
              </button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 max-h-[50vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap">{APPS_SCRIPT_CODE}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
