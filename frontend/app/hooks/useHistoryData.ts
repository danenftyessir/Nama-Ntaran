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
    } catch (err) {
      // fallback ke dummy data jika API tidak tersedia
      console.warn('API tidak tersedia, menggunakan dummy data:', err);

      // TO DO: hapus dummy data ini setelah API tersedia
      const dummyData: HistoryDataResponse = {
        deliveries: [
          {
            id: '1',
            schoolName: 'SDN Melati Jaya',
            date: '2023-10-12',
            portions: 150,
            status: 'verified',
            imageUrl: '/aesthetic view.jpg',
          },
          {
            id: '2',
            schoolName: 'SMP Harapan Bangsa',
            date: '2023-10-10',
            portions: 220,
            status: 'pending',
            imageUrl: '/aesthetic view 2.jpg',
          },
          {
            id: '3',
            schoolName: 'SMA Cahaya Ilmu',
            date: '2023-10-08',
            portions: 180,
            status: 'issue',
            imageUrl: '/aesthetic view 3.jpg',
          },
          {
            id: '4',
            schoolName: 'TK Pelita Bunda',
            date: '2023-10-05',
            portions: 80,
            status: 'verified',
            imageUrl: '/aesthetic view 4.jpg',
          },
          {
            id: '5',
            schoolName: 'SMK Budi Luhur',
            date: '2023-10-03',
            portions: 300,
            status: 'verified',
            imageUrl: '/aesthetic view 5.jpg',
          },
          {
            id: '6',
            schoolName: 'SDN Mekar Sari',
            date: '2023-10-01',
            portions: 110,
            status: 'pending',
            imageUrl: '/jagung.jpg',
          },
          {
            id: '7',
            schoolName: 'SMP Jaya Raya',
            date: '2023-09-28',
            portions: 190,
            status: 'verified',
            imageUrl: '/tempe.jpg',
          },
          {
            id: '8',
            schoolName: 'SMA Merdeka',
            date: '2023-09-25',
            portions: 250,
            status: 'issue',
            imageUrl: '/otak-otak.jpg',
          },
        ],
        totalCount: 8,
        currentPage: 1,
        totalPages: 1,
      };

      setData(dummyData);
      setError(null);
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
