'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';

// TODO: Implementasi real-time notification untuk issue baru
// TODO: Tambahkan fitur bulk actions untuk mengelola multiple issues
// TODO: Integrasi dengan system notifikasi email untuk reporter
// TODO: Implementasi advanced filtering (by date range, severity, type)
// TODO: Tambahkan export laporan issues ke PDF/Excel
// TODO: Implementasi SLA tracking untuk response time

export default function IssuesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const shouldReduceMotion = useReducedMotion();

  // data issues mock
  const allIssues = [
    {
      id: 1,
      school: 'SDN 01 Bandung',
      catering: 'Katering Sehat Mandiri',
      issueType: 'Kuantitas',
      description: 'Jumlah porsi kurang 20 dari yang dijanjikan',
      status: 'Pending',
      reportedAt: '2025-11-14 10:30',
      hasEvidence: true,
    },
    {
      id: 2,
      school: 'SMP 12 Surabaya',
      catering: 'Katering Nutrisi Prima',
      issueType: 'Kualitas',
      description: 'Makanan tidak sesuai standar nutrisi',
      status: 'Investigasi',
      reportedAt: '2025-11-13 14:20',
      hasEvidence: true,
    },
    {
      id: 3,
      school: 'SDN 05 Jakarta',
      catering: 'Katering Sehat Sejahtera',
      issueType: 'Keterlambatan',
      description: 'Pengiriman terlambat 2 jam',
      status: 'Selesai',
      reportedAt: '2025-11-12 11:00',
      resolvedAt: '2025-11-12 15:00',
      hasEvidence: false,
    },
    {
      id: 4,
      school: 'SMPN Harapan Bangsa',
      catering: 'Katering Nutrisi Prima',
      issueType: 'Kualitas',
      description: 'Makanan tidak fresh, beberapa sudah basi',
      status: 'Investigasi',
      reportedAt: '2025-11-11 09:15',
      hasEvidence: true,
    },
    {
      id: 5,
      school: 'SDN Banyu Biru 1',
      catering: 'Warung Sehat Bu Ani',
      issueType: 'Lainnya',
      description: 'Kemasan rusak dan tumpah',
      status: 'Ditolak',
      reportedAt: '2025-11-10 13:45',
      hasEvidence: false,
    },
    {
      id: 6,
      school: 'SMP 08 Yogyakarta',
      catering: 'Katering Sehat Mandiri',
      issueType: 'Kuantitas',
      description: 'Porsi lebih sedikit dari standar',
      status: 'Pending',
      reportedAt: '2025-11-09 08:30',
      hasEvidence: true,
    },
  ];

  // statistik
  const stats = {
    pending: 3,
    investigating: 2,
    resolved: 12,
    rejected: 5,
  };

  // filter issues
  const filteredIssues = allIssues.filter((issue) => {
    const matchesSearch =
      issue.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.catering.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || issue.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // pagination
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentIssues = filteredIssues.slice(startIndex, endIndex);

  // animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.03,
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Investigasi':
        return 'bg-blue-100 text-blue-700';
      case 'Selesai':
        return 'bg-green-100 text-green-700';
      case 'Ditolak':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getIssueTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Kuantitas':
        return 'bg-orange-100 text-orange-700';
      case 'Kualitas':
        return 'bg-red-100 text-red-700';
      case 'Keterlambatan':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Masalah</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Monitor Dan Selesaikan Laporan Masalah Dari Sekolah Terkait Pengiriman Makanan.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Pending */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">{stats.pending}</p>
              </div>
            </div>
          </div>

          {/* Investigasi */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Investigasi</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">{stats.investigating}</p>
              </div>
            </div>
          </div>

          {/* Selesai */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Selesai</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">{stats.resolved}</p>
              </div>
            </div>
          </div>

          {/* Ditolak */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ditolak</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Berdasarkan Sekolah, Katering, Atau Deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth outline-none text-sm"
              />
            </div>

            {/* Filter Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none bg-white text-sm min-w-[150px]"
              >
                <option value="">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Investigasi">Investigasi</option>
                <option value="Selesai">Selesai</option>
                <option value="Ditolak">Ditolak</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Issues Table */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">ID</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Sekolah</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Katering</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Tipe Masalah</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Deskripsi</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Dilaporkan</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentIssues.map((issue, index) => (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.01 : 0.2,
                      delay: shouldReduceMotion ? 0 : index * 0.03,
                      ease: [0.4, 0, 0.2, 1] as const,
                    }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-smooth"
                  >
                    <td className="p-4">
                      <span className="font-mono text-sm text-gray-600">#{issue.id}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{issue.school}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{issue.catering}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getIssueTypeBadgeClass(
                          issue.issueType
                        )}`}
                      >
                        {issue.issueType}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="text-sm text-gray-600 truncate">{issue.description}</span>
                        {issue.hasEvidence && (
                          <ImageIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                          issue.status
                        )}`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{issue.reportedAt}</span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => router.push(`/admin/issues/${issue.id}`)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-smooth text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1} Dari {Math.min(endIndex, filteredIssues.length)} Issues
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Berikutnya
              </button>
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
