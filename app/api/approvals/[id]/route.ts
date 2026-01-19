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

  try {
    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
        budgetAllocation: {
          include: {
            cycle: true,
            department: true,
            businessUnit: true,
            costCenter: true,
          },
        },
        headcountPlan: {
          include: {
            cycle: true,
            department: true,
          },
        },
        hiringProposal: {
          include: {
            cycle: true,
            department: true,
            role: true,
          },
        },
        compensationAction: {
          include: {
            compensationCycle: true,
            employee: true,
          },
        },
      },
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    return NextResponse.json(approval)
  } catch (error) {
    console.error('Error fetching approval:', error)
    return NextResponse.json({ error: 'Failed to fetch approval' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { status, comments } = body

    if (!status || !['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (APPROVED, REJECTED, or REVISION_REQUESTED) is required' },
        { status: 400 }
      )
    }

    // Get current approval to find linked entity
    const currentApproval = await prisma.approval.findUnique({
      where: { id: params.id },
    })

    if (!currentApproval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Update the approval
    const approval = await prisma.approval.update({
      where: { id: params.id },
      data: {
        status,
        comments: comments || null,
      },
    })

    // Update the linked entity status based on approval decision
    const newStatus = status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'REVISION_REQUIRED'

    if (currentApproval.budgetAllocationId) {
      await prisma.budgetAllocation.update({
        where: { id: currentApproval.budgetAllocationId },
        data: { status: newStatus },
      })
    } else if (currentApproval.headcountPlanId) {
      await prisma.headcountPlan.update({
        where: { id: currentApproval.headcountPlanId },
        data: { status: newStatus },
      })
    } else if (currentApproval.hiringProposalId) {
      await prisma.hiringProposal.update({
        where: { id: currentApproval.hiringProposalId },
        data: { status: newStatus },
      })
    } else if (currentApproval.compensationActionId) {
      await prisma.compensationAction.update({
        where: { id: currentApproval.compensationActionId },
        data: { status: newStatus },
      })
    }

    return NextResponse.json(approval)
  } catch (error) {
    console.error('Error updating approval:', error)
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Reset linked entity status to draft
    if (approval.budgetAllocationId) {
      await prisma.budgetAllocation.update({
        where: { id: approval.budgetAllocationId },
        data: { status: 'DRAFT' },
      })
    } else if (approval.headcountPlanId) {
      await prisma.headcountPlan.update({
        where: { id: approval.headcountPlanId },
        data: { status: 'DRAFT' },
      })
    } else if (approval.hiringProposalId) {
      await prisma.hiringProposal.update({
        where: { id: approval.hiringProposalId },
        data: { status: 'DRAFT' },
      })
    } else if (approval.compensationActionId) {
      await prisma.compensationAction.update({
        where: { id: approval.compensationActionId },
        data: { status: 'DRAFT' },
      })
    }

    await prisma.approval.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting approval:', error)
    return NextResponse.json({ error: 'Failed to delete approval' }, { status: 500 })
  }
}
