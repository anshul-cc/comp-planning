import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Alert {
  id: string;
  type: 'HEADCOUNT_VARIANCE' | 'BUDGET_OVERRUN' | 'HIRING_DELAY' | 'EXIT_SPIKE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  departmentId: string;
  departmentName: string;
  message: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cycleId = searchParams.get('cycleId');
  const severity = searchParams.get('severity');

  // Get approved workforce plans with their entries
  const where: Record<string, unknown> = {
    status: { in: ['APPROVED', 'LOCKED'] },
  };
  if (cycleId) where.cycleId = cycleId;

  const [plans, employees, budgetAllocations] = await Promise.all([
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
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: { status: 'ACTIVE' },
      _count: true,
      _sum: { currentSalary: true },
    }),
    prisma.budgetAllocation.findMany({
      where: cycleId ? { cycleId } : {},
      select: {
        departmentId: true,
        newHiringBudget: true,
        totalBudget: true,
      },
    }),
  ]);

  const deptStatsMap = new Map(
    employees.map((e) => [
      e.departmentId,
      { count: e._count, salary: e._sum.currentSalary || 0 },
    ])
  );

  const budgetMap = new Map(
    budgetAllocations
      .filter((b) => b.departmentId)
      .map((b) => [b.departmentId, { hiringBudget: b.newHiringBudget, totalBudget: b.totalBudget }])
  );

  const alerts: Alert[] = [];

  // Analyze each plan for potential alerts
  plans.forEach((plan) => {
    const baselineScenario = plan.scenarios[0];
    if (!baselineScenario) return;

    const actualStats = deptStatsMap.get(plan.departmentId) || { count: 0, salary: 0 };
    const budget = budgetMap.get(plan.departmentId);

    // Calculate planned totals
    let plannedHeadcount = 0;
    let plannedHires = 0;
    let plannedExits = 0;
    let plannedPayroll = 0;

    baselineScenario.entries.forEach((entry) => {
      plannedHeadcount += entry.currentHeadcount;
      plannedHires += entry.q1Hires + entry.q2Hires + entry.q3Hires + entry.q4Hires;
      plannedExits += entry.plannedExits;
      plannedPayroll += entry.totalPayrollImpact;
    });

    const projectedEndHeadcount = plannedHeadcount + plannedHires - plannedExits;
    const headcountVariance = actualStats.count - projectedEndHeadcount;
    const headcountVariancePercent =
      projectedEndHeadcount > 0 ? (headcountVariance / projectedEndHeadcount) * 100 : 0;

    // Alert: Headcount Variance (>10% deviation)
    if (Math.abs(headcountVariancePercent) > 10) {
      const isOver = headcountVariance > 0;
      alerts.push({
        id: `hc-${plan.departmentId}`,
        type: 'HEADCOUNT_VARIANCE',
        severity: Math.abs(headcountVariancePercent) > 20 ? 'HIGH' : 'MEDIUM',
        departmentId: plan.departmentId,
        departmentName: plan.department.name,
        message: isOver
          ? `Headcount ${Math.abs(headcountVariance)} above plan (${Math.abs(headcountVariancePercent).toFixed(1)}% over)`
          : `Headcount ${Math.abs(headcountVariance)} below plan (${Math.abs(headcountVariancePercent).toFixed(1)}% under)`,
        details: {
          planned: projectedEndHeadcount,
          actual: actualStats.count,
          variance: headcountVariance,
          variancePercent: headcountVariancePercent.toFixed(1),
        },
        createdAt: new Date(),
      });
    }

    // Alert: Budget Overrun
    if (budget && plannedPayroll > budget.hiringBudget) {
      const overrunAmount = plannedPayroll - budget.hiringBudget;
      const overrunPercent = (overrunAmount / budget.hiringBudget) * 100;

      if (overrunPercent > 5) {
        alerts.push({
          id: `budget-${plan.departmentId}`,
          type: 'BUDGET_OVERRUN',
          severity: overrunPercent > 15 ? 'HIGH' : 'MEDIUM',
          departmentId: plan.departmentId,
          departmentName: plan.department.name,
          message: `Planned payroll exceeds hiring budget by $${overrunAmount.toLocaleString()} (${overrunPercent.toFixed(1)}%)`,
          details: {
            plannedPayroll,
            hiringBudget: budget.hiringBudget,
            overrunAmount,
            overrunPercent: overrunPercent.toFixed(1),
          },
          createdAt: new Date(),
        });
      }
    }

    // Alert: Hiring Delay (if actual hires significantly lag planned)
    const expectedHiresToDate = plannedHires * 0.5; // Assume 50% should be hired mid-year
    const actualHiresToDate = actualStats.count - plannedHeadcount;
    if (plannedHires > 0 && actualHiresToDate < expectedHiresToDate * 0.7) {
      alerts.push({
        id: `delay-${plan.departmentId}`,
        type: 'HIRING_DELAY',
        severity: actualHiresToDate < expectedHiresToDate * 0.5 ? 'HIGH' : 'MEDIUM',
        departmentId: plan.departmentId,
        departmentName: plan.department.name,
        message: `Hiring pace behind schedule. Expected ~${Math.round(expectedHiresToDate)} hires by now, actual: ${Math.max(0, actualHiresToDate)}`,
        details: {
          plannedHires,
          expectedByNow: Math.round(expectedHiresToDate),
          actual: Math.max(0, actualHiresToDate),
        },
        createdAt: new Date(),
      });
    }

    // Alert: Exit Spike
    const expectedExits = plannedExits * 0.5;
    const actualExits = plannedHeadcount - actualStats.count + actualHiresToDate;
    if (actualExits > expectedExits * 1.5 && actualExits > 2) {
      alerts.push({
        id: `exits-${plan.departmentId}`,
        type: 'EXIT_SPIKE',
        severity: actualExits > expectedExits * 2 ? 'HIGH' : 'MEDIUM',
        departmentId: plan.departmentId,
        departmentName: plan.department.name,
        message: `Higher than expected departures. Expected ~${Math.round(expectedExits)}, actual: ${Math.round(actualExits)}`,
        details: {
          plannedExits,
          expectedByNow: Math.round(expectedExits),
          actual: Math.round(actualExits),
        },
        createdAt: new Date(),
      });
    }
  });

  // Filter by severity if specified
  let filteredAlerts = alerts;
  if (severity) {
    filteredAlerts = alerts.filter((a) => a.severity === severity);
  }

  // Sort by severity (HIGH first) then by department
  filteredAlerts.sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.departmentName.localeCompare(b.departmentName);
  });

  return NextResponse.json({
    alerts: filteredAlerts,
    summary: {
      total: filteredAlerts.length,
      high: filteredAlerts.filter((a) => a.severity === 'HIGH').length,
      medium: filteredAlerts.filter((a) => a.severity === 'MEDIUM').length,
      low: filteredAlerts.filter((a) => a.severity === 'LOW').length,
    },
  });
}
