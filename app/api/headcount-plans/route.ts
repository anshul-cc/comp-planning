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

  const headcountPlans = await prisma.headcountPlan.findMany({
    where,
    include: {
      fiscalYear: true,
      department: {
        include: {
          _count: {
            select: { employees: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate actual headcount from employees
  const plansWithActuals = await Promise.all(
    headcountPlans.map(async (plan) => {
      const actualHeadcount = await prisma.employee.count({
        where: {
          departmentId: plan.departmentId,
          status: 'ACTIVE',
        },
      })
      const actualWageCost = await prisma.employee.aggregate({
        where: {
          departmentId: plan.departmentId,
          status: 'ACTIVE',
        },
        _sum: { currentSalary: true },
      })
      return {
        ...plan,
        actualHeadcount,
        actualWageCost: actualWageCost._sum.currentSalary || 0,
      }
    })
  )

  return NextResponse.json(plansWithActuals)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { fiscalYearId, departmentId, plannedHeadcount, wageBudget, notes } = body

  if (!fiscalYearId || !departmentId || !plannedHeadcount || !wageBudget) {
    return NextResponse.json(
      { error: 'Fiscal year, department, planned headcount, and wage budget are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.headcountPlan.findUnique({
    where: {
      fiscalYearId_departmentId: {
        fiscalYearId,
        departmentId,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'A headcount plan already exists for this department and fiscal year' },
      { status: 400 }
    )
  }

  const headcountPlan = await prisma.headcountPlan.create({
    data: {
      fiscalYearId,
      departmentId,
      plannedHeadcount: parseInt(plannedHeadcount),
      wageBudget: parseFloat(wageBudget),
      notes,
    },
    include: {
      fiscalYear: true,
      department: true,
    },
  })

  return NextResponse.json(headcountPlan, { status: 201 })
}
