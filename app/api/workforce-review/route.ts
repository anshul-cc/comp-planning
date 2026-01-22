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
  const status = searchParams.get('status');
  const cycleId = searchParams.get('cycleId');
  const limit = parseInt(searchParams.get('limit') || '25');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Build where clause for submitted plans
  const where: Record<string, unknown> = {
    status: status || { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
  };
  if (cycleId) where.cycleId = cycleId;

  const [plans, total, summaryStats] = await Promise.all([
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
          where: { isBaseline: true },
          include: {
            entries: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.workforcePlan.count({ where }),
    // Get summary stats
    prisma.workforcePlan.groupBy({
      by: ['status'],
      where: { status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] } },
      _count: true,
    }),
  ]);

  // Calculate stats for each plan
  const plansWithStats = plans.map((plan) => {
    const baselineScenario = plan.scenarios[0];
    let totalHeadcount = 0;
    let totalHires = 0;
    let totalPayrollImpact = 0;

    if (baselineScenario) {
      baselineScenario.entries.forEach((entry) => {
        totalHeadcount += entry.currentHeadcount;
        totalHires += entry.q1Hires + entry.q2Hires + entry.q3Hires + entry.q4Hires;
        totalPayrollImpact += entry.totalPayrollImpact;
      });
    }

    // Get latest approval status
    const latestApproval = plan.approvals[0];

    return {
      id: plan.id,
      cycleId: plan.cycleId,
      cycleName: plan.cycle.name,
      departmentId: plan.departmentId,
      departmentName: plan.department.name,
      departmentHead: plan.department.head,
      status: plan.status,
      submittedAt: plan.submittedAt,
      stats: {
        currentHeadcount: totalHeadcount,
        totalHires,
        netChange: totalHires - (baselineScenario?.entries.reduce((sum, e) => sum + e.plannedExits, 0) || 0),
        totalPayrollImpact,
      },
      latestApproval: latestApproval
        ? {
            status: latestApproval.status,
            approver: latestApproval.approver,
            comments: latestApproval.comments,
            updatedAt: latestApproval.updatedAt,
          }
        : null,
    };
  });

  // Build summary
  const summary = {
    pending: summaryStats.find((s) => s.status === 'SUBMITTED')?._count || 0,
    approved: summaryStats.find((s) => s.status === 'APPROVED')?._count || 0,
    rejected: summaryStats.find((s) => s.status === 'REJECTED')?._count || 0,
  };

  return NextResponse.json({
    data: plansWithStats,
    total,
    limit,
    offset,
    summary,
  });
}
