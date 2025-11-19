'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Lock, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

// TO DO: integrasi dengan API untuk mendapatkan data stats dinamis
// TO DO: implementasi caching untuk data kalender

interface StatsSectionProps {
  lockedFunds: string;
  lockedFundsDescription: string;
  todayDistribution: {
    schools: number;
    portions: number;
  };
  highlightedDates?: number[];
}

const StatsSection: React.FC<StatsSectionProps> = ({
  lockedFunds = 'Rp 25.500.000',
  lockedFundsDescription = 'Dana yang belum dicairkan untuk program',
  todayDistribution = { schools: 3, portions: 1200 },
  highlightedDates = [18, 20],
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // state untuk kalender
  const [currentDate, setCurrentDate] = useState(new Date());

  // fungsi kalender
  const getDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  }, [currentDate]);

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth;

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  // animasi variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
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
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* card dana terkunci */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Dana Terkunci</h3>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-2">{lockedFundsDescription}</p>
        <p className="text-2xl font-bold text-gray-900">
          <span className="text-sm font-normal text-gray-500 mr-1">Rp</span>
          {lockedFunds.replace('Rp ', '').replace('Rp', '')}
        </p>
      </motion.div>

      {/* card distribusi hari ini */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Distribusi Hari Ini</h3>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-2">Total pengiriman untuk hari ini</p>
        <div className="flex items-baseline gap-4">
          <div>
            <span className="text-2xl font-bold text-indigo-600">{todayDistribution.schools}</span>
            <span className="text-sm text-gray-500 ml-1">sekolah</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-gray-700">{todayDistribution.portions.toLocaleString('id-ID')}</span>
            <span className="text-xs text-gray-500 ml-1">porsi</span>
          </div>
        </div>
      </motion.div>

      {/* kalender mini */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Kalender</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={previousMonth}
              className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-xs font-medium text-gray-700 min-w-[100px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
              aria-label="Bulan selanjutnya"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* header hari */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* grid tanggal */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === today.getDate();
            const isHighlighted = highlightedDates.includes(day);

            return (
              <button
                key={day}
                className={`
                  aspect-square rounded-md text-xs font-medium
                  flex items-center justify-center
                  transition-all duration-200
                  ${isToday
                    ? 'bg-indigo-600 text-white'
                    : isHighlighted
                    ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StatsSection;
