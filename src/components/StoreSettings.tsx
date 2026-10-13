import React, { useState } from 'react';
import { Store, Save, Printer, QrCode, CheckCircle2 } from 'lucide-react';
import { StoreProfile } from '../types';

interface StoreSettingsProps {
  storeProfile: StoreProfile;
  onSaveProfile: (profile: StoreProfile) => void;
  onResetDemoData: () => void;
  isDark?: boolean;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  storeProfile,
  onSaveProfile,
  onResetDemoData,
  isDark = false,
}) => {
  const [formData, setFormData] = useState<StoreProfile>({ ...storeProfile });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/15 text-emerald-500 rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Pengaturan Toko & Format Struk Thermal
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sesuaikan identitas profil toko, konfigurasi QRIS digital, serta format cetak thermal printer 58mm/80mm.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Toko */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Store className="w-4 h-4 text-emerald-500" />
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Identitas & Informasi Toko
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Nama Toko *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Slogan / Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Alamat Lengkap Toko *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Jam Operasional</label>
              <input
                type="text"
                value={formData.operatingHours}
                onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Konfigurasi QRIS & Pembayaran */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <QrCode className="w-4 h-4 text-blue-500" />
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Konfigurasi QRIS Digital
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">
                NMID QRIS (National Merchant ID)
              </label>
              <input
                type="text"
                value={formData.qrisNmid || ''}
                onChange={(e) => setFormData({ ...formData, qrisNmid: e.target.value })}
                placeholder="ID1020030405060"
                className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Nama Merchant QRIS</label>
              <input
                type="text"
                value={formData.name}
                disabled
                className={`w-full px-3.5 py-2 text-xs rounded-xl border opacity-70 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Format Cetak Struk Thermal */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Printer className="w-4 h-4 text-emerald-500" />
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Format Cetak Thermal Printer
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">
                Ukuran Lebar Kertas Default
              </label>
              <select
                value={formData.paperSize}
                onChange={(e) =>
                  setFormData({ ...formData, paperSize: e.target.value as '58mm' | '80mm' })
                }
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              >
                <option value="58mm">58mm (Printer Thermal Kasir Kecil / Bluetooth Portabel)</option>
                <option value="80mm">80mm (Printer Thermal Kasir Standar / USB Epson)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Pesan Header Struk</label>
              <input
                type="text"
                value={formData.receiptHeader}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Pesan Footer Struk</label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Yakin ingin mereset seluruh data inventaris dan profil toko ke kondisi awal?')) {
                onResetDemoData();
              }
            }}
            className="text-xs text-rose-500 hover:text-rose-400 font-bold cursor-pointer"
          >
            Reset Semua Data Demo Toko
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Berhasil Disimpan!' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
