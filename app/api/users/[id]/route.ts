import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRole, checkAuth, ADMIN_ROLES } from '@/lib/api-auth'
import { BCRYPT_ROUNDS } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Any authenticated user can view user details (for now)
  // Could be restricted further based on business requirements
  const auth = await checkAuth()
  if (auth.error) return auth.error

  // Validate ID parameter
  if (!params.id || typeof params.id !== 'string') {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
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
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require SUPER_ADMIN role to update users
  const auth = await checkRole(['SUPER_ADMIN'])
  if (auth.error) return auth.error

  // Validate ID parameter
  if (!params.id || typeof params.id !== 'string') {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, password, systemRoleId } = body

  // Build update data with validation
  const updateData: {
    name?: string
    email?: string
    password?: string
    role?: string
    systemRoleId?: string
  } = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }
    updateData.name = name.trim()
  }

  if (email !== undefined) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if email is taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: params.id },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    updateData.email = normalizedEmail
  }

  if (password !== undefined) {
    // Validate password strength
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one letter and one number' },
        { status: 400 }
      )
    }
    updateData.password = await bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  if (systemRoleId !== undefined) {
    const systemRole = await prisma.systemRole.findUnique({
      where: { id: systemRoleId },
    })
    if (!systemRole) {
      return NextResponse.json({ error: 'Invalid system role' }, { status: 400 })
    }
    updateData.systemRoleId = systemRoleId
    updateData.role = systemRole.code
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
  })
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
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

  return NextResponse.json(user)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require SUPER_ADMIN role to delete users
  const auth = await checkRole(['SUPER_ADMIN'])
  if (auth.error) return auth.error

  // Validate ID parameter
  if (!params.id || typeof params.id !== 'string') {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  // Prevent deleting self
  if (auth.user!.id === params.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
  })
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await prisma.user.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
