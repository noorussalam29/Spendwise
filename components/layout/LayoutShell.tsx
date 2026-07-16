'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import QuickAddBar from '../forms/QuickAddBar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  // Extract streak from session user if it exists (we will attach this to the session object later)
  const userStreak = (session?.user as any)?.currentStreak || 0;

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep text-ivory-white flex flex-col md:flex-row">
      {/* Navigation Layout Shell Elements */}
      <Sidebar streak={userStreak} />
      <Header streak={userStreak} />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen flex flex-col pt-16 pb-16 md:pt-0 md:pb-0 md:pl-64 transition-all duration-200">
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      <BottomNav />
      {session?.user && <QuickAddBar />}
    </div>
  );
}
