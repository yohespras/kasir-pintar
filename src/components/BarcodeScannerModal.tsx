import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  Keyboard,
  AlertCircle,
  Check,
  Upload,
  SwitchCamera,
} from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  products: Product[];
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products,
  onDetected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanSuccessAnim, setScanSuccessAnim] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const hasDetectedRef = useRef(false);

  // Play audio beep Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // AudioContext fallback
    }
  };

  const handleBarcodeFound = (code: string) => {
    if (hasDetectedRef.current) return;
    const cleanCode = code.trim();
    if (!cleanCode) return;
    hasDetectedRef.current = true;
    playBeep();
    setLastScanned(cleanCode);
    setScanSuccessAnim(true);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setTimeout(() => {
      onDetected(cleanCode);
      onClose();
    }, 700);
  };

  // Initialize ZXing Reader and Start Camera Stream
  useEffect(() => {
    hasDetectedRef.current = false;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const initCamera = async () => {
      try {
        setCameraError(null);
        const videoInputDevices = await codeReader.listVideoInputDevices();
        setAvailableDevices(videoInputDevices);

        let chosenDeviceId = selectedDeviceId;
        if (!chosenDeviceId && videoInputDevices.length > 0) {
          const backCam = videoInputDevices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          chosenDeviceId = backCam ? backCam.deviceId : videoInputDevices[0].deviceId;
        }

        if (videoRef.current) {
          setCameraActive(true);
          await codeReader.decodeFromVideoDevice(
            chosenDeviceId || null,
            videoRef.current,
            (result, error) => {
              if (result) {
                handleBarcodeFound(result.getText());
              }
              if (error && !(error instanceof NotFoundException)) {
                // Ignore routine NotFound frames
              }
            }
          );
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraActive(false);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Izin akses kamera browser ditolak. Izinkan izin kamera pada ikon gembok browser atau gunakan input barcode manual/unggah foto di bawah.'
            : 'Tidak dapat memulai kamera pada perangkat ini. Silakan gunakan input barcode manual atau unggah foto barcode.'
        );
      }
    };

    initCamera();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [selectedDeviceId]);

  // Decode from file image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    setCameraError(null);
    try {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = imageUrl;
      img.onload = async () => {
        try {
          if (codeReaderRef.current) {
            const result = await codeReaderRef.current.decodeFromImageElement(img);
            if (result) {
              handleBarcodeFound(result.getText());
            } else {
              alert('Barcode tidak terdeteksi pada gambar yang diunggah. Pastikan gambar jelas dan tidak buram.');
            }
          }
        } catch {
          alert('Barcode tidak terbaca pada gambar. Pastikan garis barcode terlihat jelas dan pencahayaan cukup.');
        } finally {
          setIsProcessingImage(false);
          URL.revokeObjectURL(imageUrl);
        }
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        alert('Gagal memuat berkas gambar.');
      };
    } catch (err: any) {
      setIsProcessingImage(false);
      alert(`Gagal memproses gambar: ${err.message}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeFound(manualCode.trim());
    }
  };

  const handleSwitchDevice = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setCameraActive(false);
    setSelectedDeviceId(availableDevices[nextIndex].deviceId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-black text-sm">Pemindai Barcode Kamera</h3>
              <p className="text-[10px] text-slate-400">Mendukung EAN-13, EAN-8, Code 128, UPC, QR Code</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {availableDevices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchDevice}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Ganti Kamera (Depan / Belakang)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport / Video Area */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Aiming Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-36 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Red Laser Scanning Line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-laser top-1/2 -translate-y-1/2" />
                  <div className="absolute top-2 left-2 text-[10px] bg-black/75 text-emerald-300 font-mono px-2 py-0.5 rounded-lg">
                    Arahkan Garis Barcode ke Sini
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400 max-w-xs">
              {cameraError ? (
                <>
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-2" />
                  <p className="text-xs text-amber-200 leading-relaxed mb-3">{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Foto Barcode</span>
                  </button>
                </>
              ) : (
                <>
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-emerald-400" />
                  <p className="text-xs">Menghubungkan ke pemindai kamera...</p>
                </>
              )}
            </div>
          )}

          {/* Success Flash Feedback */}
          {scanSuccessAnim && (
            <div className="absolute inset-0 bg-emerald-600/90 flex items-center justify-center text-white font-bold text-base flex-col gap-1 backdrop-blur-xs animate-in fade-in">
              <Check className="w-12 h-12 animate-bounce" />
              <span>Barcode Berhasil Terdeteksi!</span>
              <span className="text-sm font-mono bg-black/40 px-3 py-1 rounded-xl mt-1 tracking-wider">
                {lastScanned}
              </span>
            </div>
          )}

          {/* Hidden File Input for Image Upload Scanning */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Scan Actions & Options */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
          {/* Action Row: Upload file button */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Kamera tidak jelas atau buram?</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              {isProcessingImage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>{isProcessingImage ? 'Membaca Gambar...' : 'Pindai dari Foto'}</span>
            </button>
          </div>

          {/* Manual Barcode Input Fallback */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Ketik Barcode / SKU Manual:</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: 8999999195041 atau kode produk..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono bg-white dark:bg-slate-850 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                Pilih
              </button>
            </form>
          </div>

          {/* Quick Click Demo Barcodes from Store Catalog */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Uji coba cepat dengan barcode katalog:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Klik untuk tes scan</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {products.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleBarcodeFound(prod.barcode)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-300 text-left transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span className="font-mono font-bold text-emerald-500">{prod.barcode}</span>
                  <span className="text-slate-400 truncate max-w-[120px]">({prod.name})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
