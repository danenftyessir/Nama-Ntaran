'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  role?: 'public' | 'school' | 'catering' | 'admin';
}

export default function Navbar({ role = 'public' }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const publicLinks = [
    { href: '/about',       label: 'Tentang' },
    { href: '/transparansi',label: 'Dashboard Publik' },
    { href: '/login',       label: 'Portal Internal' },
  ];

  const links = role === 'public' ? publicLinks : [];
  const isPublic = role === 'public';

  const NAV_BG     = 'rgba(4,9,15,0.88)';
  const NAV_BORDER = 'rgba(56,189,248,0.1)';
  const CYAN       = '#38bdf8';
  const LINK_COLOR = '#64748b';

  return (
    <motion.nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        background: isPublic ? NAV_BG : 'rgba(255,255,255,0.96)',
        borderBottom: `1px solid ${isPublic ? NAV_BORDER : '#e5e7eb'}`,
        boxShadow: isPublic ? '0 4px 24px rgba(0,0,0,0.5)' : '0 1px 6px rgba(0,0,0,0.06)',
      }}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 22 }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60 }}>
          {/* logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <Image src="/MBG-removebg-preview.png" alt="MBG Logo" width={108} height={36}
                className="object-contain"
                style={{ height: 'auto', filter: isPublic ? 'brightness(0) invert(1)' : 'none', opacity: isPublic ? 0.85 : 1 }}
                priority />
            </motion.div>
          </Link>

          {/* desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden md:flex">
            {links.map((link, i) => (
              <motion.div key={link.href}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}>
                <Link href={link.href}
                  style={{ fontSize: 14, fontWeight: 500, color: isPublic ? LINK_COLOR : '#374151',
                    textDecoration: 'none', position: 'relative', paddingBottom: 2 }}
                  className="nav-link-hover"
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = isPublic ? CYAN : '#7c3aed';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = isPublic ? LINK_COLOR : '#374151';
                  }}>
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* mobile toggle */}
          <motion.button
            className="md:hidden"
            style={{ padding: 8, borderRadius: 8, background: 'transparent',
              border: `1px solid ${isPublic ? 'rgba(56,189,248,0.15)' : '#e5e7eb'}`,
              color: isPublic ? LINK_COLOR : '#374151', cursor: 'pointer', display: 'flex' }}
            onClick={() => setOpen(!open)}
            whileTap={{ scale: 0.93 }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>

        {/* mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              style={{ paddingBottom: 12, borderTop: `1px solid ${isPublic ? 'rgba(56,189,248,0.08)' : '#e5e7eb'}` }}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
              {links.map((link, i) => (
                <motion.div key={link.href}
                  initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }} transition={{ delay: i * 0.05 }}>
                  <Link href={link.href}
                    style={{ display: 'block', padding: '11px 12px', borderRadius: 8,
                      fontSize: 14, fontWeight: 500, color: isPublic ? LINK_COLOR : '#374151',
                      textDecoration: 'none', transition: 'all 0.15s' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = isPublic ? CYAN : '#7c3aed';
                      (e.currentTarget as HTMLElement).style.background = isPublic ? 'rgba(56,189,248,0.05)' : 'rgba(124,58,237,0.05)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = isPublic ? LINK_COLOR : '#374151';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                    onClick={() => setOpen(false)}>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
