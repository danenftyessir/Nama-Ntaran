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
    } catch (err) {
      // fallback ke dummy data jika API tidak tersedia
      console.warn('API tidak tersedia, menggunakan dummy data:', err);

      // TO DO: hapus dummy data ini setelah API tersedia
      const dummyData: MenuDataResponse = {
        menus: [
          {
            id: '1',
            name: 'Nasi Kotak Komplit',
            description: 'Nasi kotak lezat dengan lauk ayam goreng, sayur tumis, dan sambal. Cocok untuk makan siang yang mengenyangkan dan bergizi.',
            calories: 550,
            protein: 30,
            vitamins: 'A, C',
            price: 25000,
            imageUrl: '/aesthetic view.jpg',
          },
          {
            id: '2',
            name: 'Bubur Ayam Spesial',
            description: 'Bubur ayam hangat dengan suwiran ayam, cakwe, kerupuk, dan taburan bawang goreng. Sempurna untuk sarapan.',
            calories: 380,
            protein: 20,
            vitamins: 'B, K',
            price: 18000,
            imageUrl: '/aesthetic view 2.jpg',
          },
          {
            id: '3',
            name: 'Sayur Asem Segar',
            description: 'Sayur asem dengan kuah segar dan aneka sayuran pilihan. Pendamping yang sempurna untuk hidangan utama.',
            calories: 120,
            protein: 5,
            vitamins: 'A, C, E',
            price: 10000,
            imageUrl: '/aesthetic view 3.jpg',
          },
          {
            id: '4',
            name: 'Sop Iga Sapi',
            description: 'Sop iga sapi empuk dengan kuah kaldu yang kaya rasa, dilengkapi dengan potongan wortel dan kentang.',
            calories: 450,
            protein: 35,
            vitamins: 'B12, K',
            price: 35000,
            imageUrl: '/aesthetic view 4.jpg',
          },
          {
            id: '5',
            name: 'Sate Lilit Ayam',
            description: 'Sate lilit ayam khas Bali dengan bumbu rempah yang kuat dan aroma serai yang menggoda. Disajikan dengan nasi hangat.',
            calories: 320,
            protein: 28,
            vitamins: 'B6',
            price: 22000,
            imageUrl: '/aesthetic view 5.jpg',
          },
          {
            id: '6',
            name: 'Gado-Gado Sehat',
            description: 'Salad Indonesia Gado-Gado dengan aneka sayuran rebus, tahu, tempe, dan siraman bumbu kacang gurih.',
            calories: 300,
            protein: 15,
            vitamins: 'K, B',
            price: 17000,
            imageUrl: '/jagung.jpg',
          },
        ],
        totalCount: 6,
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

export type { MenuItem, MenuDataResponse };
