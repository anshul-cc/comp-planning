import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Debug endpoint to check database state
export async function GET() {
  try {
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        systemRoleId: true,
      },
    })

    // Check if SystemRole table exists and has data
    let systemRoles: unknown[] = []
    let systemRoleError = null
    try {
      systemRoles = await prisma.systemRole.findMany()
    } catch (e) {
      systemRoleError = String(e)
    }

    // Check if RolePermission table exists
    let permissions: unknown[] = []
    let permissionError = null
    try {
      permissions = await prisma.rolePermission.findMany({ take: 5 })
    } catch (e) {
      permissionError = String(e)
    }

    return NextResponse.json({
      users,
      systemRoles,
      systemRoleError,
      permissionsCount: permissions.length,
      permissionError,
      tablesExist: {
        systemRole: !systemRoleError,
        rolePermission: !permissionError,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
