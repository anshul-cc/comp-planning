import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { authRateLimiter } from './rate-limiter'
import { headers } from 'next/headers'

// Security: Bcrypt cost factor (12 rounds as per security requirements)
const BCRYPT_ROUNDS = 12

/**
 * Extract client IP from request headers
 * Handles various proxy configurations
 */
function getClientIp(): string {
  try {
    const headersList = headers()
    // Check common proxy headers
    const forwardedFor = headersList.get('x-forwarded-for')
    if (forwardedFor) {
      // Take the first IP in the chain (original client)
      return forwardedFor.split(',')[0].trim()
    }
    const realIp = headersList.get('x-real-ip')
    if (realIp) {
      return realIp
    }
    // Fallback for direct connections
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        // Normalize email
        const email = credentials.email.toLowerCase().trim()

        // Get client IP for rate limiting
        const clientIp = getClientIp()

        // Check rate limit before processing
        const rateLimitCheck = authRateLimiter.check(clientIp, email)
        if (!rateLimitCheck.allowed) {
          // Log the rate limit hit for security monitoring
          console.warn(`Rate limit exceeded for IP: ${clientIp}, email: ${maskEmail(email)}`)
          throw new Error(rateLimitCheck.message)
        }

        // Validate email format (basic check)
        if (!isValidEmail(email)) {
          authRateLimiter.recordFailure(clientIp, email)
          throw new Error('Invalid credentials')
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          // Record failure but use generic error message to prevent user enumeration
          authRateLimiter.recordFailure(clientIp, email)
          throw new Error('Invalid credentials')
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          authRateLimiter.recordFailure(clientIp, email)
          // Log failed attempt (with masked email for privacy)
          console.warn(`Failed login attempt for: ${maskEmail(email)} from IP: ${clientIp}`)
          throw new Error('Invalid credentials')
        }

        // Success - reset rate limit counter
        authRateLimiter.recordSuccess(clientIp, email)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
        (session.user as { role: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Session expires in 24 hours (can be adjusted)
    maxAge: 24 * 60 * 60,
  },
  // Use environment variable for secret (validated in lib/env.ts)
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Mask email for logging (privacy protection)
 * Example: user@example.com -> u***r@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`
}

/**
 * Export bcrypt rounds for use in other modules (e.g., user creation)
 */
export { BCRYPT_ROUNDS }
