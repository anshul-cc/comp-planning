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

  const where: Record<string, unknown> = {};
  if (cycleId) where.cycleId = cycleId;
  if (departmentId) where.departmentId = departmentId;

  const headcountPlans = await prisma.headcountPlan.findMany({
    where,
    include: {
      cycle: true,
      department: {
        include: {
          _count: {
            select: { employees: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate actual headcount from employees
  const plansWithActuals = await Promise.all(
    headcountPlans.map(async (plan) => {
      const actualHeadcount = await prisma.employee.count({
        where: {
          departmentId: plan.departmentId,
          status: 'ACTIVE',
        },
      });
      const actualWageCost = await prisma.employee.aggregate({
        where: {
          departmentId: plan.departmentId,
          status: 'ACTIVE',
        },
        _sum: { currentSalary: true },
      });

      // Calculate fill rate with division by zero handling
      let fillRate = null;
      if (plan.plannedHeadcount > 0) {
        fillRate = (actualHeadcount / plan.plannedHeadcount) * 100;
      } else if (actualHeadcount === 0) {
        fillRate = 100; // Both are 0, consider fully staffed
      }

      return {
        ...plan,
        actualHeadcount,
        actualWageCost: actualWageCost._sum.currentSalary || 0,
        fillRate,
        shortfall: plan.plannedHeadcount - actualHeadcount,
      };
    })
  );

  return NextResponse.json(plansWithActuals);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    cycleId,
    departmentId,
    roleId,
    plannedHeadcount,
    wageBudget,
    avgHiringCost = 0,
    avgHiringCostFixed = 0,
    avgHiringCostVariable = 0,
    avgHiringCostBenefits = 0,
    notes,
  } = body;

  if (!cycleId || !departmentId || plannedHeadcount === undefined || wageBudget === undefined) {
    return NextResponse.json(
      { error: 'Cycle, department, planned headcount, and wage budget are required' },
      { status: 400 }
    );
  }

  // Verify cycle exists
  const cycle = await prisma.planningCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  // Check for existing plan
  const existing = await prisma.headcountPlan.findUnique({
    where: {
      cycleId_departmentId: {
        cycleId,
        departmentId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A headcount plan already exists for this department and cycle' },
      { status: 400 }
    );
  }

  const headcountPlan = await prisma.headcountPlan.create({
    data: {
      cycleId,
      departmentId,
      roleId: roleId || null,
      plannedHeadcount: parseInt(String(plannedHeadcount)),
      wageBudget: parseFloat(String(wageBudget)),
      avgHiringCost: parseFloat(String(avgHiringCost)),
      avgHiringCostFixed: parseFloat(String(avgHiringCostFixed)),
      avgHiringCostVariable: parseFloat(String(avgHiringCostVariable)),
      avgHiringCostBenefits: parseFloat(String(avgHiringCostBenefits)),
      notes,
      status: 'DRAFT',
    },
    include: {
      cycle: true,
      department: true,
    },
  });

  return NextResponse.json(headcountPlan, { status: 201 });
}
