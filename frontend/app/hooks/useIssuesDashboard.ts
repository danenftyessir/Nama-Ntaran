'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { IssueItem } from '../components/catering/IssueListCard';
import type { TrendData } from '../components/catering/QualityTrendChart';

// tipe data untuk reputation
interface ReputationData {
  rating: number;
  totalReviews: number;
}

// tipe data untuk dashboard issues
interface IssuesDashboardData {
  reputation: ReputationData;
  onTimePercentage: number;
  qualityScore: number;
  issues: IssueItem[];
  qualityTrend: TrendData[];
}

// tipe return dari hook
interface UseIssuesDashboardReturn {
  data: IssuesDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// konfigurasi cache
const CACHE_KEY = 'catering_issues_dashboard_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit dalam milliseconds

// helper untuk cache
const getCache = () => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > CACHE_DURATION;

    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

const setCache = (data: any) => {
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
    // gagal menyimpan cache, abaikan
  }
};

// data default untuk fallback
const defaultData: IssuesDashboardData = {
  reputation: {
    rating: 4.8,
    totalReviews: 1234,
  },
  onTimePercentage: 98.5,
  qualityScore: 9.2,
  issues: [
    {
      id: 1,
      title: 'Keterlambatan Pengiriman',
      description: 'Pengiriman ke SD Harapan Bangsa terlambat 30 menit dari jadwal.',
      severity: 'high',
      status: 'open',
      date: '2024-07-28',
      schoolName: 'SD Harapan Bangsa',
    },
    {
      id: 2,
      title: 'Kualitas Makanan',
      description: 'Ada keluhan mengenai rasa makanan yang terlalu asin di SMP N 1 Jakarta.',
      severity: 'medium',
      status: 'investigating',
      date: '2024-07-27',
      schoolName: 'SMP N 1 Jakarta',
    },
    {
      id: 3,
      title: 'Porsi Kurang',
      description: 'Beberapa siswa di SMA Karya Bangsa melaporkan porsi makanan yang tidak sesuai.',
      severity: 'medium',
      status: 'open',
      date: '2024-07-26',
      schoolName: 'SMA Karya Bangsa',
    },
    {
      id: 4,
      title: 'Kemasan Rusak',
      description: 'Kemasan beberapa kotak makanan rusak saat tiba di TK Pelangi.',
      severity: 'low',
      status: 'resolved',
      date: '2024-07-25',
      schoolName: 'TK Pelangi',
    },
    {
      id: 5,
      title: 'Dokumentasi Tidak Lengkap',
      description: 'Laporan verifikasi pengiriman untuk SMP Merdeka tidak lengkap.',
      severity: 'low',
      status: 'resolved',
      date: '2024-07-24',
      schoolName: 'SMP Merdeka',
    },
  ],
  qualityTrend: [
    { month: 'Januari', score: 96.5 },
    { month: 'Februari', score: 97.2 },
    { month: 'Maret', score: 96.8 },
    { month: 'April', score: 97.5 },
    { month: 'Mei', score: 98.1 },
    { month: 'Juni', score: 97.9 },
  ],
};

export function useIssuesDashboard(): UseIssuesDashboardReturn {
  const [data, setData] = useState<IssuesDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ref untuk mencegah multiple fetch
  const isFetching = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (isFetching.current) return;

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // cek cache terlebih dahulu
      const cachedData = getCache();
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
        isFetching.current = false;
        return;
      }

      // fetch dari API
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login terlebih dahulu.');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/catering/issues/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Gagal memuat data dashboard');
      }

      // simpan ke cache
      setCache(result.data);
      setData(result.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Gagal memuat data dashboard';
      setError(errorMessage);

      // gunakan data default jika error
      setData(defaultData);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  // fetch data saat mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
}

export type { IssuesDashboardData, ReputationData };
