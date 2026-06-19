'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { AlertCircle, CheckCircle, ChevronRight, Clock, ExternalLink, Loader2, Lock, MoreHorizontal, Search, Shield, Activity, Radio } from 'lucide-react';

interface ChartDataItem {
  month: string;
  alokasi: number;
  distribusi: number;
}

interface PrioritySchool {
  nama: string;
  kota: string;
  anggaran: string;
  status: string;
  statusColor: string;
}

interface Escrow {
  id: number;
  school: string;
  catering: string;
  amount: number;
  status: string;
  lockedAt: string;
  releaseDate: string;
  releasedAt?: string;
  txHash: string;
}

interface Stats {
  totalTerkunci: number;
  totalTercair: number;
  pendingRelease: number;
}

interface NetworkActivity {
  hour: string;
  tps: number;
}


export default function Home() {
  const heroRef = useRef(null);
  const whatsPokeRef = useRef(null);
  const chartRef = useRef(null);
  const contentRef = useRef(null);
  const tableRef = useRef(null);

  // State untuk data dari backend
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [prioritySchools, setPrioritySchools] = useState<PrioritySchool[]>([]);
  const [networkActivity, setNetworkActivity] = useState<NetworkActivity[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);

  // menggunakan useInView untuk trigger animasi saat scroll
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const whatsPokeInView = useInView(whatsPokeRef, { once: true, amount: 0.3 });
  const chartInView = useInView(chartRef, { once: true, amount: 0.2 });
  const contentInView = useInView(contentRef, { once: true, amount: 0.3 });
  const tableInView = useInView(tableRef, { once: true, amount: 0.2 });

  // scroll parallax untuk hero image
  const { scrollY } = useScroll();
  const heroImageY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroImageOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allEscrows, setAllEscrows] = useState<Escrow[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTerkunci: 0,
    totalTercair: 0,
    pendingRelease: 0,
  });
  const itemsPerPage = 6;
  const shouldReduceMotion = useReducedMotion();

  // Dummy data karena backend sudah mati
  const DUMMY_CHART_DATA: ChartDataItem[] = [
    { month: 'Jan', alokasi: 320, distribusi: 290 },
    { month: 'Feb', alokasi: 380, distribusi: 345 },
    { month: 'Mar', alokasi: 450, distribusi: 410 },
    { month: 'Apr', alokasi: 490, distribusi: 465 },
    { month: 'Mei', alokasi: 530, distribusi: 498 },
    { month: 'Jun', alokasi: 580, distribusi: 542 },
  ];

  const DUMMY_PRIORITY_SCHOOLS: PrioritySchool[] = [
    { nama: 'SDN Cimahi 03', kota: 'Cimahi', anggaran: 'Rp 245 Juta', status: 'Terverifikasi', statusColor: 'green' },
    { nama: 'SMPN 2 Bandung', kota: 'Bandung', anggaran: 'Rp 380 Juta', status: 'Terverifikasi', statusColor: 'green' },
    { nama: 'SMAN 1 Jakarta', kota: 'Jakarta Pusat', anggaran: 'Rp 520 Juta', status: 'Menunggu', statusColor: 'yellow' },
    { nama: 'SDN Surabaya 07', kota: 'Surabaya', anggaran: 'Rp 190 Juta', status: 'Terverifikasi', statusColor: 'green' },
    { nama: 'SMPN 5 Medan', kota: 'Medan', anggaran: 'Rp 290 Juta', status: 'Menunggu', statusColor: 'yellow' },
    { nama: 'SMKN 3 Yogyakarta', kota: 'Yogyakarta', anggaran: 'Rp 410 Juta', status: 'Terverifikasi', statusColor: 'green' },
  ];

  const DUMMY_ESCROWS: Escrow[] = [
    { id: 8144, school: 'SDN Rawamangun 01', catering: 'PT Mitra Kuliner Nusantara', amount: 68900000, status: 'Tercairkan', lockedAt: '2025-01-15', releaseDate: '2025-02-15', releasedAt: '2025-02-15', txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b' },
    { id: 8143, school: 'SMKN 2 Surabaya', catering: 'CV Sumber Gizi Jaya', amount: 74200000, status: 'Tertunda', lockedAt: '2024-12-29', releaseDate: '2025-01-29', txHash: '0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6' },
    { id: 8142, school: 'SMA Negeri 3 Bandung', catering: 'PT Pangan Sejahtera', amount: 125000000, status: 'Tercairkan', lockedAt: '2025-01-10', releaseDate: '2025-02-10', releasedAt: '2025-02-10', txHash: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8' },
    { id: 8141, school: 'SDN Menteng 02', catering: 'CV Catering Anak Bangsa', amount: 45600000, status: 'Tercairkan', lockedAt: '2025-01-05', releaseDate: '2025-02-05', releasedAt: '2025-02-05', txHash: '0x7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6' },
    { id: 8140, school: 'SMPN 8 Jakarta', catering: 'PT Gizi Nusantara', amount: 98000000, status: 'Tertunda', lockedAt: '2025-01-20', releaseDate: '2025-02-20', txHash: '0x3b2a1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2' },
    { id: 8139, school: 'SMAN 2 Surabaya', catering: 'CV Sumber Gizi Jaya', amount: 112000000, status: 'Tercairkan', lockedAt: '2025-01-02', releaseDate: '2025-02-02', releasedAt: '2025-02-02', txHash: '0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5' },
  ];

  const DUMMY_STATS: Stats = {
    totalTerkunci: 2450000000,
    totalTercair: 1890000000,
    pendingRelease: 560000000,
  };

  const DUMMY_NETWORK_ACTIVITY: NetworkActivity[] = [
    { time: '00:00', tps: 12 },
    { time: '02:00', tps: 8 },
    { time: '04:00', tps: 5 },
    { time: '06:00', tps: 15 },
    { time: '08:00', tps: 45 },
    { time: '10:00', tps: 38 },
    { time: '12:00', tps: 52 },
    { time: '14:00', tps: 41 },
    { time: '16:00', tps: 35 },
    { time: '18:00', tps: 28 },
    { time: '20:00', tps: 18 },
    { time: '22:00', tps: 14 },
  ];

  // Fetch data dari backend saat component mount
  useEffect(() => {
    // Gunakan dummy data karena backend sudah mati
    setChartData(DUMMY_CHART_DATA);
    setPrioritySchools(DUMMY_PRIORITY_SCHOOLS);
    setAllEscrows(DUMMY_ESCROWS);
    setStats(DUMMY_STATS);
    setNetworkActivity(DUMMY_NETWORK_ACTIVITY);
    setIsLoadingChart(false);
    setIsLoadingSchools(false);
      }, []);

  // variasi animasi untuk stagger effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const filteredEscrows = allEscrows.filter((escrow) => {
    const matchesSearch =
      escrow.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      escrow.catering.toLowerCase().includes(searchQuery.toLowerCase()) ||
      escrow.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || escrow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEscrows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEscrows = filteredEscrows.slice(startIndex, endIndex);

  const containerEscrowVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.03,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemEscrowVariants = {
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
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Terkunci':
        return 'bg-blue-100 text-blue-700';
      case 'Menunggu Rilis':
        return 'bg-yellow-100 text-yellow-700';
      case 'Tercairkan':
        return 'bg-green-100 text-green-700';
      case 'Tertunda':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'M';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'Jt';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'Rb';
    }
    return num.toString();
  };


  return (
    <div className="min-h-screen bg-white">
      <Navbar role="public" />

      {/* hero section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/aesthetic view.jpg')" }}
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

        {/* Content overlay */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }}
            className="space-y-6"
          >

            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Transparansi Program Distribusi Pangan
            </motion.h1>
            <motion.p
              className="text-lg text-gray-200 leading-relaxed max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Platform transparansi untuk Program Makan Bergizi Gratis (MBG) yang memastikan distribusi pangan berjalan efisien dan akuntabel.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* what's poke section */}
      <section ref={whatsPokeRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={whatsPokeInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Apa Itu MBG?
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed text-justify mb-8">
              Program Makan Bergizi Gratis merupakan program makan siang gratis Indonesia pada
              pemerintahan Prabowo Subianto yang berjalan secara bertahap sejak 6 Januari 2025.
              Program ini menargetkan para pelajar dan kelompok rentan termasuk ibu hamil dan menyusui.
              MBG (Makan Bergizi Ga Bocor) hadir sebagai platform transparansi berbasis blockchain
              yang memastikan setiap dana program tersalurkan tepat sasaran tanpa kebocoran. Melalui
              teknologi smart contract, kami menciptakan ekosistem distribusi yang akuntabel, di mana
              setiap transaksi tercatat secara permanen dan dapat diverifikasi oleh publik. Bersama MBG,
              wujudkan program bantuan pangan yang benar-benar sampai kepada yang membutuhkan.
            </p>

                      </motion.div>
        </div>
      </section>

      {/* chart section - status alokasi */}
      <section ref={chartRef} className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={chartInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
              Status Alokasi Dan Distribusi Dana (Jutaan Rupiah)
            </h2>
            <p className="text-gray-600 text-center mb-12">
              Grafik hasil analisa menampilkan program
            </p>

            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={chartInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{ willChange: 'transform' }}
            >
              {isLoadingChart ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat data chart...</p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px]">
                  <p className="text-gray-600">Tidak ada data chart tersedia</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6b7280', fontSize: 14 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 14 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="alokasi"
                      name="Alokasi"
                      fill="#8b5cf6"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                      animationBegin={0}
                    />
                    <Bar
                      dataKey="distribusi"
                      name="Distribusi"
                      fill="#ec4899"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                      animationBegin={200}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </motion.div>

          {/* Network Activity Section */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={chartInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
              Network Activity (TPS per Hour)
            </h3>
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              {isLoadingChart ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat data network activity...</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={networkActivity}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="time"
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                      }}
                      labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tps"
                      stroke="#10b981"
                      fill="url(#colorTps)"
                      strokeWidth={3}
                      animationDuration={2000}
                      animationBegin={400}
                    />
                    <defs>
                      <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* content section dengan image */}
      <section ref={contentRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* text content */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -30 }}
              animate={contentInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Teknologi Blockchain untuk Transparansi Maksimal
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed text-justify">
                Dengan memanfaatkan teknologi blockchain, setiap alokasi dan distribusi dana
                Program Makan Bergizi Gratis tercatat secara permanen dan tidak dapat dimanipulasi.
                Smart contract memastikan dana otomatis tersalur sesuai kriteria yang telah
                ditetapkan, menjamin bahwa bantuan pangan benar-benar sampai kepada seluruh
                penerima manfaat tanpa potongan atau kebocoran sedikitpun.
              </p>
              <h3 className="text-2xl font-bold text-gray-900 pt-6">
                Akuntabilitas dari Sumber hingga Penerima
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed text-justify">
                Sistem kami memberikan visibilitas penuh terhadap alur dana dari pemerintah, katering,
                hingga ke sekolah-sekolah penerima manfaat. Masyarakat dapat memantau secara real-time
                distribusi bantuan pangan Program Makan Bergizi Gratis, memastikan tidak ada kebocoran
                atau penyalahgunaan anggaran di setiap tahapan distribusi. Transparansi ini menjadi
                kunci keberhasilan program yang bertujuan memberikan nutrisi berkualitas bagi generasi
                masa depan Indonesia.
              </p>
            </motion.div>

            {/* image */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              animate={contentInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/aesthetic view 2.jpg"
                  alt="Program Pangan"
                  className="w-full h-[400px] md:h-[500px] object-cover transform hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* table section - sekolah prioritas */}
      <section ref={tableRef} className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={tableInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
              Sekolah Prioritas Teratas
            </h2>
            <p className="text-gray-600 text-center mb-12">
              Daftar sekolah penerima manfaat berdasarkan program
            </p>

            <motion.div
              className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={tableInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {isLoadingSchools ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat data sekolah...</p>
                  </div>
                </div>
              ) : prioritySchools.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-gray-600">Tidak ada data sekolah tersedia</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                          Sekolah
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                          Kota
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                          Anggaran Dialokasikan
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <motion.tbody
                      variants={containerVariants}
                      initial="hidden"
                      animate={tableInView ? 'visible' : 'hidden'}
                      className="divide-y divide-gray-100"
                    >
                      {prioritySchools.map((school, index) => (
                        <motion.tr
                          key={index}
                          variants={itemVariants as any}
                          className="hover:bg-gray-50 transition-colors"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {school.nama}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {school.kota}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                            {school.anggaran}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${school.statusColor}`}
                            >
                              {school.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerEscrowVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemEscrowVariants} className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Transparansi Escrow Blockchain
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                <span className="text-blue-600 font-semibold">Rp{formatCompactNumber(stats.totalTerkunci)}</span> Dana Tersedia untuk Anak Sekolah Indonesia
              </p>
              <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-2">
                Program MBG memastikan transparansi penuh melalui blockchain. Setiap rupiah tercatat dan dapat dipertanggungjawabkan.
              </p>
            </motion.div>

            <motion.div variants={itemEscrowVariants} className="flex items-center justify-center gap-12 text-center">
                {/* Total Terkunci */}
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCompactNumber(stats.totalTerkunci)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Total Terkunci
                  </div>
                </div>

                <div className="text-2xl text-gray-400">|</div>

                {/* Total Tercair */}
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCompactNumber(stats.totalTercair)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Total Tercair
                  </div>
                </div>

                <div className="text-2xl text-gray-400">|</div>

                {/* Pending Release */}
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCompactNumber(stats.pendingRelease)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Menunggu Pencairan
                  </div>
                </div>
            </motion.div>

        {/* Filters */}
        <motion.div variants={itemEscrowVariants} className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Berdasarkan Sekolah, Katering, Atau TX Hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth outline-none text-sm"
              />
            </div>

            {/* Filter Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth appearance-none bg-white text-sm min-w-[180px]"
              >
                <option value="">Semua Status</option>
                <option value="Terkunci">Terkunci</option>
                <option value="Menunggu Rilis">Menunggu Rilis</option>
                <option value="Tercairkan">Tercairkan</option>
                <option value="Tertunda">Tertunda</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Escrow Table */}
        <motion.div variants={itemEscrowVariants} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">ID</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Sekolah</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Katering</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Jumlah</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">Tanggal Terkunci</th>
                  <th className="text-left p-4 font-semibold text-gray-700 text-sm">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {currentEscrows.map((escrow, index) => (
                  <motion.tr
                    key={escrow.id}
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
                      <span className="font-mono text-sm text-gray-600">#{escrow.id}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-900 text-sm">{escrow.school}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">{escrow.catering}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-900 text-sm stat-number">
                        {formatCurrency(escrow.amount)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                          escrow.status
                        )}`}
                      >
                        {escrow.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">
                        {new Date(escrow.lockedAt).toLocaleDateString('id-ID')}
                      </span>
                    </td>
                    <td className="p-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${escrow.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-xs font-mono flex items-center gap-1 transition-smooth"
                      >
                        {escrow.txHash.substring(0, 10)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1} Dari {Math.min(endIndex, filteredEscrows.length)} Escrow
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
        <motion.div variants={itemEscrowVariants} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Informasi Smart Contract Escrow</h4>
              <p className="text-sm text-blue-700">
                Semua transaksi escrow dikelola melalui smart contract blockchain untuk transparansi dan keamanan maksimal.
                Dana akan otomatis tercairkan ketika semua kondisi terpenuhi atau dapat di-release secara manual oleh admin.
              </p>
            </div>
          </div>
        </motion.div>
          </motion.div>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* logo dan copyright */}
            <div className="col-span-1">
              <div className="mb-4">
                <Image
                  src="/MBG-removebg-preview.png"
                  alt="MBG Logo"
                  width={120}
                  height={40}
                  className="object-contain brightness-0 invert"
                  style={{ height: 'auto' }}
                />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                2025 MBG. Semua Hak Dilindungi Undang-Undang.
              </p>
            </div>

            {/* perusahaan */}
            <div>
              <h3 className="font-bold text-lg mb-4">Perusahaan</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Tentang Kami
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Karir
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Tim
                  </a>
                </li>
              </ul>
            </div>

            {/* sumber daya */}
            <div>
              <h3 className="font-bold text-lg mb-4">Sumber Daya</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* hukum */}
            <div>
              <h3 className="font-bold text-lg mb-4">Hukum</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Kebijakan Privasi
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Syarat Layanan
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">
              Made with Love in Indonesia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
