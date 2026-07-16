'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Wallet, Target, LogOut, Flame } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface SidebarProps {
  streak?: number;
}

export default function Sidebar({ streak = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Budgets', href: '/budgets', icon: Wallet },
    { label: 'Goals', href: '/goals', icon: Target },
  ];

  return (
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
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Log Out"
            className="p-2 rounded-lg text-slate-gray hover:text-crimson-alert hover:bg-crimson-alert/5 transition-all duration-150"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
