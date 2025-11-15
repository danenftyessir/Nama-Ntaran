'use client';

import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import GlassPanel from '../components/ui/GlassPanel';
import { Search, School, MapPin, Users, TrendingUp, Award } from 'lucide-react';

export default function SekolahPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const schools = [
    {
      id: 1,
      name: 'SDN 01 Bandung Wetan',
      npsn: '20219123',
      location: 'Bandung, Jawa Barat',
      students: 450,
      priority: 'Tinggi',
      priorityColor: 'red',
      portions: 450,
      status: 'Aktif',
    },
    {
      id: 2,
      name: 'SDN 05 Menteng',
      npsn: '20100234',
      location: 'Jakarta Pusat, DKI Jakarta',
      students: 380,
      priority: 'Sedang',
      priorityColor: 'yellow',
      portions: 380,
      status: 'Aktif',
    },
    {
      id: 3,
      name: 'SDN 08 Gubeng',
      npsn: '20315678',
      location: 'Surabaya, Jawa Timur',
      students: 520,
      priority: 'Tinggi',
      priorityColor: 'red',
      portions: 520,
      status: 'Aktif',
    },
    {
      id: 4,
      name: 'SDN 12 Medan Area',
      npsn: '10210987',
      location: 'Medan, Sumatera Utara',
      students: 340,
      priority: 'Sedang',
      priorityColor: 'yellow',
      portions: 340,
      status: 'Aktif',
    },
    {
      id: 5,
      name: 'SDN 03 Makassar',
      npsn: '40123456',
      location: 'Makassar, Sulawesi Selatan',
      students: 290,
      priority: 'Rendah',
      priorityColor: 'green',
      portions: 290,
      status: 'Aktif',
    },
  ];

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.npsn.includes(searchQuery) ||
    school.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 blockchain-mesh">
      <Navbar role="public" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 fade-in">
          <div className="inline-block mb-4 px-4 py-2 glass-subtle rounded-full">
            <span className="text-sm font-semibold text-white">
              Cari & Lacak Sekolah
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-white">
            Database Sekolah
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Cari sekolah berdasarkan nama, NPSN, atau lokasi untuk melihat status distribusi dan prioritas
          </p>
        </div>

        {/* Search Bar */}
        <GlassPanel className="mb-8">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama sekolah, NPSN, atau lokasi..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-lg"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Cari
            </button>
          </div>
        </GlassPanel>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <School className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sekolah</p>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Siswa</p>
                <p className="text-2xl font-bold text-gray-900">456,789</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Porsi Hari Ini</p>
                <p className="text-2xl font-bold text-gray-900">12,340</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sekolah Aktif</p>
                <p className="text-2xl font-bold text-gray-900">1,180</p>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Schools List */}
        <GlassPanel>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Daftar Sekolah ({filteredSchools.length})
          </h2>

          <div className="space-y-4">
            {filteredSchools.map((school) => (
              <div
                key={school.id}
                className="glass-subtle rounded-xl p-6 hover:shadow-modern transition-smooth cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {school.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          school.priorityColor === 'red'
                            ? 'bg-red-100 text-red-700'
                            : school.priorityColor === 'yellow'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        Prioritas {school.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <School className="w-4 h-4" />
                        <span className="text-sm">NPSN: {school.npsn}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{school.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{school.students} Siswa</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">{school.portions} Porsi/hari</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                      Lihat Detail
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSchools.length === 0 && (
            <div className="text-center py-12">
              <School className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 font-semibold">Tidak ada sekolah ditemukan</p>
              <p className="text-sm text-gray-500 mt-2">Coba gunakan kata kunci lain</p>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
