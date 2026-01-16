import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status, comments } = body

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json(
      { error: 'Valid status (APPROVED or REJECTED) is required' },
      { status: 400 }
    )
  }

  const approval = await prisma.approvalWorkflow.update({
    where: { id: params.id },
    data: {
      status,
      comments,
    },
    include: {
      allocation: true,
    },
  })

  // Update the allocation status based on approval decision
  const newAllocationStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
  await prisma.budgetAllocation.update({
    where: { id: approval.allocationId },
    data: { status: newAllocationStatus },
  })

  const updatedApproval = await prisma.approvalWorkflow.findUnique({
    where: { id: params.id },
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

  return NextResponse.json(updatedApproval)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const approval = await prisma.approvalWorkflow.findUnique({
    where: { id: params.id },
  })

  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  // Reset allocation status to draft
  await prisma.budgetAllocation.update({
    where: { id: approval.allocationId },
    data: { status: 'DRAFT' },
  })

  await prisma.approvalWorkflow.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
