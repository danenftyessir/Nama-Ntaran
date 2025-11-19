'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Clock } from 'lucide-react';

interface OnTimePercentageCardProps {
  percentage: number;
}

const OnTimePercentageCard: React.FC<OnTimePercentageCardProps> = ({
  percentage = 98.5,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // animasi variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.2,
      },
    },
  };

  const percentageVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
        delay: 0.3,
      },
    },
  };

  // tentukan warna berdasarkan persentase
  const getColor = () => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (percentage >= 95) return 'bg-green-50';
    if (percentage >= 85) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getBorderColor = () => {
    if (percentage >= 95) return 'border-green-100';
    if (percentage >= 85) return 'border-yellow-100';
    return 'border-red-100';
  };

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow duration-300 ${getBorderColor()}`}
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* icon dan label */}
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          variants={iconVariants}
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${getBgColor()}`}
        >
          <Clock className={`w-6 h-6 ${getColor()}`} />
        </motion.div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Tepat Waktu %</h3>
          <p className="text-xs text-gray-500">Pengiriman Tepat Waktu</p>
        </div>
      </div>

      {/* persentase */}
      <motion.div
        variants={percentageVariants}
        className="text-center"
      >
        <div className={`text-5xl font-bold ${getColor()} mb-2`}>
          {percentage.toFixed(1)}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className={`h-full rounded-full ${
              percentage >= 95 ? 'bg-green-500' : percentage >= 85 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OnTimePercentageCard;
