'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  UserX,
  Clock,
  Loader2,
  Info,
  Users,
  Building2,
  Calendar,
  Target,
  Eye,
  Shield,
  Ban,
  Bell,
} from 'lucide-react';
import api from '@/lib/api';

// TODO: Integrasi dengan backend AI service untuk anomaly detection
// TODO: Implementasi actual API call untuk fetch anomalies data
// TODO: Tambahkan fitur detail view untuk setiap anomaly (modal atau separate page)
// TODO: Implementasi action buttons (Investigate, Block, Dismiss)
// TODO: Tambahkan fitur export anomalies report ke PDF/CSV
// TODO: Implementasi real-time notification untuk new critical anomalies
// TODO: Tambahkan chart/graph untuk anomaly trends over time
// TODO: Implementasi filter berdasarkan date range dan severity
// TODO: Tambahkan pagination atau infinite scroll untuk large datasets
// TODO: Implementasi search functionality untuk cari anomalies by name/keyword

interface Anomaly {
  type: 'collusion' | 'fake_verification' | 'budget_overrun' | 'quality_drop' | 'late_delivery_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suspiciousPatterns: string[];
  involvedParties: {
    schoolId?: number;
    schoolName?: string;
    cateringId?: number;
    cateringName?: string;
  };
  confidenceScore: number;
  recommendation: 'investigate' | 'block' | 'monitor' | 'alert_admin';
  detectedAt: Date;
  dataPoints: any;
}

