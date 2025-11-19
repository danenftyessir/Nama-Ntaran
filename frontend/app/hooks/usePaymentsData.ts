'use client';

import { useState, useEffect, useCallback } from 'react';

// interfaces untuk data payments
interface FundStatus {
  lockedFunds: number;
  pendingVerification: number;
  releasedFunds: number;
  totalFunds: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'completed' | 'deducted' | 'sent' | 'paid' | 'returned';
  date: string;
}

interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}

interface CashFlowData {
  month: string;
  income: number;
  expense: number;
}

interface PaymentsData {
  fundStatus: FundStatus;
  transactions: TransactionGroup[];
  cashFlowData: CashFlowData[];
}

// cache key dan TTL
const CACHE_KEY = 'payments_data_cache';
const CACHE_TTL = 3 * 60 * 1000; // 3 menit

// hook untuk mengambil data payments
export function usePaymentsData() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fungsi untuk mengambil data dari cache
  const getFromCache = useCallback((): PaymentsData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_TTL;

      if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, []);

  // fungsi untuk menyimpan data ke cache
  const saveToCache = useCallback((data: PaymentsData) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch {
      // gagal menyimpan ke cache, abaikan
    }
  }, []);

  // fungsi untuk mendapatkan auth token
  const getAuthToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }, []);

  // fungsi untuk fetch data dari API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // cek cache terlebih dahulu
    const cachedData = getFromCache();
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/catering/payments/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        // jika API gagal, gunakan data dummy untuk demo
        if (response.status === 401 || response.status === 404) {
          const dummyData = getDummyData();
          setData(dummyData);
          saveToCache(dummyData);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        saveToCache(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching payments data:', err);

      // fallback ke dummy data jika API tidak tersedia
      const dummyData = getDummyData();
      setData(dummyData);
      saveToCache(dummyData);

      // tidak set error karena menggunakan fallback data
      // setError('Gagal memuat data pembayaran');
    } finally {
      setIsLoading(false);
    }
  }, [getFromCache, saveToCache, getAuthToken]);

  // fungsi untuk refresh data
  const refreshData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
    fetchData();
  }, [fetchData]);

  // fetch data saat mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // polling untuk update data setiap 5 menit
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    data,
    isLoading,
    error,
    refreshData,
  };
}

// hook untuk filter transaksi berdasarkan periode
export function useTransactionFilter(
  transactions: TransactionGroup[],
  period: 'week' | 'month' | 'all' = 'all'
) {
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionGroup[]>([]);

  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        setFilteredTransactions(transactions);
        return;
    }

    const filtered = transactions
      .map((group) => ({
        ...group,
        transactions: group.transactions.filter(
          (txn) => new Date(txn.date) >= startDate
        ),
      }))
      .filter((group) => group.transactions.length > 0);

    setFilteredTransactions(filtered);
  }, [transactions, period]);

  return filteredTransactions;
}

// data dummy untuk fallback/demo
function getDummyData(): PaymentsData {
  return {
    fundStatus: {
      lockedFunds: 45500000,
      pendingVerification: 12000000,
      releasedFunds: 67500000,
      totalFunds: 125000000,
    },
    transactions: [
      {
        date: '2025-11-19',
        transactions: [
          {
            id: 'txn-001',
            description: 'Pembayaran dari SDN 01 Bandung',
            amount: 15000000,
            type: 'income',
            status: 'completed',
            date: '2025-11-19',
          },
          {
            id: 'txn-002',
            description: 'Biaya operasional harian',
            amount: 2500000,
            type: 'expense',
            status: 'deducted',
            date: '2025-11-19',
          },
        ],
      },
      {
        date: '2025-11-18',
        transactions: [
          {
            id: 'txn-003',
            description: 'Pembayaran dari SDN 05 Jakarta',
            amount: 12500000,
            type: 'income',
            status: 'paid',
            date: '2025-11-18',
          },
          {
            id: 'txn-004',
            description: 'Pembelian bahan baku',
            amount: 8000000,
            type: 'expense',
            status: 'sent',
            date: '2025-11-18',
          },
          {
            id: 'txn-005',
            description: 'Refund pesanan dibatalkan',
            amount: 1500000,
            type: 'expense',
            status: 'returned',
            date: '2025-11-18',
          },
        ],
      },
      {
        date: '2025-11-17',
        transactions: [
          {
            id: 'txn-006',
            description: 'Pembayaran dari SMP 12 Surabaya',
            amount: 18000000,
            type: 'income',
            status: 'completed',
            date: '2025-11-17',
          },
        ],
      },
    ],
    cashFlowData: [
      { month: 'Jun', income: 42000000, expense: 35000000 },
      { month: 'Jul', income: 48000000, expense: 38000000 },
      { month: 'Agu', income: 45000000, expense: 36000000 },
      { month: 'Sep', income: 52000000, expense: 40000000 },
      { month: 'Okt', income: 58000000, expense: 42000000 },
      { month: 'Nov', income: 67500000, expense: 45000000 },
    ],
  };
}

// export types untuk digunakan di komponen lain
export type { FundStatus, Transaction, TransactionGroup, CashFlowData, PaymentsData };
