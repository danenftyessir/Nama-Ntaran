'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeliveryStatus } from '../components/catering/DeliveryHistoryCard';

// interface untuk delivery item dari API
interface DeliveryHistoryItem {
  id: string;
  schoolName: string;
  date: string;
  portions: number;
  status: DeliveryStatus;
  imageUrl: string;
  // TO DO: tambahkan field lain dari API seperti amount, verificationId, dll
}

// interface untuk response API
interface HistoryDataResponse {
  deliveries: DeliveryHistoryItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// interface untuk hook return
interface UseHistoryDataReturn {
  data: HistoryDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

// konfigurasi cache
const CACHE_KEY = 'catering_history_data';
const CACHE_TTL = 3 * 60 * 1000; // 3 menit

// helper untuk cek cache validity
const isCacheValid = (): boolean => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp < CACHE_TTL;
  } catch {
    return false;
  }
};

// helper untuk get cached data
const getCachedData = (): HistoryDataResponse | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data } = JSON.parse(cached);
    return data;
  } catch {
    return null;
  }
};

// helper untuk set cache
const setCacheData = (data: HistoryDataResponse): void => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch {
    // ignore localStorage errors
  }
};

// hook untuk fetch history data
export function useHistoryData(): UseHistoryDataReturn {
  const [data, setData] = useState<HistoryDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // cek cache dulu
      if (isCacheValid()) {
        const cached = getCachedData();
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return;
        }
      }

      // get auth token
      const token = localStorage.getItem('token');

      // TO DO: ganti dengan endpoint API yang sebenarnya
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/catering/history/dashboard`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Gagal mengambil data riwayat pengiriman');
      }

      const result = await response.json();
      setData(result);
      setCacheData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching delivery history:', err);
      setError(err.message || 'Gagal mengambil data riwayat pengiriman. Silakan coba lagi nanti.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // fetch data saat mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // setup polling untuk refresh data
  useEffect(() => {
    const interval = setInterval(fetchData, 5 * 60 * 1000); // refresh setiap 5 menit
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refreshData: fetchData,
  };
}

export type { DeliveryHistoryItem, HistoryDataResponse };
