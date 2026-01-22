import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '25')
  const offset = parseInt(searchParams.get('offset') || '0')

  const [payGrades, total] = await Promise.all([
    prisma.payGrade.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { level: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.payGrade.count(),
  ])

  return NextResponse.json({ data: payGrades, total, limit, offset })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { code, name, level, band, minSalary, midSalary, maxSalary, currencyCode, status, notes } = body

  if (!code || !name || level === undefined || !minSalary || !maxSalary) {
    return NextResponse.json(
      { error: 'Code, name, level, minSalary, and maxSalary are required' },
      { status: 400 }
    )
  }

  if (parseFloat(minSalary) >= parseFloat(maxSalary)) {
    return NextResponse.json(
      { error: 'Minimum salary must be less than maximum salary' },
      { status: 400 }
    )
  }

  const existing = await prisma.payGrade.findUnique({
    where: { level: parseInt(level) },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'A pay grade with this level already exists' },
      { status: 400 }
    )
  }

  const calculatedMid = midSalary ? parseFloat(midSalary) : (parseFloat(minSalary) + parseFloat(maxSalary)) / 2

  const payGrade = await prisma.payGrade.create({
    data: {
      code,
      name,
      level: parseInt(level),
      band: band ? parseInt(band) : 1,
      minSalary: parseFloat(minSalary),
      midSalary: calculatedMid,
      maxSalary: parseFloat(maxSalary),
      currencyCode: currencyCode || 'USD',
      status: status || 'DRAFT',
      notes: notes || null,
    },
  })

  return NextResponse.json(payGrade, { status: 201 })
}
