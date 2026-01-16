import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allocation = await prisma.budgetAllocation.findUnique({
    where: { id: params.id },
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
  })

  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }

  return NextResponse.json(allocation)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { amount, notes, status } = body

  const existing = await prisma.budgetAllocation.findUnique({
    where: { id: params.id },
    include: {
      annualPlan: {
        include: { allocations: true },
      },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }

  // Validate against budget if amount is being updated
  if (amount !== undefined) {
    const otherAllocations = existing.annualPlan.allocations.filter(
      (a) => a.id !== params.id
    )
    const otherTotal = otherAllocations.reduce((sum, a) => sum + a.amount, 0)
    const newTotal = otherTotal + parseFloat(amount)

    if (newTotal > existing.annualPlan.totalBudget) {
      return NextResponse.json(
        {
          error: `Allocation exceeds budget. Available: $${(existing.annualPlan.totalBudget - otherTotal).toLocaleString()}`,
        },
        { status: 400 }
      )
    }
  }

  const allocation = await prisma.budgetAllocation.update({
    where: { id: params.id },
    data: {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      notes,
      status,
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

  return NextResponse.json(allocation)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.budgetAllocation.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
