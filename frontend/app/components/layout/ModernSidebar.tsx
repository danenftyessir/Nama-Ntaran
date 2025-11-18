'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LucideIcon, Settings, LogOut } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface ModernSidebarProps {
  navItems: NavItem[];
  userRole: string;
  userName: string;
  userEmail: string;
  schoolName?: string;
  onLogout?: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
  navItems,
  userRole,
  userName,
  userEmail,
  schoolName,
  onLogout,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      router.push('/login');
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-600 text-white',
    school: 'bg-blue-600 text-white',
    catering: 'bg-green-600 text-white',
    public: 'bg-gray-600 text-white',
  };

  return (
    <aside className="w-72 h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm fixed left-0 top-0">
      {/* logo dan brand */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-center">
          <Image
            src="/MBG-removebg-preview.png"
            alt="MBG Logo"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* informasi user */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${roleColors[userRole.toLowerCase()] || roleColors.public} flex items-center justify-center font-bold shadow-modern`}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{userName}</p>
            {schoolName && (
              <p className="text-xs text-gray-600 truncate">{schoolName}</p>
            )}
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-smooth ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.badge ? (
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white shadow-sm">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {/* divider */}
        <div className="my-4 border-t border-gray-200"></div>

        {/* menu tambahan */}
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => handleNavigation('/school/settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-smooth ${
                pathname === '/school/settings'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 font-medium">Pengaturan</span>
            </button>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-red-50 text-red-600 transition-smooth"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 font-medium">Keluar</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* footer */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="text-center text-sm">
          <p className="font-semibold text-gray-700 mb-1">Powered By AI & Blockchain</p>
          <p className="text-xs text-gray-500">
            Transparansi Penuh Untuk Generasi Lebih Sehat
          </p>
        </div>
      </div>
    </aside>
  );
};

export default ModernSidebar;
