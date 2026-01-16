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
  const fiscalYearId = searchParams.get('fiscalYearId')

  const where = fiscalYearId ? { fiscalYearId } : {}

  const annualPlans = await prisma.annualPlan.findMany({
    where,
    include: {
      fiscalYear: true,
      department: true,
      allocations: {
        include: {
          employee: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(annualPlans)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { fiscalYearId, departmentId, totalBudget, notes } = body

  if (!fiscalYearId || !departmentId || totalBudget === undefined) {
    return NextResponse.json(
      { error: 'Fiscal year, department, and total budget are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.annualPlan.findUnique({
    where: {
      fiscalYearId_departmentId: {
        fiscalYearId,
        departmentId,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'An AOP already exists for this department and fiscal year' },
      { status: 400 }
    )
  }

  const annualPlan = await prisma.annualPlan.create({
    data: {
      fiscalYearId,
      departmentId,
      totalBudget: parseFloat(totalBudget),
      notes,
      status: 'DRAFT',
    },
    include: {
      fiscalYear: true,
      department: true,
    },
  })

  return NextResponse.json(annualPlan, { status: 201 })
}
