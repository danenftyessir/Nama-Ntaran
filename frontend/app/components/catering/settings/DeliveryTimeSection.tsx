'use client';

import React, { useCallback } from 'react';
import { Clock } from 'lucide-react';

// TODO: validasi bahwa start time harus lebih awal dari end time
// TODO: sinkronisasi dengan business hours
// TODO: implementasikan time zone selection

interface DeliveryTimeData {
  startTime: string;
  endTime: string;
}

interface DeliveryTimeSectionProps {
  data: DeliveryTimeData;
  onUpdate: (data: Partial<DeliveryTimeData>) => void;
}

const DeliveryTimeSection: React.FC<DeliveryTimeSectionProps> = ({ data, onUpdate }) => {
  // handler untuk update time
  const handleTimeChange = useCallback(
    (field: 'startTime' | 'endTime', value: string) => {
      onUpdate({ [field]: value });
    },
    [onUpdate]
  );

  return (
    <div className="bg-white rounded-2xl shadow-modern p-6 h-full gpu-accelerate">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <Clock className="w-4 h-4 text-orange-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Delivery Time Settings</h2>
      </div>

      {/* time inputs */}
      <div className="space-y-4">
        {/* start time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
          <input
            type="time"
            value={data.startTime}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-lg font-semibold text-gray-900"
          />
        </div>

        {/* end time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
          <input
            type="time"
            value={data.endTime}
            onChange={(e) => handleTimeChange('endTime', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-lg font-semibold text-gray-900"
          />
        </div>

        {/* delivery window display */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <p className="text-sm font-medium text-blue-900 mb-1">Delivery Window</p>
          <p className="text-2xl font-bold text-blue-700">
            {data.startTime} - {data.endTime}
          </p>
          <p className="text-xs text-blue-700 mt-2 font-medium">
            Orders Will Be Delivered Within This Time Frame
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTimeSection;
