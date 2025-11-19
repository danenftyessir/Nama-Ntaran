'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// komponen
import CateringSidebar from '../../components/catering/CateringSidebar';
import CateringFooter from '../../components/catering/CateringFooter';
import FundStatusCards from '../../components/catering/FundStatusCards';
import TransactionHistory from '../../components/catering/TransactionHistory';
import CashFlowChart, { PeriodFilter } from '../../components/catering/CashFlowChart';

// hooks
import { usePaymentsData, CashFlowData } from '../../hooks/usePaymentsData';
import { useSidebarState } from '../../hooks/useCateringDashboard';
import { usePaymentsDataWithSocket } from '../../hooks/usePaymentSocket';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { data, isLoading, error, refreshData } = usePaymentsData();
  const { isCollapsed, setIsCollapsed } = useSidebarState();

  // state untuk period filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('monthly');

  // socket.io untuk realtime updates
  const { isSocketConnected } = usePaymentsDataWithSocket(
    user?.id,
    user?.cateringId,
    refreshData
  );

  // redirect jika tidak authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'catering') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // aggregate data berdasarkan period filter
  const aggregatedCashFlowData = useMemo((): CashFlowData[] => {
    if (!data?.cashFlowData) return [];

    if (periodFilter === 'monthly') {
      return data.cashFlowData;
    }

    if (periodFilter === 'quarterly') {
      // group data per kuartal
      const quarters: { [key: string]: { income: number; expense: number } } = {};

      data.cashFlowData.forEach((item, index) => {
        const quarterIndex = Math.floor(index / 3);
        const quarterName = `Q${quarterIndex + 1}`;

        if (!quarters[quarterName]) {
          quarters[quarterName] = { income: 0, expense: 0 };
        }

        quarters[quarterName].income += item.income;
        quarters[quarterName].expense += item.expense;
      });

      return Object.entries(quarters).map(([month, values]) => ({
        month,
        income: values.income,
        expense: values.expense,
      }));
    }

    if (periodFilter === 'yearly') {
      // aggregate semua data menjadi 1 tahun
      const totals = data.cashFlowData.reduce(
        (acc, item) => ({
          income: acc.income + item.income,
          expense: acc.expense + item.expense,
        }),
        { income: 0, expense: 0 }
      );

      return [
        {
          month: '2025',
          income: totals.income,
          expense: totals.expense,
        },
      ];
    }

    return data.cashFlowData;
  }, [data?.cashFlowData, periodFilter]);

  // animasi untuk page content
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
              Pembayaran
            </h1>
            <p className="text-sm text-gray-500">
              Kelola pembayaran dan pantau arus kas katering Anda
            </p>
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
          ) : data ? (
            <>
              {/* fund status cards */}
              <FundStatusCards data={data.fundStatus} />

              {/* cash flow chart */}
              <CashFlowChart
                data={aggregatedCashFlowData}
                periodFilter={periodFilter}
                onPeriodChange={setPeriodFilter}
              />

              {/* transaction history */}
              <TransactionHistory
                transactions={data.transactions}
                itemsPerPage={5}
              />
            </>
          ) : null}
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
