import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { comments } = body;
  const user = session.user as { id: string; role: string };

  // Get the workforce plan
  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
    include: {
      cycle: {
        include: {
          approvalChainLevels: {
            include: {
              assignees: true,
            },
            orderBy: { level: 'asc' },
          },
        },
      },
      approvals: {
        where: { status: 'PENDING' },
        orderBy: { step: 'asc' },
      },
    },
  });

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  if (workforcePlan.status !== 'SUBMITTED') {
    return NextResponse.json(
      { error: 'Only submitted plans can be approved' },
      { status: 400 }
    );
  }

  // Find current pending approval
  const pendingApproval = workforcePlan.approvals[0];
  if (!pendingApproval) {
    return NextResponse.json(
      { error: 'No pending approval found' },
      { status: 400 }
    );
  }

  // Verify user is authorized to approve
  if (pendingApproval.approverId !== user.id) {
    return NextResponse.json(
      { error: 'You are not authorized to approve this plan' },
      { status: 403 }
    );
  }

  // Determine if there are more approval levels
  const currentLevel = pendingApproval.step;
  const nextLevel = workforcePlan.cycle.approvalChainLevels.find(
    (l) => l.level === currentLevel + 1
  );

  const result = await prisma.$transaction(async (tx) => {
    // Update current approval to APPROVED
    await tx.approval.update({
      where: { id: pendingApproval.id },
      data: {
        status: 'APPROVED',
        comments,
        updatedAt: new Date(),
      },
    });

    if (nextLevel) {
      // Create next level approval
      const roleAssignee = nextLevel.assignees.find((a) => a.assigneeType === 'ROLE');
      const userAssignee = nextLevel.assignees.find((a) => a.assigneeType === 'USER');

      let approverId = userAssignee?.userId;
      const approverRole = roleAssignee?.roleType || 'FINANCE_ADMIN';

      if (!approverId && roleAssignee) {
        const approver = await tx.user.findFirst({
          where: { role: roleAssignee.roleType },
        });
        approverId = approver?.id;
      }

      if (approverId) {
        await tx.approval.create({
          data: {
            approverId,
            approverRole,
            status: 'PENDING',
            step: nextLevel.level,
            workforcePlanId: id,
          },
        });
      }

      // Plan stays in SUBMITTED status while more approvals pending
      return tx.workforcePlan.findUnique({
        where: { id },
        include: {
          cycle: true,
          department: true,
          approvals: {
            include: {
              approver: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } else {
      // Final approval - update plan status to APPROVED
      return tx.workforcePlan.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: {
          cycle: true,
          department: true,
          approvals: {
            include: {
              approver: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }
  });

  return NextResponse.json(result);
}
