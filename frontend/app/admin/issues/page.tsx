'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';

interface Issue {
  id: number;
  school_name: string;
  catering_name: string;
  issue_type: string;
  description: string;
  status: string;
  reported_at: string;
  resolved_at?: string;
  has_evidence: boolean;
}

interface Stats {
  pending: number;
  investigating: number;
  resolved: number;
  rejected: number;
}

export default function IssuesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    investigating: 0,
    resolved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 6;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const [issuesResponse, statsResponse] = await Promise.all([
        api.get('/api/issues'),
        api.get('/api/issues/stats'),
      ]);

      setAllIssues(issuesResponse.issues || []);
      setStats(statsResponse.stats || {
        pending: 0,
        investigating: 0,
        resolved: 0,
        rejected: 0,
      });
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      alert(error.response?.data?.error || 'Gagal memuat data issues');
    } finally {
      setIsLoading(false);
    }
  };

  // filter issues
  const filteredIssues = allIssues.filter((issue) => {
    const matchesSearch =
      issue.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.catering_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat data issues...</p>
        </div>
      </div>
    );
  }

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
                        <span className="font-medium text-gray-900 text-sm">{issue.school_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{issue.catering_name}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getIssueTypeBadgeClass(
                          issue.issue_type
                        )}`}
                      >
                        {issue.issue_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="text-sm text-gray-600 truncate">{issue.description}</span>
                        {issue.has_evidence && (
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
                      <span className="text-gray-600 text-sm">
                        {new Date(issue.reported_at).toLocaleString('id-ID')}
                      </span>
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
