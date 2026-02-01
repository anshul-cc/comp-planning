import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SYSTEM_ROLES } from '@/lib/permissions'

// Prevent static generation
export const dynamic = 'force-dynamic'

// Security: Bcrypt cost factor
const BCRYPT_ROUNDS = 12

/**
 * ONE-TIME initialization endpoint to bootstrap the database
 * This will only work if NO users exist in the database
 * After first use, it becomes permanently disabled
 */
export async function POST(request: Request) {
  try {
    // Check if any users exist - if so, this endpoint is disabled
    const existingUsers = await prisma.user.count()
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'Database already initialized. This endpoint is disabled.' },
        { status: 403 }
      )
    }

    // Get the initialization secret from request
    const body = await request.json().catch(() => ({}))
    const { secret } = body

    // Require a secret that matches env var (or a default for first-time setup)
    const initSecret = process.env.INIT_SECRET || 'comp-planning-init-2024'
    if (secret !== initSecret) {
      return NextResponse.json(
        { error: 'Invalid initialization secret' },
        { status: 401 }
      )
    }

    const logs: string[] = []
    const log = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    log('Starting database initialization...')

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', BCRYPT_ROUNDS)

    // Create system roles
    log('Creating system roles...')
    const createdSystemRoles: Record<string, string> = {}

    for (const roleDef of SYSTEM_ROLES) {
      const systemRole = await prisma.systemRole.upsert({
        where: { code: roleDef.code },
        update: {
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: roleDef.isSystemRole,
        },
        create: {
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: roleDef.isSystemRole,
        },
      })

      createdSystemRoles[roleDef.code] = systemRole.id

      // Create permissions
      for (const perm of roleDef.permissions) {
        await prisma.rolePermission.upsert({
          where: {
            systemRoleId_resource: {
              systemRoleId: systemRole.id,
              resource: perm.resource,
            },
          },
          update: {
            actions: JSON.stringify(perm.actions),
            scope: perm.scope,
          },
          create: {
            systemRoleId: systemRole.id,
            resource: perm.resource,
            actions: JSON.stringify(perm.actions),
            scope: perm.scope,
          },
        })
      }
    }

    // Create essential users
    log('Creating users...')

    const users = [
      { email: 'superadmin@example.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
      { email: 'admin@example.com', name: 'Admin User', role: 'COMPENSATION_MANAGER' },
      { email: 'hr@example.com', name: 'HR Admin', role: 'HR_ADMIN' },
      { email: 'finance@example.com', name: 'Finance Head', role: 'FINANCE_HEAD' },
    ]

    for (const user of users) {
      await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          role: user.role,
          systemRoleId: createdSystemRoles[user.role],
        },
      })
      log(`Created user: ${user.email}`)
    }

    log('Database initialization complete!')

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      logs,
      credentials: {
        note: 'All users have password: password123',
        users: users.map(u => u.email),
      },
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json(
      { error: 'Initialization failed', details: String(error) },
      { status: 500 }
    )
  }
}

// GET returns instructions
export async function GET() {
  const existingUsers = await prisma.user.count()

  if (existingUsers > 0) {
    return NextResponse.json({
      status: 'initialized',
      message: 'Database is already initialized. This endpoint is disabled.',
      userCount: existingUsers,
    })
  }

  return NextResponse.json({
    status: 'pending',
    message: 'Database needs initialization',
    instructions: 'POST to this endpoint with { "secret": "comp-planning-init-2024" } to initialize',
  })
}
