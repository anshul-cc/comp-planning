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
  const annualPlanId = searchParams.get('annualPlanId')

  const where = annualPlanId ? { annualPlanId } : {}

  const allocations = await prisma.budgetAllocation.findMany({
    where,
    include: {
      employee: true,
      annualPlan: {
        include: {
          fiscalYear: true,
          department: true,
        },
      },
      approvals: {
        include: {
          approver: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(allocations)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { annualPlanId, employeeId, amount, type, notes } = body

  if (!annualPlanId || !employeeId || amount === undefined || !type) {
    return NextResponse.json(
      { error: 'Annual plan, employee, amount, and type are required' },
      { status: 400 }
    )
  }

  // Check if allocation already exists
  const existing = await prisma.budgetAllocation.findUnique({
    where: {
      annualPlanId_employeeId_type: {
        annualPlanId,
        employeeId,
        type,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'An allocation of this type already exists for this employee' },
      { status: 400 }
    )
  }

  // Validate against annual plan budget
  const annualPlan = await prisma.annualPlan.findUnique({
    where: { id: annualPlanId },
    include: { allocations: true },
  })

  if (!annualPlan) {
    return NextResponse.json(
      { error: 'Annual plan not found' },
      { status: 404 }
    )
  }

  const currentTotal = annualPlan.allocations.reduce((sum, a) => sum + a.amount, 0)
  const newTotal = currentTotal + parseFloat(amount)

  if (newTotal > annualPlan.totalBudget) {
    return NextResponse.json(
      {
        error: `Allocation exceeds budget. Available: $${(annualPlan.totalBudget - currentTotal).toLocaleString()}`,
      },
      { status: 400 }
    )
  }

  const allocation = await prisma.budgetAllocation.create({
    data: {
      annualPlanId,
      employeeId,
      amount: parseFloat(amount),
      type,
      notes,
      status: 'DRAFT',
    },
    include: {
      employee: true,
      annualPlan: {
        include: {
          fiscalYear: true,
          department: true,
        },
      },
    },
  })

  return NextResponse.json(allocation, { status: 201 })
}
