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

  if (!comments) {
    return NextResponse.json(
      { error: 'Comments are required when rejecting a plan' },
      { status: 400 }
    );
  }

  // Get the workforce plan
  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
    include: {
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
      { error: 'Only submitted plans can be rejected' },
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

  // Verify user is authorized to reject
  if (pendingApproval.approverId !== user.id) {
    return NextResponse.json(
      { error: 'You are not authorized to reject this plan' },
      { status: 403 }
    );
  }

  // Update approval and plan status in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update current approval to REJECTED
    await tx.approval.update({
      where: { id: pendingApproval.id },
      data: {
        status: 'REJECTED',
        comments,
        updatedAt: new Date(),
      },
    });

    // Update plan status to REJECTED
    return tx.workforcePlan.update({
      where: { id },
      data: { status: 'REJECTED' },
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
  });

  return NextResponse.json(result);
}