export default function AnomalyDetectionPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const shouldReduceMotion = useReducedMotion();

  // fetch anomalies data
  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    setIsLoading(true);
    try {
      const [anomaliesResponse, summaryResponse] = await Promise.all([
        api.get('/api/ai-analytics/anomalies'),
        api.get('/api/ai-analytics/summary'),
      ]);
      setAnomalies(anomaliesResponse.anomalies || []);
      setSummary(summaryResponse.summary);
    } catch (error: any) {
      console.error('Fetch anomalies error:', error);
      alert(error.response?.data?.error || 'Gagal Memuat Data Anomali');
    } finally {
      setIsLoading(false);
    }
  };

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

  // get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'high': return 'border-orange-300 bg-orange-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  // get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'collusion': return <UserX className="w-5 h-5" />;
      case 'fake_verification': return <ShieldAlert className="w-5 h-5" />;
      case 'late_delivery_pattern': return <Clock className="w-5 h-5" />;
      case 'quality_drop': return <TrendingDown className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  // get recommendation info
  const getRecommendationInfo = (recommendation: string) => {
    switch (recommendation) {
      case 'block':
        return { icon: <Ban className="w-4 h-4" />, color: 'text-red-600 bg-red-50', label: 'Block' };
      case 'investigate':
        return { icon: <Eye className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50', label: 'Investigate' };
      case 'alert_admin':
        return { icon: <Bell className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-50', label: 'Alert Admin' };
      case 'monitor':
        return { icon: <Shield className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50', label: 'Monitor' };
      default:
        return { icon: <Target className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50', label: 'Unknown' };
    }
  };

  // filter anomalies
  const filteredAnomalies = selectedType === 'all'
    ? anomalies
    : anomalies.filter(a => a.type === selectedType);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Menganalisis Pattern Anomali...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deteksi Anomali AI</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Sistem Deteksi Fraud Dan Monitoring Aktivitas Mencurigakan Berbasis Artificial Intelligence.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Summary */}
        {summary && (
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Anomali</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Anomalies */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Anomali</p>
                    <p className="text-2xl font-bold text-red-600 stat-number">{summary.totalAnomalies}</p>
                  </div>
                </div>
              </div>

              {/* Critical */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Critical</p>
                    <p className="text-2xl font-bold text-red-600 stat-number">{summary.criticalAnomalies}</p>
                  </div>
                </div>
              </div>

              {/* Collusion */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <UserX className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collusion</p>
                    <p className="text-2xl font-bold text-orange-600 stat-number">{summary.anomalyTypes.collusion}</p>
                  </div>
                </div>
              </div>

              {/* Late Deliveries */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 stat-card-hover card-optimized">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Late Delivery</p>
                    <p className="text-2xl font-bold text-yellow-600 stat-number">{summary.anomalyTypes.lateDelivery}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 card-optimized">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filter By Type</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg transition-smooth whitespace-nowrap text-sm font-semibold ${
                selectedType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua ({anomalies.length})
            </button>
            <button
              onClick={() => setSelectedType('collusion')}
              className={`px-4 py-2 rounded-lg transition-smooth whitespace-nowrap text-sm font-semibold ${
                selectedType === 'collusion'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Collusion ({anomalies.filter(a => a.type === 'collusion').length})
            </button>
            <button
              onClick={() => setSelectedType('fake_verification')}
              className={`px-4 py-2 rounded-lg transition-smooth whitespace-nowrap text-sm font-semibold ${
                selectedType === 'fake_verification'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Fake Verification ({anomalies.filter(a => a.type === 'fake_verification').length})
            </button>
            <button
              onClick={() => setSelectedType('late_delivery_pattern')}
              className={`px-4 py-2 rounded-lg transition-smooth whitespace-nowrap text-sm font-semibold ${
                selectedType === 'late_delivery_pattern'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Late Delivery ({anomalies.filter(a => a.type === 'late_delivery_pattern').length})
            </button>
            <button
              onClick={() => setSelectedType('quality_drop')}
              className={`px-4 py-2 rounded-lg transition-smooth whitespace-nowrap text-sm font-semibold ${
                selectedType === 'quality_drop'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quality Drop ({anomalies.filter(a => a.type === 'quality_drop').length})
            </button>
          </div>
        </motion.div>

        {/* Anomalies List */}
        {filteredAnomalies.length === 0 ? (
          <motion.div variants={itemVariants} className="bg-green-50 rounded-xl p-12 text-center border border-green-200 card-optimized">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tidak Ada Anomali Terdeteksi</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {selectedType === 'all'
                ? 'Tidak Ada Aktivitas Mencurigakan Ditemukan Dalam Sistem.'
                : `Tidak Ada Anomali Bertipe "${selectedType}" Yang Terdeteksi.`}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredAnomalies.map((anomaly, index) => {
              const recInfo = getRecommendationInfo(anomaly.recommendation);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.01 : 0.3,
                    delay: shouldReduceMotion ? 0 : index * 0.05,
                    ease: [0.4, 0, 0.2, 1] as const,
                  }}
                  className={`bg-white rounded-xl p-6 border-2 card-optimized ${getSeverityColor(anomaly.severity)}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                        {getTypeIcon(anomaly.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{anomaly.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{anomaly.description}</p>
                      </div>
                    </div>

                    <div className={`px-4 py-2 rounded-full font-bold text-sm flex-shrink-0 ml-4 ${getSeverityBadgeColor(anomaly.severity)}`}>
                      {anomaly.severity.toUpperCase()}
                    </div>
                  </div>

                  {/* Involved Parties */}
                  {(anomaly.involvedParties.schoolName || anomaly.involvedParties.cateringName) && (
                    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600 text-sm font-semibold mb-3">Pihak Terlibat:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {anomaly.involvedParties.schoolName && (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-gray-900 font-semibold text-sm">{anomaly.involvedParties.schoolName}</p>
                              <p className="text-gray-500 text-xs">Sekolah</p>
                            </div>
                          </div>
                        )}
                        {anomaly.involvedParties.cateringName && (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-gray-900 font-semibold text-sm">{anomaly.involvedParties.cateringName}</p>
                              <p className="text-gray-500 text-xs">Katering</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suspicious Patterns */}
                  {anomaly.suspiciousPatterns && anomaly.suspiciousPatterns.length > 0 && (
                    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600 text-sm font-semibold mb-3">Pattern Mencurigakan:</p>
                      <ul className="space-y-2">
                        {anomaly.suspiciousPatterns.map((pattern, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="text-red-600 mt-0.5 font-bold">•</span>
                            <span>{pattern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-500 text-xs">Confidence</p>
                          <p className="text-gray-900 font-bold text-sm">{(anomaly.confidenceScore * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-500 text-xs">Detected</p>
                          <p className="text-gray-900 font-bold text-sm">
                            {new Date(anomaly.detectedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${recInfo.color}`}>
                      {recInfo.icon}
                      <span className="font-bold text-sm">
                        Rekomendasi: {recInfo.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info Panel */}
        <motion.div variants={itemVariants} className="bg-blue-50 rounded-xl p-6 border border-blue-200 card-optimized">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Tentang Deteksi Anomali</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sistem AI kami menganalisis pola transaksi, verifikasi, dan delivery untuk mendeteksi aktivitas mencurigakan secara real-time. Algoritma machine learning memonitor berbagai metrics seperti timing patterns, image similarity, geolocation data, dan behavioral anomalies untuk mengidentifikasi potential fraud atau collusion. Setiap anomaly dilengkapi dengan confidence score dan rekomendasi action yang harus diambil.
              </p>
            </div>
          </div>
        </motion.div>

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
