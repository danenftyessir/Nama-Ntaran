'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ModernSidebar from '../../../components/layout/ModernSidebar';
import { motion } from 'framer-motion';

// TO DO: implementasi tracking status pengiriman real-time
// TO DO: tambahkan fitur print detail pengiriman
// TO DO: integrasikan dengan sistem notifikasi untuk update status
import { useInView } from 'react-intersection-observer';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
  LayoutDashboard,
  History,
  QrCode,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { deliveriesApi } from '@/lib/api';
import { Delivery, MenuItem } from '../../../hooks/useDeliveries';

// konfigurasi animasi untuk performa optimal
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// konfigurasi untuk reduced motion
const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export default function DeliveryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const deliveryId = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // hook untuk intersection observer
  const { ref: contentRef, inView: contentInView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  // deteksi preferensi reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // ambil detail pengiriman
  useEffect(() => {
    if (!deliveryId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await deliveriesApi.getById(deliveryId);
        setDelivery(response.delivery || response.data?.delivery || response);
        setError(null);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Gagal memuat detail pengiriman');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [deliveryId]);

  // redirect jika tidak terautentikasi
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // navigasi items untuk sidebar
  const navItems = useMemo(() => [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle },
    { label: 'Laporkan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ], []);

  // menu items dari API atau fallback ke default
  const menuItems: MenuItem[] = useMemo(() => {
    if (delivery?.menu_items && delivery.menu_items.length > 0) {
      return delivery.menu_items;
    }
    // fallback jika data dari API belum tersedia
    return [
      { name: 'Nasi Goreng Ayam', quantity: 150, unit: 'porsi' },
      { name: 'Sup Sayuran', quantity: 150, unit: 'porsi' },
      { name: 'Buah Pisang', quantity: 300, unit: 'buah' },
    ];
  }, [delivery?.menu_items]);

  // pilih variants berdasarkan preferensi reduced motion
  const activeContainerVariants = prefersReducedMotion ? reducedMotionVariants : containerVariants;
  const activeItemVariants = prefersReducedMotion ? reducedMotionVariants : itemVariants;

  // loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat Detail Pengiriman...</p>
        </div>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-modern p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/school/history"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali Ke Riwayat
          </Link>
        </div>
      </div>
    );
  }

  // not found state
  if (!delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Pengiriman Tidak Ditemukan</p>
      </div>
    );
  }

  // fungsi untuk mendapatkan badge status
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; colorClass: string }> = {
      pending: {
        label: 'Tertunda',
        colorClass: 'bg-yellow-100 text-yellow-700',
      },
      scheduled: {
        label: 'Terjadwal',
        colorClass: 'bg-blue-100 text-blue-700',
      },
      delivered: {
        label: 'Terkirim',
        colorClass: 'bg-orange-100 text-orange-700',
      },
      verified: {
        label: 'Selesai',
        colorClass: 'bg-green-100 text-green-700',
      },
      cancelled: {
        label: 'Dibatalkan',
        colorClass: 'bg-red-100 text-red-700',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${config.colorClass}`}>
        {config.label}
      </span>
    );
  };

  // fungsi untuk mendapatkan badge status escrow
  const getEscrowStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; colorClass: string }> = {
      locked: {
        label: 'Terkunci',
        colorClass: 'bg-yellow-100 text-yellow-700',
      },
      released: {
        label: 'Dirilis',
        colorClass: 'bg-green-100 text-green-700',
      },
      disputed: {
        label: 'Disengketakan',
        colorClass: 'bg-red-100 text-red-700',
      },
    };

    const config = statusConfig[status] || statusConfig.released;

    return (
      <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${config.colorClass}`}>
        {config.label}
      </span>
    );
  };

  // format tanggal pengiriman
  const formatDeliveryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // format tanggal dengan waktu
  const formatDateWithTime = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formattedDate}, ${formattedTime}`;
  };

  // generate ID pengiriman
  const generateDeliveryId = () => {
    const date = new Date(delivery.delivery_date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `DEL-${year}${month}${day}-${String(delivery.id).padStart(3, '0')}`;
  };

  // generate ID transaksi dari API atau fallback
  const getTransactionId = () => {
    if (delivery.blockchain_tx_id) {
      return delivery.blockchain_tx_id;
    }
    return `TXN-BLK-${String(delivery.id).toUpperCase().padStart(8, '0')}`;
  };

  // generate URL blockchain explorer
  const getBlockchainExplorerUrl = () => {
    if (delivery.blockchain_explorer_url) {
      return delivery.blockchain_explorer_url;
    }
    // fallback ke URL default dengan transaction ID
    const txId = getTransactionId();
    return `https://explorer.blockchain.com/tx/${txId}`;
  };

  // ambil status escrow dari data atau inferensi dari status pengiriman
  const getEscrowStatus = (): 'locked' | 'released' | 'disputed' => {
    if (delivery.escrow_status) {
      return delivery.escrow_status;
    }
    // inferensi status escrow berdasarkan status pengiriman
    if (delivery.status === 'verified') {
      return 'released';
    } else if (delivery.status === 'cancelled') {
      return 'disputed';
    }
    return 'locked';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* sidebar */}
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user?.name || 'Kepala Sekolah'}
        userEmail={user?.email || 'sekolah@mbg.id'}
        schoolName={user?.school_name || 'Sekolah'}
        onLogout={() => router.push('/login')}
      />

      {/* konten utama */}
      <main className="flex-1 ml-72 scroll-container">
        <div className="p-8 smooth-animate">
          {/* header dengan back button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="mb-8 gpu-accelerate"
          >
            <div className="flex items-center gap-4 mb-2">
              <Link
                href="/school/history"
                className="p-2 rounded-lg hover:bg-gray-100 transition-smooth"
                aria-label="Kembali ke riwayat"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Detail Pengiriman
              </h1>
            </div>
          </motion.div>

          {/* konten utama */}
          <motion.div
            ref={contentRef}
            initial="hidden"
            animate={contentInView ? 'visible' : 'hidden'}
            variants={activeContainerVariants}
            className="space-y-6"
          >
            {/* ringkasan pengiriman */}
            <motion.div
              variants={activeItemVariants}
              className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Ringkasan Pengiriman
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">ID Pengiriman</span>
                  <span className="font-medium text-gray-900">{generateDeliveryId()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Tanggal Pengiriman</span>
                  <span className="font-medium text-gray-900">
                    {formatDateWithTime(delivery.delivery_date)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Status</span>
                  {getStatusBadge(delivery.status)}
                </div>
              </div>
            </motion.div>

            {/* detail pesanan */}
            <motion.div
              variants={activeItemVariants}
              className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Detail Pesanan
              </h2>

              {/* tabel menu items */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-600">
                        Item Menu
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">
                        Kuantitas
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{item.name}</td>
                        <td className="py-3 text-gray-900">{item.quantity}</td>
                        <td className="py-3 text-gray-600">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* tanggal pengiriman yang diharapkan */}
              <div className="flex justify-between items-center py-3 border-t border-gray-200">
                <span className="text-gray-600">Tanggal Pengiriman Yang Diharapkan</span>
                <span className="font-semibold text-gray-900">
                  {formatDeliveryDate(delivery.delivery_date)}
                </span>
              </div>
            </motion.div>

            {/* informasi pemasok */}
            <motion.div
              variants={activeItemVariants}
              className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Informasi Pemasok
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Nama Pemasok</span>
                  <span className="font-medium text-gray-900">
                    {delivery.catering_name || 'PT. Cita Rasa Nusantara'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Kontak</span>
                  <span className="font-medium text-gray-900">
                    {delivery.catering_contact || '+62 812-3456-7890'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Alamat</span>
                  <span className="font-medium text-gray-900">
                    {delivery.catering_address || 'Jl. Merdeka No. 123, Jakarta Pusat'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* status pembayaran (escrow blockchain) */}
            <motion.div
              variants={activeItemVariants}
              className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Status Pembayaran (Escrow Blockchain)
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Jumlah</span>
                  <span className="font-semibold text-gray-900">
                    Rp {(delivery.amount || 4500000).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">ID Transaksi</span>
                  <span className="font-mono font-medium text-gray-900">
                    {getTransactionId()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Status Escrow</span>
                  {getEscrowStatusBadge(getEscrowStatus())}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Tautan Blockchain</span>
                  <a
                    href={getBlockchainExplorerUrl()}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-smooth"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lihat Di Explorer
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* footer */}
        <footer className="px-8 py-6 border-t border-gray-200 bg-white mt-auto">
          <p className="text-center text-sm text-gray-500">
            2025 MBG School Portal. All Rights Reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
