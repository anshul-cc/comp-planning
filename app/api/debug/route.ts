import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Debug endpoint - ONLY available in development and requires SUPER_ADMIN authentication
export async function GET() {
  // Block in production environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint is disabled in production' },
      { status: 404 }
    )
  }

  // Require authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Require SUPER_ADMIN role
  const userRole = (session.user as { role?: string })?.role
  if (userRole !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Insufficient permissions - SUPER_ADMIN required' },
      { status: 403 }
    )
  }

  try {
    // Return limited, non-sensitive debug info
    const userCount = await prisma.user.count()
    const systemRoleCount = await prisma.systemRole.count()
    const permissionCount = await prisma.rolePermission.count()

    return NextResponse.json({
      status: 'ok',
      environment: process.env.NODE_ENV,
      counts: {
        users: userCount,
        systemRoles: systemRoleCount,
        permissions: permissionCount,
      },
      tablesExist: {
        user: true,
        systemRole: systemRoleCount > 0,
        rolePermission: permissionCount > 0,
      }
    })
  } catch (error) {
    // Don't expose error details
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
