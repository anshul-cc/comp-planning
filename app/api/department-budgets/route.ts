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
  const deptId = searchParams.get('deptId');

  const where: Record<string, unknown> = {};

  if (cycleId) {
    where.cycleId = cycleId;
  }

  if (deptId) {
    where.deptId = deptId;
  }

  const budgets = await prisma.departmentBudget.findMany({
    where,
    include: {
      cycle: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      positionBudgets: {
        include: {
          positions: {
            include: {
              profile: true,
              assignments: {
                where: {
                  validTo: { gte: new Date() },
                },
                include: {
                  employee: {
                    select: {
                      id: true,
                      name: true,
                      employeeId: true,
                    },
                  },
                },
              },
            },
          },
          budgetTransactions: {
            orderBy: { txDate: 'desc' },
            take: 10,
          },
        },
      },
    },
    orderBy: [{ cycle: { startDate: 'desc' } }, { department: { name: 'asc' } }],
  });

  // Calculate consumed and available for each budget
  const result = budgets.map((budget) => {
    const totalAllocated = budget.positionBudgets.reduce(
      (sum, pb) => sum + Number(pb.allocatedAmount),
      0
    );

    const totalConsumed = budget.positionBudgets.reduce((sum, pb) => {
      // Sum up encumbrances from transactions
      const consumed = pb.budgetTransactions
        .filter((tx) => tx.txType === 'ENCUMBER')
        .reduce((txSum, tx) => txSum + Math.abs(Number(tx.amount)), 0);
      return sum + consumed;
    }, 0);

    const filledPositions = budget.positionBudgets.reduce(
      (count, pb) =>
        count +
        pb.positions.filter((p) =>
          p.assignments.some((a) => a.assignmentType === 'PRIMARY')
        ).length,
      0
    );

    const totalPositions = budget.positionBudgets.reduce(
      (count, pb) => count + pb.positions.length,
      0
    );

    return {
      ...budget,
      totalBudget: Number(budget.totalBudget),
      totalAllocated,
      totalConsumed,
      available: Number(budget.totalBudget) - totalAllocated,
      utilizationRate:
        totalAllocated > 0
          ? ((totalConsumed / totalAllocated) * 100).toFixed(1)
          : '0',
      filledPositions,
      totalPositions,
      vacantPositions: totalPositions - filledPositions,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { cycleId, deptId, totalBudget, currency = 'INR' } = body;

  // Validate required fields
  if (!cycleId || !deptId || totalBudget === undefined) {
    return NextResponse.json(
      { error: 'cycleId, deptId, and totalBudget are required' },
      { status: 400 }
    );
  }

  // Verify cycle exists
  const cycle = await prisma.planningCycle.findUnique({
    where: { id: cycleId },
  });
  if (!cycle) {
    return NextResponse.json({ error: 'Planning cycle not found' }, { status: 404 });
  }

  // Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: deptId },
  });
  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  // Check for existing budget
  const existing = await prisma.departmentBudget.findUnique({
    where: {
      cycleId_deptId: {
        cycleId,
        deptId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Budget already exists for this cycle and department' },
      { status: 400 }
    );
  }

  const budget = await prisma.departmentBudget.create({
    data: {
      cycleId,
      deptId,
      totalBudget,
      currency,
    },
    include: {
      cycle: true,
      department: true,
    },
  });

  return NextResponse.json(
    {
      ...budget,
      totalBudget: Number(budget.totalBudget),
    },
    { status: 201 }
  );
}
