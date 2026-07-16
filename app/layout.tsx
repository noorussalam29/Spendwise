import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/layout/Providers';
import LayoutShell from '@/components/layout/LayoutShell';

export const metadata: Metadata = {
  title: 'Spendwise | Personal Expense Tracker',
  description:
    'A disciplined personal expense tracker designed for young professionals managing salary, family support, EMIs, and savings goals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full bg-bg-deep text-ivory-white antialiased flex flex-col font-sans">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
