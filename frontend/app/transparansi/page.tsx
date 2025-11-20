'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import axios from 'axios';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Loader2
} from 'lucide-react';

export default function TransparansiPage() {
  const [activeTab, setActiveTab] = useState('transparansi');
  const heroRef = useRef(null);
  const dashboardRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const dashboardInView = useInView(dashboardRef, { once: true, margin: "-100px" });

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

  // fetch transparency dashboard data
  useEffect(() => {
    const fetchTransparencyData = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

        // Fetch statistics
        const statsResponse = await axios.get(`${apiUrl}/public/statistics`);
        if (statsResponse.data.success) {
          const { summary, topRegions } = statsResponse.data.data;
          setTotalAmount(summary.totalAmountDistributed || 0);
          setTotalSchools(summary.schoolsServed || 0);
          setRegionalData(topRegions || []);
        }

        // Fetch blockchain transactions for feed
        const txResponse = await axios.get(`${apiUrl}/public/blockchain-transactions?limit=10`);
        if (txResponse.data.success) {
          setTransactions(txResponse.data.data || []);
        }

        // Fetch regions for scoring data
        const regionsResponse = await axios.get(`${apiUrl}/public/regions`);
        if (regionsResponse.data.success) {
          setScoreData(regionsResponse.data.data || []);
        }

      } catch (err: any) {
        console.error('Error fetching transparency data:', err);
        setError(err.message || 'Gagal memuat data transparansi. Silakan coba lagi nanti.');
        setTrendData([]);
        setRegionalData([]);
        setTransactions([]);
        setScoreData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransparencyData();
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
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 0.6,
      },
    },
  };

  const cardHover = {
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  };

  // loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-700">Memuat Data Transparansi...</h3>
        </div>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-600">{error}</p>
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
                <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300" />
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
                <motion.span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" />
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
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 gpu-accelerate"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Jelajahi Data
              </motion.button>
              <motion.button
                className="bg-white text-gray-700 px-8 py-3 rounded-lg font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-all duration-300 gpu-accelerate"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <div className="text-2xl font-bold text-blue-600">
                      {loading ? 'Loading...' : `Rp ${(totalAmount / 1_000_000).toFixed(1)}M`}
                    </div>
                    <div className="text-sm text-gray-600">Total Dana</div>
                  </div>
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
      <motion.section
        ref={dashboardRef}
        className="bg-gray-50 py-20"
        initial="hidden"
        animate={dashboardInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            variants={itemVariants}
            className="text-4xl font-bold text-center text-gray-900 mb-12"
          >
            Dasbor Transparansi Utama
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* card 1: tren alokasi dana bulanan */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-xl shadow-lg p-6 gpu-accelerate"
            >
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
            </motion.div>

            {/* card 2: distribusi dana regional */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-xl shadow-lg p-6 gpu-accelerate"
            >
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
                  {regionalData.map((item) => (
                    <div key={item.region} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-600">{item.region}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* card 3: umpan transaksi blockchain */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-xl shadow-lg p-6 gpu-accelerate"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Umpan Transaksi Blockchain Langsung</h3>
              {/* TODO: implementasi websocket untuk real-time updates dari blockchain */}
              <div className="space-y-3 h-64 overflow-y-auto">
                {transactions.map((tx, index) => (
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
                ))}
              </div>
            </motion.div>

            {/* card 4: distribusi skor prioritas sekolah */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-xl shadow-lg p-6 gpu-accelerate"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Skor Prioritas Sekolah</h3>
              {/* TODO: implementasi bar chart dengan library chart */}
              <div className="h-64 flex items-end justify-around gap-4 p-4">
                {scoreData.map((item) => (
                  <div key={item.category} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative">
                      <motion.div
                        className="w-full rounded-t-lg"
                        style={{
                          backgroundColor: item.color,
                          height: `${item.value}px`,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${item.value}px` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-2">{item.category}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* card 5: total dana dialokasikan */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-xl shadow-lg p-6 gpu-accelerate flex flex-col items-center justify-center"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Total Dana Dialokasikan</h3>
              <div className="text-5xl font-bold text-blue-600 mb-2">Rp 123,45</div>
              <div className="text-2xl font-semibold text-blue-600 mb-4">Miliar</div>
              <p className="text-sm text-gray-600 text-center">
                Dana terverifikasi blockchain sejak awal platform.
              </p>
            </motion.div>

            {/* card 6: jumlah sekolah terdampak */}
            <motion.div
              variants={itemVariants}
              whileHover={cardHover}
              className="bg-white rounded-xl shadow-lg p-6 gpu-accelerate flex flex-col items-center justify-center"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Jumlah Sekolah Terdampak</h3>
              <div className="text-6xl font-bold text-blue-600 mb-2">578</div>
              <div className="text-xl font-semibold text-blue-600 mb-4">Sekolah</div>
              <p className="text-sm text-gray-600 text-center">
                Total sekolah yang menerima dukungan dana.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

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
