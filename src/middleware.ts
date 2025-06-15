import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { RoleName } from '@prisma/client'; // Import RoleName enum

const protectedPathsConfig = [
  { path: '/admin', roles: [RoleName.ADMIN] },
  { path: '/hr', roles: [RoleName.HR, RoleName.ADMIN] }, // HR and ADMIN can access /hr
  { path: '/employee', roles: [RoleName.EMPLOYEE, RoleName.HR, RoleName.ADMIN] }, // All authenticated users can access /employee
  // Add more specific paths if needed, e.g., an API endpoint only for ADMINs
  { path: '/api/trpc/admin', roles: [RoleName.ADMIN] }, // Example for tRPC admin routes
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow NextAuth.js specific paths and public files
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/auth/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isPublicRoute = ['/login', '/403', '/auth/error'].includes(pathname);


  if (!token) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Redirect to login if not authenticated and accessing a protected route
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname); // Optional: add callbackUrl
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access public auth pages like /login, redirect to a default page (e.g., dashboard or first relevant page)
  if (isPublicRoute && pathname ==='/login') {
     // Determine redirect based on role, e.g., admin to /admin, hr to /hr, employee to /employee
    const userRoles = token.roles as RoleName[] || [];
    let redirectPath = '/employee'; // Default for employee or if roles are not yet defined
    if (userRoles.includes(RoleName.ADMIN)) redirectPath = '/admin';
    else if (userRoles.includes(RoleName.HR)) redirectPath = '/hr';
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }


  // Check authorization for protected routes
  const routeConfig = protectedPathsConfig.find(rc => pathname.startsWith(rc.path));

  if (routeConfig) {
    const userRoles = token.roles as RoleName[] || [];
    const hasPermission = routeConfig.roles.some(requiredRole => userRoles.includes(requiredRole));

    if (!hasPermission) {
      return NextResponse.redirect(new URL('/403', req.url)); // Redirect to 403 if not authorized
    }
  } else if (!isPublicRoute) {
    // If the path is not public and not explicitly defined in protectedPathsConfig,
    // consider if it should be a 404 or a default authorized access.
    // For now, let's assume if it's not defined and not public, it's allowed for any authenticated user.
    // Or, more strictly, you might want to redirect to 403 or a default page.
    // This part depends on how you want to handle routes not explicitly covered.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (NextAuth.js routes)
     * It also excludes paths containing a `.` (likely static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/.*).*)',
  ],
};
