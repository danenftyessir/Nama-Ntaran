'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Clock, Package, ArrowUpDown, Filter } from 'lucide-react';

interface DeliveryItem {
  id: string | number;
  schoolName: string;
  time: string;
  portions: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

interface UpcomingDeliveriesProps {
  title?: string;
  subtitle?: string;
  deliveries: DeliveryItem[];
  onDetailClick?: (delivery: DeliveryItem) => void;
  showFilters?: boolean;
}

const UpcomingDeliveries: React.FC<UpcomingDeliveriesProps> = ({
  title = 'Jadwal Mendatang',
  subtitle = 'Pengiriman Selanjutnya',
  deliveries = [],
  onDetailClick,
  showFilters = true,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const router = useRouter();

  // state untuk sorting dan filtering
  const [sortBy, setSortBy] = useState<'time' | 'portions' | 'name'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // filter dan sort deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries
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
  }, [deliveries, sortBy, sortOrder, filterStatus]);

  // toggle sort order
  const handleSort = (newSortBy: 'time' | 'portions' | 'name') => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleDetailClick = (delivery: DeliveryItem) => {
    if (onDetailClick) {
      onDetailClick(delivery);
    } else {
      router.push(`/catering/schedule?id=${delivery.id}`);
    }
  };

  // animasi variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* header section */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>

          {/* kontrol sorting dan filtering */}
          {showFilters && (
            <div className="flex items-center gap-2">
              {/* dropdown sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'time' | 'portions' | 'name')}
                  className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="time">Waktu</option>
                  <option value="portions">Porsi</option>
                  <option value="name">Nama</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* tombol toggle order */}
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-200"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className={`w-3.5 h-3.5 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>

              {/* dropdown filter status */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Semua</option>
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Berlangsung</option>
                  <option value="completed">Selesai</option>
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* list pengiriman */}
      <div className="divide-y divide-gray-50">
        {filteredDeliveries.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tidak ada jadwal pengiriman</p>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => (
            <motion.div
              key={delivery.id}
              variants={itemVariants}
              className="px-5 py-4 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {delivery.schoolName}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{delivery.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-right">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {delivery.portions.toLocaleString('id-ID')} porsi
                    </span>
                  </div>
                  <button
                    onClick={() => handleDetailClick(delivery)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default UpcomingDeliveries;
