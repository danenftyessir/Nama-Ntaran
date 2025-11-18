'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { motion, useReducedMotion } from 'framer-motion';
import ModernSidebar from '../../components/layout/ModernSidebar';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import Select from '../../components/ui/Select';
import ImageUpload from '../../components/ui/ImageUpload';
import {
  Settings,
  LayoutDashboard,
  CheckCircle,
  QrCode,
  History,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// TO DO: implementasi API untuk menyimpan data pengaturan ke server
// TO DO: implementasi modal ubah kata sandi
// TO DO: implementasi modal lihat sesi aktif
// TO DO: integrasikan dengan sistem autentikasi dua faktor
// TO DO: tambahkan validasi input form

// komponen untuk section card dengan memo untuk optimasi
const SectionCard = memo(function SectionCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-200 p-6
        transform-gpu will-change-transform
        ${className}
      `}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
});

// komponen untuk toggle item dengan label
const ToggleItem = memo(function ToggleItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
});

// komponen untuk input field
const InputField = memo(function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full px-4 py-3 bg-white border border-gray-200 rounded-xl
          text-gray-900 outline-none
          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
          transition-all duration-200 ease-out
          transform-gpu will-change-transform
        "
      />
    </div>
  );
});

// komponen untuk button aksi
const ActionButton = memo(function ActionButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full px-4 py-3 rounded-xl text-sm font-medium
        transition-all duration-200 ease-out
        transform-gpu will-change-transform
        ${variant === 'primary'
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
        }
      `}
    >
      {children}
    </button>
  );
});

