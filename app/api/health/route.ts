import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try to connect to database
    await prisma.$connect()

    // Try a simple query
    const userCount = await prisma.user.count()

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      userCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      database: 'error',
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
