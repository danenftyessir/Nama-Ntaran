'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

// tipe data untuk issue
export interface IssueItem {
  id: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  date: string;
  schoolName: string;
}

interface IssueListCardProps {
  issues: IssueItem[];
}

const IssueListCard: React.FC<IssueListCardProps> = ({ issues = [] }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // mapping severity ke label Indonesia
  const getSeverityLabel = (severity: string): string => {
    const labels: Record<string, string> = {
      critical: 'Tinggi',
      high: 'Tinggi',
      medium: 'Sedang',
      low: 'Rendah',
    };
    return labels[severity] || 'Sedang';
  };

  // mapping severity ke warna
  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-600',
      high: 'bg-red-100 text-red-600',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-600',
    };
    return colors[severity] || 'bg-gray-100 text-gray-600';
  };

  // mapping severity ke icon
  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, React.ReactNode> = {
      critical: <AlertTriangle className="w-5 h-5 text-red-500" />,
      high: <AlertTriangle className="w-5 h-5 text-red-500" />,
      medium: <AlertCircle className="w-5 h-5 text-yellow-600" />,
      low: <Info className="w-5 h-5 text-gray-500" />,
    };
    return icons[severity] || <Info className="w-5 h-5 text-gray-500" />;
  };

  // format tanggal
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
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
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Daftar Masalah Yang Dilaporkan
        </h3>
        <p className="text-sm text-gray-500">
          Tinjau Masalah Yang Perlu Tindakan Segera
        </p>
      </div>

      {/* daftar issues */}
      <div className="space-y-3">
        {issues.length === 0 ? (
          <div className="text-center py-8">
            <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tidak Ada Masalah Yang Dilaporkan</p>
          </div>
        ) : (
          issues.map((issue, index) => (
            <motion.div
              key={issue.id}
              variants={itemVariants}
              className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* icon */}
              <div className="mt-1">{getSeverityIcon(issue.severity)}</div>

              {/* konten */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {issue.title}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getSeverityColor(
                      issue.severity
                    )}`}
                  >
                    {getSeverityLabel(issue.severity)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {issue.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{issue.schoolName}</span>
                  <span>•</span>
                  <span>{formatDate(issue.date)}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default IssueListCard;
