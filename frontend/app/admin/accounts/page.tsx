'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  Plus,
  Download,
  Upload,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';

// TODO: Implementasi fitur import akun dari file CSV atau Excel
// TODO: Implementasi fitur export data akun ke berbagai format
// TODO: Tambahkan modal untuk tambah/edit akun dengan validasi form
// TODO: Integrasi dengan backend API untuk CRUD operations
// TODO: Tambahkan fitur bulk actions (hapus multiple, update status multiple)

export default function AccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const shouldReduceMotion = useReducedMotion();

  // data akun mock
  const allAccounts = [
    {
      id: 1,
      name: 'SDN Banyu Biru 1',
      email: 'sdn.banyubiru1@example.com',
      role: 'Sekolah',
      status: 'Aktif',
      registrationDate: '2023-01-15',
      walletAddress: '0xabc12def456gh789i',
    },
    {
      id: 2,
      name: 'PT Cahaya Kuliner',
      email: 'info@cahayakuliner.co.id',
      role: 'Katering',
      status: 'Aktif',
      registrationDate: '2022-11-20',
      walletAddress: '0x123abc456def789gh',
    },
    {
      id: 3,
      name: 'Budi Santoso',
      email: 'budi.santoso@nutritrack.com',
      role: 'Administrator',
      status: 'Aktif',
      registrationDate: '2023-03-10',
      walletAddress: '0xdef456ghi789jki012',
    },
    {
      id: 4,
      name: 'SMPN Harapan Bangsa',
      email: 'smp.harapanbangsa@example.com',
      role: 'Sekolah',
      status: 'Tertunda',
      registrationDate: '2023-05-01',
      walletAddress: '0x456def789ghi012jkl',
    },
    {
      id: 5,
      name: 'Warung Sehat Bu Ani',
      email: 'bu.ani@warungsehat.com',
      role: 'Katering',
      status: 'Nonaktif',
      registrationDate: '2023-02-28',
      walletAddress: '0x789ghi012jkl345mno',
    },
    {
      id: 6,
      name: 'Dewi Lestari',
      email: 'dewi.lestari@nutritrack.com',
      role: 'Administrator',
      status: 'Aktif',
      registrationDate: '2023-07-01',
      walletAddress: '0x012jkl345mno678pqr',
    },
  ];

  // filter akun
  const filteredAccounts = allAccounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.walletAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === '' || account.role === roleFilter;
    const matchesStatus = statusFilter === '' || account.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // pagination
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAccounts = filteredAccounts.slice(startIndex, endIndex);

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

  const handleAddAccount = () => {
    // TODO: Implementasi modal tambah akun
    console.log('Tambah akun baru');
  };

  const handleImportAccount = () => {
    // TODO: Implementasi import akun dari file
    console.log('Impor akun');
  };

  const handleExportAccount = () => {
    // TODO: Implementasi export akun ke file
    console.log('Ekspor akun');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Aktif':
        return 'bg-purple-100 text-purple-700';
      case 'Tertunda':
        return 'bg-yellow-100 text-yellow-700';
      case 'Nonaktif':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Akun</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Kelola Semua Akun Pengguna Sistem Termasuk Sekolah, Katering, Dan Administrator.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleAddAccount}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-smooth font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun Baru
        </button>
        <button
          onClick={handleImportAccount}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-smooth font-medium text-sm"
        >
          <Upload className="w-4 h-4" />
          Impor Akun
        </button>
        <button
          onClick={handleExportAccount}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-smooth font-medium text-sm"
        >
          <Download className="w-4 h-4" />
          Ekspor Akun
        </button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Berdasarkan Nama, Email, Atau Alamat Dompet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth outline-none text-sm"
              />
            </div>

            {/* Filter Peran */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none bg-white text-sm min-w-[150px]"
              >
                <option value="">Filter Peran</option>
                <option value="Sekolah">Sekolah</option>
                <option value="Katering">Katering</option>
                <option value="Administrator">Administrator</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none bg-white text-sm min-w-[150px]"
              >
                <option value="">Filter Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Tertunda">Tertunda</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Nama Pengguna</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Email</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Peran</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Tanggal Registrasi</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Alamat Dompet</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {currentAccounts.map((account, index) => (
                  <motion.tr
                    key={account.id}
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {account.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{account.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{account.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900 text-sm">{account.role}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                          account.status
                        )}`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{account.registrationDate}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm font-mono">{account.walletAddress}</span>
                    </td>
                    <td className="p-4">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-smooth">
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
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
              Menampilkan {startIndex + 1} Dari {Math.min(endIndex, filteredAccounts.length)} Akun
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
