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
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'New scenario name is required' }, { status: 400 });
  }

  // Get source scenario with all its data
  const sourceScenario = await prisma.workforcePlanScenario.findUnique({
    where: { id },
    include: {
      workforcePlan: true,
      entries: true,
      exits: true,
    },
  });

  if (!sourceScenario) {
    return NextResponse.json({ error: 'Source scenario not found' }, { status: 404 });
  }

  // Check if plan is editable
  if (
    sourceScenario.workforcePlan.status === 'LOCKED' ||
    sourceScenario.workforcePlan.status === 'APPROVED'
  ) {
    return NextResponse.json(
      { error: 'Cannot clone scenarios for locked or approved plans' },
      { status: 400 }
    );
  }

  // Create new scenario with cloned entries and exits
  const newScenario = await prisma.workforcePlanScenario.create({
    data: {
      workforcePlanId: sourceScenario.workforcePlanId,
      name,
      isBaseline: false,
      entries: {
        create: sourceScenario.entries.map((entry) => ({
          jobRoleId: entry.jobRoleId,
          jobLevelId: entry.jobLevelId,
          currentHeadcount: entry.currentHeadcount,
          q1Hires: entry.q1Hires,
          q2Hires: entry.q2Hires,
          q3Hires: entry.q3Hires,
          q4Hires: entry.q4Hires,
          plannedExits: entry.plannedExits,
          avgCompensation: entry.avgCompensation,
          totalPayrollImpact: entry.totalPayrollImpact,
          notes: entry.notes,
        })),
      },
      exits: {
        create: sourceScenario.exits.map((exit) => ({
          jobRoleId: exit.jobRoleId,
          jobLevelId: exit.jobLevelId,
          exitMonth: exit.exitMonth,
          exitCount: exit.exitCount,
          reason: exit.reason,
        })),
      },
    },
    include: {
      entries: {
        include: {
          jobRole: true,
          jobLevel: true,
        },
      },
      exits: true,
      _count: {
        select: { entries: true, exits: true },
      },
    },
  });

  return NextResponse.json(newScenario, { status: 201 });
}
