'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Clock,
  Package,
  Building2,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface ScheduleDetail {
  id: string;
  schoolName: string;
  address: string;
  timeRange: string;
  portions: number;
  status: 'in_progress' | 'scheduled' | 'delivered';
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleDetail | null;
  onUpdateStatus?: (id: string, status: 'in_progress' | 'scheduled' | 'delivered') => Promise<void>;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onUpdateStatus,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // mapping status
  const statusConfig = {
    in_progress: {
      label: 'Dalam Proses',
      className: 'bg-yellow-100 text-yellow-700',
      nextStatus: 'delivered' as const,
      nextLabel: 'Tandai Terkirim',
    },
    scheduled: {
      label: 'Dijadwalkan',
      className: 'bg-indigo-100 text-indigo-700',
      nextStatus: 'in_progress' as const,
      nextLabel: 'Mulai Pengiriman',
    },
    delivered: {
      label: 'Terkirim',
      className: 'bg-green-100 text-green-700',
      nextStatus: null,
      nextLabel: null,
    },
  };

  // handler untuk update status
  const handleUpdateStatus = useCallback(async () => {
    if (!schedule || !onUpdateStatus) return;

    const config = statusConfig[schedule.status];
    if (!config.nextStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(schedule.id, config.nextStatus);
      setUpdateSuccess(true);
      setTimeout(() => {
        setUpdateSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Gagal update status:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [schedule, onUpdateStatus, onClose]);

  // animasi variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (!schedule) return null;

  const config = statusConfig[schedule.status];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Detail Pengiriman</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* konten modal */}
            <div className="p-6">
              {/* nama sekolah dan status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {schedule.schoolName}
                    </h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* detail info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{schedule.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{schedule.timeRange}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 font-medium">{schedule.portions} Porsi</span>
                </div>

                {/* kontak info jika ada */}
                {schedule.contactName && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Kontak</p>
                    <p className="text-sm text-gray-700 font-medium">{schedule.contactName}</p>
                    {schedule.contactPhone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{schedule.contactPhone}</span>
                      </div>
                    )}
                    {schedule.contactEmail && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{schedule.contactEmail}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* catatan jika ada */}
                {schedule.notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Catatan</p>
                    <p className="text-sm text-gray-700">{schedule.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* footer modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
              >
                Tutup
              </button>

              {config.nextLabel && onUpdateStatus && (
                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || updateSuccess}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg
                    transition-all duration-200
                    ${updateSuccess
                      ? 'bg-green-600'
                      : isUpdating
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                    }
                  `}
                >
                  {updateSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Berhasil</span>
                    </>
                  ) : isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memperbarui...</span>
                    </>
                  ) : (
                    <span>{config.nextLabel}</span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScheduleDetailModal;
