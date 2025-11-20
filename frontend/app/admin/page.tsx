'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import {
  DollarSign,
  CheckCircle,
  Building2,
  UtensilsCrossed,
  Shield,
  TrendingUp,
  Loader2,
} from 'lucide-react';

// TODO: Implementasi Map Indonesia dengan markers untuk setiap lokasi sekolah
// TODO: Tambahkan filter berdasarkan status (Normal, Perhatian, Kritis) pada map
// TODO: Integrasi dengan library peta (Leaflet atau Google Maps)
// TODO: Implementasi chart menggunakan library recharts atau chart.js
// TODO: Tambahkan interaktivitas pada chart (tooltip, drill-down)
// TODO: Implementasi infinite scroll atau pagination untuk activity log
// TODO: Tambahkan filter berdasarkan tipe aktivitas dan tanggal
// TODO: Real-time update menggunakan WebSocket atau polling untuk activity log

export default function AdminDashboard() {
  const shouldReduceMotion = useReducedMotion();

  // state management
  const [stats, setStats] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

        const response = await axios.get(`${apiUrl}/admin/dashboard`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.data.success) {
          setStats(response.data.data.stats || {});
          setActivityLog(response.data.data.activityLog || []);
          setAllocationData(response.data.data.allocationData || []);
        } else {
          throw new Error(response.data.error || 'Failed to fetch dashboard data');
        }
      } catch (err: any) {
        console.error('Error fetching admin dashboard data:', err);
        setError(err.message || 'Gagal memuat data dashboard. Silakan coba lagi nanti.');
        setStats(null);
        setActivityLog([]);
        setAllocationData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // animation variants dengan performa tinggi
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.3,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  // loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-700">Memuat Dashboard...</h3>
        </div>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Utama</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Tinjauan Komprehensif Tentang Status Sistem, Statistik Real-Time, Dan Aktivitas Penting NutriTrack Admin.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Sekolah */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1 stat-number">{stats?.totalSekolah || 0}</h3>
            <p className="text-sm text-gray-600">Total Sekolah</p>
          </div>

          {/* Mitra Katering */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1 stat-number">{stats?.mitraKatering || 0}</h3>
            <p className="text-sm text-gray-600">Mitra Katering</p>
          </div>

          {/* Escrow Aktif */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1 stat-number">{stats?.escrowAktif || 0}</h3>
            <p className="text-sm text-gray-600">Escrow Aktif</p>
          </div>

          {/* Dana Terkunci */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1 stat-number">Rp {stats?.danaTerkunci || 0} Juta</h3>
            <p className="text-sm text-gray-600">Dana Terkunci</p>
          </div>

          {/* Dana Terdistribusi */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1 stat-number">Rp {stats?.danaTerdistribusi || 0} Juta</h3>
            <p className="text-sm text-gray-600">Dana Terdistribusi</p>
          </div>
        </motion.div>

        {/* Maps and Chart Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribusi Regional - Map */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Status Distribusi Regional</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tinjauan Distribusi Makanan Per Wilayah Dengan Status Terkini.
            </p>

            <div className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl overflow-hidden map-container">
              {/* Placeholder Map */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-lg mx-auto mb-4 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-600 font-medium">Peta Indonesia</p>
                  <p className="text-sm text-gray-500 mt-1">Distribusi Regional Sekolah</p>
                </div>
              </div>

              {/* Status Legend */}
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">Perhatian</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">Kritis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Alokasi AI - Bar Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ringkasan Alokasi AI</h3>
            <p className="text-sm text-gray-600 mb-6">
              Rekomendasi Alokasi Dana Oleh AI Untuk Distribusi Yang Optimal.
            </p>

            <div className="space-y-4 mt-8">
              {allocationData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">{item.region}</span>
                    <span className="text-gray-900 font-bold">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as const, delay: index * 0.2 }}
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center chart-bar"
                    >
                      <span className="text-white text-xs font-bold">Alokasi Dana</span>
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Alokasi</span>
                <span className="text-gray-900 font-bold">
                  {allocationData.reduce((acc, curr) => acc + curr.percentage, 0)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activity Log */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Log Aktivitas Sistem Terbaru</h3>
          <p className="text-sm text-gray-600 mb-6">
            Verifikasi Dana Berhasil Untuk Sekolah SD Nusantara 1.
          </p>

          <div className="space-y-3">
            {activityLog.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.01 : 0.3,
                  delay: shouldReduceMotion ? 0 : index * 0.05,
                  ease: [0.4, 0, 0.2, 1] as const,
                }}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-smooth border border-gray-100 activity-log-item"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm text-gray-900 flex-1">{log.message}</p>
                    <span
                      className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        log.type === 'success'
                          ? 'bg-purple-100 text-purple-700'
                          : log.type === 'warning'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{log.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="text-center py-4">
          <p className="text-sm text-gray-500">
            © 2025 NutriTrack Admin. All Rights Reserved.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
