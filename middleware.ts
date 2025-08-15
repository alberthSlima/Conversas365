import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const authPages = ['/login'];
  const protectedPages = ['/dashboard', '/messages'];

  // Sessão custom (API Basic)
  const hasAppAuth = Boolean(req.cookies.get('app_auth')?.value);

  if (!hasAppAuth && protectedPages.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (hasAppAuth && authPages.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return res;
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/messages/:path*'],
}; 