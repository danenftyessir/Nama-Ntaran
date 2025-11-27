'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Target,
  DollarSign,
  Building2,
  School,
  Loader2,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface SchoolDetail {
  id: number;
  npsn: string;
  name: string;
  address: string;
  kelurahan: string;
  status: string;
  province: string;
  city: string;
  district: string;
  jenjang: string;
  priority_score: number;
  created_at: string;
  latitude?: number;
  longitude?: number;
  logo_url?: string;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/schools/${schoolId}`);
        setSchool(response.data.school);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching school detail:', err);
        setError('Gagal memuat detail sekolah. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    if (schoolId) {
      fetchSchoolDetail();
    }
  }, [schoolId]);

  const getPriorityColor = (score: number) => {
    if (score >= 85) return 'text-red-600 bg-red-50';
    if (score >= 70) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 85) return 'Sangat Tinggi';
    if (score >= 70) return 'Tinggi';
    return 'Sedang';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Memuat Detail Sekolah...</h3>
          <p className="text-gray-500">Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-white">
        {/* navbar */}
        <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center">
                <Image
                  src="/MBG-removebg-preview.png"
                  alt="MBG Logo"
                  width={120}
                  height={40}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h3 className="text-xl font-semibold text-red-600 mb-2">Error</h3>
            <p className="text-gray-500 mb-6">{error || 'Sekolah tidak ditemukan.'}</p>
            <Link
              href="/school-list"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali ke Daftar Sekolah
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* navbar */}
      <motion.nav
        className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Image
                  src="/MBG-removebg-preview.png"
                  alt="MBG Logo"
                  width={120}
                  height={40}
                  className="object-contain"
                  priority
                />
              </motion.div>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/priority-map"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                Priority Map
                <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/school-list"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                School List
                <motion.span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
              </Link>
              <Link
                href="/transparansi"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                Transparency Dashboard
                <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/school-list"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Daftar Sekolah
          </Link>
        </motion.div>

        {/* school detail card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* header section */}
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 text-white">
            <div className="flex items-start gap-6">
              {/* school icon/logo */}
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {school.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <School className="w-10 h-10" />
                )}
              </div>

              {/* school name and basic info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{school.name}</h1>
                <div className="flex items-center gap-2 text-white/90 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">NPSN: {school.npsn}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                  <span className="text-sm font-semibold">{school.jenjang}</span>
                </div>
              </div>

              {/* priority score badge */}
              <div className={`px-6 py-4 rounded-xl ${getPriorityColor(school.priority_score)} flex flex-col items-center`}>
                <Target className="w-6 h-6 mb-1" />
                <span className="text-2xl font-bold">{Math.round(school.priority_score)}</span>
                <span className="text-xs font-semibold mt-1">{getPriorityLabel(school.priority_score)}</span>
              </div>
            </div>
          </div>

          {/* detail sections */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* location information */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  Informasi Lokasi
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Alamat</label>
                    <p className="text-gray-900">{school.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Kelurahan</label>
                    <p className="text-gray-900">{school.kelurahan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Kecamatan</label>
                    <p className="text-gray-900">{school.district}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Kota/Kabupaten</label>
                    <p className="text-gray-900">{school.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Provinsi</label>
                    <p className="text-gray-900">{school.province}</p>
                  </div>
                </div>
              </div>

              {/* additional information */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Informasi Tambahan
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <p className="text-gray-900 capitalize">{school.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Jenjang</label>
                    <p className="text-gray-900">{school.jenjang}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Skor Prioritas</label>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                          style={{ width: `${school.priority_score}%` }}
                        />
                      </div>
                      <span className="text-gray-900 font-bold">{Math.round(school.priority_score)}/100</span>
                    </div>
                  </div>
                  {school.latitude && school.longitude && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Koordinat</label>
                      <p className="text-gray-900 text-sm">
                        {school.latitude.toFixed(6)}, {school.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Terdaftar Sejak</label>
                    <p className="text-gray-900">
                      {new Date(school.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* map placeholder */}
            {school.latitude && school.longitude && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Lokasi pada Peta</h2>
                <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                  <p className="text-gray-500">Map integration coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* footer */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">
              © 2025 MBG Transparency Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
