'use client';

import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { Download, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CashFlowData {
  month: string;
  income: number;
  expense: number;
}

type PeriodFilter = 'monthly' | 'quarterly' | 'yearly';

interface CashFlowChartProps {
  data: CashFlowData[];
  periodFilter?: PeriodFilter;
  onPeriodChange?: (period: PeriodFilter) => void;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  periodFilter = 'monthly',
  onPeriodChange,
}) => {
  const ref = useRef(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // format untuk tooltip
  const formatTooltipValue = (value: number) => {
    return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
  };

  // format untuk axis Y
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(1)} Jt`;
    }
    return `Rp${value}`;
  };

  // export chart ke gambar
  const handleExportChart = useCallback(async () => {
    if (!chartRef.current) return;

    try {
      // import html2canvas secara dinamis
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      // buat link download
      const link = document.createElement('a');
      link.download = `grafik-arus-kas-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Gagal export chart:', error);
      // fallback: gunakan SVG export
      const svgElement = chartRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const link = document.createElement('a');
        link.download = `grafik-arus-kas-${new Date().toISOString().split('T')[0]}.svg`;
        link.href = svgUrl;
        link.click();

        URL.revokeObjectURL(svgUrl);
      }
    }
  }, []);

  // period options
  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: 'monthly', label: 'Bulanan' },
    { id: 'quarterly', label: 'Kuartalan' },
    { id: 'yearly', label: 'Tahunan' },
  ];

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

  // custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatTooltipValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="mb-8"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Grafik Arus Kas
        </h2>

        <div className="flex items-center gap-2">
          {/* period filter */}
          {onPeriodChange && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {periodOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onPeriodChange(option.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    periodFilter === option.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* export button */}
          <button
            onClick={handleExportChart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Pemasukan vs Pengeluaran {periodFilter === 'monthly' ? 'Bulanan' : periodFilter === 'quarterly' ? 'Kuartalan' : 'Tahunan'}
        </h3>

        <div className="h-80" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                }}
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
              <Bar
                dataKey="income"
                name="Pemasukan"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expense"
                name="Pengeluaran"
                fill="#ec4899"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default CashFlowChart;
export type { PeriodFilter, CashFlowData };
