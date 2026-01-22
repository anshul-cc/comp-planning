import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
    include: {
      cycle: true,
      department: {
        include: {
          head: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      scenarios: {
        include: {
          entries: {
            include: {
              jobRole: {
                include: {
                  subFamily: {
                    include: {
                      jobFamily: true,
                    },
                  },
                },
              },
              jobLevel: {
                include: {
                  payGrade: true,
                },
              },
            },
            orderBy: [
              { jobRole: { name: 'asc' } },
              { jobLevel: { levelCode: 'asc' } },
            ],
          },
          exits: true,
        },
      },
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

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  return NextResponse.json(workforcePlan);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, notes } = body;

  // Check if plan exists
  const existing = await prisma.workforcePlan.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'REJECTED', 'DRAFT'],
    APPROVED: ['LOCKED'],
    REJECTED: ['DRAFT'],
    LOCKED: [],
  };

  if (status && !validTransitions[existing.status]?.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${existing.status} to ${status}` },
      { status: 400 }
    );
  }

  const workforcePlan = await prisma.workforcePlan.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      cycle: true,
      department: true,
      scenarios: true,
    },
  });

  return NextResponse.json(workforcePlan);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check if plan exists
  const existing = await prisma.workforcePlan.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  // Only allow deletion of DRAFT plans
  if (existing.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only draft plans can be deleted' },
      { status: 400 }
    );
  }

  // Cascade delete will handle scenarios, entries, and exits
  await prisma.workforcePlan.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
