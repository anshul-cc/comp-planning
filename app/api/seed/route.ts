import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SYSTEM_ROLES } from '@/lib/permissions'

export async function GET() {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }

  try {
    const hashedPassword = await bcrypt.hash('password123', 10)
    log('Password hashed successfully')

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
    // USERS
    // ============================================
    console.log('Creating users...')

    // Super Admin
    await prisma.user.upsert({
      where: { email: 'superadmin@example.com' },
      update: {
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
        systemRoleId: createdSystemRoles['SUPER_ADMIN'],
      },
      create: {
        email: 'superadmin@example.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        systemRoleId: createdSystemRoles['SUPER_ADMIN'],
      },
    })

    // Compensation Manager (Admin)
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        role: 'COMPENSATION_MANAGER',
        name: 'Admin User',
        systemRoleId: createdSystemRoles['COMPENSATION_MANAGER'],
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'COMPENSATION_MANAGER',
        systemRoleId: createdSystemRoles['COMPENSATION_MANAGER'],
      },
    })

    // HR Admin
    await prisma.user.upsert({
      where: { email: 'hr@example.com' },
      update: {
        role: 'HR_ADMIN',
        name: 'HR Manager',
        systemRoleId: createdSystemRoles['HR_ADMIN'],
      },
      create: {
        email: 'hr@example.com',
        password: hashedPassword,
        name: 'HR Manager',
        role: 'HR_ADMIN',
        systemRoleId: createdSystemRoles['HR_ADMIN'],
      },
    })

    // Finance Head
    await prisma.user.upsert({
      where: { email: 'finance@example.com' },
      update: {
        role: 'FINANCE_HEAD',
        name: 'Finance Manager',
        systemRoleId: createdSystemRoles['FINANCE_HEAD'],
      },
      create: {
        email: 'finance@example.com',
        password: hashedPassword,
        name: 'Finance Manager',
        role: 'FINANCE_HEAD',
        systemRoleId: createdSystemRoles['FINANCE_HEAD'],
      },
    })

    log('All users created/updated successfully')

    return NextResponse.json({
      message: 'Database seeded successfully!',
      logs,
      systemRoles: Object.keys(createdSystemRoles),
      credentials: {
        superAdmin: 'superadmin@example.com / password123',
        compensationManager: 'admin@example.com / password123',
        hrAdmin: 'hr@example.com / password123',
        financeHead: 'finance@example.com / password123',
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({
      error: 'Failed to seed database',
      details: String(error),
      logs,
      hint: 'You may need to run: prisma db push to update the database schema'
    }, { status: 500 })
  }
}
