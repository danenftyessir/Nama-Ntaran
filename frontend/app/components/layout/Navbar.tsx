'use client';

import Link from 'next/link';
import { Home, School, Truck, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  role?: 'public' | 'school' | 'catering' | 'admin';
}

export default function Navbar({ role = 'public' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicLinks = [
    { href: '/', label: 'Beranda', icon: Home },
    { href: '/peta-prioritas', label: 'Peta Prioritas', icon: Shield },
    { href: '/sekolah', label: 'Cari Sekolah', icon: School },
    { href: '/transparansi', label: 'Transparansi', icon: Shield },
  ];

  const schoolLinks = [
    { href: '/school', label: 'Dashboard', icon: Home },
    { href: '/school/verifikasi', label: 'Verifikasi', icon: Shield },
    { href: '/school/riwayat', label: 'Riwayat', icon: School },
  ];

  const cateringLinks = [
    { href: '/catering', label: 'Dashboard', icon: Home },
    { href: '/catering/jadwal', label: 'Jadwal', icon: Truck },
    { href: '/catering/pembayaran', label: 'Pembayaran', icon: Shield },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/alokasi', label: 'Alokasi', icon: Shield },
    { href: '/admin/monitoring', label: 'Monitoring', icon: School },
  ];

  const links = role === 'school' ? schoolLinks : role === 'catering' ? cateringLinks : role === 'admin' ? adminLinks : publicLinks;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={role === 'public' ? '/' : `/${role}`} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <School className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">NutriChain</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}

            {/* Login & Register Buttons - Only for public role */}
            {role === 'public' && (
              <div className="flex items-center gap-2 ml-4">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}

            {/* Mobile Login & Register - Only for public role */}
            {role === 'public' && (
              <div className="flex flex-col gap-2 px-4 pt-4 border-t border-gray-200 mt-4">
                <Link
                  href="/login"
                  className="px-4 py-3 rounded-lg text-center text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-3 rounded-lg text-center bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
