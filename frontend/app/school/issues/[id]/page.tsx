'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { issuesApi } from '@/lib/api';
import ModernSidebar from '../../../components/layout/ModernSidebar';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Image as ImageIcon,
  Download,
  CheckCircle,
  QrCode,
  AlertCircle,
} from 'lucide-react';

// TODO: Implementasikan update status issue
// TODO: Tambahkan fitur comment/reply untuk issue
// TODO: Integrasikan dengan sistem notifikasi
// TODO: Tambahkan timeline history perubahan status

interface Issue {
  id: number;
  issue_type: string;
  description: string;
  status: string;
  severity: string;
  created_at: string;
  updated_at: string;
  delivery_id?: number;
  issue_photo_url?: string;
  resolution_notes?: string;
}

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const issueId = params.id as string;

  // redirect jika tidak authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // fetch issue detail
  useEffect(() => {
    const fetchIssueDetail = async () => {
      if (!issueId) return;

      try {
        setIsLoading(true);
        const response = await issuesApi.getById(issueId);
        setIssue(response.issue || response.data || response);
      } catch (err: any) {
        setError(err.message || 'Gagal mengambil detail isu');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchIssueDetail();
    }
  }, [issueId, authLoading, user]);

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
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
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
      <span className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
        {config.icon && <span>{config.icon}</span>}
        {config.label}
      </span>
    );
  };

  // tampilkan loading state
  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // tampilkan error state
  if (error || !issue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Isu Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-6">{error || 'Isu yang Anda cari tidak ditemukan.'}</p>
          <button
            onClick={() => router.push('/school/issues')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-smooth"
          >
            Kembali ke Daftar Isu
          </button>
        </div>
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
        <div className="max-w-5xl mx-auto p-8 py-12">
          {/* back button */}
          <button
            onClick={() => router.push('/school/issues')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Daftar Isu
          </button>

          {/* header section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 smooth-animate">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    #ISS-{String(issue.id).padStart(3, '0')}
                  </h1>
                  {getStatusBadge(issue.status)}
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {issueTypeLabels[issue.issue_type] || issue.issue_type}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Dilaporkan: {new Date(issue.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {issue.delivery_id && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>ID Pengiriman: #{issue.delivery_id}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                {getPriorityBadge(issue.severity)}
              </div>
            </div>
          </div>

          {/* detail section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* deskripsi */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 smooth-animate">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Deskripsi Masalah
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>

              {/* foto bukti */}
              {issue.issue_photo_url && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 smooth-animate">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Foto Bukti
                  </h3>
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={issue.issue_photo_url}
                      alt="Foto bukti isu"
                      className="w-full h-auto object-cover"
                    />
                    <a
                      href={issue.issue_photo_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-100 rounded-lg shadow-lg transition-smooth"
                    >
                      <Download className="w-5 h-5 text-gray-700" />
                    </a>
                  </div>
                </div>
              )}

              {/* resolution notes jika ada */}
              {issue.resolution_notes && (
                <div className="bg-green-50 rounded-2xl border border-green-200 p-6 smooth-animate">
                  <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Catatan Penyelesaian
                  </h3>
                  <p className="text-green-800 leading-relaxed">
                    {issue.resolution_notes}
                  </p>
                </div>
              )}
            </div>

            {/* sidebar info */}
            <div className="space-y-6">
              {/* informasi isu */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 smooth-animate">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Informasi Isu</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    {getStatusBadge(issue.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Prioritas</p>
                    {getPriorityBadge(issue.severity)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Jenis Isu</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {issueTypeLabels[issue.issue_type] || issue.issue_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tanggal Dibuat</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(issue.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Terakhir Diperbarui</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(issue.updated_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* action buttons */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 smooth-animate">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tindakan</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/school/issues')}
                    className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-smooth text-sm"
                  >
                    Kembali ke Daftar
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-smooth text-sm"
                  >
                    Cetak Laporan
                  </button>
                </div>
              </div>
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
