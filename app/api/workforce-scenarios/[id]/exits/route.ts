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

  const exits = await prisma.plannedExit.findMany({
    where: { scenarioId: id },
    orderBy: [{ exitMonth: 'asc' }, { reason: 'asc' }],
  });

  // Group by month for summary
  const byMonth = exits.reduce(
    (acc, exit) => {
      if (!acc[exit.exitMonth]) {
        acc[exit.exitMonth] = { total: 0, byReason: {} };
      }
      acc[exit.exitMonth].total += exit.exitCount;
      acc[exit.exitMonth].byReason[exit.reason] =
        (acc[exit.exitMonth].byReason[exit.reason] || 0) + exit.exitCount;
      return acc;
    },
    {} as Record<number, { total: number; byReason: Record<string, number> }>
  );

  const totalExits = exits.reduce((sum, e) => sum + e.exitCount, 0);

  return NextResponse.json({
    exits,
    summary: {
      total: totalExits,
      byMonth,
    },
  });
}

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
  const { jobRoleId, jobLevelId, exitMonth, exitCount = 1, reason } = body;

  if (!jobRoleId || !jobLevelId || !exitMonth || !reason) {
    return NextResponse.json(
      { error: 'Job role, job level, exit month, and reason are required' },
      { status: 400 }
    );
  }

  // Validate exit month
  if (exitMonth < 1 || exitMonth > 12) {
    return NextResponse.json(
      { error: 'Exit month must be between 1 and 12' },
      { status: 400 }
    );
  }

  // Validate reason
  const validReasons = ['ATTRITION', 'RETIREMENT', 'RESTRUCTURING'];
  if (!validReasons.includes(reason)) {
    return NextResponse.json(
      { error: `Reason must be one of: ${validReasons.join(', ')}` },
      { status: 400 }
    );
  }

  // Verify scenario exists and plan is editable
  const scenario = await prisma.workforcePlanScenario.findUnique({
    where: { id },
    include: {
      workforcePlan: true,
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  if (
    scenario.workforcePlan.status === 'LOCKED' ||
    scenario.workforcePlan.status === 'APPROVED'
  ) {
    return NextResponse.json(
      { error: 'Cannot add exits to locked or approved plans' },
      { status: 400 }
    );
  }

  const plannedExit = await prisma.plannedExit.create({
    data: {
      scenarioId: id,
      jobRoleId,
      jobLevelId,
      exitMonth,
      exitCount: parseInt(String(exitCount)),
      reason,
    },
  });

  // Update the total planned exits in the entry
  await prisma.workforcePlanEntry.updateMany({
    where: {
      scenarioId: id,
      jobRoleId,
      jobLevelId,
    },
    data: {
      plannedExits: {
        increment: parseInt(String(exitCount)),
      },
    },
  });

  return NextResponse.json(plannedExit, { status: 201 });
}
