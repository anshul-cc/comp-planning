import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cycle = await prisma.planningCycle.findUnique({
    where: { id: params.id },
    include: {
      budgetAllocations: {
        include: {
          department: true,
          costCenter: true,
          businessUnit: true,
        },
      },
      headcountPlans: {
        include: {
          department: true,
        },
      },
      compensationCycles: true,
      approvalChainLevels: {
        include: {
          assignees: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { level: 'asc' },
      },
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  return NextResponse.json(cycle);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    type,
    startDate,
    endDate,
    totalBudget,
    status,
    autoApproveIfMissing,
    skipApproverEmails,
    approvalLevels,
  } = body;

  const existing = await prisma.planningCycle.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  // Only allow editing approval chain when cycle is in DRAFT status
  if (approvalLevels !== undefined && existing.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Approval chain can only be modified when cycle is in DRAFT status' },
      { status: 400 }
    );
  }

  // If approval levels are being updated, delete existing and recreate
  if (approvalLevels !== undefined) {
    await prisma.approvalChainLevel.deleteMany({
      where: { cycleId: params.id },
    });
  }

  const cycle = await prisma.planningCycle.update({
    where: { id: params.id },
    data: {
      name: name ?? existing.name,
      type: type ?? existing.type,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      totalBudget: totalBudget !== undefined ? parseFloat(totalBudget) : existing.totalBudget,
      status: status ?? existing.status,
      autoApproveIfMissing: autoApproveIfMissing ?? existing.autoApproveIfMissing,
      skipApproverEmails: skipApproverEmails ?? existing.skipApproverEmails,
      ...(approvalLevels !== undefined && approvalLevels.length > 0
        ? {
            approvalChainLevels: {
              create: approvalLevels.map((level: { level: number; name?: string; assignees: Array<{ assigneeType: string; roleType?: string; userId?: string }> }, index: number) => ({
                level: index + 1,
                name: level.name || null,
                assignees: {
                  create: level.assignees.map((assignee: { assigneeType: string; roleType?: string; userId?: string }) => ({
                    assigneeType: assignee.assigneeType,
                    roleType: assignee.roleType || null,
                    userId: assignee.userId || null,
                  })),
                },
              })),
            },
          }
        : {}),
    },
    include: {
      budgetAllocations: true,
      headcountPlans: true,
      approvalChainLevels: {
        include: {
          assignees: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { level: 'asc' },
      },
    },
  });

  return NextResponse.json(cycle);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.planningCycle.findUnique({
    where: { id: params.id },
    include: {
      budgetAllocations: true,
      headcountPlans: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  if (existing.budgetAllocations.length > 0 || existing.headcountPlans.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete cycle with existing allocations or headcount plans' },
      { status: 400 }
    );
  }

  await prisma.planningCycle.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
