'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

// TO DO: ganti gambar hero dengan gambar dapur profesional yang sesuai
// TO DO: implementasi lazy loading untuk gambar dengan blur placeholder

interface HeroBannerProps {
  title: string;
  subtitle: string;
  imageSrc?: string;
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  title = 'Manajemen Nutrisi Lebih Mudah',
  subtitle = 'Pantau program makanan bergizi Anda dengan efisien.',
  imageSrc = '/aesthetic view.jpg',
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // animasi variants dengan GPU acceleration
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.2,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="relative w-full h-64 rounded-2xl overflow-hidden mb-6"
      style={{
        willChange: 'opacity',
        transform: 'translateZ(0)',
      }}
    >
      {/* gambar background */}
      <Image
        src={imageSrc}
        alt="Hero Banner"
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
      />

      {/* overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

      {/* konten text */}
      <motion.div
        variants={textVariants}
        className="absolute inset-0 flex flex-col justify-center px-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-gray-200 text-sm md:text-base max-w-md drop-shadow-md">
          {subtitle}
        </p>
      </motion.div>

      {/* dekorasi avatar di kanan (opsional) */}
      <div className="absolute top-4 right-4">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden">
          <Image
            src="/MBG-removebg-preview.png"
            alt="Profile"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;
