'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Wallet, Target } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Budgets', href: '/budgets', icon: Wallet },
    { label: 'Goals', href: '/goals', icon: Target },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-card-fill border-t border-slate-gray/10 z-30 flex items-center justify-around px-4 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 ${
              isActive ? 'text-mint-cash' : 'text-slate-gray'
            }`}
          >
            <Icon size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-wide">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
