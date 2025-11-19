'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  History,
  UtensilsCrossed,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  LucideIcon,
} from 'lucide-react';

// TO DO: integrasi dengan API untuk mendapatkan notifikasi badge dinamis
// TO DO: implementasi fitur collapse sidebar dengan local storage persistence

interface NavItemType {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

interface CateringSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const CateringSidebar: React.FC<CateringSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  // daftar navigasi utama
  const navItems: NavItemType[] = [
    { label: 'Dashboard', path: '/catering', icon: LayoutDashboard },
    { label: 'Delivery Schedule', path: '/catering/schedule', icon: Calendar },
    { label: 'Payment Status', path: '/catering/payments', icon: CreditCard },
    { label: 'Delivery History', path: '/catering/history', icon: History },
    { label: 'Menu Management', path: '/catering/menu', icon: UtensilsCrossed },
    { label: 'Issues & Reputation', path: '/catering/issues', icon: AlertCircle },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // animasi variants untuk smooth transition
  const sidebarVariants = {
    expanded: {
      width: 256,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    collapsed: {
      width: 80,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      className="h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-40"
      style={{
        willChange: 'width',
        transform: 'translateZ(0)',
      }}
    >
      {/* header dengan logo dan tombol collapse */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">NutriChain</p>
                <p className="text-xs text-gray-500">MBG</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </motion.div>
        </button>
      </div>

      {/* navigasi utama */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <motion.li
                key={item.path}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200 ease-out
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  style={{
                    transform: 'translateZ(0)',
                  }}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && !isCollapsed && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-600">
                      {item.badge}
                    </span>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* footer dengan support link */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => handleNavigation('/support')}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-gray-600 hover:bg-gray-50 hover:text-gray-900
            transition-all duration-200 ease-out
          `}
        >
          <HelpCircle className="w-5 h-5 text-gray-400" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                Support
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
};

export default CateringSidebar;
