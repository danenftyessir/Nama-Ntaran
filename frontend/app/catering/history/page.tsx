'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';

// komponen
import CateringSidebar from '../../components/catering/CateringSidebar';
import CateringFooter from '../../components/catering/CateringFooter';
import DeliveryHistoryCard, { DeliveryStatus } from '../../components/catering/DeliveryHistoryCard';

// hooks
import { useSidebarState } from '../../hooks/useCateringDashboard';
import { useHistoryData } from '../../hooks/useHistoryData';

// tipe untuk filter
type MonthFilter = 'all' | 'oktober' | 'september' | 'agustus';
type StatusFilter = 'all' | 'verified' | 'pending' | 'issue';

// interface untuk delivery item
interface DeliveryItem {
  id: string;
  schoolName: string;
  date: string;
  portions: number;
  status: DeliveryStatus;
  imageUrl: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebarState();
  const { data, isLoading, error, refreshData } = useHistoryData();

  // state untuk filter
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // ambil deliveries dari hook data
  const deliveries: DeliveryItem[] = data?.deliveries || [];

  // redirect jika tidak authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'catering') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // filter deliveries berdasarkan bulan dan status
  const filteredDeliveries = useMemo(() => {
    let filtered = deliveries;

    // filter berdasarkan bulan
    if (monthFilter !== 'all') {
      const monthMap: Record<string, number> = {
        oktober: 9, // javascript month adalah 0-indexed
        september: 8,
        agustus: 7,
      };

      const targetMonth = monthMap[monthFilter];
      filtered = filtered.filter((item) => {
        const itemMonth = new Date(item.date).getMonth();
        return itemMonth === targetMonth;
      });
    }

    // filter berdasarkan status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    return filtered;
  }, [deliveries, monthFilter, statusFilter]);

  // opsi untuk filter bulan
  const monthOptions: { id: MonthFilter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'oktober', label: 'Oktober' },
    { id: 'september', label: 'September' },
    { id: 'agustus', label: 'Agustus' },
  ];

  // opsi untuk filter status
  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'verified', label: 'Terverifikasi' },
    { id: 'pending', label: 'Menunggu' },
    { id: 'issue', label: 'Bermasalah' },
  ];

  // handler untuk klik card
  const handleCardClick = (id: string) => {
    router.push(`/catering/deliveries/${id}`);
  };

  // animasi variants untuk page container
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* sidebar */}
      <CateringSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        badges={[
          { path: '/catering/schedule', count: 3 },
        ]}
      />

      {/* main content */}
      <main
        className={`flex-1 transition-all duration-300 ease-out ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
        style={{
          willChange: 'margin-left',
        }}
      >
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto px-6 py-8"
          style={{
            willChange: 'opacity',
            transform: 'translateZ(0)',
          }}
        >
          {/* page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Riwayat Pengiriman
            </h1>
          </div>

          {/* filter section */}
          <div className="flex items-center justify-between mb-6">
            {/* month filter buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 mr-2">Bulan:</span>
              {monthOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setMonthFilter(option.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    monthFilter === option.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* status filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
              >
                Status: {statusOptions.find((o) => o.id === statusFilter)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showStatusDropdown && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                  {statusOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setStatusFilter(option.id);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        statusFilter === option.id
                          ? 'text-indigo-600 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* loading state untuk data */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            /* deliveries grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredDeliveries.length === 0 ? (
                <div className="col-span-full py-12 text-center">
                  <p className="text-sm text-gray-500">Tidak ada riwayat pengiriman ditemukan</p>
                </div>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <div key={delivery.id}>
                    <DeliveryHistoryCard
                      id={delivery.id}
                      schoolName={delivery.schoolName}
                      date={delivery.date}
                      portions={delivery.portions}
                      status={delivery.status}
                      imageUrl={delivery.imageUrl}
                      onClick={() => handleCardClick(delivery.id)}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* footer */}
        <CateringFooter
          supportUrl="mailto:support@namantaran.id"
          socialLinks={{
            instagram: 'https://instagram.com/namantaran',
            twitter: 'https://twitter.com/namantaran',
            linkedin: 'https://linkedin.com/company/namantaran',
          }}
        />
      </main>
    </div>
  );
}
