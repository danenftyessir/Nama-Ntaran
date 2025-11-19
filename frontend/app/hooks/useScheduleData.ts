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

// data default untuk jadwal pengiriman
const defaultSchedules: ScheduleItem[] = [
  {
    id: '1',
    schoolName: 'SDN 01 Harapan Jaya',
    address: 'Jl. Melati No. 10, Jakarta Timur',
    timeRange: '08:00 - 09:00 WIB',
    portions: 150,
    status: 'in_progress',
    date: new Date().toISOString().split('T')[0],
    iconVariant: 'secondary',
  },
  {
    id: '2',
    schoolName: 'SMP Nasional Mandiri',
    address: 'Jl. Kenanga No. 5, Kota Bogor',
    timeRange: '10:00 - 11:00 WIB',
    portions: 220,
    status: 'scheduled',
    date: new Date().toISOString().split('T')[0],
    iconVariant: 'primary',
  },
  {
    id: '3',
    schoolName: 'SMA Negeri 88',
    address: 'Jl. Sudirman No. 12, Kota Bandung',
    timeRange: '13:00 - 14:00 WIB',
    portions: 300,
    status: 'scheduled',
    date: new Date().toISOString().split('T')[0],
    iconVariant: 'secondary',
  },
  {
    id: '4',
    schoolName: 'TK Bahagia Ceria',
    address: 'Jl. Anggrek No. 3, Kota Depok',
    timeRange: '15:00 - 16:00 WIB',
    portions: 80,
    status: 'delivered',
    date: new Date().toISOString().split('T')[0],
    iconVariant: 'primary',
  },
  {
    id: '5',
    schoolName: 'PAUD Cerdas Bangsa',
    address: 'Jl. Mawar No. 7, Kota Bekasi',
    timeRange: '09:30 - 10:30 WIB',
    portions: 100,
    status: 'scheduled',
    date: new Date().toISOString().split('T')[0],
    iconVariant: 'secondary',
  },
  {
    id: '6',
    schoolName: 'SD Islam Terpadu',
    address: 'Jl. Cempaka No. 22, Tangerang Selatan',
    timeRange: '11:00 - 12:00 WIB',
    portions: 180,
    status: 'in_progress',
    date: new Date().toISOString().split('T')[0],
    iconVariant: 'primary',
  },
];

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

      // simulasi API call
      await new Promise(resolve => setTimeout(resolve, 400));

      // simpan ke cache
      setCache(defaultSchedules);
      setSchedules(defaultSchedules);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data jadwal';
      setError(errorMessage);
      setSchedules(defaultSchedules);
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