export default function SchoolSettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // state untuk form profil sekolah
  const [schoolProfile, setSchoolProfile] = useState({
    logo: '',
    npsn: '1023456789',
    name: 'SDN 01 Jakarta Pusat',
    address: 'Jl. Merdeka Raya No. 10, Jakarta Pusat, DKI Jakarta, 10110',
    studentCount: '500',
    contactName: 'Bapak Budi Santoso',
    contactEmail: 'budi.santoso@sdn01.sch.id',
    contactPhone: '081234567890',
  });

  // state untuk preferensi notifikasi
  const [notifications, setNotifications] = useState({
    deliveryReminder: true,
    issueUpdate: true,
    paymentStatus: false,
    notificationTime: '08:00',
  });

  // state untuk pengaturan verifikasi
  const [verification, setVerification] = useState({
    defaultVerifier: 'petugas-a',
    requirePhoto: true,
    reminderTime: '30',
  });

  // state untuk keamanan
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
  });

  // redirect jika tidak terautentikasi
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'school') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // navigation items untuk sidebar - sama dengan halaman school lainnya
  const navItems = [
    { label: 'Dashboard', path: '/school', icon: LayoutDashboard },
    { label: 'Verifikasi Pengiriman', path: '/school/verify', icon: CheckCircle },
    { label: 'Verifikasi QR', path: '/school/verify-qr', icon: QrCode },
    { label: 'Riwayat Verifikasi', path: '/school/history', icon: History },
    { label: 'Masalah', path: '/school/issues', icon: AlertTriangle },
    { label: 'Laporan Masalah Baru', path: '/school/issues/new', icon: AlertCircle },
  ];

  // handler untuk update profil sekolah
  const handleProfileChange = useCallback((field: string, value: string | null) => {
    setSchoolProfile(prev => ({ ...prev, [field]: value || '' }));
  }, []);

  // handler untuk simpan perubahan
  const handleSave = useCallback(() => {
    console.log('Menyimpan pengaturan...', {
      schoolProfile,
      notifications,
      verification,
      security,
    });
    alert('Pengaturan berhasil disimpan!');
  }, [schoolProfile, notifications, verification, security]);

  // handler untuk ubah kata sandi
  const handleChangePassword = useCallback(() => {
    alert('Fitur ubah kata sandi akan segera tersedia');
  }, []);

  // handler untuk lihat sesi aktif
  const handleViewSessions = useCallback(() => {
    alert('Fitur lihat sesi aktif akan segera tersedia');
  }, []);

  // handler untuk logout
  const handleLogout = useCallback(() => {
    router.push('/login');
  }, [router]);

  // opsi untuk dropdown waktu notifikasi
  const notificationTimeOptions = [
    { value: '06:00', label: '06:00 WIB' },
    { value: '07:00', label: '07:00 WIB' },
    { value: '08:00', label: '08:00 WIB' },
    { value: '09:00', label: '09:00 WIB' },
    { value: '10:00', label: '10:00 WIB' },
  ];

  // opsi untuk dropdown verifikator default
  const verifierOptions = [
    { value: 'petugas-a', label: 'Petugas Lapangan A' },
    { value: 'petugas-b', label: 'Petugas Lapangan B' },
    { value: 'kepala-sekolah', label: 'Kepala Sekolah' },
    { value: 'wakil-kepala', label: 'Wakil Kepala Sekolah' },
  ];

  // opsi untuk dropdown waktu pengingat
  const reminderTimeOptions = [
    { value: '15', label: '15 menit' },
    { value: '30', label: '30 menit' },
    { value: '60', label: '1 jam' },
    { value: '120', label: '2 jam' },
  ];

  // animasi untuk konten
  const contentAnimation = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
      };

  // loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat Data...</p>
        </div>
      </div>
    );
  }

  // tidak terotorisasi
  if (!user || user.role !== 'school') {
    return null;
  }

  const schoolInfo = {
    name: user.school_name || 'Sekolah',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar */}
      <ModernSidebar
        navItems={navItems}
        userRole="School"
        userName={user.name || 'Kepala Sekolah'}
        userEmail={user.email || 'sekolah@mbg.id'}
        schoolName={schoolInfo.name}
        onLogout={handleLogout}
      />

      {/* konten utama */}
      <main
        className="ml-72 min-h-screen p-8 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        <motion.div {...contentAnimation} className="max-w-6xl mx-auto">
          {/* header halaman */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-600 rounded-xl shadow-md">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Pengaturan Sekolah</h1>
                <p className="text-gray-600 mt-1">
                  Kelola Profil Sekolah, Notifikasi, Verifikasi, Dan Keamanan.
                </p>
              </div>
            </div>
          </div>

          {/* grid layout untuk sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* profil sekolah */}
            <SectionCard
              title="Profil Sekolah"
              subtitle="Perbarui detail informasi sekolah Anda."
            >
              {/* upload logo */}
              <div className="mb-6">
                <ImageUpload
                  value={schoolProfile.logo}
                  onChange={(value) => handleProfileChange('logo', value)}
                  placeholder="Unggah Logo"
                  size="lg"
                />
              </div>

              {/* form fields */}
              <InputField
                label="NPSN"
                value={schoolProfile.npsn}
                onChange={(value) => handleProfileChange('npsn', value)}
              />
              <InputField
                label="Nama Sekolah"
                value={schoolProfile.name}
                onChange={(value) => handleProfileChange('name', value)}
              />
              <InputField
                label="Alamat Lengkap"
                value={schoolProfile.address}
                onChange={(value) => handleProfileChange('address', value)}
              />
              <InputField
                label="Jumlah Siswa"
                value={schoolProfile.studentCount}
                onChange={(value) => handleProfileChange('studentCount', value)}
                type="number"
              />
              <InputField
                label="Nama Kontak"
                value={schoolProfile.contactName}
                onChange={(value) => handleProfileChange('contactName', value)}
              />
              <InputField
                label="Email Kontak"
                value={schoolProfile.contactEmail}
                onChange={(value) => handleProfileChange('contactEmail', value)}
                type="email"
              />
              <InputField
                label="Nomor Telepon Kontak"
                value={schoolProfile.contactPhone}
                onChange={(value) => handleProfileChange('contactPhone', value)}
                type="tel"
              />

              {/* tombol simpan */}
              <button
                onClick={handleSave}
                className="
                  w-full mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl
                  font-medium hover:bg-indigo-700
                  transition-all duration-200 ease-out
                  transform-gpu will-change-transform
                  flex items-center justify-center gap-2
                "
              >
                Simpan Perubahan
              </button>
            </SectionCard>

            {/* kolom kanan */}
            <div className="space-y-6">
              {/* preferensi notifikasi */}
              <SectionCard
                title="Preferensi Notifikasi"
                subtitle="Atur bagaimana Anda ingin menerima notifikasi."
              >
                <div className="space-y-1">
                  <ToggleItem
                    label="Notifikasi Pengingat Pengiriman"
                    checked={notifications.deliveryReminder}
                    onChange={(checked) =>
                      setNotifications(prev => ({ ...prev, deliveryReminder: checked }))
                    }
                  />
                  <ToggleItem
                    label="Pembaruan Masalah"
                    checked={notifications.issueUpdate}
                    onChange={(checked) =>
                      setNotifications(prev => ({ ...prev, issueUpdate: checked }))
                    }
                  />
                  <ToggleItem
                    label="Status Pembayaran"
                    checked={notifications.paymentStatus}
                    onChange={(checked) =>
                      setNotifications(prev => ({ ...prev, paymentStatus: checked }))
                    }
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waktu Notifikasi
                  </label>
                  <Select
                    value={notifications.notificationTime}
                    onChange={(value) =>
                      setNotifications(prev => ({ ...prev, notificationTime: value }))
                    }
                    options={notificationTimeOptions}
                  />
                </div>
              </SectionCard>
            </div>
          </div>

          {/* baris kedua */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* pengaturan verifikasi */}
            <SectionCard
              title="Pengaturan Verifikasi"
              subtitle="Konfigurasi proses verifikasi pengiriman makanan."
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verifikator Default
                  </label>
                  <Select
                    value={verification.defaultVerifier}
                    onChange={(value) =>
                      setVerification(prev => ({ ...prev, defaultVerifier: value }))
                    }
                    options={verifierOptions}
                  />
                </div>

                <ToggleItem
                  label="Wajib Unggah Foto Verifikasi"
                  checked={verification.requirePhoto}
                  onChange={(checked) =>
                    setVerification(prev => ({ ...prev, requirePhoto: checked }))
                  }
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waktu Pengingat Otomatis Sebelum Pengiriman
                  </label>
                  <Select
                    value={verification.reminderTime}
                    onChange={(value) =>
                      setVerification(prev => ({ ...prev, reminderTime: value }))
                    }
                    options={reminderTimeOptions}
                  />
                </div>
              </div>
            </SectionCard>

            {/* keamanan */}
            <SectionCard
              title="Keamanan"
              subtitle="Kelola pengaturan keamanan akun Anda."
            >
              <div className="space-y-3">
                <ActionButton onClick={handleChangePassword}>
                  Ubah Kata Sandi
                </ActionButton>
                <ActionButton onClick={handleViewSessions}>
                  Lihat Sesi Aktif
                </ActionButton>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <ToggleItem
                  label="Autentikasi Dua Faktor"
                  checked={security.twoFactorAuth}
                  onChange={(checked) =>
                    setSecurity(prev => ({ ...prev, twoFactorAuth: checked }))
                  }
                />
              </div>
            </SectionCard>
          </div>

          {/* footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              &copy; 2025 MBG School Verifier. All Rights Reserved.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
