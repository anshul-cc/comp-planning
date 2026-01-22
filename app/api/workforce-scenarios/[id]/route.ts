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

  const scenario = await prisma.workforcePlanScenario.findUnique({
    where: { id },
    include: {
      workforcePlan: {
        include: {
          cycle: true,
          department: true,
        },
      },
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
        orderBy: [{ jobRole: { name: 'asc' } }, { jobLevel: { levelCode: 'asc' } }],
      },
      exits: {
        orderBy: { exitMonth: 'asc' },
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  return NextResponse.json(scenario);
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
  const { name, isBaseline } = body;

  // Check if scenario exists
  const existing = await prisma.workforcePlanScenario.findUnique({
    where: { id },
    include: {
      workforcePlan: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  // Check if plan is editable
  if (existing.workforcePlan.status === 'LOCKED' || existing.workforcePlan.status === 'APPROVED') {
    return NextResponse.json(
      { error: 'Cannot modify scenarios for locked or approved plans' },
      { status: 400 }
    );
  }

  // If setting as baseline, unset other baselines
  if (isBaseline && !existing.isBaseline) {
    await prisma.workforcePlanScenario.updateMany({
      where: {
        workforcePlanId: existing.workforcePlanId,
        isBaseline: true,
      },
      data: { isBaseline: false },
    });
  }

  const scenario = await prisma.workforcePlanScenario.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(isBaseline !== undefined && { isBaseline }),
    },
    include: {
      _count: {
        select: { entries: true, exits: true },
      },
    },
  });

  return NextResponse.json(scenario);
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

  // Check if scenario exists
  const existing = await prisma.workforcePlanScenario.findUnique({
    where: { id },
    include: {
      workforcePlan: {
        include: {
          scenarios: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  // Check if plan is editable
  if (existing.workforcePlan.status === 'LOCKED' || existing.workforcePlan.status === 'APPROVED') {
    return NextResponse.json(
      { error: 'Cannot delete scenarios from locked or approved plans' },
      { status: 400 }
    );
  }

  // Cannot delete if it's the only scenario
  if (existing.workforcePlan.scenarios.length <= 1) {
    return NextResponse.json(
      { error: 'Cannot delete the only scenario in a plan' },
      { status: 400 }
    );
  }

  // Cannot delete baseline if there are other scenarios
  if (existing.isBaseline) {
    return NextResponse.json(
      { error: 'Cannot delete baseline scenario. Set another scenario as baseline first.' },
      { status: 400 }
    );
  }

  // Cascade delete will handle entries and exits
  await prisma.workforcePlanScenario.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
