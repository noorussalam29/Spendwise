'use client';

import Link from 'next/link';
import { Flame, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface HeaderProps {
  streak?: number;
}

export default function Header({ streak = 0 }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-card-fill border-b border-slate-gray/10 z-30 flex items-center justify-between px-6">
      <Link href="/dashboard" className="flex items-center">
        <span className="font-display font-bold text-lg tracking-wider bg-gradient-to-r from-mint-cash to-emerald-400 bg-clip-text text-transparent">
          SPENDWISE
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {/* Streak indicator on mobile header */}
        {session?.user && (
          <div className="flex items-center gap-1 bg-bg-deep border border-slate-gray/10 px-2 py-1 rounded-md">
            <Flame size={14} className="text-rupee-gold fill-rupee-gold/20" />
            <span className="font-numeric font-semibold text-xs text-rupee-gold">
              {streak}
            </span>
          </div>
        )}

        {/* User logout trigger */}
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1 rounded-md text-slate-gray hover:text-crimson-alert transition-colors"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
