'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import useIssues from '../../hooks/useIssues';
import ModernSidebar from '../../components/layout/ModernSidebar';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  Loader2,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Eye,
  FileText,
  CheckCircle,
  QrCode,
  AlertCircle,
} from 'lucide-react';

// TODO: Implementasikan pagination untuk daftar isu yang banyak
// TODO: Tambahkan export data ke CSV atau PDF
// TODO: Integrasikan dengan sistem notifikasi real-time untuk isu baru
// TODO: Tambahkan filter berdasarkan tanggal range yang lebih detail

export default function IssuesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { issues, isLoading } = useIssues({
    autoFetch: true,
  });

  // state untuk filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // redirect jika tidak authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // navigation items untuk sidebar
  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle },
    { label: 'Laporan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ];

  // mapping jenis isu ke label Indonesia
  const issueTypeLabels: Record<string, string> = {
    late_delivery: 'Keterlambatan Pengiriman',
    wrong_portions: 'Jumlah Tidak Sesuai',
    quality_issue: 'Kualitas Makanan Buruk',
    missing_delivery: 'Item Hilang',
    packaging_issue: 'Kemasan Rusak',
    hygiene_issue: 'Masalah Kebersihan',
    other: 'Lainnya',
  };

  // mapping status ke label Indonesia
  const statusLabels: Record<string, string> = {
    open: 'Terbuka',
    in_progress: 'Dalam Proses',
    resolved: 'Selesai',
    closed: 'Ditutup',
  };

  // fungsi untuk get badge priority dengan styling
  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: string }> = {
      low: { label: 'Rendah', bgColor: 'bg-gray-100', textColor: 'text-gray-600', icon: '●' },
      medium: { label: 'Sedang', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600', icon: '▲' },
      high: { label: 'Tinggi', bgColor: 'bg-orange-100', textColor: 'text-orange-600', icon: '▲' },
      critical: { label: 'Kritis', bgColor: 'bg-red-100', textColor: 'text-red-600', icon: '▲' },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // fungsi untuk get badge status dengan styling
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; icon?: string }> = {
      open: { label: 'Terbuka', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
      in_progress: { label: 'Dalam Proses', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
      resolved: { label: 'Selesai', bgColor: 'bg-green-50', textColor: 'text-green-700', icon: '✓' },
      closed: { label: 'Ditutup', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
        {config.icon && <span>{config.icon}</span>}
        {config.label}
      </span>
    );
  };

  // filter issues berdasarkan search dan filter yang dipilih
  const filteredIssues = issues.filter((issue: any) => {
    // filter berdasarkan search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        issue.id?.toString().includes(searchLower) ||
        issue.issue_type?.toLowerCase().includes(searchLower) ||
        issue.description?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // filter berdasarkan issue type
    if (selectedIssueType && issue.issue_type !== selectedIssueType) {
      return false;
    }

    // filter berdasarkan status
    if (selectedStatus && issue.status !== selectedStatus) {
      return false;
    }

    // filter berdasarkan tanggal
    if (selectedDate) {
      const issueDate = new Date(issue.created_at).toISOString().split('T')[0];
      if (issueDate !== selectedDate) {
        return false;
      }
    }

    return true;
  });

  // reset semua filter
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedIssueType('');
    setSelectedStatus('');
    setSelectedDate('');
  };

  // tampilkan loading state
  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user.name || 'Kepala Sekolah'}
        userEmail={user.email || 'sekolah@mbg.id'}
        schoolName={user.school_name || 'Sekolah'}
      />

      {/* main content dengan margin left untuk sidebar */}
      <main className="flex-1 ml-72 overflow-y-auto scroll-container">
        <div className="max-w-7xl mx-auto p-8 py-12">
          {/* header section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Daftar Isu Pengiriman Makanan
              </h1>
            </div>
            <button
              onClick={() => router.push('/school/issues/new')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-smooth shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Laporkan Isu Baru
            </button>
          </div>

          {/* filter & search section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 smooth-animate">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Filter & Pencarian Isu</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* search input */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari isu..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                  />
                </div>
              </div>

              {/* jenis isu dropdown */}
              <div>
                <select
                  value={selectedIssueType}
                  onChange={(e) => setSelectedIssueType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                >
                  <option value="">Jenis Isu</option>
                  {Object.entries(issueTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* status dropdown */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                >
                  <option value="">Status</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* tanggal lapor input */}
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="Tanggal Lapor"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                />
              </div>
            </div>

            {/* filter actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  // trigger filter (currently auto-filtering via filteredIssues)
                }}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-smooth"
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-smooth"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* table section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden smooth-animate">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Daftar Isu Terbaru</h2>
            </div>

            {/* table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ID Isu
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Jenis Isu
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tanggal Lapor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Prioritas AI
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                          {searchQuery || selectedIssueType || selectedStatus || selectedDate
                            ? 'Tidak Ada Isu Yang Sesuai Dengan Filter'
                            : 'Belum Ada Isu Yang Dilaporkan'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue: any) => (
                      <tr
                        key={issue.id}
                        className="hover:bg-gray-50 transition-smooth"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            #ISS-{String(issue.id).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 font-medium">
                            {issueTypeLabels[issue.issue_type] || issue.issue_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {new Date(issue.created_at).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(issue.severity || 'medium')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(issue.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/school/issues/${issue.id}`)}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold text-sm transition-smooth"
                          >
                            <Eye className="w-4 h-4" />
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2025 MBG School Portal. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
