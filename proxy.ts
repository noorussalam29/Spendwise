import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect authenticated users away from login/register back to the dashboard
    if (token && (path === '/login' || path === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Allow public pages and assets to load without a token
        if (
          path === '/login' ||
          path === '/register' ||
          path.startsWith('/api/auth/register') ||
          path.startsWith('/_next') ||
          path.includes('.')
        ) {
          return true;
        }

        // Require a valid JWT token for all other pages (dashboard, expenses, etc.)
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth/register (registration API)
     * - _next/static (Next.js static assets)
     * - _next/image (Next.js image helper)
     * - favicon.ico (Site icon)
     */
    '/((?!api/auth/register|_next/static|_next/image|favicon.ico).*)',
  ],
};
