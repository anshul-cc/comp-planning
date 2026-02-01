import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

/**
 * API Authorization Helper
 * Provides consistent authentication and authorization checks for API routes
 */

// Role hierarchy - higher roles inherit permissions from lower roles
const ROLE_HIERARCHY: Record<string, number> = {
  USER: 1,
  MANAGER: 2,
  HR_ADMIN: 3,
  FINANCE_HEAD: 3,
  COMPENSATION_MANAGER: 4,
  SUPER_ADMIN: 5,
}

// Admin roles that have elevated privileges
const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPENSATION_MANAGER', 'HR_ADMIN', 'FINANCE_HEAD']

// Super admin only
const SUPER_ADMIN_ROLES = ['SUPER_ADMIN']

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string
  role: string
}

export interface AuthResult {
  authenticated: boolean
  user: AuthenticatedUser | null
  error?: NextResponse
}

/**
 * Check if the current request is authenticated
 * Returns the user if authenticated, or an error response
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      authenticated: false,
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return {
    authenticated: true,
    user: {
      id: (session.user as AuthenticatedUser).id,
      email: session.user.email || '',
      name: session.user.name || undefined,
      role: (session.user as AuthenticatedUser).role,
    },
  }
}

/**
 * Check if the user has one of the required roles
 */
export async function requireRole(
  allowedRoles: string[]
): Promise<AuthResult> {
  const authResult = await requireAuth()

  if (!authResult.authenticated || !authResult.user) {
    return authResult
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      authenticated: true,
      user: authResult.user,
      error: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Check if the user is an admin (HR, Finance, Compensation Manager, or Super Admin)
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole(ADMIN_ROLES)
}

/**
 * Check if the user is a super admin
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  return requireRole(SUPER_ADMIN_ROLES)
}

/**
 * Check if the user has at least the specified role level
 * Uses role hierarchy for comparison
 */
export async function requireRoleLevel(
  minimumRole: string
): Promise<AuthResult> {
  const authResult = await requireAuth()

  if (!authResult.authenticated || !authResult.user) {
    return authResult
  }

  const userLevel = ROLE_HIERARCHY[authResult.user.role] || 0
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0

  if (userLevel < requiredLevel) {
    return {
      authenticated: true,
      user: authResult.user,
      error: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Check if the user can access a specific resource
 * Allows access if user is admin OR owns the resource
 */
export async function requireOwnerOrAdmin(
  resourceOwnerId: string
): Promise<AuthResult> {
  const authResult = await requireAuth()

  if (!authResult.authenticated || !authResult.user) {
    return authResult
  }

  const isAdmin = ADMIN_ROLES.includes(authResult.user.role)
  const isOwner = authResult.user.id === resourceOwnerId

  if (!isAdmin && !isOwner) {
    return {
      authenticated: true,
      user: authResult.user,
      error: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return authResult
}

/**
 * Helper to quickly check auth and return early if failed
 * Usage:
 *   const auth = await checkAuth()
 *   if (auth.error) return auth.error
 *   // auth.user is now available
 */
export async function checkAuth(): Promise<
  { user: AuthenticatedUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) {
    return { error: result.error }
  }
  return { user: result.user! }
}

/**
 * Helper to check role and return early if failed
 */
export async function checkRole(
  allowedRoles: string[]
): Promise<
  { user: AuthenticatedUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const result = await requireRole(allowedRoles)
  if (result.error) {
    return { error: result.error }
  }
  return { user: result.user! }
}

/**
 * Check if a role is an admin role
 */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role)
}

/**
 * Check if a role is super admin
 */
export function isSuperAdmin(role: string): boolean {
  return SUPER_ADMIN_ROLES.includes(role)
}

// Export constants for use in other modules
export { ADMIN_ROLES, SUPER_ADMIN_ROLES, ROLE_HIERARCHY }
