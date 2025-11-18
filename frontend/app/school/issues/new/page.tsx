'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import useIssues from '../../../hooks/useIssues';
import ModernSidebar from '../../../components/layout/ModernSidebar';
import {
  AlertTriangle,
  Upload,
  X,
  Loader2,
  LayoutDashboard,
  History,
  FileText,
  CheckCircle2,
  CheckCircle,
  QrCode,
  AlertCircle,
} from 'lucide-react';

// TODO: Integrasikan dengan sistem notifikasi real-time
// TODO: Tambahkan validasi file untuk berbagai format (JPG, PNG, PDF)
// TODO: Implementasikan preview untuk PDF files
// TODO: Tambahkan progress indicator untuk upload file

function ReportIssueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { createIssue } = useIssues();

  const deliveryId = searchParams.get('delivery_id');

  // state untuk form data
  const [issueType, setIssueType] = useState('');
  const [deliveryIdInput, setDeliveryIdInput] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  // handler untuk file change via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  };

  // handler untuk drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  // proses file yang diupload
  const processFiles = (selectedFiles: File[]) => {
    const validFiles: File[] = [];
    const previews: string[] = [];

    selectedFiles.forEach(file => {
      // validasi ukuran file maksimal 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} Terlalu Besar! Maksimal 5MB.`);
        return;
      }

      // validasi tipe file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} Tidak Didukung! Gunakan JPG, PNG, atau PDF.`);
        return;
      }

      validFiles.push(file);

      // buat preview untuk gambar
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === validFiles.filter(f => f.type.startsWith('image/')).length) {
            setFilePreviews(prev => [...prev, ...previews]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // untuk PDF, gunakan icon placeholder
        previews.push('pdf');
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  // hapus file dari list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

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
      // buat FormData untuk file upload
      const formData = new FormData();

      // tambahkan delivery_id jika ada
      if (deliveryIdInput) {
        formData.append('delivery_id', deliveryIdInput);
      }

      formData.append('issue_type', issueType);
      formData.append('description', description);
      formData.append('incident_date', incidentDate);

      // tambahkan files jika ada
      files.forEach((file, index) => {
        formData.append(`issue_photo_${index}`, file);
      });

      await createIssue(formData);

      alert('Laporan Masalah Berhasil Dikirim!');
      router.push('/school/issues');
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
                  type="text"
                  value={deliveryIdInput}
                  onChange={(e) => setDeliveryIdInput(e.target.value)}
                  placeholder="Masukkan ID Pengiriman terkait"
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

              {/* lampirkan foto/file section */}
              <div className="space-y-3 pt-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Lampirkan Foto/File</h2>
                  <p className="text-sm text-gray-600">
                    Unggah gambar atau dokumen yang relevan sebagai bukti (maks. 5MB per file).
                  </p>
                </div>

                {/* drag and drop area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-smooth cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <input
                    type="file"
                    id="fileUpload"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="fileUpload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900 mb-1">
                          Seret & Lepas File Di Sini, Atau{' '}
                          <span className="text-blue-600">Klik Untuk Memilih</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Format yang didukung: JPG, PNG, PDF
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* preview uploaded files */}
                {files.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="relative group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-smooth"
                      >
                        {file.type.startsWith('image/') ? (
                          <img
                            src={filePreviews[index]}
                            alt={file.name}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-100">
                            <FileText className="w-10 h-10 text-red-500 mb-2" />
                            <p className="text-xs text-gray-600 font-medium">PDF</p>
                          </div>
                        )}
                        <div className="p-2 bg-white">
                          <p className="text-xs text-gray-700 truncate font-medium">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-smooth hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
