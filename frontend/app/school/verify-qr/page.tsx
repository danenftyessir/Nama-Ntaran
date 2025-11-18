'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import ModernSidebar from '@/app/components/layout/ModernSidebar';
import {
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  History,
  QrCode,
  AlertCircle,
  Camera,
  Upload,
  Loader2,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

// TODO: Implementasi integrasi dengan blockchain untuk transparansi verifikasi
// TODO: Tambahkan fitur history scan QR untuk tracking
// TODO: Implementasi offline mode dengan queue system

interface DeliveryQRData {
  deliveryId: number;
  schoolId: number;
  cateringId: number;
  portions: number;
  deliveryDate: string;
  hash: string;
}

export default function VerifyQRPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<DeliveryQRData | null>(null);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle },
    { label: 'Laporan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ];

  const handleLogout = () => {
    router.push('/login');
  };

  const schoolInfo = {
    name: user?.school_name || 'Sekolah',
  };

  // mulai scan dengan kamera
  const startCameraScanning = async () => {
    try {
      setError('');

      // cek apakah browser mendukung getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda Tidak Mendukung Akses Kamera');
      }

      // set showCamera true dan tunggu React selesai render
      setShowCamera(true);
    } catch (err: any) {
      console.error('Camera error:', err);

      // handle berbagai jenis error kamera
      let errorMessage = 'Gagal Mengakses Kamera';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Akses Kamera Ditolak. Mohon Berikan Izin Akses Kamera Pada Browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'Kamera Tidak Ditemukan. Pastikan Perangkat Anda Memiliki Kamera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Kamera Sedang Digunakan Oleh Aplikasi Lain. Tutup Aplikasi Tersebut Dan Coba Lagi.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Kamera Tidak Mendukung Pengaturan Yang Diminta.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Browser Anda Tidak Mendukung Akses Kamera. Gunakan Browser Modern Seperti Chrome Atau Firefox.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setShowCamera(false);
    }
  };

  // effect untuk initialize scanner setelah camera element ter-render
  useEffect(() => {
    const initializeScanner = async () => {
      if (!showCamera || scanning) return;

      try {
        // tunggu sebentar untuk memastikan DOM sudah ter-render
        await new Promise(resolve => setTimeout(resolve, 100));

        // cek apakah element sudah ada
        const element = document.getElementById("qr-reader");
        if (!element) {
          throw new Error('Element QR Reader Tidak Ditemukan');
        }

        html5QrCodeRef.current = new Html5Qrcode("qr-reader");

        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          onScanSuccess,
          () => {} // abaikan error scan individual
        );

        setScanning(true);
      } catch (err: any) {
        console.error('Scanner initialization error:', err);

        let errorMessage = 'Gagal Mengakses Kamera';

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Akses Kamera Ditolak. Mohon Berikan Izin Akses Kamera Pada Browser Anda.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Kamera Tidak Ditemukan. Pastikan Perangkat Anda Memiliki Kamera.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Kamera Sedang Digunakan Oleh Aplikasi Lain. Tutup Aplikasi Tersebut Dan Coba Lagi.';
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Kamera Tidak Mendukung Pengaturan Yang Diminta.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Browser Anda Tidak Mendukung Akses Kamera. Gunakan Browser Modern Seperti Chrome Atau Firefox.';
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        setShowCamera(false);

        // cleanup jika ada error
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.clear();
          } catch (clearErr) {
            console.error('Error clearing scanner:', clearErr);
          }
        }
      }
    };

    initializeScanner();
  }, [showCamera, scanning]);

  // stop scanning
  const stopScanning = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setScanning(false);
        setShowCamera(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  // handle scan dari file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const html5QrCode = new Html5Qrcode("qr-reader-file");

      const decodedText = await html5QrCode.scanFile(file, true);
      onScanSuccess(decodedText);

      html5QrCode.clear();
    } catch (err: any) {
      setError('Gagal membaca QR code dari gambar. Pastikan gambar mengandung QR code yang valid.');
    }
  };

  // callback saat QR berhasil di-scan
  const onScanSuccess = (decodedText: string) => {
    try {
      const data: DeliveryQRData = JSON.parse(decodedText);

      // validasi hash untuk keamanan
      const dataString = `${data.deliveryId}-${data.schoolId}-${data.cateringId}-${data.portions}-${data.deliveryDate}`;
      const expectedHash = generateSimpleHash(dataString);

      if (data.hash !== expectedHash) {
        setError('QR Code tidak valid atau telah dimodifikasi!');
        return;
      }

      setScannedData(data);
      stopScanning();
    } catch (err) {
      setError('Format QR Code tidak valid');
    }
  };

  // generate hash sederhana untuk validasi
  const generateSimpleHash = (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };

  // handle verifikasi pengiriman
  const handleVerification = async () => {
    if (!scannedData) {
      // jika belum scan, arahkan ke scan
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    setValidating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/verifications`,
        {
          delivery_id: scannedData.deliveryId,
          portions_received: scannedData.portions,
          quality_rating: 5,
          notes: `Verifikasi via QR Code - ${new Date().toLocaleString('id-ID')}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // redirect ke dashboard setelah berhasil
      router.push('/school');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memverifikasi pengiriman');
    } finally {
      setValidating(false);
    }
  };

  // handle report issue
  const handleReportIssue = () => {
    router.push('/school/issues/new');
  };

  // cleanup saat component unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 smooth-scroll">
      {/* sidebar */}
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user?.name || 'Kepala Sekolah'}
        userEmail={user?.email || 'sekolah@mbg.id'}
        schoolName={schoolInfo.name}
        onLogout={handleLogout}
      />

      {/* main content */}
      <main className="ml-72 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8 gpu-accelerate">
          {/* page header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Verifikasi Pengiriman QR
            </h1>
            <p className="text-gray-600 text-lg">
              Pindai Kode QR Pada Pesanan Pengiriman Untuk Memverifikasi Penerimaan Makanan Secara Instan Atau Unggah Gambar Kode QR
            </p>
          </motion.div>

          {/* qr scanner area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="mb-8"
          >
            {!showCamera ? (
              <div
                onClick={() => startCameraScanning()}
                className="relative bg-white border-2 border-dashed border-gray-300 rounded-2xl p-16 hover:border-purple-400 hover:bg-gray-50 transition-smooth cursor-pointer group"
              >
                {/* hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* hidden div untuk file scanning */}
                <div id="qr-reader-file" className="hidden"></div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-2xl mb-6 group-hover:bg-purple-50 transition-smooth gpu-accelerate">
                    <QrCode className="w-12 h-12 text-gray-400 group-hover:text-purple-600 transition-smooth" />
                  </div>

                  <p className="text-gray-600 text-lg font-medium mb-2">
                    Arahkan Kamera Ke Kode QR Atau Klik Area Ini Untuk Mengunggah
                  </p>

                  <p className="text-gray-500 text-sm">
                    Klik Untuk Memulai Scan Atau Upload Gambar QR Code
                  </p>
                </div>

                {/* scanned data preview */}
                {scannedData && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute top-4 right-4"
                  >
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        QR Terdeteksi
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                {/* camera preview */}
                <div id="qr-reader" className="rounded-xl overflow-hidden mb-4"></div>

                <button
                  onClick={stopScanning}
                  className="w-full bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-smooth"
                >
                  Tutup Kamera
                </button>
              </motion.div>
            )}

            {/* error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </motion.div>
            )}

            {/* scanned data info */}
            {scannedData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="mt-4 p-6 bg-white border border-gray-200 rounded-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">Data Pengiriman Terdeteksi</h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">ID Pengiriman:</span>
                    <span className="font-semibold text-gray-900">#{scannedData.deliveryId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Jumlah Porsi:</span>
                    <span className="font-semibold text-purple-600">{scannedData.portions} Porsi</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Tanggal Pengiriman:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(scannedData.deliveryDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <button
              onClick={handleVerification}
              disabled={validating}
              className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-700 hover:shadow-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {validating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verifikasi Pengiriman
                </>
              )}
            </button>

            <button
              onClick={handleReportIssue}
              className="bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 hover:shadow-lg transition-smooth flex items-center justify-center gap-3"
            >
              <AlertCircle className="w-5 h-5" />
              Laporkan Masalah
            </button>
          </motion.div>

          {/* footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <p className="text-gray-500 text-sm">
              &copy; 2025 MBG School Portal. All Rights Reserved.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
