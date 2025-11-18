'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import useDeliveries from '../../hooks/useDeliveries';
import ModernSidebar from '../../components/layout/ModernSidebar';
import GlassPanel from '../../components/ui/GlassPanel';
import DeliveryCard from '../../components/school/DeliveryCard';
import {
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  History,
  Loader2,
  QrCode,
  AlertCircle,
  Package,
  Calendar,
  Filter,
} from 'lucide-react';

// TODO: Implementasi filter berdasarkan tanggal pengiriman
// TODO: Tambahkan fitur bulk verification untuk multiple deliveries
// TODO: Implementasi notifikasi real-time untuk pengiriman baru

export default function VerifyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { deliveries, isLoading, refetch } = useDeliveries({
    school_id: user?.school_id,
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

  // filter pengiriman yang menunggu verifikasi
  const pendingDeliveries = deliveries.filter(
    (d) => d.status === 'scheduled' || d.status === 'delivered' || d.status === 'pending'
  );

  // filter berdasarkan status yang dipilih
  const filteredDeliveries = filterStatus === 'all'
    ? pendingDeliveries
    : pendingDeliveries.filter(d => d.status === filterStatus);

  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle, badge: pendingDeliveries.length },
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

  // navigasi ke halaman detail verifikasi
  const handleVerify = (delivery: any) => {
    router.push(`/school/verify/${delivery.id}`);
  };

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
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
        <div className="max-w-7xl mx-auto p-8 gpu-accelerate">
          {/* page header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-600 rounded-xl shadow-md">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Verifikasi Pengiriman</h1>
                <p className="text-gray-600 mt-1">
                  Verifikasi Penerimaan Makanan Dari Penyedia Katering
                </p>
              </div>
            </div>
          </motion.div>

          {/* quick action card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm gpu-accelerate"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  Metode Verifikasi
                </h3>
                <p className="text-gray-600 text-sm">
                  Gunakan QR Code Scanner Untuk Verifikasi Cepat Atau Pilih Manual Dari Daftar
                </p>
              </div>
              <button
                onClick={() => router.push('/school/verify-qr')}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 hover:shadow-lg transition-smooth flex items-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                Scan QR Code
              </button>
            </div>
          </motion.div>

          {/* stats summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 gpu-accelerate">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Menunggu</p>
                  <h3 className="text-3xl font-bold text-gray-900">{pendingDeliveries.length}</h3>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Hari Ini</p>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {pendingDeliveries.filter(d => {
                      const today = new Date().toDateString();
                      return new Date(d.delivery_date).toDateString() === today;
                    }).length}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
              className="bg-white border border-gray-200 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Porsi</p>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {pendingDeliveries.reduce((sum, d) => sum + d.portions, 0)}
                  </h3>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* filter dan header daftar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Daftar Pengiriman
              </h2>
              <p className="text-gray-600">
                {filteredDeliveries.length} Pengiriman Perlu Diverifikasi
              </p>
            </div>

            {/* filter status */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-smooth"
              >
                <option value="all">Semua Status</option>
                <option value="scheduled">Terjadwal</option>
                <option value="delivered">Dikirim</option>
                <option value="pending">Tertunda</option>
              </select>
            </div>
          </motion.div>

          {/* daftar pengiriman */}
          {filteredDeliveries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
            >
              <GlassPanel variant="light">
                <div className="text-center py-16">
                  <CheckCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Tidak Ada Pengiriman
                  </h3>
                  <p className="text-gray-600">
                    {filterStatus === 'all'
                      ? 'Tidak Ada Pengiriman Yang Perlu Diverifikasi Saat Ini'
                      : `Tidak Ada Pengiriman Dengan Status ${filterStatus}`
                    }
                  </p>
                </div>
              </GlassPanel>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {filteredDeliveries.map((delivery, index) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.4 + index * 0.05,
                  }}
                >
                  <DeliveryCard
                    id={delivery.id}
                    catering={delivery.catering_name || 'Katering'}
                    portions={delivery.portions}
                    date={new Date(delivery.delivery_date).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    status={delivery.status}
                    onVerify={() => handleVerify(delivery)}
                    onReportIssue={() => {
                      router.push(`/school/issues/new?delivery_id=${delivery.id}`);
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
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
