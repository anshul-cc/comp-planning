import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRole, ADMIN_ROLES } from '@/lib/api-auth'
import { BCRYPT_ROUNDS } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Require admin role to list users
  const auth = await checkRole(ADMIN_ROLES)
  if (auth.error) return auth.error

  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100) // Cap at 100
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        systemRoleId: true,
        systemRole: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        managedBusinessUnits: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        managedDepartments: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count(),
  ])

  return NextResponse.json({ data: users, total, limit, offset })
}

export async function POST(request: NextRequest) {
  // Require SUPER_ADMIN role to create users
  const auth = await checkRole(['SUPER_ADMIN'])
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, password, systemRoleId } = body

  // Input validation
  if (!name || !email || !password || !systemRoleId) {
    return NextResponse.json(
      { error: 'Name, email, password, and system role are required' },
      { status: 400 }
    )
  }

  // Validate name length
  if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: 'Name must be between 2 and 100 characters' },
      { status: 400 }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Validate password strength
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  // Check for password complexity (at least one letter and one number)
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json(
      { error: 'Password must contain at least one letter and one number' },
      { status: 400 }
    )
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim()

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
  }

  // Get the system role to set the legacy role field
  const systemRole = await prisma.systemRole.findUnique({
    where: { id: systemRoleId },
  })

  if (!systemRole) {
    return NextResponse.json({ error: 'Invalid system role' }, { status: 400 })
  }

  // Hash password with 12 rounds (security requirement)
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: systemRole.code,
      systemRoleId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      systemRole: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  })

  return NextResponse.json(user, { status: 201 })
}
