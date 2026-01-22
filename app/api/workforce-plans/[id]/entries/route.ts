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
  const searchParams = request.nextUrl.searchParams;
  const scenarioId = searchParams.get('scenarioId');

  // Verify workforce plan exists
  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
    include: {
      scenarios: true,
    },
  });

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  // Get entries for specified scenario or baseline
  let targetScenarioId = scenarioId;
  if (!targetScenarioId) {
    const baselineScenario = workforcePlan.scenarios.find((s) => s.isBaseline);
    targetScenarioId = baselineScenario?.id || workforcePlan.scenarios[0]?.id;
  }

  if (!targetScenarioId) {
    return NextResponse.json({ error: 'No scenario found' }, { status: 404 });
  }

  const entries = await prisma.workforcePlanEntry.findMany({
    where: { scenarioId: targetScenarioId },
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
  });

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => {
      acc.currentHeadcount += entry.currentHeadcount;
      acc.q1Hires += entry.q1Hires;
      acc.q2Hires += entry.q2Hires;
      acc.q3Hires += entry.q3Hires;
      acc.q4Hires += entry.q4Hires;
      acc.plannedExits += entry.plannedExits;
      acc.totalPayrollImpact += entry.totalPayrollImpact;
      return acc;
    },
    {
      currentHeadcount: 0,
      q1Hires: 0,
      q2Hires: 0,
      q3Hires: 0,
      q4Hires: 0,
      plannedExits: 0,
      totalPayrollImpact: 0,
    }
  );

  const totalHires = totals.q1Hires + totals.q2Hires + totals.q3Hires + totals.q4Hires;
  const netChange = totalHires - totals.plannedExits;

  return NextResponse.json({
    scenarioId: targetScenarioId,
    entries,
    totals: {
      ...totals,
      totalHires,
      netChange,
    },
  });
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
  const { scenarioId, entries } = body;

  if (!scenarioId || !entries || !Array.isArray(entries)) {
    return NextResponse.json(
      { error: 'Scenario ID and entries array are required' },
      { status: 400 }
    );
  }

  // Verify workforce plan exists and is editable
  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
    include: {
      scenarios: true,
    },
  });

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  if (workforcePlan.status === 'LOCKED' || workforcePlan.status === 'APPROVED') {
    return NextResponse.json(
      { error: 'Cannot modify entries for locked or approved plans' },
      { status: 400 }
    );
  }

  // Verify scenario belongs to this plan
  const scenario = workforcePlan.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    return NextResponse.json(
      { error: 'Scenario not found in this plan' },
      { status: 404 }
    );
  }

  // Process entries - upsert each one
  const results = await Promise.all(
    entries.map(
      async (entry: {
        id?: string;
        jobRoleId: string;
        jobLevelId: string;
        currentHeadcount?: number;
        q1Hires?: number;
        q2Hires?: number;
        q3Hires?: number;
        q4Hires?: number;
        plannedExits?: number;
        avgCompensation?: number;
        notes?: string;
      }) => {
        const totalHires =
          (entry.q1Hires || 0) +
          (entry.q2Hires || 0) +
          (entry.q3Hires || 0) +
          (entry.q4Hires || 0);
        const avgComp = entry.avgCompensation || 0;
        const totalPayrollImpact = totalHires * avgComp;

        return prisma.workforcePlanEntry.upsert({
          where: {
            scenarioId_jobRoleId_jobLevelId: {
              scenarioId,
              jobRoleId: entry.jobRoleId,
              jobLevelId: entry.jobLevelId,
            },
          },
          create: {
            scenarioId,
            jobRoleId: entry.jobRoleId,
            jobLevelId: entry.jobLevelId,
            currentHeadcount: entry.currentHeadcount || 0,
            q1Hires: entry.q1Hires || 0,
            q2Hires: entry.q2Hires || 0,
            q3Hires: entry.q3Hires || 0,
            q4Hires: entry.q4Hires || 0,
            plannedExits: entry.plannedExits || 0,
            avgCompensation: avgComp,
            totalPayrollImpact,
            notes: entry.notes,
          },
          update: {
            currentHeadcount: entry.currentHeadcount,
            q1Hires: entry.q1Hires,
            q2Hires: entry.q2Hires,
            q3Hires: entry.q3Hires,
            q4Hires: entry.q4Hires,
            plannedExits: entry.plannedExits,
            avgCompensation: avgComp,
            totalPayrollImpact,
            notes: entry.notes,
          },
          include: {
            jobRole: true,
            jobLevel: true,
          },
        });
      }
    )
  );

  // Update the plan's updatedAt
  await prisma.workforcePlan.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ entries: results });
}
