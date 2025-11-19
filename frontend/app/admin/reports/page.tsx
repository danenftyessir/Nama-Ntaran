'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  ChevronRight,
} from 'lucide-react';

// TODO: Integrasi dengan backend API untuk fetch data laporan berdasarkan filter
// TODO: Implementasi actual PDF generation menggunakan library seperti jsPDF atau PDFMake
// TODO: Implementasi actual Excel export menggunakan library seperti xlsx atau exceljs
// TODO: Tambahkan fitur chart/graph untuk visualisasi data laporan
// TODO: Implementasi pagination atau infinite scroll untuk detailed reports list
// TODO: Tambahkan fitur filter berdasarkan kategori laporan
// TODO: Implementasi preview laporan sebelum download
// TODO: Tambahkan fitur schedule automated reports (email report berkala)

export default function ReportsPage() {
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState('2025-11');
  const shouldReduceMotion = useReducedMotion();

  // data statistik bulanan
  const monthlyStats = {
    totalDeliveries: 156,
    totalAmount: 125000000,
    totalPortions: 18420,
    verificationRate: 98.5,
    issueRate: 1.5,
    averageProcessingTime: '2.3 Jam',
  };

  // data laporan detail
  const detailedReports = [
    { name: 'Laporan Pengiriman Bulanan', date: '1-30 Nov 2025', size: '2.4 MB', category: 'Pengiriman' },
    { name: 'Laporan Keuangan & Pencairan Dana', date: '1-30 Nov 2025', size: '1.8 MB', category: 'Keuangan' },
    { name: 'Laporan Issues & Resolusi', date: '1-30 Nov 2025', size: '890 KB', category: 'Issues' },
    { name: 'Laporan Performance Katering', date: '1-30 Nov 2025', size: '1.2 MB', category: 'Performance' },
    { name: 'Laporan Blockchain Transactions', date: '1-30 Nov 2025', size: '3.1 MB', category: 'Blockchain' },
  ];

  // animation variants
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

  const handleExport = (format: string) => {
    // TODO: Implementasi actual export logic
    console.log(`Exporting as ${format}...`);
    alert(`Export ${format} Akan Segera Tersedia!`);
  };

  const handleDownloadReport = (reportName: string) => {
    // TODO: Implementasi actual download logic
    console.log(`Downloading ${reportName}...`);
    alert(`Download ${reportName} Akan Segera Dimulai!`);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan & Analytics</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Generate Dan Download Laporan Sistem Untuk Analisis Data Dan Monitoring.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Report Filters */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filter Laporan</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tipe Laporan
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none text-sm"
              >
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Periode
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('PDF')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-smooth flex items-center gap-2 text-sm"
              >
                <Download className="w-5 h-5" />
                Export PDF
              </button>
              <button
                onClick={() => handleExport('Excel')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-smooth flex items-center gap-2 text-sm"
              >
                <Download className="w-5 h-5" />
                Export Excel
              </button>
            </div>
          </div>
        </motion.div>

        {/* Monthly Overview */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan November 2025</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Pengiriman */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pengiriman</p>
                  <p className="text-2xl font-bold text-gray-900 stat-number">{monthlyStats.totalDeliveries}</p>
                </div>
              </div>
            </div>

            {/* Total Dana */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Dana</p>
                  <p className="text-2xl font-bold text-gray-900 stat-number">
                    Rp {(monthlyStats.totalAmount / 1000000).toFixed(0)} Juta
                  </p>
                </div>
              </div>
            </div>

            {/* Total Porsi */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Porsi</p>
                  <p className="text-2xl font-bold text-gray-900 stat-number">
                    {monthlyStats.totalPortions.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Tingkat Verifikasi */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tingkat Verifikasi</p>
                  <p className="text-2xl font-bold text-gray-900 stat-number">{monthlyStats.verificationRate}%</p>
                </div>
              </div>
            </div>

            {/* Tingkat Issue */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tingkat Issue</p>
                  <p className="text-2xl font-bold text-gray-900 stat-number">{monthlyStats.issueRate}%</p>
                </div>
              </div>
            </div>

            {/* Avg Processing */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg. Processing</p>
                  <p className="text-2xl font-bold text-gray-900 stat-number">{monthlyStats.averageProcessingTime}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detailed Reports */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Laporan Detail</h3>
            <span className="text-sm text-gray-500">{detailedReports.length} Laporan Tersedia</span>
          </div>
          <div className="space-y-3">
            {detailedReports.map((report, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.01 : 0.3,
                  delay: shouldReduceMotion ? 0 : idx * 0.05,
                  ease: [0.4, 0, 0.2, 1] as const,
                }}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-smooth group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-smooth">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{report.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{report.date}</span>
                      <span>•</span>
                      <span>{report.size}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{report.category}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadReport(report.name)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-smooth flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Info Panel */}
        <motion.div variants={itemVariants} className="bg-blue-50 rounded-xl p-6 border border-blue-200 card-optimized">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Tentang Laporan</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Semua laporan di-generate secara otomatis berdasarkan data real-time dari sistem. Laporan mencakup informasi lengkap tentang pengiriman, keuangan, issues, dan performance katering. Export laporan dalam format PDF untuk presentasi atau Excel untuk analisis lebih lanjut.
              </p>
            </div>
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
