'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import useDeliveries from '../../hooks/useDeliveries';
import ModernSidebar from '../../components/layout/ModernSidebar';
import { motion, AnimatePresence } from 'framer-motion';

// TO DO: implementasi export data ke CSV/Excel
// TO DO: tambahkan grafik statistik verifikasi per bulan
// TO DO: integrasikan filter pemasok dengan API caterings
import { useInView } from 'react-intersection-observer';
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Calendar,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  AlertTriangle,
  QrCode,
  AlertCircle,
  FileText,
} from 'lucide-react';

// konfigurasi animasi untuk performa optimal
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // state untuk filter
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // hook untuk intersection observer
  const { ref: tableRef, inView: tableInView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const { ref: filterRef, inView: filterInView } = useInView({
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

  const { deliveries, isLoading, refetch } = useDeliveries({
    school_id: user?.school_id,
    status: statusFilter,
    date_from: dateFrom,
    date_to: dateTo,
  });

  // redirect jika tidak terautentikasi
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // handler untuk apply filter dengan throttling
  const handleApplyFilters = useCallback(() => {
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  // handler untuk reset filter
  const handleResetFilters = useCallback(() => {
    setStatusFilter('');
    setSupplierFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  // filter deliveries berdasarkan search query (client-side) dengan memoization
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        d.catering_name?.toLowerCase().includes(query) ||
        d.id.toString().includes(query)
      );
    });
  }, [deliveries, searchQuery]);

  // pagination dengan memoization
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * 10;
    return filteredDeliveries.slice(startIndex, startIndex + 10);
  }, [filteredDeliveries, currentPage]);

  const totalPages = Math.ceil(filteredDeliveries.length / 10);

  // navigasi items untuk sidebar
  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle },
    { label: 'Laporkan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ];

  // opsi pemasok - data statis untuk sementara
  // dapat diintegrasikan dengan API caterings di masa depan
  const supplierOptions = useMemo(() => [
    { value: '', label: 'Semua Pemasok' },
    { value: 'pt-sumber-pangan', label: 'PT Sumber Pangan' },
    { value: 'cv-sehat-selalu', label: 'CV Sehat Selalu' },
    { value: 'pt-boga-rasa', label: 'PT Boga Rasa' },
  ], []);

  // loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  // fungsi untuk mendapatkan badge status
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; colorClass: string; icon: React.ElementType }> = {
      pending: {
        label: 'Tertunda',
        colorClass: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        icon: Clock
      },
      scheduled: {
        label: 'Terjadwal',
        colorClass: 'bg-blue-100 text-blue-700 border border-blue-200',
        icon: Calendar
      },
      delivered: {
        label: 'Terkirim',
        colorClass: 'bg-orange-100 text-orange-700 border border-orange-200',
        icon: Package
      },
      verified: {
        label: 'Terverifikasi',
        colorClass: 'bg-green-100 text-green-700 border border-green-200',
        icon: CheckCircle
      },
      cancelled: {
        label: 'Dibatalkan',
        colorClass: 'bg-red-100 text-red-700 border border-red-200',
        icon: XCircle
      },
      published: {
        label: 'Diterbitkan',
        colorClass: 'bg-purple-100 text-purple-700 border border-purple-200',
        icon: FileText
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.colorClass} gpu-accelerate`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // pilih variants berdasarkan preferensi reduced motion
  const activeContainerVariants = prefersReducedMotion ? reducedMotionVariants : containerVariants;
  const activeItemVariants = prefersReducedMotion ? reducedMotionVariants : itemVariants;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* sidebar */}
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user.name || 'Kepala Sekolah'}
        userEmail={user.email || 'sekolah@mbg.id'}
        schoolName={user.school_name || 'Sekolah'}
        onLogout={() => router.push('/login')}
      />

      {/* konten utama */}
      <main className="flex-1 ml-72 scroll-container">
        <div className="p-8 smooth-animate">
          {/* header section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="mb-8 gpu-accelerate"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Riwayat Verifikasi Pengiriman
            </h1>
            <p className="text-gray-600 max-w-3xl leading-relaxed">
              Halaman ini menyediakan catatan komprehensif dari semua verifikasi pengiriman
              makanan yang dilakukan oleh sekolah. Anda dapat mencari dan memfilter data untuk
              menemukan catatan tertentu.
            </p>
          </motion.div>

          {/* filter section */}
          <motion.div
            ref={filterRef}
            initial="hidden"
            animate={filterInView ? 'visible' : 'hidden'}
            variants={activeContainerVariants}
            className="bg-white rounded-2xl shadow-modern p-6 mb-6 gpu-accelerate"
          >
            <motion.div variants={activeItemVariants}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Filter Riwayat Verifikasi
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Cari dan saring catatan verifikasi berdasarkan berbagai kriteria.
              </p>
            </motion.div>

            <motion.div
              variants={activeItemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
            >
              {/* search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari Kata Kunci..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-smooth outline-none text-sm"
                />
              </div>

              {/* date from */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  placeholder="Tanggal Mulai"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-smooth outline-none text-sm"
                />
              </div>

              {/* date to */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  placeholder="Tanggal Akhir"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-smooth outline-none text-sm"
                />
              </div>

              {/* status dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-smooth outline-none text-sm appearance-none cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="pending">Tertunda</option>
                <option value="scheduled">Terjadwal</option>
                <option value="delivered">Terkirim</option>
                <option value="verified">Terverifikasi</option>
                <option value="cancelled">Dibatalkan</option>
              </select>

              {/* supplier dropdown */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-smooth outline-none text-sm appearance-none cursor-pointer"
              >
                {supplierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* filter buttons */}
            <motion.div
              variants={activeItemVariants}
              className="flex justify-end gap-3"
            >
              <button
                onClick={handleResetFilters}
                className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-smooth text-sm"
              >
                Reset Filter
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-6 py-2.5 bg-green-600 rounded-lg text-white font-medium hover:bg-green-700 transition-smooth text-sm shadow-sm"
              >
                Terapkan Filter
              </button>
            </motion.div>
          </motion.div>

          {/* table section */}
          <motion.div
            ref={tableRef}
            initial="hidden"
            animate={tableInView ? 'visible' : 'hidden'}
            variants={activeContainerVariants}
            className="bg-white rounded-2xl shadow-modern overflow-hidden gpu-accelerate"
          >
            <motion.div variants={activeItemVariants} className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Catatan Verifikasi
              </h2>
              <p className="text-sm text-gray-600">
                Daftar lengkap semua verifikasi pengiriman makanan yang dilakukan.
              </p>
            </motion.div>

            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Memuat Data...</p>
              </div>
            ) : paginatedDeliveries.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Tidak Ada Riwayat Ditemukan</p>
                <p className="text-sm text-gray-500 mt-1">
                  Coba ubah filter atau kata kunci pencarian Anda.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto scroll-container">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          ID Verifikasi
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          Tanggal
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          Pemasok
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          Item Makanan
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          Kuantitas
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          Status
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-gray-700 text-sm">
                          Pemverifikasi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {paginatedDeliveries.map((delivery, index) => (
                          <motion.tr
                            key={delivery.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.05,
                              ease: [0.4, 0, 0.2, 1]
                            }}
                            onClick={() => router.push(`/school/deliveries/${delivery.id}`)}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-smooth cursor-pointer gpu-accelerate"
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                V{String(delivery.id).padStart(3, '0')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {new Date(delivery.delivery_date).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                }).split('/').reverse().join('-')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                {delivery.catering_name || 'PT Sumber Pangan'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {delivery.menu_items || delivery.notes || 'Nasi, Ayam Goreng, Sayur Lodeh'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                {delivery.portions}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(delivery.status)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {delivery.verifier_name || user.school_name || 'Budi Santoso'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* pagination */}
                {totalPages > 0 && (
                  <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
                        aria-label="Halaman sebelumnya"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>

                      <span className="text-sm text-gray-600 px-3">
                        Halaman {currentPage} dari {totalPages || 1}
                      </span>

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
                        aria-label="Halaman selanjutnya"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
