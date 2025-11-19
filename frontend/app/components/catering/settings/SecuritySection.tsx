'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key } from 'lucide-react';

// TODO: integrasikan dengan authentication service
// TODO: implementasikan 2FA dengan OTP/authenticator app
// TODO: tambahkan session management

interface SecurityData {
  twoFactorAuth: boolean;
}

interface SecuritySectionProps {
  data: SecurityData;
  onUpdate: (data: Partial<SecurityData>) => void;
}

// komponen toggle switch untuk 2FA
const TwoFactorToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="font-semibold text-gray-900 flex items-center gap-2">
          <Key className="w-4 h-4" />
          Two-Factor Authentication
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Add An Extra Layer Of Security To Your Account
        </p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-7 rounded-full transition-smooth will-animate ${
          checked ? 'bg-green-600' : 'bg-gray-300'
        }`}
        style={{ transform: 'translateZ(0)' }}
        aria-label="Toggle Two-Factor Authentication"
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

const SecuritySection: React.FC<SecuritySectionProps> = ({ data, onUpdate }) => {
  // handler untuk toggle 2FA
  const handleToggle2FA = useCallback(
    (value: boolean) => {
      onUpdate({ twoFactorAuth: value });
    },
    [onUpdate]
  );

  return (
    <div className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <Shield className="w-4 h-4 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Security</h2>
      </div>

      {/* two-factor authentication */}
      <div>
        <TwoFactorToggle checked={data.twoFactorAuth} onChange={handleToggle2FA} />

        {/* 2FA status card */}
        {data.twoFactorAuth && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 will-animate"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-900">
                  Two-Factor Authentication Is Active
                </p>
                <p className="text-sm text-green-800 mt-1">
                  Your Account Is Protected With An Additional Security Layer
                </p>
                <button className="mt-3 text-sm font-medium text-green-700 hover:text-green-800 underline">
                  Manage 2FA Settings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SecuritySection;
