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
  const status = searchParams.get('status')

  const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}

  const approvals = await prisma.approvalWorkflow.findMany({
    where,
    include: {
      allocation: {
        include: {
          employee: true,
          annualPlan: {
            include: {
              fiscalYear: true,
              department: true,
            },
          },
        },
      },
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(approvals)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { allocationId, approverId } = body

  if (!allocationId || !approverId) {
    return NextResponse.json(
      { error: 'Allocation and approver are required' },
      { status: 400 }
    )
  }

  // Update the allocation status to pending
  await prisma.budgetAllocation.update({
    where: { id: allocationId },
    data: { status: 'PENDING_APPROVAL' },
  })

  const approval = await prisma.approvalWorkflow.create({
    data: {
      allocationId,
      approverId,
      status: 'PENDING',
    },
    include: {
      allocation: {
        include: {
          employee: true,
          annualPlan: {
            include: {
              fiscalYear: true,
              department: true,
            },
          },
        },
      },
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return NextResponse.json(approval, { status: 201 })
}
