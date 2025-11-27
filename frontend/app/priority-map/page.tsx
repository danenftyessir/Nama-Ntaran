'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ChevronDown,
  Loader2
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fix Leaflet default icon issue with webpack
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Province coordinates for Indonesia (approximate center)
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'D.K.I. Jakarta': [-6.2088, 106.8456],
  'Jawa Barat': [-6.9175, 107.6191],
  'Jawa Tengah': [-7.1508, 110.1403],
  'Jawa Timur': [-7.5360, 112.2384],
  'Sumatera Utara': [3.5952, 98.6722],
  'Sumatera Barat': [-0.9471, 100.4172],
  'Sumatera Selatan': [-3.3194, 104.9147],
  'Bali': [-8.3405, 115.0920],
  'Sulawesi Selatan': [-3.6687, 119.9740],
  'Papua': [-4.2699, 138.0804],
  'Kalimantan Timur': [0.5387, 116.4194],
  'Kalimantan Barat': [-0.0263, 109.3425],
  'Aceh': [4.6951, 96.7494],
  'Riau': [0.2933, 101.7068],
  'Lampung': [-4.5586, 105.4068],
  'Banten': [-6.4058, 106.0640],
  'Nusa Tenggara Barat': [-8.6529, 117.3616],
  'Nusa Tenggara Timur': [-8.6573, 121.0794],
  'Kalimantan Selatan': [-3.0926, 115.2838],
  'Kalimantan Tengah': [-1.6815, 113.3824],
  'Sulawesi Tengah': [-1.4300, 121.4456],
  'Sulawesi Tenggara': [-4.1448, 122.1747],
  'Maluku': [-3.2385, 130.1453],
  'Papua Barat': [-1.3361, 133.1747]
};

interface SchoolData {
  id: number;
  name: string;
  province: string;
  city: string;
  priority_score: number | null;
  jenjang: string;
}

interface ProvinceGroup {
  province: string;
  coords: [number, number];
  schools: SchoolData[];
  avgScore: number;
  totalSchools: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

export default function PriorityMapPage() {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef(null);
  const mapRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const mapInView = useInView(mapRef, { once: true, margin: "-100px" });

  // Fetch schools data from Supabase
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);

