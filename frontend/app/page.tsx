'use client';

import { useState } from 'react';
import Navbar from './components/layout/Navbar';
import GlassPanel from './components/ui/GlassPanel';
import ModernStatCard from './components/ui/ModernStatCard';
import DonutChart from './components/charts/DonutChart';
import BarChart from './components/charts/BarChart';
import LineChart from './components/charts/LineChart';
import {
  DollarSign,
  UtensilsCrossed,
  School,
  Shield,
  CheckCircle,
  MapPin,
  Search,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const stats = {
    totalFunds: 'Rp 500 M',
    allocated: 'Rp 350 M',
    disbursed: 'Rp 280 M',
    schools: '1,234',
  };

  const fundDistribution = [
    { name: 'Dikunci (Escrow)', value: 70, color: '#3b82f6' },
    { name: 'Dicairkan', value: 210, color: '#10b981' },
    { name: 'Tersedia', value: 150, color: '#6b7280' },
  ];

  const regionalData = [
    { name: 'Jawa Barat', schools: 245, portions: 24500 },
    { name: 'DKI Jakarta', schools: 189, portions: 18900 },
    { name: 'Jawa Timur', schools: 234, portions: 23400 },
    { name: 'Sumatera Utara', schools: 123, portions: 12300 },
    { name: 'Sulawesi Selatan', schools: 98, portions: 9800 },
  ];

  const monthlyTrend = [
    { name: 'Jan', disbursed: 45, portions: 450000 },
    { name: 'Feb', disbursed: 52, portions: 520000 },
    { name: 'Mar', disbursed: 61, portions: 610000 },
    { name: 'Apr', disbursed: 70, portions: 700000 },
    { name: 'Mei', disbursed: 85, portions: 850000 },
    { name: 'Jun', disbursed: 95, portions: 950000 },
    { name: 'Jul', disbursed: 108, portions: 1080000 },
  ];

  const recentTransactions = [
    {
      id: 1,
      type: 'released',
      school: 'SDN 01 Bandung',
      catering: 'Katering Sehat Mandiri',
      amount: 'Rp 15.000.000',
      time: '2 menit lalu',
      txHash: '0x7f9f...a3b2',
    },
    {
      id: 2,
      type: 'verified',
      school: 'SDN 05 Jakarta',
      catering: null,
      amount: '100 porsi',
      time: '15 menit lalu',
      txHash: null,
    },
    {
      id: 3,
      type: 'locked',
      school: 'SDN 08 Surabaya',
      catering: 'Boga Rasa',
      amount: 'Rp 12.500.000',
      time: '1 jam lalu',
      txHash: '0x3d2f...c9e1',
    },
    {
      id: 4,
      type: 'issue',
      school: 'SDN 12 Medan',
      catering: 'Gizi Nusantara',
      amount: null,
      time: '3 jam lalu',
      txHash: null,
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="min-h-screen bg-gray-950 blockchain-mesh">
      <div className="relative z-10">
        <Navbar role="public" />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden z-10">
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="text-center fade-in">
            <div className="inline-block mb-4 px-4 py-2 glass-subtle rounded-full">
              <span className="text-sm font-semibold text-white">
                Powered by AI & Blockchain
              </span>
            </div>
            <h1 className="text-7xl font-bold mb-4 text-white drop-shadow-lg">
              MBG
            </h1>
            <p className="text-3xl mb-3 font-semibold text-white">
              Makan Bergizi Gabocor
            </p>
            <p className="text-white/90 max-w-2xl mx-auto text-lg mb-8">
              Platform transparansi berbasis AI dan Blockchain untuk program Makan
              Bergizi Gratis. Memastikan setiap rupiah sampai kepada yang berhak.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto scale-in">
              <div className="glass rounded-2xl p-2 flex items-center gap-2 shadow-modern-lg">
                <Search className="w-6 h-6 text-gray-400 ml-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari sekolah berdasarkan nama atau NPSN..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 px-2 py-3"
                />
                <button
                  type="submit"
                  className="btn-modern bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-smooth"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 relative z-10">
        {/* Statistics */}
        <section className="fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModernStatCard
              title="Total Anggaran"
              value={stats.totalFunds}
              icon={DollarSign}
              gradient="bg-blue-600"
              trend={{ value: 12, isPositive: true }}
              subtitle="Total alokasi program"
            />
            <ModernStatCard
              title="Dana Dialokasikan"
              value={stats.allocated}
              icon={Shield}
              gradient="bg-purple-600"
              trend={{ value: 8, isPositive: true }}
              subtitle="Terkunci di escrow"
            />
            <ModernStatCard
              title="Dana Dicairkan"
              value={stats.disbursed}
              icon={CheckCircle}
              gradient="bg-green-600"
              trend={{ value: 15, isPositive: true }}
              subtitle="Berhasil disalurkan"
            />
            <ModernStatCard
              title="Sekolah Terlayani"
              value={stats.schools}
              icon={School}
              gradient="bg-orange-600"
              trend={{ value: 5, isPositive: true }}
              subtitle="Di seluruh Indonesia"
            />
          </div>
        </section>

        {/* Map & Live Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority Map */}
          <div className="lg:col-span-2">
            <GlassPanel className="h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Peta Prioritas AI
                  </h2>
                  <p className="text-gray-300">
                    Visualisasi scoring berbasis data real-time
                  </p>
                </div>
                <button className="px-4 py-2 glass-subtle rounded-xl text-sm font-semibold text-white hover:shadow-modern transition-smooth">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Peta Lengkap
                </button>
              </div>

              {/* Map Placeholder */}
              <div className="relative h-96 rounded-xl overflow-hidden bg-gradient-bg-3/20 border-2 border-dashed border-gray-600">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-white font-semibold">
                      Peta Interaktif Prioritas
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Integrasi Leaflet.js sedang dalam pengembangan
                    </p>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Live Blockchain Feed */}
          <div className="lg:col-span-1">
            <GlassPanel className="h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Live Feed
                  </h2>
                  <p className="text-sm text-gray-300">Blockchain real-time</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-600 font-semibold">
                    LIVE
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="glass-subtle rounded-xl p-3 hover:shadow-modern transition-smooth cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          tx.type === 'released'
                            ? 'bg-green-100'
                            : tx.type === 'verified'
                            ? 'bg-blue-100'
                            : tx.type === 'locked'
                            ? 'bg-yellow-100'
                            : 'bg-red-100'
                        }`}
                      >
                        {tx.type === 'released' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : tx.type === 'verified' ? (
                          <Shield className="w-4 h-4 text-blue-600" />
                        ) : tx.type === 'locked' ? (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {tx.school}
                        </p>
                        {tx.catering && (
                          <p className="text-xs text-gray-300 truncate">
                            {tx.catering}
                          </p>
                        )}
                        {tx.amount && (
                          <p className="text-xs font-semibold text-blue-400 mt-1">
                            {tx.amount}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {tx.time}
                          </span>
                          {tx.txHash && (
                            <>
                              <span className="text-xs text-gray-500">•</span>
                              <button className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1">
                                {tx.txHash}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* Charts Section */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Analisis & Insights
            </h2>
            <p className="text-gray-300">
              Data-driven transparency dengan AI analytics
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GlassPanel>
              <DonutChart
                data={fundDistribution}
                title="Distribusi Dana (Juta Rupiah)"
                centerLabel="Total"
                centerValue="430M"
              />
            </GlassPanel>

            <GlassPanel>
              <BarChart
                data={regionalData}
                bars={[
                  { dataKey: 'schools', name: 'Jumlah Sekolah', color: '#3b82f6' },
                  { dataKey: 'portions', name: 'Porsi Terdistribusi', color: '#10b981' },
                ]}
                title="Distribusi per Wilayah"
                height={300}
              />
            </GlassPanel>
          </div>

          <GlassPanel>
            <LineChart
              data={monthlyTrend}
              lines={[
                {
                  dataKey: 'disbursed',
                  name: 'Dana Dicairkan (Juta Rp)',
                  color: '#3b82f6',
                  strokeWidth: 3,
                },
                {
                  dataKey: 'portions',
                  name: 'Porsi Makanan',
                  color: '#10b981',
                  strokeWidth: 3,
                },
              ]}
              title="Trend Pencairan Dana & Distribusi (7 Bulan)"
              height={350}
              showArea={true}
            />
          </GlassPanel>
        </section>

        {/* How It Works */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-2">
              Cara Kerja MBG
            </h2>
            <p className="text-gray-300">
              5 langkah transparansi dengan AI & Blockchain
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '1',
                title: 'AI Scoring',
                desc: 'Analisis data prioritas',
                icon: Activity,
                color: 'bg-blue-600',
              },
              {
                step: '2',
                title: 'Dana Dikunci',
                desc: 'Escrow smart contract',
                icon: Shield,
                color: 'bg-purple-600',
              },
              {
                step: '3',
                title: 'Pengiriman',
                desc: 'Katering mengirim makanan',
                icon: UtensilsCrossed,
                color: 'bg-orange-600',
              },
              {
                step: '4',
                title: 'Verifikasi',
                desc: 'Sekolah konfirmasi',
                icon: School,
                color: 'bg-green-600',
              },
              {
                step: '5',
                title: 'Pencairan',
                desc: 'Auto-transfer blockchain',
                icon: CheckCircle,
                color: 'bg-cyan-600',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <GlassPanel
                  key={item.step}
                  hover
                  className="text-center group"
                >
                  <div
                    className={`w-16 h-16 ${item.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-modern group-hover:shadow-glow transition-smooth`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="inline-block px-3 py-1 glass-subtle rounded-full mb-3">
                    <span className="text-xs font-bold text-white">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-300">{item.desc}</p>
                </GlassPanel>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <GlassPanel className="!p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 gradient-bg-1 opacity-10"></div>
            <div className="relative z-10">
              <Shield className="w-16 h-16 mx-auto mb-6 text-blue-400 pulse-glow" />
              <h2 className="text-4xl font-bold text-white mb-4">
                Transparansi Penuh, Akuntabilitas Nyata
              </h2>
              <p className="text-gray-300 mb-8 max-w-3xl mx-auto text-lg">
                Setiap transaksi tercatat di blockchain. Setiap keputusan didukung
                AI. Setiap rupiah dapat dilacak. Mari bersama wujudkan program gizi
                sekolah yang benar-benar sampai ke anak-anak.
              </p>
              <div className="flex gap-4 justify-center">
                <button className="btn-modern bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 shadow-modern">
                  Lihat Dokumentasi
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="btn-modern glass px-8 py-4 rounded-xl font-semibold text-white shadow-modern hover:bg-white/10">
                  Jelajahi Data
                </button>
              </div>
            </div>
          </GlassPanel>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative overflow-hidden mt-20 bg-gray-900 text-white py-12 z-10">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-2xl mb-2">MBG</h3>
              <p className="text-sm font-semibold mb-2">
                Makan Bergizi Gabocor
              </p>
              <p className="text-gray-400 text-sm">
                Platform transparansi berbasis AI & Blockchain
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Fitur</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>AI Priority Scoring</li>
                <li>Blockchain Escrow</li>
                <li>Real-time Monitoring</li>
                <li>Transparent Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Untuk</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Pemerintah Daerah</li>
                <li>Sekolah</li>
                <li>Mitra Katering</li>
                <li>Masyarakat Umum</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Teknologi</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Next.js & React</li>
                <li>Solidity Smart Contracts</li>
                <li>Polygon Network</li>
                <li>PostgreSQL</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 MBG. Built with transparency in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
