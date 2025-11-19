'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

// TODO: integrasikan dengan backend notification service
// TODO: tambahkan email/SMS notification channels
// TODO: implementasikan notification preferences untuk timing

interface NotificationsData {
  paymentAlerts: boolean;
  orderNotifications: boolean;
  issueReports: boolean;
}

interface NotificationsSectionProps {
  data: NotificationsData;
  onUpdate: (data: Partial<NotificationsData>) => void;
}

// komponen toggle switch dengan animasi smooth
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-7 rounded-full transition-smooth will-animate ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        style={{ transform: 'translateZ(0)' }}
        aria-label={`Toggle ${label}`}
      >
        <motion.div
          className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
          animate={{ x: checked ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ transform: 'translateZ(0)' }}
        />
      </button>
    </div>
  );
};

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ data, onUpdate }) => {
  // handlers untuk toggle notifications
  const handleToggle = useCallback(
    (key: keyof NotificationsData, value: boolean) => {
      onUpdate({ [key]: value });
    },
    [onUpdate]
  );

  return (
    <div className="bg-white rounded-2xl shadow-modern p-6 h-full gpu-accelerate">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <Bell className="w-4 h-4 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
      </div>

      {/* notification toggles */}
      <div className="space-y-2">
        <ToggleSwitch
          checked={data.paymentAlerts}
          onChange={(value) => handleToggle('paymentAlerts', value)}
          label="Payment Alerts"
          description="Receive Notifications For Payment Updates"
        />

        <div className="border-t border-gray-200"></div>

        <ToggleSwitch
          checked={data.orderNotifications}
          onChange={(value) => handleToggle('orderNotifications', value)}
          label="Order Notifications"
          description="Get Notified About New Orders"
        />

        <div className="border-t border-gray-200"></div>

        <ToggleSwitch
          checked={data.issueReports}
          onChange={(value) => handleToggle('issueReports', value)}
          label="Issue Reports"
          description="Receive Alerts For Delivery Issues"
        />
      </div>
    </div>
  );
};

export default NotificationsSection;
