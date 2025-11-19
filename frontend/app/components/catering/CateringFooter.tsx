'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

// TO DO: implementasi link sosial media yang valid
// TO DO: integrasi dengan support system

interface CateringFooterProps {
  showSocialLinks?: boolean;
}

const CateringFooter: React.FC<CateringFooterProps> = ({
  showSocialLinks = true,
}) => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { id: 'facebook', icon: Facebook, href: '#', label: 'Facebook' },
    { id: 'twitter', icon: Twitter, href: '#', label: 'Twitter' },
    { id: 'instagram', icon: Instagram, href: '#', label: 'Instagram' },
    { id: 'linkedin', icon: Linkedin, href: '#', label: 'LinkedIn' },
    { id: 'youtube', icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* support link */}
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Support</span>
        </Link>

        {/* copyright */}
        <p className="text-sm text-gray-500">
          &copy; {currentYear} NutriChain MBG. All rights reserved.
        </p>

        {/* social links */}
        {showSocialLinks && (
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  aria-label={social.label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
};

export default CateringFooter;
