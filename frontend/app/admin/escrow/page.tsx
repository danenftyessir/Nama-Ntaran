'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Lock,
  Unlock,
  ExternalLink,
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  Search,
  ChevronRight,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';

// TODO: Implementasi smart contract integration untuk lock/release funds
// TODO: Tambahkan modal konfirmasi untuk release funds dengan signature
// TODO: Integrasi dengan blockchain explorer (Etherscan, BSCScan, dll)
// TODO: Implementasi real-time status update menggunakan WebSocket
// TODO: Tambahkan history log untuk setiap transaksi escrow
// TODO: Implementasi multi-signature approval untuk release funds
// TODO: Tambahkan notifikasi email/push ketika status escrow berubah

export default function EscrowPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const shouldReduceMotion = useReducedMotion();

  // data escrow mock
  const allEscrows = [
    {
      id: 1,
      school: 'SDN 01 Bandung',
      catering: 'Katering Sehat Mandiri',
      amount: 15000000,
      status: 'Terkunci',
      lockedAt: '2025-11-10',
      releaseDate: '2025-11-15',
      txHash: '0x7f9fade234b567c89012d3456e78f9a01234b567c890a3b2',
    },
    {
      id: 2,
      school: 'SMP 12 Surabaya',
      catering: 'Katering Nutrisi Prima',
      amount: 18000000,
      status: 'Menunggu Rilis',
      lockedAt: '2025-11-12',
      releaseDate: '2025-11-16',
      txHash: '0x8a1bcde345c678d90123e4567f89a12345c678d901b4c3',
    },
    {
      id: 3,
      school: 'SDN 05 Jakarta',
      catering: 'Katering Sehat Sejahtera',
      amount: 12500000,
      status: 'Tercairkan',
      lockedAt: '2025-11-08',
      releaseDate: '2025-11-12',
      releasedAt: '2025-11-12',
      txHash: '0x9b2cdef456d789e01234f5678a90b23456d789e012c5d4',
    },
    {
      id: 4,
      school: 'SMPN Harapan Bangsa',
      catering: 'Katering Nutrisi Prima',
      amount: 20000000,
      status: 'Terkunci',
      lockedAt: '2025-11-14',
      releaseDate: '2025-11-18',
      txHash: '0xa3c4def567e890f12345g6789b01c34567e890f123d6e5',
    },
    {
      id: 5,
      school: 'SDN Banyu Biru 1',
      catering: 'Warung Sehat Bu Ani',
      amount: 13500000,
      status: 'Tertunda',
      lockedAt: '2025-11-13',
      releaseDate: '2025-11-17',
      txHash: '0xb4d5efg678f901g23456h7890c12d45678f901g234e7f6',
    },
    {
      id: 6,
      school: 'SMP 08 Yogyakarta',
      catering: 'Katering Sehat Mandiri',
      amount: 16500000,
      status: 'Tercairkan',
      lockedAt: '2025-11-09',
      releaseDate: '2025-11-13',
      releasedAt: '2025-11-13',
      txHash: '0xc5e6fgh789g012h34567i8901d23e56789g012h345f8g7',
    },
  ];

  // statistik
  const stats = {
    totalTerkunci: 125000000,
    totalTercair: 95000000,
    pendingRelease: 30000000,
  };

  // filter escrow
  const filteredEscrows = allEscrows.filter((escrow) => {
    const matchesSearch =
      escrow.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      escrow.catering.toLowerCase().includes(searchQuery.toLowerCase()) ||
      escrow.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || escrow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // pagination
  const totalPages = Math.ceil(filteredEscrows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEscrows = filteredEscrows.slice(startIndex, endIndex);

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

  const handleReleaseFunds = (id: number) => {
    // TODO: Implementasi release funds dengan smart contract
    console.log('Release funds untuk escrow', id);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Terkunci':
        return 'bg-blue-100 text-blue-700';
      case 'Menunggu Rilis':
        return 'bg-yellow-100 text-yellow-700';
      case 'Tercairkan':
        return 'bg-green-100 text-green-700';
      case 'Tertunda':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kontrol Escrow</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Monitor Dan Kelola Smart Contract Escrow Untuk Transaksi Sekolah Dan Katering.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Terkunci */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Terkunci</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">
                  {formatCurrency(stats.totalTerkunci)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Tercair */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tercair</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">
                  {formatCurrency(stats.totalTercair)}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Release */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Release</p>
                <p className="text-2xl font-bold text-gray-900 stat-number">
                  {formatCurrency(stats.pendingRelease)}
                </p>
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
                placeholder="Cari Berdasarkan Sekolah, Katering, Atau TX Hash..."
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
                className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none bg-white text-sm min-w-[180px]"
              >
                <option value="">Semua Status</option>
                <option value="Terkunci">Terkunci</option>
                <option value="Menunggu Rilis">Menunggu Rilis</option>
                <option value="Tercairkan">Tercairkan</option>
                <option value="Tertunda">Tertunda</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Escrow Table */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">ID</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Sekolah</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Katering</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Jumlah</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Tanggal Terkunci</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">TX Hash</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentEscrows.map((escrow, index) => (
                  <motion.tr
                    key={escrow.id}
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
                      <span className="font-mono text-sm text-gray-600">#{escrow.id}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{escrow.school}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{escrow.catering}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 text-sm stat-number">
                        {formatCurrency(escrow.amount)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                          escrow.status
                        )}`}
                      >
                        {escrow.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{escrow.lockedAt}</span>
                    </td>
                    <td className="p-4">
                      <a
                        href={`https://etherscan.io/tx/${escrow.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-xs font-mono flex items-center gap-1 transition-smooth"
                      >
                        {escrow.txHash.substring(0, 10)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4">
                      {escrow.status === 'Menunggu Rilis' ? (
                        <button
                          onClick={() => handleReleaseFunds(escrow.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-smooth text-sm font-medium"
                        >
                          <Unlock className="w-4 h-4" />
                          Release
                        </button>
                      ) : (
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-smooth">
                          <MoreHorizontal className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1} Dari {Math.min(endIndex, filteredEscrows.length)} Escrow
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

        {/* Info Panel */}
        <motion.div variants={itemVariants} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Informasi Smart Contract Escrow</h4>
              <p className="text-sm text-blue-700">
                Semua transaksi escrow dikelola melalui smart contract blockchain untuk transparansi dan keamanan maksimal.
                Dana akan otomatis tercairkan ketika semua kondisi terpenuhi atau dapat di-release secara manual oleh admin.
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
