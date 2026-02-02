import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Prevent static generation
export const dynamic = 'force-dynamic'

// Security: Bcrypt cost factor (must match auth.ts)
const BCRYPT_ROUNDS = 12

/**
 * Password reset endpoint for administrative purposes
 * Requires INIT_SECRET to execute
 * This will update all user passwords to use correct bcrypt rounds
 */
export async function POST(request: Request) {
  try {
    // Get the secret from request
    const body = await request.json().catch(() => ({}))
    const { secret } = body

    // Require a secret that matches env var
    const initSecret = process.env.INIT_SECRET || 'comp-planning-init-2024'
    if (secret !== initSecret) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Hash the default password with correct rounds
    const hashedPassword = await bcrypt.hash('password123', BCRYPT_ROUNDS)

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    // Update all user passwords
    const updated: string[] = []
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })
      updated.push(user.email)
    }

    return NextResponse.json({
      success: true,
      message: `Updated passwords for ${updated.length} users`,
      users: updated,
      bcryptRounds: BCRYPT_ROUNDS,
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Password reset failed', details: String(error) },
      { status: 500 }
    )
  }
}
