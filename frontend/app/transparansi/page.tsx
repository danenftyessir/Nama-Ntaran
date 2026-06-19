'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Loader2,
  Activity,
  Shield,
  Database,
  Search,
  Clock,
  Zap,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  BarChart3,
  PieChart,
  Hash,
  Globe,
  Cpu,
  Layers
} from 'lucide-react';

// Dummy data untuk backend yang mati
const DUMMY_TRANSACTIONS = [
  { time: '2024-12-18 08:30:45', amount: 'Rp 2.5 M', receiver: 'SDN 01 Jakarta', status: 'Selesai', hash: '0x3fa8...b1c2' },
  { time: '2024-12-18 09:15:22', amount: 'Rp 1.8 M', receiver: 'SMAN 5 Surabaya', status: 'Selesai', hash: '0x7b2c...d4e5' },
  { time: '2024-12-18 10:45:11', amount: 'Rp 3.2 M', receiver: 'SMPN 3 Bandung', status: 'Selesai', hash: '0x9f1e...a6b3' },
  { time: '2024-12-18 11:20:33', amount: 'Rp 2.1 M', receiver: 'SMKN 2 Semarang', status: 'Proses', hash: '0x4c7a...f9d2' },
  { time: '2024-12-18 12:10:18', amount: 'Rp 4.7 M', receiver: 'SDN 07 Yogyakarta', status: 'Selesai', hash: '0x8e3b...c5a1' }
];

const DUMMY_TREND_DATA = [
  { month: 'Jul', alokasi: 420, distribusi: 380 },
  { month: 'Agu', alokasi: 480, distribusi: 445 },
  { month: 'Sep', alokasi: 520, distribusi: 489 },
  { month: 'Okt', alokasi: 560, distribusi: 534 },
  { month: 'Nov', alokasi: 590, distribusi: 561 },
  { month: 'Des', alokasi: 620, distribusi: 595 }
];

const DUMMY_REGIONAL_DATA = [
  { region: 'Jakarta', amount: 850, color: '#8b5cf6' },
  { region: 'Surabaya', amount: 720, color: '#f59e0b' },
  { region: 'Bandung', amount: 680, color: '#3b82f6' },
  { region: 'Semarang', amount: 540, color: '#ec4899' },
  { region: 'Yogyakarta', amount: 490, color: '#10b981' }
];

const DUMMY_SCORE_DATA = [
  { category: 'Sangat Rendah', value: 12, color: '#ef4444' },
  { category: 'Rendah', value: 28, color: '#f97316' },
  { category: 'Sedang', value: 45, color: '#eab308' },
  { category: 'Tinggi', value: 68, color: '#22c55e' },
  { category: 'Sangat Tinggi', value: 92, color: '#3b82f6' }
];

const DUMMY_SYSTEM_STATS = {
  totalSchools: 245,
  totalAmount: 28500000000,
  efficiency: 95.2,
  gasCost: 18,
  activeContracts: 3,
  uptime: '99.97%',
  lastUpdate: new Date().toLocaleString('id-ID')
};

