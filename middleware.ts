import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/erp')) {
    const token = request.cookies.get('rsl-user')?.value;
    if (!token) return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/investor')) {
    const token = request.cookies.get('rsl-investor')?.value;
    if (!token) return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/erp/:path*', '/investor/:path*'],
};
