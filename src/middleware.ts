import { NextResponse } from 'next/server';

export async function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/api/trpc/:path*',
    // Exclude public routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico|auth/sign-in|auth/error).*)',
  ],
};
