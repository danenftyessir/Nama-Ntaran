'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  ImageIcon,
  MapPin,
  Calendar,
  User,
  Building2,
  MessageSquare,
  ArrowLeft,
  AlertTriangle,
  Eye,
  Package,
} from 'lucide-react';

// TODO: Integrasi dengan backend API untuk fetch detail issue berdasarkan ID
// TODO: Implementasi upload foto bukti tambahan dari admin
// TODO: Tambahkan fitur comment thread untuk komunikasi dengan reporter
// TODO: Implementasi notifikasi real-time untuk update status issue
// TODO: Tambahkan history log untuk semua perubahan status dan action
// TODO: Integrasi dengan escrow system untuk automated refund/compensation

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const issueId = params.id as string;
  const [issue, setIssue] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // data mock - replace dengan actual API call
    setIssue({
      id: parseInt(issueId),
      school_name: 'SDN 01 Bandung',
      school_id: 1,
      catering_name: 'Katering Sehat Mandiri',
      catering_id: 1,
      delivery_id: 36,
      issue_type: 'Kuantitas',
      description: 'Jumlah porsi makanan yang diterima kurang 20 dari yang seharusnya (dijanjikan 250 porsi, diterima 230 porsi)',
      status: 'Pending',
      severity: 'Medium',
      reported_at: '2025-11-14T10:30:00',
      reporter_name: 'Kepala Sekolah SDN 01',
      reporter_contact: 'kepala@sdn01bandung.sch.id',
      expected_quantity: 250,
      received_quantity: 230,
      delivery_date: '2025-11-14',
      delivery_time: '10:00',
      location: 'Jl. Merdeka No. 123, Bandung',
      evidence_photos: [
        '/uploads/evidence/photo1.jpg',
        '/uploads/evidence/photo2.jpg',
        '/uploads/evidence/photo3.jpg',
      ],
      timeline: [
        {
          timestamp: '2025-11-14T10:30:00',
          action: 'Issue Dilaporkan',
          actor: 'Kepala Sekolah SDN 01',
          description: 'Laporan masalah kekurangan porsi dibuat',
        },
        {
          timestamp: '2025-11-14T10:35:00',
          action: 'Notifikasi Terkirim',
          actor: 'System',
          description: 'Email notifikasi dikirim ke katering dan admin',
        },
      ],
    });
  }, [issueId]);

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

  const handleResolve = () => {
    if (!resolution || !actionNotes) {
      alert('Mohon lengkapi semua field');
      return;
    }
    // TODO: Implementasi API call untuk resolve issue
    console.log('Resolving issue...', { issueId, resolution, actionNotes });
    alert('Issue berhasil diselesaikan!');
    router.push('/admin/issues');
  };

  const handleReject = () => {
    if (!actionNotes) {
      alert('Mohon berikan alasan penolakan');
      return;
    }
    // TODO: Implementasi API call untuk reject issue
    console.log('Rejecting issue...', { issueId, actionNotes });
    alert('Issue ditolak');
    router.push('/admin/issues');
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

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'Low':
        return 'bg-blue-100 text-blue-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'High':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return Clock;
      case 'Investigasi':
        return Eye;
      case 'Selesai':
        return CheckCircle;
      case 'Ditolak':
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  if (!issue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat Detail Issue...</p>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(issue.status);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push('/admin/issues')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-smooth"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detail Issue #{issueId}</h1>
        </div>
        <p className="text-sm text-gray-600 ml-14">
          Detail Investigasi Dan Resolusi Masalah Yang Dilaporkan Oleh Sekolah.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Issue Header Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{issue.issue_type}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                        issue.status
                      )}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {issue.status}
                    </span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadgeClass(
                        issue.severity
                      )}`}
                    >
                      Severity: {issue.severity}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">{issue.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">Dilaporkan</p>
              <p className="font-semibold text-gray-900 text-sm">
                {new Date(issue.reported_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(issue.reported_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Delivery ID</p>
              <p className="font-semibold text-gray-900 text-sm">#{issue.delivery_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Diharapkan</p>
              <p className="font-semibold text-gray-900 text-sm">{issue.expected_quantity} Porsi</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Diterima</p>
              <p className="font-semibold text-red-600 text-sm">{issue.received_quantity} Porsi</p>
            </div>
          </div>
        </motion.div>

        {/* School & Catering Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* School Info */}
          <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Informasi Sekolah</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nama Sekolah</p>
                <p className="font-semibold text-gray-900">{issue.school_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pelapor</p>
                <p className="font-semibold text-gray-900">{issue.reporter_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kontak</p>
                <p className="text-gray-600 text-sm">{issue.reporter_contact}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Lokasi</p>
                <p className="text-gray-600 flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  {issue.location}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Catering Info */}
          <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Informasi Katering</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nama Katering</p>
                <p className="font-semibold text-gray-900">{issue.catering_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tanggal Pengiriman</p>
                <p className="text-gray-600 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(issue.delivery_date).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Waktu Pengiriman</p>
                <p className="text-gray-600 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {issue.delivery_time} WIB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status Pengiriman</p>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                  <Eye className="w-3 h-3" />
                  Under Investigation
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Evidence Photos */}
        {issue.evidence_photos && issue.evidence_photos.length > 0 && (
          <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Bukti Foto</h3>
              <span className="ml-auto text-sm text-gray-500">
                {issue.evidence_photos.length} Foto
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {issue.evidence_photos.map((photo: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.01 : 0.2,
                    delay: shouldReduceMotion ? 0 : idx * 0.05,
                    ease: [0.4, 0, 0.2, 1] as const,
                  }}
                  className="aspect-square bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center hover:shadow-lg hover:border-purple-300 transition-smooth cursor-pointer group"
                >
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 group-hover:text-purple-600 transition-smooth mx-auto" />
                    <p className="text-xs text-gray-500 mt-2">Foto {idx + 1}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Timeline Aktivitas</h3>
          </div>
          <div className="space-y-4">
            {issue.timeline.map((event: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.01 : 0.3,
                  delay: shouldReduceMotion ? 0 : idx * 0.1,
                  ease: [0.4, 0, 0.2, 1] as const,
                }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  {idx < issue.timeline.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{event.action}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">oleh {event.actor}</p>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Resolution Actions */}
        {issue.status === 'Pending' || issue.status === 'Investigasi' ? (
          <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Tindakan Resolusi</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tipe Resolusi
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none text-sm"
                >
                  <option value="">Pilih Resolusi...</option>
                  <option value="refund">Pengembalian Dana Sebagian</option>
                  <option value="redelivery">Pengiriman Ulang</option>
                  <option value="compensation">Kompensasi</option>
                  <option value="penalty">Penalti Katering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Catatan Tindakan
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth resize-none text-sm"
                  placeholder="Jelaskan Tindakan Yang Akan Diambil Dan Alasannya..."
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleResolve}
                disabled={!resolution || !actionNotes}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-smooth flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <CheckCircle className="w-5 h-5" />
                Selesaikan Issue
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-smooth flex items-center gap-2 text-sm"
              >
                <XCircle className="w-5 h-5" />
                Tolak Issue
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
            <div className="text-center py-8">
              {issue.status === 'Selesai' ? (
                <>
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    Issue Telah Diselesaikan
                  </p>
                  <p className="text-gray-600">
                    Tindakan Telah Diambil Untuk Menyelesaikan Issue Ini
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    Issue Telah Ditolak
                  </p>
                  <p className="text-gray-600">
                    Issue Ini Telah Ditolak Oleh Administrator
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

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
