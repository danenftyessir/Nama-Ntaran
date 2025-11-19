'use client';

import React from 'react';
import Image from 'next/image';
import { Calendar, UtensilsCrossed } from 'lucide-react';

// tipe status untuk delivery
type DeliveryStatus = 'verified' | 'pending' | 'issue';

interface DeliveryHistoryCardProps {
  id: string;
  schoolName: string;
  date: string;
  portions: number;
  status: DeliveryStatus;
  imageUrl: string;
  onClick?: () => void;
}

// konfigurasi status badge
const statusConfig: Record<DeliveryStatus, { label: string; className: string }> = {
  verified: {
    label: 'Terverifikasi',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
  pending: {
    label: 'Menunggu',
    className: 'bg-cyan-50 text-cyan-600 border border-cyan-200',
  },
  issue: {
    label: 'Bermasalah',
    className: 'bg-red-500 text-white border border-red-500',
  },
};

const DeliveryHistoryCard: React.FC<DeliveryHistoryCardProps> = ({
  id,
  schoolName,
  date,
  portions,
  status,
  imageUrl,
  onClick,
}) => {
  // format tanggal ke bahasa indonesia
  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const config = statusConfig[status] || statusConfig.verified;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md transition-shadow duration-200"
    >
      {/* gambar makanan */}
      <div className="relative w-full h-40 overflow-hidden">
        <Image
          src={imageUrl}
          alt={schoolName}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          priority={false}
        />
      </div>

      {/* konten card */}
      <div className="p-4">
        {/* nama sekolah */}
        <h3 className="text-sm font-semibold text-gray-900 mb-3 truncate">
          {schoolName}
        </h3>

        {/* tanggal */}
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">{formatDate(date)}</span>
        </div>

        {/* jumlah porsi */}
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">{portions} porsi</span>
        </div>

        {/* status badge */}
        <div className="flex justify-end">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryHistoryCard;
export type { DeliveryStatus, DeliveryHistoryCardProps };
