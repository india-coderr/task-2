'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export const Navbar = () => {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { settings, lowStockCount } = useSettings();

  if (!user) return null;

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sales', href: '/sales' },
    { label: 'Products', href: '/products' },
    {
      label: 'Low stock',
      href: '/inventory/low-stock',
      badge: lowStockCount > 0 ? lowStockCount : null
    },
    { label: 'Movements', href: '/inventory/movements' },
    { label: 'Reports', href: '/reports' },
    ...(isAdmin ? [{ label: 'Settings', href: '/settings' }] : [])
  ];

  return (
    <nav className="w-full bg-white border-b border-[#e2e8f0] px-4 py-2.5 flex items-center justify-between text-[13px] no-print">
      {/* Left side brand and navigation */}
      <div className="flex items-center space-x-5">
        {/* Brand Name + POS tag from Image 3 */}
        <div className="flex items-center space-x-2">
          <Link href="/dashboard" className="font-bold text-[15px] text-[#0f172a] tracking-tight hover:opacity-90">
            {settings?.storeName || 'Greenfield Grocers'}
          </Link>
          <span className="border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] tracking-wide">
            POS
          </span>
        </div>

        {/* Navigation Items with Image 3 framing */}
        <div className="flex items-center space-x-1.5">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1 text-[13px] transition-colors flex items-center space-x-1.5 rounded-[3px] ${
                  isActive
                    ? 'border border-[#15803d] font-semibold text-[#15803d] bg-white'
                    : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="border border-[#f59e0b] text-[#b45309] font-bold text-[11px] px-1 py-0 rounded-[3px] tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* + New Sale CTA Button inspired by + New Order in Image 3 */}
          <Link
            href="/sales/new"
            className="ml-2 bg-[#15803d] hover:bg-[#166534] text-white font-medium px-3 py-1 text-[13px] rounded-[3px] transition-colors flex items-center space-x-1"
          >
            <span>+ New Sale</span>
          </Link>
        </div>
      </div>

      {/* Right side user info and sign out */}
      <div className="flex items-center space-x-3 text-[#475569]">
        <div className="flex items-center space-x-2">
          <span>
            {user.name} ({user.role === 'admin' ? 'Admin' : 'Staff'})
          </span>
          <span className="border border-[#cbd5e1] text-[#334155] font-semibold text-[10px] px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider">
            {user.role}
          </span>
        </div>
        <span className="text-[#cbd5e1]">|</span>
        <button
          onClick={logout}
          className="text-[#475569] hover:text-[#0f172a] text-[13px] transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
};