        // Fetch ALL schools in batches to bypass Supabase's 1000 row limit
        let allSchools: any[] = [];
        let start = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: batch, error: supabaseError, count } = await supabase
            .from('schools')
            .select('*', { count: 'exact' })
            .gt('priority_score', 0)
            .order('priority_score', { ascending: false })
            .range(start, start + batchSize - 1);

          if (supabaseError) {
            throw supabaseError;
          }

          if (batch && batch.length > 0) {
            allSchools = [...allSchools, ...batch];
            start += batchSize;

            // If we got less than batchSize rows, we've reached the end
            if (batch.length < batchSize) {
              hasMore = false;
            }

            // Removed console.log for performance
          } else {
            hasMore = false;
          }
        }

        setSchools(allSchools);

        // Final summary
        const uniqueProvinces = Array.from(new Set(allSchools.map((s: any) => s.province) || [])).filter(Boolean);
        console.log(`✅ Loaded ${allSchools.length} schools from ${uniqueProvinces.length} provinces`);

        setError(null);
      } catch (err: any) {
        console.error('Error fetching schools from Supabase:', err);
        setError('Gagal memuat data sekolah dari database');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  // Group schools by province
  const provinceGroups = useMemo(() => {
    const groups: Record<string, ProvinceGroup> = {};

    schools.forEach(school => {
      const province = school.province || 'Unknown';
      if (!groups[province]) {
        groups[province] = {
          province,
          coords: PROVINCE_COORDS[province] || [-2.5489, 118.0149], // Default to Indonesia center
          schools: [],
          avgScore: 0,
          totalSchools: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0
        };
      }

      groups[province].schools.push(school);
      groups[province].totalSchools++;

      const score = school.priority_score || 0;
      if (score >= 70) groups[province].highPriority++;
      else if (score >= 40) groups[province].mediumPriority++;
      else if (score > 0) groups[province].lowPriority++;
    });

    // Calculate average scores
    Object.values(groups).forEach(group => {
      const validScores = group.schools.filter(s => s.priority_score).map(s => s.priority_score!);
      group.avgScore = validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;
    });

    return Object.values(groups);
  }, [schools]);

  // Filter province groups
  const filteredProvinceGroups = useMemo(() => {
    return provinceGroups.filter(group => {
      // Filter by selected provinces
      if (selectedProvinces.length > 0 && !selectedProvinces.includes(group.province)) {
        return false;
      }

      // Filter by category
      if (selectedCategory !== 'Semua Kategori') {
        if (selectedCategory === 'Prioritas Tinggi' && group.avgScore < 70) return false;
        if (selectedCategory === 'Prioritas Sedang' && (group.avgScore < 40 || group.avgScore >= 70)) return false;
        if (selectedCategory === 'Prioritas Rendah' && group.avgScore >= 40) return false;
      }

      return true;
    });
  }, [provinceGroups, selectedProvinces, selectedCategory]);

  // Get unique provinces for filter
  const provinces = useMemo(() => {
    return Array.from(new Set(schools.map(s => s.province))).filter(Boolean).sort();
  }, [schools]);

  // daftar kategori untuk filter
  const categories = [
    'Semua Kategori',
    'Prioritas Tinggi',
    'Prioritas Sedang',
    'Prioritas Rendah'
  ];

  // toggle province selection
  const toggleProvince = (province: string) => {
    if (selectedProvinces.includes(province)) {
      setSelectedProvinces(selectedProvinces.filter(p => p !== province));
    } else {
      setSelectedProvinces([...selectedProvinces, province]);
    }
  };

  // Get marker color based on average score
  const getMarkerColor = (avgScore: number) => {
    if (avgScore >= 70) return 'red';
    if (avgScore >= 40) return 'orange';
    return 'green';
  };

  // variasi animasi
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 0.6,
      },
    },
  };

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
            {/* logo */}
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

            {/* menu navigasi */}
            <div className="flex items-center gap-6">
              <Link
                href="/priority-map"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                Priority Map
                <motion.span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
              </Link>
              <Link
                href="/school-list"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                School List
                <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300" />
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

      {/* hero section */}
      <motion.section
        ref={heroRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Peta Prioritas Sekolah
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Jelajahi skor prioritas sekolah yang dihasilkan AI dan alokasi dana yang diverifikasi blockchain di peta interaktif. Gunakan filter untuk menemukan informasi spesifik dengan mudah.
          </p>
        </motion.div>
      </motion.section>

      {/* map section */}
      <section
        ref={mapRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* filter sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Kontrol & Legenda Peta
              </h2>

              {/* filter berdasarkan provinsi */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">
                    Filter Berdasarkan Provinsi
                  </span>
                  <span className="text-xs text-gray-500">
                    ({provinces.length} provinsi)
                  </span>
                </div>

                {!loading && provinces.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSelectedProvinces(provinces)}
                      className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <button
                      onClick={() => setSelectedProvinces([])}
                      className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Hapus Semua
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {loading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-5 h-5 mx-auto animate-spin text-purple-600" />
                    </div>
                  ) : provinces.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Tidak ada data provinsi
                    </div>
                  ) : (
                    provinces.map((province) => (
                      <label
                        key={province}
                        className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50 p-1 rounded transition-colors"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={selectedProvinces.includes(province)}
                            onChange={() => toggleProvince(province)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors">
                          {province}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* filter berdasarkan kategori */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => setCategoryOpen(!categoryOpen)}
                  className="w-full flex items-center justify-between text-left font-semibold text-gray-900 mb-3"
                >
                  <div className="flex flex-col">
                    <span>Filter Berdasarkan Kategori</span>
                    <span className="text-xs font-normal text-purple-600 mt-1">
                      {selectedCategory}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
                </button>

                {categoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setCategoryOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedCategory === category
                            ? 'bg-purple-100 text-purple-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Legend Section */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Legenda Peta</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-xs text-gray-700">Prioritas Tinggi (≥70)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-xs text-gray-700">Prioritas Sedang (40-69)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-xs text-gray-700">Prioritas Rendah (&lt;40)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* map container */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[600px] relative">
              {/* header peta */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000]">
                <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-lg shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 text-center">
                    Peta Interaktif Sekolah Indonesia
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-purple-600">{filteredProvinceGroups.length}</span>
                      <span>Provinsi</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-purple-600">{filteredProvinceGroups.reduce((sum, g) => sum + g.totalSchools, 0)}</span>
                      <span>Sekolah</span>
                    </div>
                    {selectedProvinces.length > 0 && (
                      <>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="text-xs text-purple-600">
                          {selectedProvinces.length} filter aktif
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
                    <p className="text-gray-600">Memuat data peta...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center">
                    <p className="text-red-600 font-semibold mb-2">Error</p>
                    <p className="text-gray-600">{error}</p>
                  </div>
                </div>
              )}

              {/* Leaflet Map */}
              {!loading && !error && typeof window !== 'undefined' && (
                <MapContainer
                  center={[-2.5489, 118.0149]}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {filteredProvinceGroups.map((group) => (
                    <Marker
                      key={group.province}
                      position={group.coords}
                    >
                      <Popup>
                        <div className="p-2 min-w-[220px]">
                          <div className="mb-3 pb-2 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 text-lg">{group.province}</h3>
                            <div
                              className="inline-block mt-1 px-3 py-1 rounded-full text-white text-xs font-semibold"
                              style={{ backgroundColor: getMarkerColor(group.avgScore) }}
                            >
                              Skor: {group.avgScore.toFixed(1)}/100
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-700">
                              <span className="font-semibold">Total Sekolah:</span> {group.totalSchools}
                            </p>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-600 font-semibold mb-2">Kategori Prioritas:</p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    Tinggi (≥70)
                                  </span>
                                  <span className="font-semibold">{group.highPriority} sekolah</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Sedang (40-69)
                                  </span>
                                  <span className="font-semibold">{group.mediumPriority} sekolah</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Rendah (&lt;40)
                                  </span>
                                  <span className="font-semibold">{group.lowPriority} sekolah</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* tentang kami */}
            <div>
              <h3 className="text-lg font-bold mb-4">Tentang Kami</h3>
              <p className="text-sm text-gray-400 mb-4">
                Enhancing accountability and transparency in education.
              </p>
              <div className="flex gap-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* sumber daya */}
            <div>
              <h3 className="text-lg font-bold mb-4">Sumber Daya</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Misi Kami
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Tim
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Kontak
                  </Link>
                </li>
              </ul>
            </div>

            {/* sumber daya 2 */}
            <div>
              <h3 className="text-lg font-bold mb-4">Sumber Daya</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Dokumentasi
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Dukungan
                  </Link>
                </li>
              </ul>
            </div>

            {/* hukum */}
            <div>
              <h3 className="text-lg font-bold mb-4">Hukum</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Ketentuan Layanan
                  </Link>
                </li>
              </ul>
            </div>
          </div>

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
