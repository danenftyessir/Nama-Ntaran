'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Star } from 'lucide-react';

interface ReputationCardProps {
  rating: number;
  totalReviews: number;
}

const ReputationCard: React.FC<ReputationCardProps> = ({
  rating = 4.8,
  totalReviews = 1234,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // render bintang rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // bintang penuh
        stars.push(
          <Star
            key={i}
            className="w-7 h-7 fill-yellow-400 text-yellow-400"
            strokeWidth={0}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        // bintang setengah
        stars.push(
          <div key={i} className="relative w-7 h-7">
            <Star
              className="absolute inset-0 w-7 h-7 text-gray-300"
              fill="currentColor"
              strokeWidth={0}
            />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star
                className="w-7 h-7 fill-yellow-400 text-yellow-400"
                strokeWidth={0}
              />
            </div>
          </div>
        );
      } else {
        // bintang kosong
        stars.push(
          <Star
            key={i}
            className="w-7 h-7 text-gray-300 fill-gray-300"
            strokeWidth={0}
          />
        );
      }
    }

    return stars;
  };

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

  const starContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        delay: 0.2,
        staggerChildren: 0.1,
      },
    },
  };

  const starVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* header */}
      <h3 className="text-gray-900 text-lg font-semibold mb-6">Reputasi Bisnis</h3>

      {/* rating bintang */}
      <motion.div
        variants={starContainerVariants}
        className="flex items-center justify-center gap-1 mb-4"
      >
        {renderStars().map((star, index) => (
          <motion.div key={index} variants={starVariants}>
            {star}
          </motion.div>
        ))}
      </motion.div>

      {/* skor rating */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="text-center mb-4"
      >
        <div className="text-6xl font-bold text-gray-900 mb-2">
          {rating.toFixed(1)}
        </div>
      </motion.div>

      {/* jumlah ulasan */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="text-center"
      >
        <p className="text-gray-500 text-sm">
          Berdasarkan {totalReviews.toLocaleString('id-ID')} Ulasan
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ReputationCard;
