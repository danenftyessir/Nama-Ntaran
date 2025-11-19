'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { TrendingUp } from 'lucide-react';

// tipe data untuk trend
export interface TrendData {
  month: string;
  score: number;
}

interface QualityTrendChartProps {
  data: TrendData[];
}

const QualityTrendChart: React.FC<QualityTrendChartProps> = ({ data = [] }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // konfigurasi chart
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // hitung skala untuk sumbu Y (0-100%)
  const yScale = useMemo(() => {
    return (value: number) => {
      return innerHeight - (value / 100) * innerHeight;
    };
  }, [innerHeight]);

  // hitung skala untuk sumbu X
  const xScale = useMemo(() => {
    return (index: number) => {
      return (index / (data.length - 1)) * innerWidth;
    };
  }, [data.length, innerWidth]);

  // buat path untuk line chart
  const linePath = useMemo(() => {
    if (data.length === 0) return '';

    const points = data.map((item, index) => {
      const x = xScale(index);
      const y = yScale(item.score);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, xScale, yScale]);

  // buat path untuk area di bawah line
  const areaPath = useMemo(() => {
    if (data.length === 0) return '';

    const points = data.map((item, index) => {
      const x = xScale(index);
      const y = yScale(item.score);
      return `${x},${y}`;
    });

    const areaPoints = [
      `M 0,${innerHeight}`,
      `L ${points.join(' L ')}`,
      `L ${xScale(data.length - 1)},${innerHeight}`,
      'Z',
    ];

    return areaPoints.join(' ');
  }, [data, xScale, yScale, innerHeight]);

  // grid lines untuk sumbu Y
  const yGridLines = [0, 25, 50, 75, 100];

  // animasi variants
  const containerVariants = {
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

  const pathVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 2,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.3,
      },
    },
  };

  const areaVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 0.2,
      transition: {
        duration: 1.5,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.5,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Tren Kualitas Layanan
        </h3>
        <p className="text-sm text-gray-500">
          Perbandingan Skor Kualitas Selama 6 Bulan Terakhir
        </p>
      </div>

      {/* chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto"
          style={{ minWidth: '600px' }}
        >
          {/* background grid */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* horizontal grid lines */}
            {yGridLines.map((value) => (
              <g key={value}>
                <line
                  x1={0}
                  y1={yScale(value)}
                  x2={innerWidth}
                  y2={yScale(value)}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <text
                  x={-10}
                  y={yScale(value)}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-500"
                >
                  {value}%
                </text>
              </g>
            ))}

            {/* area di bawah line */}
            <motion.path
              d={areaPath}
              fill="url(#areaGradient)"
              variants={areaVariants}
            />

            {/* line chart */}
            <motion.path
              d={linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={pathVariants}
            />

            {/* data points */}
            {data.map((item, index) => (
              <motion.g
                key={index}
                initial={{ scale: 0, opacity: 0 }}
                animate={
                  isInView
                    ? { scale: 1, opacity: 1 }
                    : { scale: 0, opacity: 0 }
                }
                transition={{
                  duration: 0.3,
                  delay: 0.5 + index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
              >
                <circle
                  cx={xScale(index)}
                  cy={yScale(item.score)}
                  r={5}
                  fill="white"
                  stroke="#667eea"
                  strokeWidth={3}
                />
              </motion.g>
            ))}

            {/* sumbu X labels */}
            {data.map((item, index) => (
              <motion.text
                key={index}
                x={xScale(index)}
                y={innerHeight + 25}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                initial={{ opacity: 0, y: -10 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }
                }
                transition={{ duration: 0.4, delay: 0.7 + index * 0.05 }}
              >
                {item.month}
              </motion.text>
            ))}
          </g>

          {/* gradients */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#667eea" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#667eea" stopOpacity={0.05} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* label sumbu Y */}
      <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
        <TrendingUp className="w-4 h-4 mr-1" />
        <span>Skor Kualitas</span>
      </div>
    </motion.div>
  );
};

export default QualityTrendChart;
