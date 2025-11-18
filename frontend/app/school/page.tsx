'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import useDeliveries from '../hooks/useDeliveries';
import useVerifications from '../hooks/useVerifications';
import useIssues from '../hooks/useIssues';
import ModernSidebar from '../components/layout/ModernSidebar';
import GlassPanel from '../components/ui/GlassPanel';

// TO DO: implementasi fetch data profil sekolah dari API
// TO DO: tambahkan fitur export laporan bulanan ke PDF
// TO DO: integrasikan dengan sistem notifikasi real-time
// TO DO: tambahkan analytics dan grafik tren pengiriman
import ModernStatCard from '../components/ui/ModernStatCard';
import DeliveryCard from '../components/school/DeliveryCard';
import VerificationModal from '../components/school/VerificationModal';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  History,
  School,
  Package,
  Calendar,
  TrendingUp,
  Clock,
  Loader2,
  QrCode,
  AlertCircle,
  Truck,
  Eye,
} from 'lucide-react';

export default function SchoolDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch deliveries for this school
  const { deliveries, isLoading: deliveriesLoading, refetch: refetchDeliveries } = useDeliveries({
    school_id: user?.school_id,
  });

  // Fetch verification stats
  const { stats: verificationStats, createVerification } = useVerifications({
    school_id: user?.school_id,
  });

  // Fetch issues
  const { issues, stats: issueStats } = useIssues({
    autoFetch: true,
  });

  // Redirect if not authenticated or not a school user
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Filter today's deliveries
  const today = new Date().toISOString().split('T')[0];
  const todayDeliveries = deliveries.filter(d => {
    const deliveryDate = new Date(d.delivery_date).toISOString().split('T')[0];
    return deliveryDate === today && (d.status === 'scheduled' || d.status === 'delivered');
  });

  // Recent verified deliveries (last 3)
  const recentHistory = deliveries
    .filter(d => d.status === 'verified')
    .slice(0, 3);

  // Calculate stats
  const pendingVerifications = todayDeliveries.length;
  const totalVerified = verificationStats?.total || deliveries.filter(d => d.status === 'verified').length;
  const issuesReported = issueStats?.open || 0;

  // Calculate this month portions
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthPortions = deliveries
    .filter(d => {
      const deliveryDate = new Date(d.delivery_date);
      return deliveryDate.getMonth() === currentMonth &&
             deliveryDate.getFullYear() === currentYear &&
             d.status === 'verified';
    })
    .reduce((sum, d) => sum + d.portions, 0);

  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle, badge: pendingVerifications },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle, badge: issuesReported },
    { label: 'Laporan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ];

  // handle logout
  const handleLogout = () => {
    router.push('/login');
  };

  const handleVerify = (delivery: any) => {
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
  };

  const handleSubmitVerification = async (data: any) => {
    try {
      const response = await createVerification({
        delivery_id: selectedDelivery.id,
        status: 'approved',
        portions_received: data.portionsReceived,
        quality_rating: data.quality,
        notes: data.notes,
        photo_url: data.photoUrl || null,
      });

      // Show success message with blockchain info
      let message = '✅ Verifikasi berhasil!';

      if (response?.blockchain?.released) {
        message += `\n\n🔗 Dana telah dicairkan ke katering via blockchain!`;
        message += `\nTx Hash: ${response.blockchain.transactionHash.substring(0, 20)}...`;
        message += `\nBlock: ${response.blockchain.blockNumber}`;
      } else {
        message += '\n\n⚠️ Verifikasi tersimpan, namun blockchain belum dikonfigurasi.';
      }

      alert(message);
      setIsModalOpen(false);
      setSelectedDelivery(null);
      refetchDeliveries();
    } catch (error: any) {
      alert(`❌ Error: ${error.message || 'Gagal melakukan verifikasi'}`);
    }
  };

  // Loading state
  if (authLoading || deliveriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 blockchain-mesh">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!user || user.role !== 'school') {
    return null;
  }

  // School info from user data
  const schoolInfo = {
    name: user.school_name || 'Sekolah',
    npsn: user.school_npsn || '-',
    address: user.school_address || '-',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar */}
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user.name || 'Kepala Sekolah'}
        userEmail={user.email || 'sekolah@mbg.id'}
        schoolName={schoolInfo.name}
        onLogout={handleLogout}
      />

      {/* main content */}
      <main className="ml-72 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">
          {/* page header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-600 rounded-xl shadow-md">
                <School className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Dasbor Sekolah</h1>
                <p className="text-gray-600 mt-1">Kelola Verifikasi Penerimaan Makanan Dengan Mudah</p>
              </div>
            </div>
          </div>

          {/* stat cards dengan gambar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* stat cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernStatCard
                title="Verifikasi Tertunda"
                value={pendingVerifications}
                icon={Clock}
                gradient="gradient-bg-5"
                subtitle={`${pendingVerifications > 0 ? '+' : ''} 2 Hari Terakhir`}
              />
              <ModernStatCard
                title="Total Verifikasi Terlaksana"
                value={totalVerified}
                icon={CheckCircle}
                gradient="gradient-bg-4"
                subtitle={`${totalVerified > 0 ? '+' : ''} 15% Bulan Ini`}
              />
              <ModernStatCard
                title="Masalah Dilaporkan"
                value={issuesReported}
                icon={AlertTriangle}
                gradient="gradient-bg-2"
                subtitle={`${issuesReported > 0 ? '' : '+'} 1 Bulan Ini`}
              />
              <ModernStatCard
                title="Porsi Makanan Bulan Ini"
                value={thisMonthPortions.toLocaleString()}
                icon={Package}
                gradient="gradient-bg-1"
                subtitle="Target 1.500"
              />
            </div>

            {/* gambar ilustrasi */}
            <div className="hidden lg:block">
              <GlassPanel variant="light" className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <img
                    src="/component-without-background1.png"
                    alt="Dashboard Illustration"
                    className="w-full max-w-xs mx-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <Package className="w-32 h-32 text-purple-600 mx-auto hidden" />
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* quick action buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => router.push('/school/verify-qr')}
              className="bg-white border border-gray-200 text-gray-900 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:bg-gray-50 transition-smooth"
            >
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gray-100 rounded-xl">
                  <QrCode className="w-8 h-8 text-gray-700" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold mb-1">Verifikasi Cepat QR</h3>
                  <p className="text-sm text-gray-600">Scan QR Code Untuk Verifikasi Instant</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/school/issues/new')}
              className="bg-white border border-gray-200 text-gray-900 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:bg-gray-50 transition-smooth"
            >
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gray-100 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-gray-700" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold mb-1">Laporkan Masalah Baru</h3>
                  <p className="text-sm text-gray-600">Laporkan Kendala Atau Masalah Pengiriman</p>
                </div>
              </div>
            </button>
          </div>

          {/* layout dengan sidebar untuk ilustrasi */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* kolom kiri - tugas hari ini */}
            <div className="lg:col-span-2">
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      Tugas Hari Ini
                    </h2>
                    <p className="text-gray-600">
                      {todayDeliveries.length} Pengiriman Perlu Diverifikasi
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">
                      {new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {todayDeliveries.length === 0 ? (
                  <GlassPanel variant="light">
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Tidak Ada Pengiriman Hari Ini</p>
                    </div>
                  </GlassPanel>
                ) : (
                  <div className="space-y-4">
                    {todayDeliveries.slice(0, 3).map((delivery) => (
                      <DeliveryCard
                        key={delivery.id}
                        id={delivery.id}
                        catering={delivery.catering_name || 'Katering'}
                        portions={delivery.portions}
                        date={new Date(delivery.delivery_date).toLocaleString('id-ID')}
                        status={delivery.status}
                        onVerify={() => handleVerify(delivery)}
                        onReportIssue={() => {
                          router.push(`/school/issues/new?delivery_id=${delivery.id}`);
                        }}
                      />
                    ))}

                    {todayDeliveries.length > 3 && (
                      <button
                        onClick={() => router.push('/school/verify')}
                        className="w-full bg-gray-100 p-4 rounded-xl text-gray-900 font-semibold hover:bg-gray-200 hover:shadow-md transition-smooth"
                      >
                        Lihat Semua ({todayDeliveries.length} Pengiriman)
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* kolom kanan - ilustrasi delivery truck */}
            <div className="hidden lg:block">
              <GlassPanel variant="light" className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="mb-4">
                    <img
                      src="/component-without-background1.png"
                      alt="Delivery Truck"
                      className="w-full max-w-xs mx-auto"
                      onError={(e) => {
                        // fallback ke icon jika image tidak ada
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <Truck className="w-32 h-32 text-purple-600 mx-auto hidden" />
                  </div>
                  <p className="text-gray-600 mt-6 text-sm font-medium">
                    Pengiriman Makanan Bergizi
                  </p>
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* riwayat verifikasi terbaru dengan table */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Riwayat Verifikasi Terbaru
                </h2>
                <p className="text-gray-600">
                  Verifikasi Terakhir
                </p>
              </div>
              <button
                onClick={() => router.push('/school/history')}
                className="px-4 py-2 bg-gray-100 rounded-xl font-semibold text-gray-900 hover:bg-gray-200 hover:shadow-md transition-smooth flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Lihat Semua Riwayat
              </button>
            </div>

            <GlassPanel variant="light" className="overflow-hidden">
              {recentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Belum Ada Riwayat Verifikasi</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">
                          Tanggal Pengiriman
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-700">
                          Penyedia
                        </th>
                        <th className="text-right p-4 text-sm font-semibold text-gray-700">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistory.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-smooth"
                        >
                          <td className="p-4">
                            <p className="text-gray-900 font-medium">
                              {new Date(item.delivery_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="text-gray-900 font-medium">
                              {item.catering_name || 'Katering'}
                            </p>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => router.push(`/school/history/${item.id}`)}
                              className="text-purple-600 hover:text-purple-700 font-semibold text-sm transition-smooth"
                            >
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassPanel>
          </section>
        </div>
      </main>

      {/* Verification Modal */}
      {selectedDelivery && (
        <VerificationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDelivery(null);
          }}
          delivery={selectedDelivery}
          onSubmit={handleSubmitVerification}
        />
      )}
    </div>
  );
}
