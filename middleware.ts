// middleware.ts
// Route protection via Next.js middleware
// Runs on the edge before each request

import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_USER_ROUTES = [
  '/dashboard',
  '/report',
  '/my-reports',
  '/sos',
  '/notifications',
  '/profile',
  '/nearby-alerts',
  '/live-map',
]

// Routes that require admin role
const ADMIN_ROUTES = ['/admin']

// Routes only for unauthenticated users
const AUTH_ONLY_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Read auth session cookie set by the client after Firebase login
  // We use a simple cookie presence check — actual auth validation happens in components
  const authToken = request.cookies.get('auth-token')?.value
  const userRole = request.cookies.get('user-role')?.value

  const isAuthenticated = !!authToken
  const isAdmin = userRole && ['admin', 'super_admin', 'incident_manager', 'monitoring_admin', 'alert_manager'].includes(userRole)

  // Block unauthenticated users from protected routes
  const isProtectedUserRoute = PROTECTED_USER_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  if (isProtectedUserRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Block non-admins from admin routes
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))
  if (isAdminRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(
      new URL(isAdmin ? '/admin/dashboard' : '/dashboard', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     * - api routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