export default function TransparansiPage() {
  const heroRef = useRef(null);
  const dashboardRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.1 });
  const dashboardInView = useInView(dashboardRef, { once: true, amount: 0.1 });

  // state management
  const [trendData, setTrendData] = useState<any[]>([]);
  const [regionalData, setRegionalData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [scoreData, setScoreData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // state untuk summary stats
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalSchools, setTotalSchools] = useState<number>(0);

  // Menggunakan dummy data karena backend mati
  useEffect(() => {
    const loadDummyData = () => {
      try {
        setLoading(true);

        // Set dummy data
        setTrendData(DUMMY_TREND_DATA);
        setScoreData(DUMMY_SCORE_DATA);
        setRegionalData(DUMMY_REGIONAL_DATA);
        setTransactions(DUMMY_TRANSACTIONS);
        setTotalSchools(DUMMY_SYSTEM_STATS.totalSchools);
        setTotalAmount(DUMMY_SYSTEM_STATS.totalAmount);

        setLoading(false);
      } catch (error) {
        console.error('Error loading dummy data:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadDummyData();
  }, []);

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
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const cardHover = {
    scale: 1.02,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  };

  // Don't use early returns for loading/error - render the page structure instead

  return (
    <div className="min-h-screen bg-white">
      {/* navbar */}
      <motion.nav
        className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* logo */}
            <Link href="/" className="flex items-center group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 17 }}
              >
                <Image
                  src="/MBG-removebg-preview.png"
                  alt="MBG Logo"
                  width={120}
                  height={40}
                  className="object-contain"
                  style={{ height: 'auto' }}
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
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/school-list"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                School List
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="/transparansi"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium relative group"
              >
                Transparency Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* hero section */}
      <motion.section
        ref={heroRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* content kiri */}
          <motion.div variants={itemVariants}>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Wujudkan Akuntabilitas Dana Pendidikan
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Platform Transparansi MBG menyediakan akses publik ke data prioritas sekolah dan alokasi dana.
              Visualisasikan skor sekolah berbasis AI dan alokasi dana yang terverifikasi blockchain untuk
              meningkatkan akuntabilitas.
            </p>
            <div className="flex gap-4">
              <motion.button
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Jelajahi Data
              </motion.button>
              <motion.button
                className="bg-white text-gray-700 px-8 py-3 rounded-lg font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Pelajari Lebih Lanjut
              </motion.button>
            </div>
          </motion.div>

          {/* ilustrasi kanan */}
          <motion.div
            variants={itemVariants}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-12 shadow-xl">
              {/* TODO: ganti dengan ilustrasi custom atau gunakan gambar dari public folder */}
              <div className="space-y-6">
                {/* ilustrasi dashboard sederhana */}
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  </div>
                  {/* grafik bar sederhana */}
                  <div className="flex items-end gap-2 h-32">
                    <div className="flex-1 bg-blue-200 rounded-t" style={{ height: '60%' }}></div>
                    <div className="flex-1 bg-blue-400 rounded-t" style={{ height: '85%' }}></div>
                    <div className="flex-1 bg-blue-300 rounded-t" style={{ height: '70%' }}></div>
                    <div className="flex-1 bg-blue-500 rounded-t" style={{ height: '95%' }}></div>
                  </div>
                </div>
                {/* statistik cards */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <div className="text-2xl font-bold text-purple-600">
                      {loading ? '...' : totalSchools}
                    </div>
                    <div className="text-sm text-gray-600">Sekolah</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* dashboard section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Dasbor Transparansi Utama
          </h2>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-700">Memuat Data Transparansi...</h3>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-red-600 mb-2">Error</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* card 1: tren alokasi dana bulanan */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tren Alokasi Dana Bulanan</h3>
              {/* TODO: implementasi chart library seperti recharts atau chart.js untuk visualisasi yang lebih baik */}
              <div className="h-64 relative">
                {/* line chart sederhana dengan SVG */}
                <svg className="w-full h-full" viewBox="0 0 300 200">
                  {/* grid lines */}
                  <line x1="0" y1="180" x2="300" y2="180" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="0" y1="135" x2="300" y2="135" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="0" y1="90" x2="300" y2="90" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="0" y1="45" x2="300" y2="45" stroke="#e5e7eb" strokeWidth="1" />

                  {/* line path - representasi sederhana */}
                  <polyline
                    points="0,160 30,140 60,165 90,150 120,130 150,125 180,115 210,120 240,110 270,105 300,100"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* labels */}
                  <text x="15" y="195" fontSize="10" fill="#6b7280">Des</text>
                  <text x="135" y="195" fontSize="10" fill="#6b7280">Apr</text>
                  <text x="270" y="195" fontSize="10" fill="#6b7280">Agt</text>
                </svg>
                {/* legend */}
                <div className="absolute top-2 right-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Rp 0.5 M</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span className="text-gray-600">Rp 0.5 M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* card 2: distribusi dana regional */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Dana Regional</h3>
              {/* TODO: implementasi donut chart dengan library chart */}
              <div className="h-64 flex items-center justify-center relative">
                {/* donut chart dengan SVG */}
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="30"
                    strokeDasharray="200 314"
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="30"
                    strokeDasharray="125 314"
                    strokeDashoffset="-200"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="30"
                    strokeDasharray="100 314"
                    strokeDashoffset="-325"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="30"
                    strokeDasharray="50 314"
                    strokeDashoffset="-425"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="30"
                    strokeDasharray="25 314"
                    strokeDashoffset="-475"
                  />
                </svg>

                {/* legend */}
                <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-2 text-xs">
                  {regionalData.length > 0 ? (
                    regionalData.map((item, idx) => (
                      <div key={item.region || idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-600">{item.region || item.name || 'Unknown'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-400">Tidak ada data</div>
                  )}
                </div>
              </div>
            </div>

            {/* card 3: umpan transaksi blockchain */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Umpan Transaksi Blockchain Langsung</h3>
              {/* TODO: implementasi websocket untuk real-time updates dari blockchain */}
              <div className="space-y-3 h-64 overflow-y-auto">
                {transactions.length > 0 ? (
                  transactions.map((tx, index) => (
                    <div key={index} className="border-b border-gray-100 pb-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">{tx.time}</span>
                        <span className={`text-xs px-2 py-1 rounded ${tx.status === 'Selesai' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-gray-900">{tx.amount}</div>
                      <div className="text-xs text-gray-600">{tx.receiver}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="text-center">Belum ada transaksi</p>
                  </div>
                )}
              </div>
            </div>

            {/* card 4: distribusi skor prioritas sekolah */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Skor Prioritas Sekolah</h3>
              {/* TODO: implementasi bar chart dengan library chart */}
              <div className="h-64 flex items-end justify-around gap-4 p-4">
                {scoreData.length > 0 ? (
                  scoreData.map((item) => (
                    <div key={item.category} className="flex-1 flex flex-col items-center">
                      <div className="w-full relative">
                        <div
                          className="w-full rounded-t-lg transition-all duration-1000"
                          style={{
                            backgroundColor: item.color,
                            height: `${item.value}px`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-2">{item.category}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400">
                    <p className="text-center">Tidak ada data distribusi</p>
                  </div>
                )}
              </div>
            </div>

            {/* card 5: jumlah sekolah terdampak */}
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Jumlah Sekolah Terdampak</h3>
              <div className="text-6xl font-bold text-blue-600 mb-2">{totalSchools}</div>
              <div className="text-xl font-semibold text-blue-600 mb-4">Sekolah</div>
              <p className="text-sm text-gray-600 text-center">
                Total sekolah yang menerima dukungan dana.
              </p>
            </div>
          </div>
          )}
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
