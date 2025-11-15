'use client';

import Navbar from '../components/layout/Navbar';
import GlassPanel from '../components/ui/GlassPanel';
import { MapPin, TrendingUp, AlertCircle, School } from 'lucide-react';

export default function PetaPrioritasPage() {
  return (
    <div className="min-h-screen bg-gray-950 blockchain-mesh">
      <Navbar role="public" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 fade-in">
          <div className="inline-block mb-4 px-4 py-2 glass-subtle rounded-full">
            <span className="text-sm font-semibold text-white">
              AI-Powered Prioritization
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-white">
            Peta Prioritas AI
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Visualisasi prioritas distribusi berdasarkan analisis AI dari data stunting, kemiskinan, dan kerawanan pangan
          </p>
        </div>

        {/* Main Map Section */}
        <GlassPanel className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Peta Interaktif Indonesia
              </h2>
              <p className="text-gray-600">
                Klik wilayah untuk melihat detail scoring prioritas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600">Prioritas Tinggi</span>
              <div className="w-3 h-3 rounded-full bg-yellow-500 ml-4"></div>
              <span className="text-sm text-gray-600">Prioritas Sedang</span>
              <div className="w-3 h-3 rounded-full bg-green-500 ml-4"></div>
              <span className="text-sm text-gray-600">Prioritas Rendah</span>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="relative h-[500px] rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-dashed border-gray-300">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-700 font-semibold text-lg mb-2">
                  Peta Interaktif Indonesia
                </p>
                <p className="text-sm text-gray-600">
                  Integrasi dengan Leaflet.js & AI Model sedang dalam pengembangan
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassPanel hover>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600 mb-1">Prioritas Tinggi</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">342</p>
                <p className="text-sm text-gray-600">Sekolah membutuhkan perhatian segera</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <School className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600 mb-1">Prioritas Sedang</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">567</p>
                <p className="text-sm text-gray-600">Sekolah dalam monitoring aktif</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600 mb-1">Prioritas Rendah</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">325</p>
                <p className="text-sm text-gray-600">Sekolah dengan kondisi stabil</p>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* AI Scoring Factors */}
        <GlassPanel>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Faktor Penilaian AI
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Data Stunting</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Prevalensi stunting tinggi</span>
                  <span className="text-sm font-semibold text-red-600">Bobot: 35%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tingkat Kemiskinan</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Indeks kemiskinan wilayah</span>
                  <span className="text-sm font-semibold text-orange-600">Bobot: 30%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Kerawanan Pangan</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Food security index</span>
                  <span className="text-sm font-semibold text-yellow-600">Bobot: 25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Aksesibilitas</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Jarak ke penyedia katering</span>
                  <span className="text-sm font-semibold text-blue-600">Bobot: 10%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
