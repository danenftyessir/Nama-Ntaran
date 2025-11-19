'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Package, Building2 } from 'lucide-react';

interface ScheduleCardProps {
  id: string | number;
  schoolName: string;
  address: string;
  timeRange: string;
  portions: number;
  status: 'in_progress' | 'scheduled' | 'delivered';
  iconVariant?: 'primary' | 'secondary';
  index?: number;
  onClick?: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  id,
  schoolName,
  address,
  timeRange,
  portions,
  status,
  iconVariant = 'primary',
  index = 0,
  onClick,
}) => {
  // mapping status ke label dan style
  const statusConfig = {
    in_progress: {
      label: 'Dalam Proses',
      className: 'bg-gray-100 text-gray-700 border border-gray-200',
    },
    scheduled: {
      label: 'Dijadwalkan',
      className: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    },
    delivered: {
      label: 'Terkirim',
      className: 'bg-gray-100 text-gray-600 border border-gray-200',
    },
  };

  // warna icon berdasarkan variant
  const iconColorClass = iconVariant === 'primary'
    ? 'bg-indigo-100 text-indigo-600'
    : 'bg-purple-100 text-purple-600';

  // animasi variants
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        delay: index * 0.08,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* icon di luar card */}
      <div className="absolute -left-5 top-6 z-10">
        <div className={`w-10 h-10 rounded-xl ${iconColorClass} flex items-center justify-center shadow-sm`}>
          <Building2 className="w-5 h-5" />
        </div>
      </div>

      {/* card utama */}
      <div
        onClick={onClick}
        className={`ml-8 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      >
        <div className="p-5">
          {/* nama sekolah */}
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {schoolName}
          </h3>

          {/* detail info */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 mb-4">
            {/* alamat */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{address}</span>
            </div>

            {/* waktu */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{timeRange}</span>
            </div>

            {/* porsi */}
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-gray-400" />
              <span>{portions} Porsi</span>
            </div>
          </div>

          {/* status badge */}
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[status].className}`}>
              {status === 'in_progress' && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
              {status === 'scheduled' && (
                <Clock className="w-3 h-3" />
              )}
              {status === 'delivered' && (
                <Package className="w-3 h-3" />
              )}
              {statusConfig[status].label}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ScheduleCard;
