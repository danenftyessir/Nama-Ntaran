'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, Phone, Mail, User, Clock, UtensilsCrossed, Upload, X } from 'lucide-react';
import Image from 'next/image';

// TODO: implementasikan upload logo ke cloud storage
// TODO: tambahkan validasi format file untuk logo (png, jpg, svg)
// TODO: integrasi dengan API untuk update profile

interface CompanyProfileData {
  businessName: string;
  officialAddress: string;
  licenseNumber: string;
  phoneNumber: string;
  email: string;
  pointOfContact: string;
  logo: string | null;
  businessHours: {
    weekday: { start: string; end: string };
    weekend: { start: string; end: string };
  };
  cuisineSpecializations: string[];
}

interface CompanyProfileSectionProps {
  data: CompanyProfileData;
  onUpdate: (data: Partial<CompanyProfileData>) => void;
}

// daftar cuisine options
const CUISINE_OPTIONS = [
  'Indonesian',
  'Western',
  'Chinese',
  'Japanese',
  'Korean',
  'Italian',
  'Mexican',
  'Thai',
  'Indian',
  'Mediterranean',
  'Vegetarian',
  'Vegan',
  'Halal',
  'Seafood',
];

const CompanyProfileSection: React.FC<CompanyProfileSectionProps> = ({ data, onUpdate }) => {
  const [newCuisine, setNewCuisine] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // handler untuk upload logo
  const handleLogoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // validasi ukuran file max 2MB
        if (file.size > 2 * 1024 * 1024) {
          alert('Ukuran file terlalu besar. Maksimal 2MB.');
          return;
        }

        // buat preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          onUpdate({ logo: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    },
    [onUpdate]
  );

  // handler untuk add cuisine
  const handleAddCuisine = useCallback(() => {
    if (newCuisine && !data.cuisineSpecializations.includes(newCuisine)) {
      onUpdate({
        cuisineSpecializations: [...data.cuisineSpecializations, newCuisine],
      });
      setNewCuisine('');
    }
  }, [newCuisine, data.cuisineSpecializations, onUpdate]);

  // handler untuk remove cuisine
  const handleRemoveCuisine = useCallback(
    (cuisine: string) => {
      onUpdate({
        cuisineSpecializations: data.cuisineSpecializations.filter((c) => c !== cuisine),
      });
    },
    [data.cuisineSpecializations, onUpdate]
  );

  return (
    <div className="bg-white rounded-2xl shadow-modern p-6 gpu-accelerate">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-pink-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Company Profile</h2>
      </div>

      {/* logo upload section */}
      <div className="mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shadow-modern border-4 border-white">
              {data.logo ? (
                <Image
                  src={data.logo}
                  alt="Company Logo"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Building2 className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-smooth"
              style={{ transform: 'translateZ(0)' }}
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-smooth font-medium text-sm"
            >
              Edit Logo
            </button>
            <p className="text-xs text-gray-600 mt-2 font-medium">PNG, JPG Up To 2MB</p>
          </div>
        </div>
      </div>

      {/* business name */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
        <input
          type="text"
          value={data.businessName}
          onChange={(e) => onUpdate({ businessName: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold placeholder:text-gray-500 placeholder:font-normal"
          placeholder="Enter Business Name"
        />
      </div>

      {/* official address */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Official Address</label>
        <input
          type="text"
          value={data.officialAddress}
          onChange={(e) => onUpdate({ officialAddress: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold placeholder:text-gray-500 placeholder:font-normal"
          placeholder="Enter Official Address"
        />
      </div>

      {/* license number */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">License Number</label>
        <input
          type="text"
          value={data.licenseNumber}
          onChange={(e) => onUpdate({ licenseNumber: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold placeholder:text-gray-500 placeholder:font-normal"
          placeholder="Enter License Number"
        />
      </div>

      {/* contact information */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* phone number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <input
              type="tel"
              value={data.phoneNumber}
              onChange={(e) => onUpdate({ phoneNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold placeholder:text-gray-500 placeholder:font-normal"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* email address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold placeholder:text-gray-500 placeholder:font-normal"
              placeholder="email@example.com"
            />
          </div>
        </div>

        {/* point of contact */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            Point Of Contact (PIC)
          </label>
          <input
            type="text"
            value={data.pointOfContact}
            onChange={(e) => onUpdate({ pointOfContact: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold placeholder:text-gray-500 placeholder:font-normal"
            placeholder="Enter Contact Person Name"
          />
        </div>
      </div>

      {/* business hours */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Business Hours
        </h3>

        {/* weekday hours */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Monday - Friday:</label>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={data.businessHours.weekday.start}
              onChange={(e) =>
                onUpdate({
                  businessHours: {
                    ...data.businessHours,
                    weekday: { ...data.businessHours.weekday, start: e.target.value },
                  },
                })
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold"
            />
            <span className="text-gray-700 font-semibold">-</span>
            <input
              type="time"
              value={data.businessHours.weekday.end}
              onChange={(e) =>
                onUpdate({
                  businessHours: {
                    ...data.businessHours,
                    weekday: { ...data.businessHours.weekday, end: e.target.value },
                  },
                })
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold"
            />
          </div>
        </div>

        {/* weekend hours */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Saturday - Sunday:</label>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={data.businessHours.weekend.start}
              onChange={(e) =>
                onUpdate({
                  businessHours: {
                    ...data.businessHours,
                    weekend: { ...data.businessHours.weekend, start: e.target.value },
                  },
                })
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold"
            />
            <span className="text-gray-700 font-semibold">-</span>
            <input
              type="time"
              value={data.businessHours.weekend.end}
              onChange={(e) =>
                onUpdate({
                  businessHours: {
                    ...data.businessHours,
                    weekend: { ...data.businessHours.weekend, end: e.target.value },
                  },
                })
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* cuisine specializations */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5" />
          Cuisine Specializations
        </h3>

        {/* selected cuisines */}
        <div className="flex flex-wrap gap-2 mb-4">
          {data.cuisineSpecializations.map((cuisine) => (
            <motion.div
              key={cuisine}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full flex items-center gap-2 font-medium text-sm will-animate"
            >
              <span>{cuisine}</span>
              <button
                onClick={() => handleRemoveCuisine(cuisine)}
                className="hover:bg-blue-200 rounded-full p-1 transition-smooth"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* add new cuisine */}
        <div className="flex gap-2">
          <select
            value={newCuisine}
            onChange={(e) => setNewCuisine(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-smooth text-gray-900 font-semibold"
            style={{ color: newCuisine ? '#111827' : '#6B7280' }}
          >
            <option value="" className="text-gray-500">Select Cuisine Type</option>
            {CUISINE_OPTIONS.filter((c) => !data.cuisineSpecializations.includes(c)).map(
              (cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              )
            )}
          </select>
          <button
            onClick={handleAddCuisine}
            disabled={!newCuisine}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-smooth font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ transform: 'translateZ(0)' }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileSection;
