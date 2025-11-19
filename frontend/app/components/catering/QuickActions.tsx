'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Upload, CreditCard, LucideIcon } from 'lucide-react';

// TO DO: implementasi modal untuk upload menu
// TO DO: integrasi dengan API untuk quick actions

interface QuickActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions?: QuickActionItem[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const router = useRouter();

  // default quick actions sesuai design
  const defaultActions: QuickActionItem[] = [
    {
      id: 'schedule',
      label: 'Lihat Jadwal',
      icon: Calendar,
      path: '/catering/schedule',
    },
    {
      id: 'upload',
      label: 'Upload Menu',
      icon: Upload,
      path: '/catering/menu',
    },
    {
      id: 'payment',
      label: 'Lihat Pembayaran',
      icon: CreditCard,
      path: '/catering/payments',
    },
  ];

  const actionItems = actions || defaultActions;

  const handleClick = (action: QuickActionItem) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.path) {
      router.push(action.path);
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
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
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
      className="mb-6"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Tindakan Cepat</h2>

      <div className="flex flex-wrap gap-3">
        {actionItems.map((action) => {
          const Icon = action.icon;

          return (
            <motion.button
              key={action.id}
              variants={itemVariants}
              onClick={() => handleClick(action)}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5
                bg-white border border-gray-200 rounded-lg
                text-sm font-medium text-gray-700
                hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50
                active:scale-95
                transition-all duration-200 ease-out
              `}
              style={{
                transform: 'translateZ(0)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-4 h-4" />
              <span>{action.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default QuickActions;
