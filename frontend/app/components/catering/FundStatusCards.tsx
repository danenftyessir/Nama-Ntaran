'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Lock, Clock, CheckCircle } from 'lucide-react';

interface FundStatus {
  lockedFunds: number;
  pendingVerification: number;
  releasedFunds: number;
  totalFunds: number;
}

interface FundStatusCardsProps {
  data: FundStatus;
}

// komponen untuk animasi counter
const AnimatedCounter: React.FC<{ value: number; isInView: boolean }> = ({
  value,
  isInView,
}) => {
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    mass: 1,
  });

  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat('id-ID').format(Math.round(current))
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return <motion.span>{display}</motion.span>;
};

const FundStatusCards: React.FC<FundStatusCardsProps> = ({ data }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // hitung persentase
  const calculatePercentage = (value: number) => {
    if (data.totalFunds === 0) return 0;
    return Math.round((value / data.totalFunds) * 100);
  };

  // data untuk cards
  const cards = [
    {
      id: 'locked',
      title: 'Dana Terkunci',
      value: data.lockedFunds,
      percentage: calculatePercentage(data.lockedFunds),
      icon: Lock,
      iconBgClass: 'bg-gray-100',
      iconColorClass: 'text-gray-600',
    },
    {
      id: 'pending',
      title: 'Menunggu Verifikasi',
      value: data.pendingVerification,
      percentage: calculatePercentage(data.pendingVerification),
      icon: Clock,
      iconBgClass: 'bg-gray-100',
      iconColorClass: 'text-gray-600',
    },
    {
      id: 'released',
      title: 'Dana Cair',
      value: data.releasedFunds,
      percentage: calculatePercentage(data.releasedFunds),
      icon: CheckCircle,
      iconBgClass: 'bg-gray-100',
      iconColorClass: 'text-gray-600',
    },
  ];

  // animasi variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
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
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      style={{
        willChange: 'opacity',
        transform: 'translateZ(0)',
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <motion.div
            key={card.id}
            variants={cardVariants}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative overflow-hidden"
          >
            {/* icon di pojok kanan */}
            <div className="absolute top-4 right-4">
              <div className={`w-10 h-10 rounded-lg ${card.iconBgClass} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.iconColorClass}`} />
              </div>
            </div>

            {/* konten */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                Rp <AnimatedCounter value={card.value} isInView={isInView} />
              </p>
              <p className="text-xs text-gray-400">
                {card.percentage}% dari total dana
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default FundStatusCards;
