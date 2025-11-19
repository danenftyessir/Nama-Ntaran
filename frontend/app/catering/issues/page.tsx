'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CateringSidebar from '../../components/catering/CateringSidebar';
import CateringFooter from '../../components/catering/CateringFooter';
import ReputationCard from '../../components/catering/ReputationCard';
import OnTimePercentageCard from '../../components/catering/OnTimePercentageCard';
import QualityScoreCard from '../../components/catering/QualityScoreCard';
import IssueListCard from '../../components/catering/IssueListCard';
import QualityTrendChart from '../../components/catering/QualityTrendChart';
import { useIssuesDashboard } from '../../hooks/useIssuesDashboard';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// TODO: implementasi filter untuk daftar masalah berdasarkan severity
// TODO: implementasi pagination untuk daftar masalah
// TODO: tambahkan notifikasi real-time untuk masalah baru

export default function IssuesAndReputationPage() {
  // hook untuk data dashboard issues dengan caching dan error handling
  const { data, isLoading, error, refetch } = useIssuesDashboard();

  // preload gambar untuk performa
  useEffect(() => {
    const images = ['/MBG-removebg-preview.png'];
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-6">
      {/* stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* issue list skeleton */}
      <div className="h-96 bg-gray-200 rounded-2xl" />

      {/* chart skeleton */}
      <div className="h-96 bg-gray-200 rounded-2xl" />
    </div>
  );

  // error component
  const ErrorDisplay = () => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-red-700 mb-2">Terjadi Kesalahan</h3>
      <p className="text-red-600 text-sm mb-4">{error}</p>
      <button
        onClick={refetch}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Coba Lagi</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar navigation */}
      <CateringSidebar badges={[]} />

      {/* main content area */}
      <main className="min-h-screen ml-72" style={{ transform: 'translateZ(0)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Issues & Reputation
            </h1>
            <p className="text-gray-600">
              Pantau Reputasi Bisnis Dan Kelola Masalah Yang Dilaporkan
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingSkeleton />
              </motion.div>
            ) : error && !data ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorDisplay />
              </motion.div>
            ) : data ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* kartu statistik utama */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* reputasi bisnis */}
                  <ReputationCard
                    rating={data.reputation.rating}
                    totalReviews={data.reputation.totalReviews}
                  />

                  {/* persentase tepat waktu */}
                  <OnTimePercentageCard percentage={data.onTimePercentage} />

                  {/* skor kualitas */}
                  <QualityScoreCard score={data.qualityScore} />
                </div>

                {/* daftar masalah yang dilaporkan */}
                <div className="mb-6">
                  <IssueListCard issues={data.issues} />
                </div>

                {/* grafik tren kualitas layanan */}
                <div className="mb-6">
                  <QualityTrendChart data={data.qualityTrend} />
                </div>

                {/* footer */}
                <CateringFooter />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
