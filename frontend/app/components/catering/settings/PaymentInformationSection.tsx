'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard, FileText, CheckCircle, Eye, EyeOff } from 'lucide-react';

// TODO: integrasikan dengan payment gateway API
// TODO: tambahkan verifikasi bank account
// TODO: implementasikan payment method setup wizard

interface PaymentInformationData {
  bankAccount: string;
  xenditGateway: string;
  taxRegistration: string;
}

interface PaymentInformationSectionProps {
  data: PaymentInformationData;
  onUpdate: (data: Partial<PaymentInformationData>) => void;
}

const PaymentInformationSection: React.FC<PaymentInformationSectionProps> = ({
  data,
  onUpdate,
}) => {
  const [showBankAccount, setShowBankAccount] = useState(false);

  // handler untuk toggle visibility bank account
  const toggleBankAccountVisibility = useCallback(() => {
    setShowBankAccount((prev) => !prev);
  }, []);

  // handler untuk update field
  const handleFieldChange = useCallback(
    (field: keyof PaymentInformationData, value: string) => {
      onUpdate({ [field]: value });
    },
    [onUpdate]
  );

  return (
    <div className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Payment Information</h2>
      </div>

      {/* bank account details */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Bank Account Details
        </label>
        <div className="relative">
          <input
            type={showBankAccount ? 'text' : 'password'}
            value={data.bankAccount}
            onChange={(e) => handleFieldChange('bankAccount', e.target.value)}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-medium placeholder:text-gray-400"
            placeholder="**** **** **** 1234"
          />
          <button
            onClick={toggleBankAccountVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 transition-smooth"
            aria-label="Toggle bank account visibility"
          >
            {showBankAccount ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1 font-medium">
          <CheckCircle className="w-3 h-3" />
          Your Bank Account Is Securely Encrypted
        </p>
      </div>

      {/* xendit payment gateway */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Xendit Payment Gateway
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{data.xenditGateway}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  data.xenditGateway === 'Active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {data.xenditGateway}
              </span>
            </div>
          </div>
          <button
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-smooth font-medium whitespace-nowrap"
            style={{ transform: 'translateZ(0)' }}
          >
            Configure
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 font-medium">
          Manage Your Payment Gateway Integration Settings
        </p>
      </div>

      {/* tax registration number */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Tax Registration Number
        </label>
        <input
          type="text"
          value={data.taxRegistration}
          onChange={(e) => handleFieldChange('taxRegistration', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-medium placeholder:text-gray-400"
          placeholder="TXID-XXXXXXXXX"
        />
        <p className="text-xs text-gray-600 mt-2 font-medium">
          Required For Tax Reporting And Compliance
        </p>
      </div>

      {/* payment methods summary */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="w-5 h-5 text-gray-700" />
          <h3 className="font-bold text-gray-900">
            Accepted Payment Methods
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Bank Transfer', 'E-Wallet', 'Credit Card', 'Virtual Account'].map((method) => (
            <motion.div
              key={method}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-semibold will-animate shadow-sm"
            >
              {method}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentInformationSection;
