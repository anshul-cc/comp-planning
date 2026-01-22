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

  // Get approved workforce plans
  const where: Record<string, unknown> = {
    status: { in: ['APPROVED', 'LOCKED'] },
  };
  if (cycleId) where.cycleId = cycleId;
  if (departmentId) where.departmentId = departmentId;

  const [plans, employees, departments] = await Promise.all([
    prisma.workforcePlan.findMany({
      where,
      include: {
        cycle: true,
        department: true,
        scenarios: {
          where: { isBaseline: true },
          include: {
            entries: true,
          },
        },
      },
    }),
    // Get actual employee counts by department
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: { status: 'ACTIVE' },
      _count: true,
      _sum: { currentSalary: true },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
    }),
  ]);

  // Create department stats map
  const deptStatsMap = new Map(
    employees.map((e) => [
      e.departmentId,
      { count: e._count, salary: e._sum.currentSalary || 0 },
    ])
  );

  const deptNameMap = new Map(departments.map((d) => [d.id, d.name]));

  // Calculate plan vs actual for each department
  const departmentStats = plans.map((plan) => {
    const baselineScenario = plan.scenarios[0];
    const actualStats = deptStatsMap.get(plan.departmentId) || { count: 0, salary: 0 };

    // Calculate planned totals
    let plannedHeadcount = 0;
    let plannedHires = 0;
    let plannedExits = 0;
    let plannedPayroll = 0;

    if (baselineScenario) {
      baselineScenario.entries.forEach((entry) => {
        plannedHeadcount += entry.currentHeadcount;
        plannedHires += entry.q1Hires + entry.q2Hires + entry.q3Hires + entry.q4Hires;
        plannedExits += entry.plannedExits;
        plannedPayroll += entry.totalPayrollImpact;
      });
    }

    const projectedEndHeadcount = plannedHeadcount + plannedHires - plannedExits;
    const actualHeadcount = actualStats.count;
    const headcountVariance = actualHeadcount - projectedEndHeadcount;
    const adherenceRate =
      projectedEndHeadcount > 0
        ? Math.min(100, (actualHeadcount / projectedEndHeadcount) * 100)
        : 100;

    return {
      departmentId: plan.departmentId,
      departmentName: deptNameMap.get(plan.departmentId) || 'Unknown',
      cycleId: plan.cycleId,
      cycleName: plan.cycle.name,
      planned: {
        startHeadcount: plannedHeadcount,
        hires: plannedHires,
        exits: plannedExits,
        endHeadcount: projectedEndHeadcount,
        payrollImpact: plannedPayroll,
      },
      actual: {
        headcount: actualHeadcount,
        payroll: actualStats.salary,
      },
      variance: {
        headcount: headcountVariance,
        headcountPercent:
          projectedEndHeadcount > 0
            ? ((headcountVariance / projectedEndHeadcount) * 100).toFixed(1)
            : '0',
        adherenceRate: adherenceRate.toFixed(1),
      },
    };
  });

  // Calculate overall summary
  const overallPlanned = departmentStats.reduce(
    (acc, d) => {
      acc.headcount += d.planned.endHeadcount;
      acc.hires += d.planned.hires;
      acc.exits += d.planned.exits;
      acc.payroll += d.planned.payrollImpact;
      return acc;
    },
    { headcount: 0, hires: 0, exits: 0, payroll: 0 }
  );

  const overallActual = departmentStats.reduce(
    (acc, d) => {
      acc.headcount += d.actual.headcount;
      acc.payroll += d.actual.payroll;
      return acc;
    },
    { headcount: 0, payroll: 0 }
  );

  const overallVariance = {
    headcount: overallActual.headcount - overallPlanned.headcount,
    headcountPercent:
      overallPlanned.headcount > 0
        ? (
            ((overallActual.headcount - overallPlanned.headcount) / overallPlanned.headcount) *
            100
          ).toFixed(1)
        : '0',
    adherenceRate:
      overallPlanned.headcount > 0
        ? Math.min(100, (overallActual.headcount / overallPlanned.headcount) * 100).toFixed(1)
        : '100',
  };

  return NextResponse.json({
    overall: {
      planned: overallPlanned,
      actual: overallActual,
      variance: overallVariance,
    },
    byDepartment: departmentStats,
  });
}
