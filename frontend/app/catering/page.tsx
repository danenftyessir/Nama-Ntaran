'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CateringSidebar from '../components/catering/CateringSidebar';
import HeroBanner from '../components/catering/HeroBanner';
import StatsSection from '../components/catering/StatsSection';
import QuickActions from '../components/catering/QuickActions';
import UpcomingDeliveries from '../components/catering/UpcomingDeliveries';
import CateringFooter from '../components/catering/CateringFooter';
import UploadMenuModal from '../components/catering/UploadMenuModal';
import { useCateringDashboard, useSidebarState } from '../hooks/useCateringDashboard';
import { Calendar, Upload, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';

export default function CateringDashboard() {
  // hook untuk data dashboard dengan caching dan error handling
  const { stats, deliveries, badges, isLoading, error, refetch } = useCateringDashboard();

  // hook untuk sidebar state dengan local storage persistence
  const { isCollapsed, toggleCollapsed, isInitialized } = useSidebarState();

  // state untuk modal upload menu
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // handler untuk upload menu
  const handleUploadMenu = useCallback(async (files: File[]) => {
    // simulasi upload ke API
    console.log('Uploading files:', files);
    // const formData = new FormData();
    // files.forEach(file => formData.append('files', file));
    // await fetch('/api/catering/menu/upload', { method: 'POST', body: formData });
  }, []);

  // quick actions dengan modal integration
  const quickActions = [
    {
      id: 'schedule',
      label: 'Lihat Jadwal',
      icon: Calendar,
      path: '/catering/schedule',
    },
    {
      id: 'upload',
      label: 'Upload Menu',
      icon: Upload,
      onClick: () => setIsUploadModalOpen(true),
    },
    {
      id: 'payment',
      label: 'Lihat Pembayaran',
      icon: CreditCard,
      path: '/catering/payments',
    },
  ];

  // animasi variants untuk konten utama dengan GPU acceleration
  const mainContentVariants = {
    expanded: {
      marginLeft: 256,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    collapsed: {
      marginLeft: 80,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // preload gambar untuk performa
  useEffect(() => {
    const images = ['/aesthetic view.jpg', '/MBG-removebg-preview.png'];
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-6">
      {/* hero skeleton */}
      <div className="h-64 bg-gray-200 rounded-2xl" />

      {/* stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* quick actions skeleton */}
      <div className="flex gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded-lg" />
        ))}
      </div>

      {/* deliveries skeleton */}
      <div className="bg-gray-200 rounded-xl h-64" />
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

  // tunggu sampai sidebar state ter-inisialisasi
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar navigation */}
      <CateringSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapsed}
        badges={badges}
      />

      {/* main content area */}
      <motion.main
        initial={false}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={mainContentVariants}
        className="min-h-screen"
        style={{
          willChange: 'margin-left',
          transform: 'translateZ(0)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
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
            ) : error && !stats ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorDisplay />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* hero banner section */}
                <HeroBanner
                  title="Manajemen Nutrisi Lebih Mudah"
                  subtitle="Pantau program makanan bergizi Anda dengan efisien."
                  imageSrc="/aesthetic view.jpg"
                />

                {/* stats section - dana terkunci, distribusi, kalender */}
                {stats && (
                  <StatsSection
                    lockedFunds={stats.lockedFunds}
                    lockedFundsDescription={stats.lockedFundsDescription}
                    todayDistribution={stats.todayDistribution}
                    highlightedDates={stats.highlightedDates}
                  />
                )}

                {/* quick actions */}
                <QuickActions actions={quickActions} />

                {/* upcoming deliveries list */}
                <UpcomingDeliveries
                  title="Jadwal Mendatang"
                  subtitle="Pengiriman Selanjutnya"
                  deliveries={deliveries}
                  showFilters={true}
                />

                {/* footer */}
                <CateringFooter />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>

      {/* modal upload menu */}
      <UploadMenuModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadMenu}
      />
    </div>
  );
}
