import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payGrades = await prisma.payGrade.findMany({
    include: {
      _count: {
        select: { employees: true },
      },
    },
    orderBy: { level: 'asc' },
  })

  return NextResponse.json(payGrades)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, level, minSalary, maxSalary } = body

  if (!name || level === undefined || !minSalary || !maxSalary) {
    return NextResponse.json(
      { error: 'All fields are required' },
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

  const payGrade = await prisma.payGrade.create({
    data: {
      name,
      level: parseInt(level),
      minSalary: parseFloat(minSalary),
      maxSalary: parseFloat(maxSalary),
    },
  })

  return NextResponse.json(payGrade, { status: 201 })
}
