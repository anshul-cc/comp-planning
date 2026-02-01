import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Security middleware for the application
 * - Adds security headers to all responses
 * - Protects API routes that require authentication
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth', // NextAuth routes
]

// API routes that require specific roles
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  '/api/users': ['SUPER_ADMIN', 'HR_ADMIN'],
  '/api/system-roles': ['SUPER_ADMIN'],
  '/api/audit': ['SUPER_ADMIN', 'HR_ADMIN', 'FINANCE_HEAD'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create response (we'll modify headers)
  const response = NextResponse.next()

  // Add security headers to all responses
  addSecurityHeaders(response)

  // Skip auth check for public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return response
  }

  // Skip auth check for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return response
  }

  // Check authentication for API routes
  if (pathname.startsWith('/api/')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: response.headers }
      )
    }

    // Check role-based access for specific routes
    const userRole = token.role as string
    for (const [route, allowedRoles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403, headers: response.headers }
          )
        }
        break
      }
    }
  }

  return response
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // XSS protection (legacy but still useful for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (restrict browser features)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Content Security Policy (adjust based on your needs)
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
      "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

  // Strict Transport Security (for HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
