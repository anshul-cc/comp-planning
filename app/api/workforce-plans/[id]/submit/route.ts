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
  const user = session.user as { id: string; role: string };

  // Get the workforce plan with scenarios and entries
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
      department: true,
      scenarios: {
        include: {
          entries: true,
        },
      },
    },
  });

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  // Only DRAFT or REJECTED plans can be submitted
  if (workforcePlan.status !== 'DRAFT' && workforcePlan.status !== 'REJECTED') {
    return NextResponse.json(
      { error: `Cannot submit a plan with status ${workforcePlan.status}` },
      { status: 400 }
    );
  }

  // Verify there's at least one scenario with entries
  const baselineScenario = workforcePlan.scenarios.find((s) => s.isBaseline);
  if (!baselineScenario || baselineScenario.entries.length === 0) {
    return NextResponse.json(
      { error: 'Plan must have a baseline scenario with at least one entry' },
      { status: 400 }
    );
  }

  // Create initial approval record based on approval chain
  const firstLevel = workforcePlan.cycle.approvalChainLevels[0];
  let approvalData = null;

  if (firstLevel) {
    // Find the appropriate approver
    const roleAssignee = firstLevel.assignees.find((a) => a.assigneeType === 'ROLE');
    const userAssignee = firstLevel.assignees.find((a) => a.assigneeType === 'USER');

    let approverId = userAssignee?.userId;
    let approverRole = roleAssignee?.roleType || 'DEPARTMENT_HEAD';

    // If role-based, find the appropriate user
    if (!approverId && roleAssignee) {
      if (roleAssignee.roleType === 'DEPARTMENT_HEAD' && workforcePlan.department.headId) {
        approverId = workforcePlan.department.headId;
      } else {
        // Find user with matching role
        const approver = await prisma.user.findFirst({
          where: { role: roleAssignee.roleType },
        });
        approverId = approver?.id;
      }
    }

    if (approverId) {
      approvalData = {
        approverId,
        approverRole,
        status: 'PENDING',
        step: firstLevel.level,
        workforcePlanId: id,
      };
    }
  }

  // Update plan status and create approval in a transaction
  const updatedPlan = await prisma.$transaction(async (tx) => {
    // Create approval record if we have approver data
    if (approvalData) {
      await tx.approval.create({
        data: approvalData,
      });
    }

    // Update the workforce plan
    return tx.workforcePlan.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedById: user.id,
      },
      include: {
        cycle: true,
        department: true,
        scenarios: {
          include: {
            entries: {
              include: {
                jobRole: true,
                jobLevel: true,
              },
            },
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
    });
  });

  return NextResponse.json(updatedPlan);
}
