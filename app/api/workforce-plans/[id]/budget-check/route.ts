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

  // Get the workforce plan with related budget allocation
  const workforcePlan = await prisma.workforcePlan.findUnique({
    where: { id },
    include: {
      cycle: true,
      department: true,
      scenarios: {
        include: {
          entries: true,
        },
      },
    },
  });

  if (!workforcePlan) {
    return NextResponse.json({ error: 'Workforce plan not found' }, { status: 404 });
  }

  // Get the target scenario
  let targetScenario = scenarioId
    ? workforcePlan.scenarios.find((s) => s.id === scenarioId)
    : workforcePlan.scenarios.find((s) => s.isBaseline);

  if (!targetScenario) {
    targetScenario = workforcePlan.scenarios[0];
  }

  if (!targetScenario) {
    return NextResponse.json({ error: 'No scenario found' }, { status: 404 });
  }

  // Get budget allocation for this department and cycle
  const budgetAllocation = await prisma.budgetAllocation.findFirst({
    where: {
      cycleId: workforcePlan.cycleId,
      departmentId: workforcePlan.departmentId,
    },
  });

  // Calculate totals from entries
  const entries = targetScenario.entries;
  let totalCurrentPayroll = 0;
  let totalNewHiresPayroll = 0;
  let q1Payroll = 0;
  let q2Payroll = 0;
  let q3Payroll = 0;
  let q4Payroll = 0;

  entries.forEach((entry) => {
    totalCurrentPayroll += entry.currentHeadcount * entry.avgCompensation;

    // Calculate payroll impact by quarter (annualized)
    // Q1 hires work 12 months, Q2 hires work 9 months, Q3 hires work 6 months, Q4 hires work 3 months
    q1Payroll += entry.q1Hires * entry.avgCompensation;
    q2Payroll += entry.q2Hires * entry.avgCompensation * 0.75;
    q3Payroll += entry.q3Hires * entry.avgCompensation * 0.5;
    q4Payroll += entry.q4Hires * entry.avgCompensation * 0.25;

    totalNewHiresPayroll += entry.totalPayrollImpact;
  });

  // Get available budget
  const availableBudget = budgetAllocation?.newHiringBudget || 0;
  const salaryBudget = (budgetAllocation?.salaryFixed || 0) + (budgetAllocation?.salaryVariable || 0);
  const totalBudget = budgetAllocation?.totalBudget || 0;

  // Calculate variance
  const plannedSpend = totalNewHiresPayroll;
  const variance = availableBudget - plannedSpend;
  const variancePercent = availableBudget > 0 ? (variance / availableBudget) * 100 : 0;

  // Determine status
  let status: 'UNDER' | 'ON_TRACK' | 'OVER' = 'ON_TRACK';
  if (variance < 0) {
    status = 'OVER';
  } else if (variancePercent > 20) {
    status = 'UNDER';
  }

  // Calculate headcount summary
  const totalCurrentHeadcount = entries.reduce((sum, e) => sum + e.currentHeadcount, 0);
  const totalNewHires = entries.reduce(
    (sum, e) => sum + e.q1Hires + e.q2Hires + e.q3Hires + e.q4Hires,
    0
  );
  const totalExits = entries.reduce((sum, e) => sum + e.plannedExits, 0);
  const projectedEndHeadcount = totalCurrentHeadcount + totalNewHires - totalExits;

  return NextResponse.json({
    scenarioId: targetScenario.id,
    scenarioName: targetScenario.name,
    budget: {
      totalBudget,
      salaryBudget,
      hiringBudget: availableBudget,
      hasBudgetAllocation: !!budgetAllocation,
    },
    payroll: {
      currentPayroll: totalCurrentPayroll,
      newHiresPayroll: totalNewHiresPayroll,
      q1Payroll,
      q2Payroll,
      q3Payroll,
      q4Payroll,
      totalProjectedPayroll: totalCurrentPayroll + totalNewHiresPayroll,
    },
    headcount: {
      current: totalCurrentHeadcount,
      newHires: totalNewHires,
      exits: totalExits,
      projectedEnd: projectedEndHeadcount,
      netChange: totalNewHires - totalExits,
    },
    variance: {
      amount: variance,
      percent: variancePercent,
      status,
    },
  });
}
