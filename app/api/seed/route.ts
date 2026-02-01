import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SYSTEM_ROLES } from '@/lib/permissions'

// Prevent static generation - only run on request
export const dynamic = 'force-dynamic'

// Security: Bcrypt cost factor (12 rounds as per security requirements)
const BCRYPT_ROUNDS = 12

// Seed endpoint - ONLY available in development and requires authentication
// Changed to POST to prevent accidental triggering via URL access
export async function POST() {
  // Block in production environment - use CLI seed script instead
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed endpoint is disabled in production. Use CLI: npm run db:seed' },
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

  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }

  try {
    // Use environment variable for seed password in dev, or generate secure random
    const seedPassword = process.env.SEED_PASSWORD || generateSecurePassword()
    const hashedPassword = await bcrypt.hash(seedPassword, BCRYPT_ROUNDS)
    log('Password hashed successfully with bcrypt (12 rounds)')

    // ============================================
    // SYSTEM ROLES & PERMISSIONS
    // ============================================
    log('Creating system roles and permissions...')

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

      // Create permissions for this role
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

    // ============================================
    // USERS (without exposing credentials in response)
    // ============================================
    log('Creating users...')

    const userConfigs = [
      { email: 'superadmin@example.com', name: 'Super Admin', role: 'SUPER_ADMIN', roleCode: 'SUPER_ADMIN' },
      { email: 'admin@example.com', name: 'Admin User', role: 'COMPENSATION_MANAGER', roleCode: 'COMPENSATION_MANAGER' },
      { email: 'hr@example.com', name: 'HR Manager', role: 'HR_ADMIN', roleCode: 'HR_ADMIN' },
      { email: 'finance@example.com', name: 'Finance Manager', role: 'FINANCE_HEAD', roleCode: 'FINANCE_HEAD' },
    ]

    for (const config of userConfigs) {
      await prisma.user.upsert({
        where: { email: config.email },
        update: {
          role: config.role,
          name: config.name,
          systemRoleId: createdSystemRoles[config.roleCode],
        },
        create: {
          email: config.email,
          password: hashedPassword,
          name: config.name,
          role: config.role,
          systemRoleId: createdSystemRoles[config.roleCode],
        },
      })
    }

    log('All users created/updated successfully')

    // Security: Never expose passwords in API responses
    return NextResponse.json({
      message: 'Database seeded successfully!',
      logs,
      systemRoles: Object.keys(createdSystemRoles),
      usersCreated: userConfigs.map(u => u.email),
      // Note: Credentials are only shown in server logs during development
      note: 'Check server console for temporary credentials if SEED_PASSWORD was auto-generated',
    })
  } catch (error) {
    console.error('Seed error:', error)
    // Don't expose detailed error information
    return NextResponse.json({
      error: 'Failed to seed database',
      logs,
      hint: 'Check server logs for details. You may need to run: prisma db push',
    }, { status: 500 })
  }
}

// GET method returns 405 Method Not Allowed for security
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST request.' },
    { status: 405 }
  )
}

// Generate a secure random password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  const array = new Uint32Array(16)
  crypto.getRandomValues(array)
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length]
  }
  // Log to server console only (never in response)
  console.log('Generated seed password (development only):', password)
  return password
}
