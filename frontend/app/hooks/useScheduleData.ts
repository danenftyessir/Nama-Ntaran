'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// tipe data untuk jadwal pengiriman
interface ScheduleItem {
  id: string;
  schoolName: string;
  address: string;
  timeRange: string;
  portions: number;
  status: 'in_progress' | 'scheduled' | 'delivered';
  date: string;
  iconVariant: 'primary' | 'secondary';
}

type FilterType = 'today' | 'week' | 'month';

interface UseScheduleDataReturn {
  schedules: ScheduleItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// konfigurasi cache
const CACHE_KEY = 'schedule_data_cache';
const CACHE_DURATION = 3 * 60 * 1000; // 3 menit

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

const setCache = (data: ScheduleItem[]) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // gagal menyimpan cache
  }
};

export function useScheduleData(filter: FilterType): UseScheduleDataReturn {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFetching = useRef(false);

  const fetchScheduleData = useCallback(async () => {
    if (isFetching.current) return;

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // cek cache
      const cachedData = getCache();
      if (cachedData) {
        setSchedules(cachedData);
        setIsLoading(false);
        isFetching.current = false;
        return;
      }

      // actual API call
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/catering/schedules`, {
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
        // simpan ke cache
        setCache(result.data);
        setSchedules(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch schedule data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data jadwal';
      setError(errorMessage);
      setSchedules([]);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // filter schedules berdasarkan filter type
  const filteredSchedules = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);

      switch (filter) {
        case 'today':
          return scheduleDate.getTime() === today.getTime();
        case 'week': {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return scheduleDate >= weekStart && scheduleDate <= weekEnd;
        }
        case 'month': {
          return (
            scheduleDate.getMonth() === today.getMonth() &&
            scheduleDate.getFullYear() === today.getFullYear()
          );
        }
        default:
          return true;
      }
    });
  }, [schedules, filter]);

  return {
    schedules: filteredSchedules,
    isLoading,
    error,
    refetch: fetchScheduleData,
  };
}

export type { ScheduleItem, FilterType };
