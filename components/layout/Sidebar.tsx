'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Wallet, FileText, Settings, LogOut, Flame, X } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface SidebarProps {
  streak?: number;
}

export default function Sidebar({ streak = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Budgets', href: '/budgets', icon: Wallet },
    { label: 'Reports', href: '/reports', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen bg-card-fill border-r border-slate-gray/10 text-ivory-white fixed left-0 top-0 z-30">
        {/* Brand Logo Wordmark */}
        <div className="h-16 flex items-center px-6 border-b border-slate-gray/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl tracking-wider bg-gradient-to-r from-mint-cash to-emerald-400 bg-clip-text text-transparent">
              SPENDWISE
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-mint-cash/10 text-mint-cash border-l-2 border-mint-cash'
                    : 'text-slate-gray hover:text-ivory-white hover:bg-slate-gray/5'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-mint-cash' : 'text-slate-gray group-hover:text-ivory-white'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Area: Streak & Session Info */}
        <div className="p-4 border-t border-slate-gray/10 space-y-4">
          {/* Daily Streak Indicator */}
          {session?.user && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-deep border border-slate-gray/10">
              <div className="flex items-center gap-2 text-xs text-slate-gray">
                <Flame size={14} className="text-rupee-gold fill-rupee-gold/20" />
                <span>Daily Streak</span>
              </div>
              <span className="font-numeric font-semibold text-sm text-rupee-gold">
                {streak} {streak === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}

          {/* User Profile Info & Logout */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-semibold text-ivory-white truncate">
                {session?.user?.name || 'User'}
              </span>
              <span className="text-[10px] text-slate-gray truncate">
                {session?.user?.email}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Log Out"
              className="p-2 rounded-lg text-slate-gray hover:text-crimson-alert hover:bg-crimson-alert/5 transition-all duration-150"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ivory-white">Sign Out</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-gray leading-relaxed">
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-1 h-11 bg-crimson-alert/10 hover:bg-crimson-alert/20 text-crimson-alert border border-crimson-alert/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
