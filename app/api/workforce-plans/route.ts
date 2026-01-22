import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cycleId = searchParams.get('cycleId');
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '25');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: Record<string, unknown> = {};
  if (cycleId) where.cycleId = cycleId;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  const [workforcePlans, total] = await Promise.all([
    prisma.workforcePlan.findMany({
      where,
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
            _count: {
              select: { entries: true },
            },
          },
        },
        _count: {
          select: { approvals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.workforcePlan.count({ where }),
  ]);

  // Calculate summary stats for each plan
  const plansWithStats = await Promise.all(
    workforcePlans.map(async (plan) => {
      // Get baseline scenario stats
      const baselineScenario = plan.scenarios.find((s) => s.isBaseline);
      let totalHeadcount = 0;
      let totalHires = 0;
      let totalPayrollImpact = 0;

      if (baselineScenario) {
        const entries = await prisma.workforcePlanEntry.findMany({
          where: { scenarioId: baselineScenario.id },
        });

        entries.forEach((entry) => {
          totalHeadcount += entry.currentHeadcount;
          totalHires += entry.q1Hires + entry.q2Hires + entry.q3Hires + entry.q4Hires;
          totalPayrollImpact += entry.totalPayrollImpact;
        });
      }

      return {
        ...plan,
        stats: {
          totalHeadcount,
          totalHires,
          totalPayrollImpact,
          scenarioCount: plan.scenarios.length,
        },
      };
    })
  );

  return NextResponse.json({ data: plansWithStats, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { cycleId, departmentId, notes } = body;

  if (!cycleId || !departmentId) {
    return NextResponse.json(
      { error: 'Cycle and department are required' },
      { status: 400 }
    );
  }

  // Verify cycle exists and is in appropriate status
  const cycle = await prisma.planningCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Planning cycle not found' }, { status: 404 });
  }

  // Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  // Check for existing plan
  const existing = await prisma.workforcePlan.findUnique({
    where: {
      cycleId_departmentId: {
        cycleId,
        departmentId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A workforce plan already exists for this department and cycle' },
      { status: 400 }
    );
  }

  // Create workforce plan with default baseline scenario
  const workforcePlan = await prisma.workforcePlan.create({
    data: {
      cycleId,
      departmentId,
      notes,
      status: 'DRAFT',
      scenarios: {
        create: {
          name: 'Baseline',
          isBaseline: true,
        },
      },
    },
    include: {
      cycle: true,
      department: true,
      scenarios: true,
    },
  });

  return NextResponse.json(workforcePlan, { status: 201 });
}
