'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { deliveriesApi, verificationsApi } from '@/lib/api';
import ModernSidebar from '../../../components/layout/ModernSidebar';
import {
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  History,
  Loader2,
  QrCode,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
  Package,
} from 'lucide-react';

// TODO: Implementasi auto-save untuk form draft
// TODO: Tambahkan konfirmasi dialog sebelum submit
// TODO: Implementasi upload foto sebagai bukti penerimaan

export default function VerifyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = params.id as string;
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [delivery, setDelivery] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // form state
  const [jumlahDiterima, setJumlahDiterima] = useState('');
  const [statusKualitas, setStatusKualitas] = useState('Sangat Baik');
  const [catatanTambahan, setCatatanTambahan] = useState('');
  const [laporkanMasalah, setLaporkanMasalah] = useState(false);

  // redirect jika tidak terautentikasi
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // fetch data pengiriman
  useEffect(() => {
    const fetchDelivery = async () => {
      if (!deliveryId) return;

      try {
        setIsLoading(true);
        const response = await deliveriesApi.getById(deliveryId);
        const deliveryData = response.delivery || response.data || response;
        setDelivery(deliveryData);
        // set default value untuk jumlah diterima
        setJumlahDiterima(deliveryData.portions?.toString() || '0');
      } catch (error: any) {
        console.error('Error fetching delivery:', error);
        alert('Gagal memuat data pengiriman');
        router.push('/school/verify');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDelivery();
  }, [deliveryId, router]);

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

  // fungsi untuk copy ID pengiriman
  const handleCopyId = async () => {
    if (!delivery?.id) return;

    const deliveryIdText = `MBG-DEL-${delivery.id}`;
    try {
      await navigator.clipboard.writeText(deliveryIdText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Gagal copy ID:', error);
    }
  };

  // konversi rating kualitas ke angka
  const getQualityRating = (status: string): number => {
    const mapping: Record<string, number> = {
      'Sangat Baik': 5,
      'Baik': 4,
      'Cukup': 3,
      'Kurang': 2,
      'Buruk': 1,
    };
    return mapping[status] || 3;
  };

  // handle submit verifikasi
  const handleSubmitVerification = async () => {
    if (!delivery) return;

    // validasi input
    const jumlahDiterimaNum = parseFloat(jumlahDiterima);
    if (isNaN(jumlahDiterimaNum) || jumlahDiterimaNum < 0) {
      alert('Jumlah yang diterima harus berupa angka positif');
      return;
    }

    try {
      setIsSubmitting(true);

      // jika checkbox laporkan masalah dicentang, redirect ke halaman laporan
      if (laporkanMasalah) {
        router.push(`/school/issues/new?delivery_id=${delivery.id}`);
        return;
      }

      // buat verifikasi
      const verificationData = {
        delivery_id: delivery.id,
        status: 'approved',
        portions_received: jumlahDiterimaNum,
        quality_rating: getQualityRating(statusKualitas),
        notes: catatanTambahan || null,
        photo_url: null,
      };

      const response = await verificationsApi.create(verificationData);

      // tampilkan pesan sukses
      if (response?.blockchain?.released) {
        alert('Verifikasi Berhasil! Dana Telah Dicairkan Ke Katering Via Blockchain.');
      } else {
        alert('Verifikasi Berhasil Tersimpan.');
      }

      // redirect ke halaman verifikasi
      router.push('/school/verify');
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      alert(`Gagal: ${error.message || 'Gagal melakukan verifikasi'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // handle tombol laporkan masalah
  const handleReportIssue = () => {
    if (!delivery) return;
    router.push(`/school/issues/new?delivery_id=${delivery.id}`);
  };

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  const deliveryIdFormatted = `MBG-DEL-${delivery.id}`;
  const deliveryDate = new Date(delivery.delivery_date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
          {/* tombol kembali */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => router.push('/school/verify')}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-6 transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Kembali Ke Daftar</span>
          </motion.button>

          {/* header halaman */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-600 rounded-xl shadow-modern">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Verifikasi Penerimaan Makanan
                </h1>
                <p className="text-gray-600 mt-1">
                  Konfirmasi Penerimaan Dan Kualitas Makanan Dari Pemasok
                </p>
              </div>
            </div>
          </motion.div>

          {/* form container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="bg-white rounded-2xl shadow-modern border border-gray-200 overflow-hidden gpu-accelerate"
          >
            {/* section header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-8 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Rincian Pengiriman</h2>
              <p className="text-gray-600 text-sm mt-1">
                Tanggal Pengiriman: {deliveryDate}
              </p>
            </div>

            {/* form content */}
            <div className="p-8 space-y-6">
              {/* ID pengiriman */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
              >
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  ID Pengiriman
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={deliveryIdFormatted}
                    readOnly
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold focus:outline-none cursor-default"
                  />
                  <button
                    onClick={handleCopyId}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-smooth"
                    title="Copy ID"
                  >
                    {isCopied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* nama pemasok */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
              >
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Nama Pemasok
                </label>
                <input
                  type="text"
                  value={delivery.catering_name || 'Tidak Diketahui'}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold focus:outline-none cursor-default"
                />
              </motion.div>

              {/* jumlah yang diterima */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
              >
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Jumlah Yang Diterima (Porsi)
                </label>
                <input
                  type="number"
                  value={jumlahDiterima}
                  onChange={(e) => setJumlahDiterima(e.target.value)}
                  min="0"
                  step="1"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-smooth"
                  placeholder="Masukkan jumlah porsi yang diterima"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Dijanjikan: {delivery.portions} porsi
                </p>
              </motion.div>

              {/* status kualitas */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
              >
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Status Kualitas
                </label>
                <select
                  value={statusKualitas}
                  onChange={(e) => setStatusKualitas(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-smooth cursor-pointer"
                >
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang">Kurang</option>
                  <option value="Buruk">Buruk</option>
                </select>
              </motion.div>

              {/* catatan tambahan */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
              >
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={catatanTambahan}
                  onChange={(e) => setCatatanTambahan(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-smooth resize-none"
                  placeholder="Sertakan detail relevan tentang pengiriman atau kualitas makanan..."
                />
              </motion.div>

              {/* checkbox laporkan masalah */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.45 }}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
              >
                <input
                  type="checkbox"
                  id="laporkanMasalah"
                  checked={laporkanMasalah}
                  onChange={(e) => setLaporkanMasalah(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                />
                <label
                  htmlFor="laporkanMasalah"
                  className="text-gray-900 font-medium cursor-pointer select-none"
                >
                  Laporkan Masalah Dengan Pengiriman Ini
                </label>
              </motion.div>
            </div>

            {/* action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
              className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex gap-4"
            >
              <button
                onClick={handleReportIssue}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:shadow-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertCircle className="w-5 h-5" />
                Laporkan Masalah
              </button>

              <button
                onClick={handleSubmitVerification}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 hover:shadow-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Konfirmasi Penerimaan
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>

          {/* footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8 text-center"
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
