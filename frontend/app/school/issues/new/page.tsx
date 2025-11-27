'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import useIssues from '../../../hooks/useIssues';
import ModernSidebar from '../../../components/layout/ModernSidebar';
import { useSchoolLogo } from '../../../hooks/useSchoolLogo';
import ImageUpload from '../../../components/ui/ImageUpload';
import {
  AlertTriangle,
  Loader2,
  LayoutDashboard,
  History,
  CheckCircle2,
  CheckCircle,
  QrCode,
  AlertCircle,
} from 'lucide-react';

function ReportIssueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { logoUrl } = useSchoolLogo();
  const { createIssue } = useIssues();

  const deliveryId = searchParams.get('delivery_id');

  // state untuk form data
  const [issueType, setIssueType] = useState('');
  const [deliveryIdInput, setDeliveryIdInput] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // set delivery_id dari URL jika ada
  useEffect(() => {
    if (deliveryId) {
      setDeliveryIdInput(deliveryId);
    }
  }, [deliveryId]);

  // redirect jika tidak authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // set tanggal hari ini sebagai default
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIncidentDate(today);
  }, []);

  // submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validasi field yang required
    if (!issueType) {
      alert('Pilih Jenis Masalah Terlebih Dahulu!');
      return;
    }

    if (!description.trim()) {
      alert('Deskripsi Masalah Tidak Boleh Kosong!');
      return;
    }

    if (!incidentDate) {
      alert('Tanggal Kejadian Harus Diisi!');
      return;
    }

    setIsSubmitting(true);

    try {
      // Buat object data untuk dikirim sebagai JSON
      const issueData: any = {
        issue_type: issueType,
        description: description,
        incident_date: incidentDate,
      };

      // tambahkan delivery_id jika ada (convert ke integer)
      if (deliveryIdInput) {
        const parsedId = parseInt(deliveryIdInput);
        if (isNaN(parsedId)) {
          alert('ID Pengiriman harus berupa angka!');
          return;
        }
        issueData.delivery_id = parsedId;
      }

      // tambahkan photo_url jika ada
      if (photoUrl) {
        issueData.photo_url = photoUrl;
      }

      await createIssue(issueData);

      alert('Laporan Masalah Berhasil Dikirim!');

      // Small delay to ensure data is committed before redirect
      setTimeout(() => {
        router.push('/school/issues');
      }, 500);
    } catch (error: any) {
      alert(`Error: ${error.message || 'Gagal Mengirim Laporan'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // tampilkan loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // navigation items untuk sidebar
  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle },
    { label: 'Laporan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user.name || 'Kepala Sekolah'}
        userEmail={user.email || 'sekolah@mbg.id'}
        schoolName={user.school_name || 'Sekolah'}
        schoolLogoUrl={logoUrl}
      />

      {/* main content dengan margin left untuk sidebar */}
      <main className="flex-1 ml-72 overflow-y-auto scroll-container">
        <div className="max-w-4xl mx-auto p-8 py-12">
          {/* header section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Detail Masalah</h1>
            <p className="text-gray-600">Isi informasi dasar tentang masalah pengiriman.</p>
          </div>

          {/* form container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 smooth-animate">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* jenis masalah */}
              <div className="space-y-2">
                <label htmlFor="issueType" className="block text-sm font-semibold text-gray-900">
                  Jenis Masalah
                </label>
                <select
                  id="issueType"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                  required
                >
                  <option value="">Pilih Jenis Masalah</option>
                  <option value="late_delivery">Keterlambatan Pengiriman</option>
                  <option value="wrong_portions">Jumlah Porsi Tidak Sesuai</option>
                  <option value="quality_issue">Masalah Kualitas Makanan</option>
                  <option value="missing_delivery">Pengiriman Tidak Datang</option>
                  <option value="packaging_issue">Masalah Kemasan</option>
                  <option value="hygiene_issue">Masalah Kebersihan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              {/* ID pengiriman optional */}
              <div className="space-y-2">
                <label htmlFor="deliveryId" className="block text-sm font-semibold text-gray-900">
                  ID Pengiriman (Optional)
                </label>
                <input
                  id="deliveryId"
                  type="number"
                  value={deliveryIdInput}
                  onChange={(e) => setDeliveryIdInput(e.target.value)}
                  placeholder="Masukkan ID Pengiriman terkait (hanya angka)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                />
              </div>

              {/* tanggal kejadian */}
              <div className="space-y-2">
                <label htmlFor="incidentDate" className="block text-sm font-semibold text-gray-900">
                  Tanggal Kejadian
                </label>
                <input
                  id="incidentDate"
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth"
                  required
                />
              </div>

              {/* deskripsi detail section */}
              <div className="space-y-3 pt-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Deskripsi Detail</h2>
                  <p className="text-sm text-gray-600">
                    Jelaskan masalah secara rinci, berikan semua informasi yang relevan.
                  </p>
                </div>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={500}
                  placeholder="Misalnya: Kemasan rusak, makanan tumpah, atau jumlah barang tidak sesuai dari yang diharapkan. Sertakan detail waktu dan lokasi jika memungkinkan."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth resize-none"
                  required
                />
                <p className="text-sm text-gray-500 text-right">
                  {description.length} / 500 karakter
                </p>
              </div>

              {/* lampirkan foto section */}
              <div className="space-y-3 pt-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Lampirkan Foto Bukti</h2>
                  <p className="text-sm text-gray-600">
                    Unggah gambar sebagai bukti masalah (opsional, maks. 5MB).
                  </p>
                </div>

                {/* Image Upload Component */}
                <ImageUpload
                  value={photoUrl}
                  onChange={(value) => setPhotoUrl(value || '')}
                  placeholder="Unggah Foto"
                  size="lg"
                  folder="issues"
                />
              </div>

              {/* action buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Laporkan Masalah
                    </>
                  )}
                </button>
              </div>
            </form>
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

export default function ReportIssuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ReportIssueContent />
    </Suspense>
  );
}
