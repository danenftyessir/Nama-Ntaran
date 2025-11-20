'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// tipe data untuk stats dashboard
interface DashboardStats {
  lockedFunds: string;
  lockedFundsDescription: string;
  todayDistribution: {
    schools: number;
    portions: number;
  };
  highlightedDates: number[];
}

// tipe data untuk jadwal pengiriman
interface DeliveryItem {
  id: string;
  schoolName: string;
  time: string;
  portions: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

// tipe data untuk notifikasi badge
interface NotificationBadge {
  path: string;
  count: number;
}

// tipe return dari hook
interface UseCateringDashboardReturn {
  stats: DashboardStats | null;
  deliveries: DeliveryItem[];
  badges: NotificationBadge[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// konfigurasi cache
const CACHE_KEY = 'catering_dashboard_cache';
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
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // gagal menyimpan cache, abaikan
  }
};

export function useCateringDashboard(): UseCateringDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [badges, setBadges] = useState<NotificationBadge[]>([]);
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
        setStats(cachedData.stats);
        setDeliveries(cachedData.deliveries);
        setBadges(cachedData.badges);
        setIsLoading(false);
        isFetching.current = false;
        return;
      }

      // actual API call
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/catering/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;

        // simpan ke cache
        setCache(data);

        setStats(data.stats);
        setDeliveries(data.deliveries || []);
        setBadges(data.badges || []);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data dashboard';
      setError(errorMessage);
      setStats(null);
      setDeliveries([]);
      setBadges([]);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  // fetch data saat mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // setup websocket untuk real-time updates
  useEffect(() => {
    // implementasi websocket connection
    // const ws = new WebSocket('ws://localhost:3001/catering');
    //
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.type === 'stats_update') {
    //     setStats(prev => ({ ...prev, ...data.payload }));
    //   }
    //   if (data.type === 'delivery_update') {
    //     setDeliveries(data.payload);
    //   }
    // };
    //
    // return () => ws.close();

    // untuk sementara, gunakan polling setiap 30 detik
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return {
    stats,
    deliveries,
    badges,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
}

// hook untuk local storage persistence sidebar
export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // load state dari local storage saat mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catering_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(JSON.parse(saved));
      }
      setIsInitialized(true);
    }
  }, []);

  // simpan state ke local storage saat berubah
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('catering_sidebar_collapsed', JSON.stringify(newValue));
      }
      return newValue;
    });
  }, []);

  return {
    isCollapsed,
    toggleCollapsed,
    isInitialized,
  };
}

// hook untuk sorting dan filtering deliveries
interface UseDeliveriesFilterReturn {
  filteredDeliveries: DeliveryItem[];
  sortBy: 'time' | 'portions' | 'name';
  sortOrder: 'asc' | 'desc';
  filterStatus: string;
  setSortBy: (sort: 'time' | 'portions' | 'name') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilterStatus: (status: string) => void;
}

export function useDeliveriesFilter(deliveries: DeliveryItem[]): UseDeliveriesFilterReturn {
  const [sortBy, setSortBy] = useState<'time' | 'portions' | 'name'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredDeliveries = deliveries
    .filter(delivery => {
      if (filterStatus === 'all') return true;
      return delivery.status === filterStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'time':
          comparison = a.time.localeCompare(b.time);
          break;
        case 'portions':
          comparison = a.portions - b.portions;
          break;
        case 'name':
          comparison = a.schoolName.localeCompare(b.schoolName);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return {
    filteredDeliveries,
    sortBy,
    sortOrder,
    filterStatus,
    setSortBy,
    setSortOrder,
    setFilterStatus,
  };
}

export type { DashboardStats, DeliveryItem, NotificationBadge };
