'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, ChevronDown, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    namaLengkap: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // validasi password
    if (formData.password !== formData.confirmPassword) {
      setError('Kata sandi tidak cocok');
      return;
    }

    // validasi minimal 8 karakter
    if (formData.password.length < 8) {
      setError('Kata sandi minimal 8 karakter');
      return;
    }

    setLoading(true);

    try {
      // TODO: implementasi API register
      const { authApi, setToken, setUser } = await import('@/lib/api');
      const data = await authApi.register(
        formData.email,
        formData.password,
        formData.role as any,
        formData.namaLengkap
      );

      // auto login setelah registrasi
      setToken(data.token);
      setUser(data.user);

      // redirect berdasarkan role
      switch (formData.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'school':
          router.push('/school');
          break;
        case 'catering':
          router.push('/catering');
          break;
        default:
          router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // variasi animasi untuk form elements
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* navbar */}
      <motion.nav
        className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* tombol back */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </motion.div>
              <span className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                Back
              </span>
            </Link>

            {/* link ke login */}
            <Link
              href="/login"
              className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
            >
              Login
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* content wrapper */}
      <div className="flex-1 flex flex-row-reverse">
        {/* section kanan - form register */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          className="w-full max-w-md"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* logo dan heading */}
          <motion.div className="mb-8" variants={itemVariants}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                MBG Platform
              </h1>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Buat Akun Baru
            </h2>
            <p className="text-gray-600">
              Masukkan Detail Anda Di Bawah Ini Untuk Membuat Akun Baru.
            </p>
          </motion.div>

          {/* form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-5"
            variants={containerVariants}
          >
            {/* error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* nama lengkap */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="namaLengkap"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  id="namaLengkap"
                  type="text"
                  required
                  value={formData.namaLengkap}
                  onChange={(e) =>
                    setFormData({ ...formData, namaLengkap: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 gpu-accelerate placeholder:text-gray-400 placeholder:font-normal relative z-0"
                  placeholder="Nama Lengkap Anda"
                />
              </div>
            </motion.div>

            {/* email */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 gpu-accelerate placeholder:text-gray-400 placeholder:font-normal relative z-0"
                  placeholder="email@example.com"
                />
              </div>
            </motion.div>

            {/* kata sandi */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 gpu-accelerate placeholder:text-gray-400 placeholder:font-normal relative z-0"
                  placeholder="Minimal 8 karakter"
                />
              </div>
            </motion.div>

            {/* konfirmasi kata sandi */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 gpu-accelerate placeholder:text-gray-400 placeholder:font-normal relative z-0"
                  placeholder="Masukkan ulang kata sandi Anda"
                />
              </div>
            </motion.div>

            {/* peran pengguna */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Peran Pengguna
              </label>
              <div className="relative">
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white transition-all duration-200 gpu-accelerate cursor-pointer ${
                    formData.role === ''
                      ? 'text-gray-400 font-normal'
                      : 'text-gray-900 font-semibold'
                  }`}
                  required
                >
                  <option value="" disabled className="text-gray-400 font-normal">
                    Pilih Peran Anda
                  </option>
                  <option value="pemerintah" className="text-gray-900 font-semibold">
                    Pemerintah
                  </option>
                  <option value="admin" className="text-gray-900 font-semibold">
                    Admin
                  </option>
                  <option value="school" className="text-gray-900 font-semibold">
                    Sekolah
                  </option>
                  <option value="catering" className="text-gray-900 font-semibold">
                    Katering
                  </option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </motion.div>

            {/* tombol buat akun */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 gpu-accelerate"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Buat Akun
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* link ke login */}
            <motion.div
              variants={itemVariants}
              className="text-center pt-2"
            >
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Sudah Punya Akun? Masuk
              </Link>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>

      {/* section kiri - gambar otak-otak */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-800 via-gray-900 to-black items-center justify-center relative overflow-hidden"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }}
      >
        {/* overlay gelap untuk efek cinematic */}
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* gambar otak-otak dengan parallax */}
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <img
            src="/otak-otak.jpg"
            alt="Otak-otak"
            className="w-full h-full object-cover opacity-80"
            loading="eager"
          />
        </motion.div>

        {/* gradient overlay untuk depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10" />

        {/* vignette effect */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/50 z-10" />
      </motion.div>
      </div>
    </div>
  );
}
