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

  const [plans, hiresByMonth] = await Promise.all([
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
    // Get actual hires by month (based on hireDate)
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: {
        status: 'ACTIVE',
        hireDate: {
          gte: new Date(new Date().getFullYear(), 0, 1), // Start of current year
        },
      },
      _count: true,
    }),
  ]);

  // Calculate quarterly planned vs actual
  const quarterlyData = {
    q1: { planned: 0, actual: 0 },
    q2: { planned: 0, actual: 0 },
    q3: { planned: 0, actual: 0 },
    q4: { planned: 0, actual: 0 },
  };

  // Aggregate planned hires by quarter
  plans.forEach((plan) => {
    const baselineScenario = plan.scenarios[0];
    if (!baselineScenario) return;

    baselineScenario.entries.forEach((entry) => {
      quarterlyData.q1.planned += entry.q1Hires;
      quarterlyData.q2.planned += entry.q2Hires;
      quarterlyData.q3.planned += entry.q3Hires;
      quarterlyData.q4.planned += entry.q4Hires;
    });
  });

  // Get actual hires count for the year
  const currentYear = new Date().getFullYear();
  const actualHiresCount = await prisma.employee.count({
    where: {
      status: 'ACTIVE',
      hireDate: {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1),
      },
      ...(departmentId ? { departmentId } : {}),
    },
  });

  // Detailed hires by month for velocity calculation
  const hiresByMonthData = await prisma.employee.findMany({
    where: {
      status: 'ACTIVE',
      hireDate: {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1),
      },
      ...(departmentId ? { departmentId } : {}),
    },
    select: {
      hireDate: true,
      departmentId: true,
    },
  });

  // Group by month
  const monthlyHires = Array(12).fill(0);
  hiresByMonthData.forEach((emp) => {
    const month = emp.hireDate.getMonth();
    monthlyHires[month]++;
  });

  // Assign to quarters
  quarterlyData.q1.actual = monthlyHires[0] + monthlyHires[1] + monthlyHires[2];
  quarterlyData.q2.actual = monthlyHires[3] + monthlyHires[4] + monthlyHires[5];
  quarterlyData.q3.actual = monthlyHires[6] + monthlyHires[7] + monthlyHires[8];
  quarterlyData.q4.actual = monthlyHires[9] + monthlyHires[10] + monthlyHires[11];

  // Calculate velocity metrics
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  // Determine what should be complete by now
  let expectedComplete = 0;
  let actualComplete = 0;

  if (currentQuarter >= 1) {
    expectedComplete += quarterlyData.q1.planned;
    actualComplete += quarterlyData.q1.actual;
  }
  if (currentQuarter >= 2) {
    expectedComplete += quarterlyData.q2.planned;
    actualComplete += quarterlyData.q2.actual;
  }
  if (currentQuarter >= 3) {
    expectedComplete += quarterlyData.q3.planned;
    actualComplete += quarterlyData.q3.actual;
  }
  if (currentQuarter >= 4) {
    expectedComplete += quarterlyData.q4.planned;
    actualComplete += quarterlyData.q4.actual;
  }

  const totalPlanned =
    quarterlyData.q1.planned +
    quarterlyData.q2.planned +
    quarterlyData.q3.planned +
    quarterlyData.q4.planned;

  const totalActual =
    quarterlyData.q1.actual +
    quarterlyData.q2.actual +
    quarterlyData.q3.actual +
    quarterlyData.q4.actual;

  const velocityRate = expectedComplete > 0 ? (actualComplete / expectedComplete) * 100 : 100;

  // Project year-end based on current velocity
  const monthsElapsed = currentMonth + 1;
  const avgMonthlyHires = totalActual / monthsElapsed;
  const projectedYearEnd = Math.round(avgMonthlyHires * 12);

  return NextResponse.json({
    quarterly: quarterlyData,
    monthly: monthlyHires.map((count, index) => ({
      month: index + 1,
      monthName: new Date(2024, index).toLocaleString('default', { month: 'short' }),
      hires: count,
    })),
    velocity: {
      rate: velocityRate.toFixed(1),
      status: velocityRate >= 90 ? 'ON_TRACK' : velocityRate >= 70 ? 'AT_RISK' : 'BEHIND',
      expectedByNow: expectedComplete,
      actualByNow: actualComplete,
      variance: actualComplete - expectedComplete,
    },
    projection: {
      totalPlanned,
      totalActual,
      projectedYearEnd,
      gap: totalPlanned - projectedYearEnd,
    },
    cumulativeGrowth: (() => {
      let cumulative = 0;
      return monthlyHires.map((count, index) => {
        cumulative += count;
        return {
          month: index + 1,
          monthName: new Date(2024, index).toLocaleString('default', { month: 'short' }),
          cumulative,
        };
      });
    })(),
  });
}
