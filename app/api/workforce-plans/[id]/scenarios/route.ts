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

  const scenarios = await prisma.workforcePlanScenario.findMany({
    where: { workforcePlanId: id },
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
    orderBy: [{ isBaseline: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json(scenarios);
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
  const { name, isBaseline = false, copyFromScenarioId } = body;

  if (!name) {
    return NextResponse.json({ error: 'Scenario name is required' }, { status: 400 });
  }

  // Verify workforce plan exists
  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
  });

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  // If setting as baseline, unset other baselines
  if (isBaseline) {
    await prisma.workforcePlanScenario.updateMany({
      where: { workforcePlanId: id, isBaseline: true },
      data: { isBaseline: false },
    });
  }

  // If copying from another scenario, get its entries
  let entriesToCopy: Array<{
    jobRoleId: string;
    jobLevelId: string;
    currentHeadcount: number;
    q1Hires: number;
    q2Hires: number;
    q3Hires: number;
    q4Hires: number;
    plannedExits: number;
    avgCompensation: number;
    totalPayrollImpact: number;
    notes: string | null;
  }> = [];

  if (copyFromScenarioId) {
    const sourceScenario = await prisma.workforcePlanScenario.findUnique({
      where: { id: copyFromScenarioId },
      include: { entries: true },
    });

    if (sourceScenario && sourceScenario.workforcePlanId === id) {
      entriesToCopy = sourceScenario.entries.map((entry) => ({
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
      }));
    }
  }

  const scenario = await prisma.workforcePlanScenario.create({
    data: {
      workforcePlanId: id,
      name,
      isBaseline,
      ...(entriesToCopy.length > 0
        ? {
            entries: {
              create: entriesToCopy,
            },
          }
        : {}),
    },
    include: {
      entries: {
        include: {
          jobRole: true,
          jobLevel: true,
        },
      },
      _count: {
        select: { entries: true },
      },
    },
  });

  return NextResponse.json(scenario, { status: 201 });
}
