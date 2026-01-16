import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fiscalYears = await prisma.fiscalYear.findMany({
    include: {
      _count: {
        select: { annualPlans: true },
      },
    },
    orderBy: { year: 'desc' },
  })

  return NextResponse.json(fiscalYears)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { year, name, startDate, endDate, status } = body

  if (!year || !name || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'All fields are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.fiscalYear.findUnique({
    where: { year: parseInt(year) },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Fiscal year already exists' },
      { status: 400 }
    )
  }

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      year: parseInt(year),
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'PLANNING',
    },
  })

  return NextResponse.json(fiscalYear, { status: 201 })
}
