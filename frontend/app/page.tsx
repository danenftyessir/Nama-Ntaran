'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
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
} from 'recharts';

export default function Home() {
  const heroRef = useRef(null);
  const whatsPokeRef = useRef(null);
  const chartRef = useRef(null);
  const contentRef = useRef(null);
  const tableRef = useRef(null);

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

  // data untuk chart status alokasi
  const chartData = [
    { month: 'Jan', alokasi: 180, distribusi: 165 },
    { month: 'Feb', alokasi: 220, distribusi: 200 },
    { month: 'Mar', alokasi: 260, distribusi: 235 },
    { month: 'Apr', alokasi: 240, distribusi: 220 },
    { month: 'Mei', alokasi: 280, distribusi: 250 },
    { month: 'Jun', alokasi: 300, distribusi: 280 },
  ];

  // data untuk tabel sekolah prioritas
  const prioritySchools = [
    {
      nama: 'SDN Bukit Batin 1',
      kota: 'Jakarta',
      anggaran: 'Rp 1.5 M',
      status: 'Aktif',
      statusColor: 'text-green-600 bg-green-50',
    },
    {
      nama: 'SMPN Harapan Bangsa',
      kota: 'Surabaya',
      anggaran: 'Rp 1.2 M',
      status: 'Aktif',
      statusColor: 'text-green-600 bg-green-50',
    },
    {
      nama: 'SMAN Cerdas Mandiri',
      kota: 'Bandung',
      anggaran: 'Rp 1.8 M',
      status: 'Aktif',
      statusColor: 'text-green-600 bg-green-50',
    },
    {
      nama: 'SDIT Cahaya Ilmu',
      kota: 'Yogyakarta',
      anggaran: 'Rp 1.0 M',
      status: 'Aktif',
      statusColor: 'text-green-600 bg-green-50',
    },
    {
      nama: 'SMP Bhinneka Tunggal',
      kota: 'Medan',
      anggaran: 'Rp 1.1 M',
      status: 'Aktif',
      statusColor: 'text-green-600 bg-green-50',
    },
    {
      nama: 'SMK Teknologi Maju',
      kota: 'Semarang',
      anggaran: 'Rp 1.4 M',
      status: 'Selesai',
      statusColor: 'text-blue-600 bg-blue-50',
    },
  ];

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

  return (
    <div className="min-h-screen bg-white">
      <Navbar role="public" />

      {/* hero section */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* text content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }}
              className="space-y-6"
            >
              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                Transparansi Dan Program Distribusi Pangan
              </motion.h1>
              <motion.p
                className="text-lg text-gray-600 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                MBG berkomitmen untuk memastikan bahwa setiap donasi mencapai
                tujuan yang diinginkan, memberdayakan komunitas dan memberikan
                nutrisi penting kepada mereka yang paling membutuhkannya.
              </motion.p>
            </motion.div>

            {/* hero image dengan parallax */}
            <motion.div
              className="relative"
              style={{ y: heroImageY, opacity: heroImageOpacity }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/aesthetic view.jpg"
                  alt="Program Distribusi Pangan"
                  className="w-full h-[400px] md:h-[500px] object-cover transform hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent" />
              </div>
              {/* floating decoration */}
              <motion.div
                className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full blur-3xl opacity-50"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </div>
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
              What's Poke
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
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
            </motion.div>
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
                Lorem
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <h3 className="text-2xl font-bold text-gray-900 pt-6">Lorem</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco
                laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                irure dolor in reprehenderit in voluptate velit esse cillum
                dolore eu fugiat nulla pariatur.
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
                        variants={itemVariants}
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
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold">MBG</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                © 2025 MBG. Semua hak dilindungi undang-undang.
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
                    Kara
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
