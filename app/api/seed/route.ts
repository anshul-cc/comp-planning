import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// One-time seed endpoint - DELETE after use
export async function GET() {
  try {
    // Check if already seeded
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Database already seeded' })
    }

    const hashedPassword = await bcrypt.hash('password123', 10)

    // Create admin user
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
      },
    })

    // Create HR user
    await prisma.user.create({
      data: {
        email: 'hr@example.com',
        password: hashedPassword,
        name: 'HR Manager',
        role: 'HR',
      },
    })

    // Create Finance user
    await prisma.user.create({
      data: {
        email: 'finance@example.com',
        password: hashedPassword,
        name: 'Finance Manager',
        role: 'FINANCE',
      },
    })

    return NextResponse.json({
      message: 'Database seeded successfully!',
      credentials: {
        admin: 'admin@example.com / password123',
        hr: 'hr@example.com / password123',
        finance: 'finance@example.com / password123'
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed database', details: String(error) }, { status: 500 })
  }
}
