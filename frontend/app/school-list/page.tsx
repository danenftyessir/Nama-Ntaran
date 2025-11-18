'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ChevronDown,
  Search,
  MapPin,
  Target,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

// interface untuk data sekolah
interface School {
  id: number;
  name: string;
  location: string;
  priorityScore: number;
  budget: string;
  image?: string;
}

export default function SchoolListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedScore, setSelectedScore] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });

  // TODO: PENTING - ganti dengan API call ke database
  // gunakan useEffect untuk fetch data dari endpoint /api/schools
  // contoh: const { data: schools, isLoading } = useSWR('/api/schools', fetcher);
  // atau gunakan fetch/axios dengan useEffect
  // data di bawah ini hanya untuk mock/development
  const schools: School[] = [
    { id: 1, name: 'SDN Maju Jaya 1', location: 'Jakarta Pusat', priorityScore: 85, budget: 'Rp 1.5 M' },
    { id: 2, name: 'SMPN Harapan Bangsa 2', location: 'Surabaya', priorityScore: 78, budget: 'Rp 2.0 M' },
    { id: 3, name: 'SMAN Cerdas Mandiri 3', location: 'Bandung', priorityScore: 92, budget: 'Rp 2.8 M' },
    { id: 4, name: 'SD Islam Al-Falah', location: 'Yogyakarta', priorityScore: 70, budget: 'Rp 1.2 M' },
    { id: 5, name: 'SMP Tunas Bangsa', location: 'Medan', priorityScore: 88, budget: 'Rp 1.8 M' },
    { id: 6, name: 'SMKN Teknologi Maju', location: 'Semarang', priorityScore: 95, budget: 'Rp 3.5 M' },
    { id: 7, name: 'SD Bhakti Pertiwi', location: 'Denpasar', priorityScore: 80, budget: 'Rp 1.3 M' },
    { id: 8, name: 'SMP Global Nusantara', location: 'Makassar', priorityScore: 75, budget: 'Rp 1.9 M' },
    { id: 9, name: 'SMA Unggul Prestasi', location: 'Palembang', priorityScore: 90, budget: 'Rp 3.0 M' },
    { id: 10, name: 'SDN Pelita Harapan', location: 'Jakarta Pusat', priorityScore: 82, budget: 'Rp 1.7 M' },
    { id: 11, name: 'SMPN Bina Prestasi', location: 'Surabaya', priorityScore: 87, budget: 'Rp 2.2 M' },
    { id: 12, name: 'SMAN Nusa Bangsa', location: 'Bandung', priorityScore: 91, budget: 'Rp 2.9 M' },
    { id: 13, name: 'SD Kreatif Mandiri', location: 'Yogyakarta', priorityScore: 76, budget: 'Rp 1.4 M' },
    { id: 14, name: 'SMP Sejahtera', location: 'Medan', priorityScore: 84, budget: 'Rp 1.9 M' },
    { id: 15, name: 'SMKN Digital Tech', location: 'Semarang', priorityScore: 93, budget: 'Rp 3.2 M' },
    { id: 16, name: 'SDN Harapan Jaya', location: 'Jakarta Pusat', priorityScore: 79, budget: 'Rp 1.6 M' },
    { id: 17, name: 'SMPN Patriot Bangsa', location: 'Surabaya', priorityScore: 86, budget: 'Rp 2.1 M' },
    { id: 18, name: 'SMAN Widya Karya', location: 'Bandung', priorityScore: 89, budget: 'Rp 2.7 M' },
    { id: 19, name: 'SD Citra Bangsa', location: 'Yogyakarta', priorityScore: 73, budget: 'Rp 1.3 M' },
    { id: 20, name: 'SMP Karya Mandiri', location: 'Medan', priorityScore: 81, budget: 'Rp 1.7 M' },
    { id: 21, name: 'SMKN Informatika', location: 'Semarang', priorityScore: 94, budget: 'Rp 3.4 M' },
    { id: 22, name: 'SDN Cahaya Ilmu', location: 'Denpasar', priorityScore: 77, budget: 'Rp 1.4 M' },
    { id: 23, name: 'SMPN Bina Nusantara', location: 'Makassar', priorityScore: 83, budget: 'Rp 2.0 M' },
    { id: 24, name: 'SMAN Taruna Bhakti', location: 'Palembang', priorityScore: 88, budget: 'Rp 2.6 M' },
    { id: 25, name: 'SD Budi Luhur', location: 'Jakarta Pusat', priorityScore: 74, budget: 'Rp 1.5 M' },
    { id: 26, name: 'SMP Sinar Harapan', location: 'Surabaya', priorityScore: 85, budget: 'Rp 2.3 M' },
    { id: 27, name: 'SMAN Pembangunan', location: 'Bandung', priorityScore: 90, budget: 'Rp 2.9 M' },
    { id: 28, name: 'SD Tunas Mekar', location: 'Yogyakarta', priorityScore: 72, budget: 'Rp 1.2 M' },
    { id: 29, name: 'SMP Pancasila', location: 'Medan', priorityScore: 86, budget: 'Rp 2.1 M' },
    { id: 30, name: 'SMKN Multimedia', location: 'Semarang', priorityScore: 92, budget: 'Rp 3.1 M' },
    { id: 31, name: 'SDN Kartika Jaya', location: 'Denpasar', priorityScore: 78, budget: 'Rp 1.5 M' },
    { id: 32, name: 'SMPN Dharma Bangsa', location: 'Makassar', priorityScore: 80, budget: 'Rp 1.8 M' },
    { id: 33, name: 'SMAN Bhinneka Tunggal', location: 'Palembang', priorityScore: 87, budget: 'Rp 2.5 M' },
    { id: 34, name: 'SD Muhammadiyah', location: 'Jakarta Pusat', priorityScore: 81, budget: 'Rp 1.6 M' },
    { id: 35, name: 'SMP Al-Azhar', location: 'Surabaya', priorityScore: 89, budget: 'Rp 2.4 M' },
    { id: 36, name: 'SMAN Nusantara Jaya', location: 'Bandung', priorityScore: 93, budget: 'Rp 3.0 M' },
  ];

  // daftar wilayah untuk filter
  const regions = [
    'Semua Wilayah',
    'Jakarta Pusat',
    'Surabaya',
    'Bandung',
    'Yogyakarta',
    'Medan',
    'Semarang',
    'Denpasar',
    'Makassar',
    'Palembang'
  ];

  // daftar skor untuk filter
  const scores = [
    'Semua Skor',
    'Tinggi (85-100)',
    'Sedang (70-84)',
    'Rendah (0-69)'
  ];

  // daftar status anggaran untuk filter
  const budgetStatuses = [
    'Semua Status',
    '< Rp 1.5 M',
    'Rp 1.5 M - Rp 2.5 M',
    '> Rp 2.5 M'
  ];

  // variasi animasi - hanya untuk hero section
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  // filter data sekolah berdasarkan kriteria yang dipilih
  const filteredSchools = schools.filter((school) => {
    // filter berdasarkan search query
    const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase());

    // filter berdasarkan wilayah
    const matchesRegion = !selectedRegion || selectedRegion === 'Semua Wilayah' || school.location === selectedRegion;

    // filter berdasarkan skor prioritas
    let matchesScore = true;
    if (selectedScore && selectedScore !== 'Semua Skor') {
      if (selectedScore === 'Tinggi (85-100)') {
        matchesScore = school.priorityScore >= 85 && school.priorityScore <= 100;
      } else if (selectedScore === 'Sedang (70-84)') {
        matchesScore = school.priorityScore >= 70 && school.priorityScore < 85;
      } else if (selectedScore === 'Rendah (0-69)') {
        matchesScore = school.priorityScore >= 0 && school.priorityScore < 70;
      }
    }

    // filter berdasarkan budget
    let matchesBudget = true;
    if (selectedBudget && selectedBudget !== 'Semua Status') {
      const budgetValue = parseFloat(school.budget.replace(/[^\d.]/g, ''));
      if (selectedBudget === '< Rp 1.5 M') {
        matchesBudget = budgetValue < 1.5;
      } else if (selectedBudget === 'Rp 1.5 M - Rp 2.5 M') {
        matchesBudget = budgetValue >= 1.5 && budgetValue <= 2.5;
      } else if (selectedBudget === '> Rp 2.5 M') {
        matchesBudget = budgetValue > 2.5;
      }
    }

    return matchesSearch && matchesRegion && matchesScore && matchesBudget;
  });

  // pagination logic
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchools = filteredSchools.slice(startIndex, endIndex);

  // generate page numbers untuk pagination (max 5 pages ditampilkan)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // reset ke halaman 1 ketika filter berubah
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // komponen placeholder untuk gambar sekolah - simple div untuk performa maksimal
  const SchoolPlaceholder = ({ className = "" }: { className?: string }) => (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100`}>
      <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center">
        <span className="text-4xl">🏫</span>
      </div>
    </div>
  );

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
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-md"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <span className="text-white font-bold text-lg">M</span>
              </motion.div>
              <motion.span
                className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
              >
                MBG
              </motion.span>
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
            Daftar Sekolah
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Jelajahi daftar lengkap sekolah yang berpartisipasi dalam program Transparansi MBG, lengkap dengan lokasi, skor prioritas, dan alokasi anggaran.
          </p>
        </motion.div>

        {/* filter section */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8"
        >
          {/* search input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Nama Sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 gpu-accelerate"
            />
          </div>

          {/* filter wilayah */}
          <div className="relative">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all duration-200 gpu-accelerate font-bold text-gray-800"
            >
              {regions.map((region) => (
                <option key={region} value={region} className="font-bold">
                  {region}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-gray-600 font-semibold">
              Wilayah
            </label>
          </div>

          {/* filter skor prioritas */}
          <div className="relative">
            <select
              value={selectedScore}
              onChange={(e) => setSelectedScore(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all duration-200 gpu-accelerate font-bold text-gray-800"
            >
              {scores.map((score) => (
                <option key={score} value={score} className="font-bold">
                  {score}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-gray-600 font-semibold">
              Skor Prioritas
            </label>
          </div>

          {/* filter status anggaran */}
          <div className="relative">
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all duration-200 gpu-accelerate font-bold text-gray-800"
            >
              {budgetStatuses.map((status) => (
                <option key={status} value={status} className="font-bold">
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-gray-600 font-semibold">
              Status Anggaran
            </label>
          </div>

          {/* tombol search / apply filter */}
          <motion.button
            onClick={handleFilterChange}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all duration-200 gpu-accelerate"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-5 h-5" />
            Cari
          </motion.button>
        </motion.div>
      </motion.section>

      {/* school cards section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredSchools.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Tidak Ada Sekolah Ditemukan</h3>
              <p className="text-gray-500">Coba ubah kriteria filter untuk melihat lebih banyak hasil.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentSchools.map((school, index) => (
              <div
                key={school.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-2"
              >
                {/* school image placeholder */}
                <div className="h-48 bg-gradient-to-br from-purple-100 to-blue-100 relative overflow-hidden">
                  <SchoolPlaceholder className="w-full h-full object-cover" />
                </div>

                {/* school info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {school.name}
                  </h3>

                  <div className="space-y-2 mb-4">
                    {/* lokasi */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">{school.location}</span>
                    </div>

                    {/* skor prioritas */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Skor Prioritas: {school.priorityScore}/100</span>
                    </div>

                    {/* anggaran */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Anggaran Dialokasikan: {school.budget}</span>
                    </div>
                  </div>

                  {/* button */}
                  <button
                    className="w-full py-2 px-4 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-purple-600 hover:text-purple-600 transition-all duration-200"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* pagination */}
        {filteredSchools.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-bold transition-all duration-150 ${
                    currentPage === pageNum
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
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
