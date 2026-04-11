import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/', '/api/auth'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!req.auth) {
    const url = new URL('/', req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/admin') && req.auth.user.role !== 'COMMISSIONER') {
    return NextResponse.redirect(new URL('/leagues', req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/stream).*)'],
};
