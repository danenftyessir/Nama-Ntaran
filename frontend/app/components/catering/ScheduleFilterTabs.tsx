'use client';

import React from 'react';
import { motion } from 'framer-motion';

type FilterType = 'today' | 'week' | 'month';

interface FilterTab {
  id: FilterType;
  label: string;
}

interface ScheduleFilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const ScheduleFilterTabs: React.FC<ScheduleFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const tabs: FilterTab[] = [
    { id: 'today', label: 'Hari Ini' },
    { id: 'week', label: 'Minggu Ini' },
    { id: 'month', label: 'Bulan Ini' },
  ];

  return (
    <div className="flex items-center gap-2 mb-6">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`
              relative px-5 py-2 rounded-full text-sm font-medium
              transition-all duration-200 ease-out
              ${isActive
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300'
              }
            `}
            style={{
              transform: 'translateZ(0)',
            }}
          >
            {/* background animasi untuk tab aktif */}
            {isActive && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-indigo-600 rounded-full"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
                style={{
                  willChange: 'transform',
                }}
              />
            )}

            {/* label text */}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ScheduleFilterTabs;
export type { FilterType };
