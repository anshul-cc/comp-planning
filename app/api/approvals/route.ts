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
  const type = searchParams.get('type') // budget, headcount, hiring, compensation

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  // Filter by type if specified
  if (type === 'budget') {
    where.budgetAllocationId = { not: null }
  } else if (type === 'headcount') {
    where.headcountPlanId = { not: null }
  } else if (type === 'hiring') {
    where.hiringProposalId = { not: null }
  } else if (type === 'compensation') {
    where.compensationActionId = { not: null }
  }

  try {
    const approvals = await prisma.approval.findMany({
      where,
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
            proposer: {
              select: { id: true, name: true },
            },
          },
        },
        compensationAction: {
          include: {
            compensationCycle: true,
            employee: true,
            proposer: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform the data to include the approval type
    const transformedApprovals = approvals.map(approval => {
      let approvalType = 'unknown'
      let entityName = 'Unknown'
      let entityDetails = {}

      if (approval.budgetAllocationId) {
        approvalType = 'budget'
        const ba = approval.budgetAllocation
        entityName = ba?.department?.name || ba?.costCenter?.name || ba?.businessUnit?.name || 'Budget Allocation'
        entityDetails = {
          cycleName: ba?.cycle?.name,
          totalBudget: ba?.totalBudget,
        }
      } else if (approval.headcountPlanId) {
        approvalType = 'headcount'
        const hp = approval.headcountPlan
        entityName = hp?.department?.name || 'Headcount Plan'
        entityDetails = {
          cycleName: hp?.cycle?.name,
          plannedHeadcount: hp?.plannedHeadcount,
          actualHeadcount: hp?.actualHeadcount,
        }
      } else if (approval.hiringProposalId) {
        approvalType = 'hiring'
        const hp = approval.hiringProposal
        entityName = hp?.positionTitle || 'Hiring Proposal'
        entityDetails = {
          department: hp?.department?.name,
          quantity: hp?.quantity,
          proposedSalary: hp?.proposedSalary,
          proposedBy: hp?.proposer?.name,
        }
      } else if (approval.compensationActionId) {
        approvalType = 'compensation'
        const ca = approval.compensationAction
        entityName = ca?.employee?.name || 'Compensation Action'
        entityDetails = {
          actionType: ca?.actionType,
          currentSalary: ca?.currentSalary,
          proposedSalary: ca?.proposedSalary,
          proposedBy: ca?.proposer?.name,
        }
      }

      return {
        ...approval,
        approvalType,
        entityName,
        entityDetails,
      }
    })

    return NextResponse.json(transformedApprovals)
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      budgetAllocationId,
      headcountPlanId,
      hiringProposalId,
      compensationActionId,
      step = 1
    } = body

    // Ensure at least one entity is provided
    if (!budgetAllocationId && !headcountPlanId && !hiringProposalId && !compensationActionId) {
      return NextResponse.json(
        { error: 'At least one entity ID must be provided' },
        { status: 400 }
      )
    }

    const userId = (session.user as { id?: string })?.id
    const userRole = (session.user as { role?: string })?.role

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 })
    }

    const approval = await prisma.approval.create({
      data: {
        approverId: userId,
        approverRole: userRole || 'USER',
        status: 'PENDING',
        step,
        budgetAllocationId: budgetAllocationId || null,
        headcountPlanId: headcountPlanId || null,
        hiringProposalId: hiringProposalId || null,
        compensationActionId: compensationActionId || null,
      },
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('Error creating approval:', error)
    return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 })
  }
}
