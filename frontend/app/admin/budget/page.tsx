'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Sparkles,
  Download,
  MapPin,
  Users,
  Activity,
  Target,
} from 'lucide-react';
import api from '@/lib/api';

// TODO: Integrasi dengan backend AI service untuk budget optimization
// TODO: Implementasi actual API call ke AI model untuk recommendation
// TODO: Tambahkan fitur save/load optimization scenarios
// TODO: Implementasi comparison mode untuk compare multiple scenarios
// TODO: Tambahkan visualization chart (pie chart, bar chart) untuk budget allocation
// TODO: Implementasi real-time calculation saat input budget berubah
// TODO: Tambahkan fitur export ke PDF dengan detailed report
// TODO: Implementasi history tracking untuk semua optimization runs

interface BudgetRecommendation {
  province: string;
  currentAllocation: number;
  recommendedAllocation: number;
  reasoning: string;
  expectedImpact: {
    additionalStudents: number;
    stuntingReductionPercent: number;
    efficiencyGain: number;
  };
  confidence: number;
}

export default function BudgetOptimizationPage() {
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasOptimized, setHasOptimized] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
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

  // handle optimization
  const handleOptimize = async () => {
    const budgetValue = parseFloat(totalBudget.replace(/,/g, ''));

    if (isNaN(budgetValue) || budgetValue <= 0) {
      alert('Mohon Masukkan Jumlah Budget Yang Valid');
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await api.post('/api/ai-analytics/optimize-budget', {
        totalBudget: budgetValue,
      });

      setRecommendations(response.data.recommendations || []);
      setHasOptimized(true);
    } catch (error: any) {
      console.error('Optimization error:', error);
      alert(error.response?.data?.error || 'Gagal Melakukan Optimasi Budget');
    } finally {
      setIsOptimizing(false);
    }
  };

  // format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // export to CSV
  const exportToCSV = () => {
    if (recommendations.length === 0) return;

    const headers = ['Provinsi', 'Alokasi Saat Ini', 'Alokasi Rekomendasi', 'Perubahan', 'Siswa Tambahan', 'Reduksi Stunting %', 'Peningkatan Efisiensi', 'Confidence', 'Reasoning'];
    const rows = recommendations.map(rec => [
      rec.province,
      rec.currentAllocation,
      rec.recommendedAllocation,
      rec.recommendedAllocation - rec.currentAllocation,
      rec.expectedImpact.additionalStudents,
      rec.expectedImpact.stuntingReductionPercent.toFixed(2),
      rec.expectedImpact.efficiencyGain.toFixed(2),
      (rec.confidence * 100).toFixed(0) + '%',
      `"${rec.reasoning}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-optimization-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Optimasi Anggaran AI</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Optimalkan Alokasi Anggaran Antar Provinsi Menggunakan Analisis Berbasis AI Untuk Impact Maksimal.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Input Section */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Input Total Budget</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-gray-900 mb-3 font-semibold text-sm">
                Total Budget Tersedia (IDR)
              </label>
              <input
                type="text"
                value={totalBudget}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setTotalBudget(value ? parseInt(value).toLocaleString('id-ID') : '');
                }}
                placeholder="Contoh: 10,000,000,000"
                className="w-full px-6 py-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-2xl font-bold placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-smooth"
              />
              <p className="text-gray-500 mt-2 text-sm">
                Masukkan Total Budget Yang Ingin Anda Alokasikan Ke Seluruh Provinsi
              </p>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !totalBudget}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold text-lg transition-smooth flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOptimizing ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengoptimasi...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Optimasi Dengan AI
                  </>
                )}
              </button>
            </div>
          </div>

          {totalBudget && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <p className="text-blue-600 text-sm font-semibold">Total Budget Yang Akan Dioptimasi:</p>
              <p className="text-gray-900 text-3xl font-bold mt-1">
                {formatCurrency(parseFloat(totalBudget.replace(/,/g, '')))}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Results Section */}
        {hasOptimized && recommendations.length > 0 && (
          <>
            {/* Summary Stats */}
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Hasil Optimasi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Provinces */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Provinsi</p>
                      <p className="text-2xl font-bold text-gray-900 stat-number">{recommendations.length}</p>
                    </div>
                  </div>
                </div>

                {/* Total Students */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Siswa</p>
                      <p className="text-2xl font-bold text-green-600 stat-number">
                        +{recommendations.reduce((sum, rec) => sum + rec.expectedImpact.additionalStudents, 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Avg Stunting Reduction */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Reduksi Stunting</p>
                      <p className="text-2xl font-bold text-purple-600 stat-number">
                        {(recommendations.reduce((sum, rec) => sum + rec.expectedImpact.stuntingReductionPercent, 0) / recommendations.length).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Avg Efficiency */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Efisiensi</p>
                      <p className="text-2xl font-bold text-orange-600 stat-number">
                        {(recommendations.reduce((sum, rec) => sum + rec.expectedImpact.efficiencyGain, 0) / recommendations.length).toFixed(2)}x
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Export Button */}
            <motion.div variants={itemVariants} className="flex justify-end">
              <button
                onClick={exportToCSV}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-smooth flex items-center gap-2 font-semibold text-sm"
              >
                <Download className="w-5 h-5" />
                Export Ke CSV
              </button>
            </motion.div>

            {/* Recommendations Table */}
            <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Rekomendasi Alokasi Budget</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-gray-700 font-semibold pb-4 px-4 text-sm">Provinsi</th>
                      <th className="text-right text-gray-700 font-semibold pb-4 px-4 text-sm">Saat Ini</th>
                      <th className="text-right text-gray-700 font-semibold pb-4 px-4 text-sm">Rekomendasi</th>
                      <th className="text-right text-gray-700 font-semibold pb-4 px-4 text-sm">Perubahan</th>
                      <th className="text-right text-gray-700 font-semibold pb-4 px-4 text-sm">Siswa</th>
                      <th className="text-right text-gray-700 font-semibold pb-4 px-4 text-sm">Stunting ↓</th>
                      <th className="text-center text-gray-700 font-semibold pb-4 px-4 text-sm">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((rec, index) => {
                      const change = rec.recommendedAllocation - rec.currentAllocation;
                      const changePercent = rec.currentAllocation > 0
                        ? ((change / rec.currentAllocation) * 100).toFixed(1)
                        : 'N/A';

                      return (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: shouldReduceMotion ? 0.01 : 0.2,
                            delay: shouldReduceMotion ? 0 : index * 0.05,
                            ease: [0.4, 0, 0.2, 1] as const,
                          }}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-smooth"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <span className="text-gray-900 font-semibold text-sm">{rec.province}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-600 text-sm">
                            {formatCurrency(rec.currentAllocation)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-gray-900 font-bold text-sm">
                              {formatCurrency(rec.recommendedAllocation)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-semibold text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change >= 0 ? '+' : ''}{formatCurrency(change)}
                              {changePercent !== 'N/A' && (
                                <span className="text-xs ml-1">({changePercent}%)</span>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right text-green-600 font-semibold text-sm">
                            +{rec.expectedImpact.additionalStudents.toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-4 text-right text-purple-600 font-semibold text-sm">
                            {rec.expectedImpact.stuntingReductionPercent.toFixed(1)}%
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-block">
                              <div className="w-16 h-16 relative">
                                <svg className="transform -rotate-90 w-16 h-16">
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="#e5e7eb"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={2 * Math.PI * 28}
                                    strokeDashoffset={2 * Math.PI * 28 * (1 - rec.confidence)}
                                    className="text-blue-600"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-bold text-gray-900">
                                    {(rec.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detailed Reasoning */}
              <div className="mt-8 space-y-3">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Penjelasan AI</h4>
                {recommendations.map((rec, index) => (
                  <details key={index} className="group border border-gray-200 rounded-lg">
                    <summary className="cursor-pointer p-4 hover:bg-gray-50 transition-smooth rounded-lg">
                      <span className="text-gray-900 font-semibold text-sm">{rec.province}</span>
                    </summary>
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-600 leading-relaxed text-sm mb-4">{rec.reasoning}</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-green-600 text-xs mb-1 font-semibold">Siswa Tambahan</p>
                          <p className="text-gray-900 font-bold text-lg">
                            +{rec.expectedImpact.additionalStudents.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-purple-600 text-xs mb-1 font-semibold">Reduksi Stunting</p>
                          <p className="text-gray-900 font-bold text-lg">
                            {rec.expectedImpact.stuntingReductionPercent.toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-orange-600 text-xs mb-1 font-semibold">Peningkatan Efisiensi</p>
                          <p className="text-gray-900 font-bold text-lg">
                            {rec.expectedImpact.efficiencyGain.toFixed(2)}x
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Empty State */}
        {!hasOptimized && (
          <motion.div variants={itemVariants} className="bg-purple-50 rounded-xl p-12 text-center border border-purple-200 card-optimized">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Optimasi Budget Berbasis AI</h3>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Masukkan Total Budget Di Atas Dan Biarkan AI Kami Menganalisis Data Provinsi (Tingkat Kemiskinan, Statistik Stunting, Kepadatan Sekolah) Untuk Merekomendasikan Alokasi Optimal Demi Impact Maksimal Pada Nutrisi Anak Dan Pengurangan Stunting.
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div variants={itemVariants} className="text-center py-4">
          <p className="text-sm text-gray-500">
            © 2025 NutriTrack Admin. All Rights Reserved.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
