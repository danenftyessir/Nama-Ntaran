'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import CateringSidebar from '../components/catering/CateringSidebar';
import HeroBanner from '../components/catering/HeroBanner';
import StatsSection from '../components/catering/StatsSection';
import QuickActions from '../components/catering/QuickActions';
import UpcomingDeliveries from '../components/catering/UpcomingDeliveries';
import CateringFooter from '../components/catering/CateringFooter';

// TO DO: integrasi dengan API untuk mendapatkan data dashboard real-time
// TO DO: implementasi real-time updates menggunakan websocket
// TO DO: implementasi error handling dan loading states
// TO DO: implementasi caching dengan react-query atau SWR

export default function CateringDashboard() {
  // state untuk sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // data statistik - TO DO: ambil dari API
  const stats = useMemo(() => ({
    lockedFunds: '25.500.000',
    lockedFundsDescription: 'Dana yang belum dicairkan untuk program',
    todayDistribution: {
      schools: 3,
      portions: 1200,
    },
    highlightedDates: [18, 20],
  }), []);

  // data jadwal pengiriman - TO DO: ambil dari API
  const upcomingDeliveries = useMemo(() => [
    {
      id: '1',
      schoolName: 'SDN 01 Merdeka',
      time: '09:00 WIB',
      portions: 350,
    },
    {
      id: '2',
      schoolName: 'SMP Harapan Bangsa',
      time: '11:30 WIB',
      portions: 420,
    },
    {
      id: '3',
      schoolName: 'SMA Persatuan',
      time: '14:00 WIB',
      portions: 500,
    },
    {
      id: '4',
      schoolName: 'TK Ceria',
      time: '08:30 WIB',
      portions: 200,
    },
  ], []);

  // handler untuk toggle sidebar
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar navigation */}
      <CateringSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* main content area */}
      <motion.main
        initial={false}
        animate={isSidebarCollapsed ? 'collapsed' : 'expanded'}
        variants={mainContentVariants}
        className="min-h-screen"
        style={{
          willChange: 'margin-left',
          transform: 'translateZ(0)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* hero banner section */}
          <HeroBanner
            title="Manajemen Nutrisi Lebih Mudah"
            subtitle="Pantau program makanan bergizi Anda dengan efisien."
            imageSrc="/aesthetic view.jpg"
          />

          {/* stats section - dana terkunci, distribusi, kalender */}
          <StatsSection
            lockedFunds={stats.lockedFunds}
            lockedFundsDescription={stats.lockedFundsDescription}
            todayDistribution={stats.todayDistribution}
            highlightedDates={stats.highlightedDates}
          />

          {/* quick actions */}
          <QuickActions />

          {/* upcoming deliveries list */}
          <UpcomingDeliveries
            title="Jadwal Mendatang"
            subtitle="Pengiriman Selanjutnya"
            deliveries={upcomingDeliveries}
          />

          {/* footer */}
          <CateringFooter />
        </div>
      </motion.main>
    </div>
  );
}
