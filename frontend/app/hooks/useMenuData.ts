'use client';

import { useState, useEffect, useCallback } from 'react';

// interface untuk menu item
interface MenuItem {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  vitamins: string;
  price: number;
  imageUrl: string;
}

// interface untuk response API
interface MenuDataResponse {
  menus: MenuItem[];
  totalCount: number;
}

// interface untuk hook return
interface UseMenuDataReturn {
  data: MenuDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

// konfigurasi cache
const CACHE_KEY = 'catering_menu_data';
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

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
const getCachedData = (): MenuDataResponse | null => {
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
const setCacheData = (data: MenuDataResponse): void => {
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

// hook untuk fetch menu data
export function useMenuData(): UseMenuDataReturn {
  const [data, setData] = useState<MenuDataResponse | null>(null);
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
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/catering/menu`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Gagal mengambil data menu');
      }

      const result = await response.json();
      setData(result);
      setCacheData(result);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching menu data:', err);
      setError(err.message || 'Gagal mengambil data menu. Silakan coba lagi nanti.');
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

export type { MenuItem, MenuDataResponse };
