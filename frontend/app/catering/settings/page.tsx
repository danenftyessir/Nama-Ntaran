'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef } from 'react';
import CateringSidebar from '../../components/catering/CateringSidebar';
import { Save } from 'lucide-react';
import CompanyProfileSection from '../../components/catering/settings/CompanyProfileSection';
import NotificationsSection from '../../components/catering/settings/NotificationsSection';
import DeliveryTimeSection from '../../components/catering/settings/DeliveryTimeSection';
import PaymentInformationSection from '../../components/catering/settings/PaymentInformationSection';

// TODO: integrasikan dengan API untuk menyimpan pengaturan vendor
// TODO: tambahkan validasi form yang lebih komprehensif
// TODO: implementasikan toast notification untuk feedback user

// interface untuk settings data
interface VendorSettings {
  companyProfile: {
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
  };
  notifications: {
    paymentAlerts: boolean;
    orderNotifications: boolean;
    issueReports: boolean;
  };
  deliveryTime: {
    startTime: string;
    endTime: string;
  };
  paymentInformation: {
    bankAccount: string;
    xenditGateway: string;
    taxRegistration: string;
  };
}

// easing functions untuk animasi yang sangat smooth
const smoothEasing = [0.25, 0.1, 0.25, 1];
const bounceEasing = [0.68, -0.55, 0.265, 1.55];

export default function VendorSettingsPage() {
  // refs untuk intersection observer
  const headerRef = useRef(null);
  const companyRef = useRef(null);
  const notificationsRef = useRef(null);
  const deliveryRef = useRef(null);
  const paymentRef = useRef(null);

  // intersection observer hooks untuk viewport-based triggering
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-100px' });
  const isCompanyInView = useInView(companyRef, { once: true, margin: '-50px' });
  const isNotificationsInView = useInView(notificationsRef, { once: true, margin: '-50px' });
  const isDeliveryInView = useInView(deliveryRef, { once: true, margin: '-50px' });
  const isPaymentInView = useInView(paymentRef, { once: true, margin: '-50px' });

  // state untuk settings data
  const [settings, setSettings] = useState<VendorSettings>({
    companyProfile: {
      businessName: 'CaterFlow Express',
      officialAddress: '123 Catering Lane, Culinary City, CC 90210',
      licenseNumber: 'CATR-12345-LIC',
      phoneNumber: '+1 (555) 123-4567',
      email: 'contact@caterflow.com',
      pointOfContact: 'Chef Antoine DuBois',
      logo: null,
      businessHours: {
        weekday: { start: '09:00', end: '17:00' },
        weekend: { start: '10:00', end: '15:00' },
      },
      cuisineSpecializations: ['Indonesian', 'Western', 'Vegetarian', 'Vegan'],
    },
    notifications: {
      paymentAlerts: true,
      orderNotifications: true,
      issueReports: false,
    },
    deliveryTime: {
      startTime: '08:00',
      endTime: '17:00',
    },
    paymentInformation: {
      bankAccount: '**** **** **** 1234',
      xenditGateway: 'Active',
      taxRegistration: 'TXID-987654321',
    },
  });

  // state untuk loading dan save status
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // handler untuk update settings
  const updateSettings = useCallback(
    (section: keyof VendorSettings, data: Partial<VendorSettings[typeof section]>) => {
      setSettings((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...data,
        },
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // handler untuk save changes
  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // simulasi API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // await fetch('/api/vendor/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // });
      setHasUnsavedChanges(false);
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // preload images untuk performa
  useEffect(() => {
    const images = ['/aesthetic view.jpg', '/MBG-removebg-preview.png'];
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // animation variants untuk sections
  const sectionVariants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: 20,
        scale: 0.98,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.5,
          ease: smoothEasing,
        },
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar navigation */}
      <CateringSidebar />

      {/* main content area dengan GPU acceleration */}
      <main
        className="min-h-screen ml-72 scroll-container"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* header section */}
          <motion.div
            ref={headerRef}
            initial="hidden"
            animate={isHeaderInView ? 'visible' : 'hidden'}
            variants={sectionVariants}
            className="mb-8 gpu-accelerate"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Settings</h1>
            <p className="text-gray-600">
              Manage Your Business Profile, Notification Preferences, Payment Details, And Security
              Settings.
            </p>
          </motion.div>

          {/* layout grid untuk sections */}
          <div className="space-y-6">
            {/* company profile section */}
            <motion.div
              ref={companyRef}
              initial="hidden"
              animate={isCompanyInView ? 'visible' : 'hidden'}
              variants={sectionVariants}
              className="will-animate"
            >
              <CompanyProfileSection
                data={settings.companyProfile}
                onUpdate={(data) => updateSettings('companyProfile', data)}
              />
            </motion.div>

            {/* notifications and delivery time - side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                ref={notificationsRef}
                initial="hidden"
                animate={isNotificationsInView ? 'visible' : 'hidden'}
                variants={sectionVariants}
                className="will-animate"
              >
                <NotificationsSection
                  data={settings.notifications}
                  onUpdate={(data) => updateSettings('notifications', data)}
                />
              </motion.div>

              <motion.div
                ref={deliveryRef}
                initial="hidden"
                animate={isDeliveryInView ? 'visible' : 'hidden'}
                variants={sectionVariants}
                className="will-animate"
              >
                <DeliveryTimeSection
                  data={settings.deliveryTime}
                  onUpdate={(data) => updateSettings('deliveryTime', data)}
                />
              </motion.div>
            </div>

            {/* payment information section */}
            <motion.div
              ref={paymentRef}
              initial="hidden"
              animate={isPaymentInView ? 'visible' : 'hidden'}
              variants={sectionVariants}
              className="will-animate"
            >
              <PaymentInformationSection
                data={settings.paymentInformation}
                onUpdate={(data) => updateSettings('paymentInformation', data)}
              />
            </motion.div>
          </div>

          {/* save button - sticky di bottom */}
          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: smoothEasing }}
                className="fixed bottom-8 right-8 z-50"
              >
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="btn-modern px-8 py-4 bg-gradient-bg-1 text-white rounded-xl shadow-modern-lg hover:shadow-glow-lg transition-smooth flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ transform: 'translateZ(0)' }}
                >
                  <Save className="w-5 h-5" />
                  <span className="font-semibold">
                    {isSaving ? 'Menyimpan...' : 'Save Changes'}
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
