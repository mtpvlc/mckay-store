import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/cookies';

/**
 * Runs on the edge runtime, so it MUST NOT import from @/db or anything that
 * reaches Postgres.
 *
 * This is a cheap first filter only: it checks whether an admin cookie is
 * present, nothing more. It cannot tell whether the session row still exists
 * or has expired. The real gate is requireAdmin() inside every admin page and
 * server action, which does the database lookup.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!request.cookies.get(ADMIN_COOKIE_NAME)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
