'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Award } from 'lucide-react';

interface QualityScoreCardProps {
  score: number;
}

const QualityScoreCard: React.FC<QualityScoreCardProps> = ({
  score = 9.2,
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

  const scoreVariants = {
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

  // tentukan warna berdasarkan skor
  const getColor = () => {
    if (score >= 9) return 'text-blue-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (score >= 9) return 'bg-blue-50';
    if (score >= 7) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getBorderColor = () => {
    if (score >= 9) return 'border-blue-100';
    if (score >= 7) return 'border-yellow-100';
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
          <Award className={`w-6 h-6 ${getColor()}`} />
        </motion.div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Skor Kualitas</h3>
          <p className="text-xs text-gray-500">Penilaian Kualitas Makanan</p>
        </div>
      </div>

      {/* skor */}
      <motion.div
        variants={scoreVariants}
        className="text-center"
      >
        <div className={`text-5xl font-bold ${getColor()} mb-2`}>
          {score.toFixed(1)}
          <span className="text-2xl text-gray-400">/10</span>
        </div>

        {/* progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-4">
          <motion.div
            initial={{ width: 0 }}
            animate={isInView ? { width: `${(score / 10) * 100}%` } : { width: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className={`h-full rounded-full ${
              score >= 9 ? 'bg-blue-500' : score >= 7 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QualityScoreCard;
