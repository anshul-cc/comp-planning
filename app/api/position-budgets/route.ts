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
  const budgetId = searchParams.get('budgetId');

  const where: Record<string, unknown> = {};

  if (budgetId) {
    where.budgetId = budgetId;
  }

  const positionBudgets = await prisma.positionBudget.findMany({
    where,
    include: {
      departmentBudget: {
        include: {
          cycle: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      },
      positions: {
        include: {
          profile: true,
          assignments: {
            where: {
              validTo: { gte: new Date() },
            },
            include: {
              employee: {
                select: { id: true, name: true, employeeId: true },
              },
            },
          },
        },
      },
      budgetTransactions: {
        orderBy: { txDate: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = positionBudgets.map((pb) => {
    const encumbered = pb.budgetTransactions
      .filter((tx) => tx.txType === 'ENCUMBER')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const released = pb.budgetTransactions
      .filter((tx) => tx.txType === 'RELEASE')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      ...pb,
      allocatedAmount: Number(pb.allocatedAmount),
      consumedAmount: encumbered - released,
      availableAmount: Number(pb.allocatedAmount) - (encumbered - released),
      positionCount: pb.positions.length,
      filledCount: pb.positions.filter((p) =>
        p.assignments.some((a) => a.assignmentType === 'PRIMARY')
      ).length,
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
  const { budgetId, allocatedAmount, positionIds = [] } = body;

  // Validate required fields
  if (!budgetId || allocatedAmount === undefined) {
    return NextResponse.json(
      { error: 'budgetId and allocatedAmount are required' },
      { status: 400 }
    );
  }

  // Verify department budget exists
  const departmentBudget = await prisma.departmentBudget.findUnique({
    where: { id: budgetId },
    include: {
      positionBudgets: true,
    },
  });

  if (!departmentBudget) {
    return NextResponse.json({ error: 'Department budget not found' }, { status: 404 });
  }

  // Check if allocation would exceed total budget
  const currentAllocated = departmentBudget.positionBudgets.reduce(
    (sum, pb) => sum + Number(pb.allocatedAmount),
    0
  );

  if (currentAllocated + allocatedAmount > Number(departmentBudget.totalBudget)) {
    return NextResponse.json(
      {
        error: `Allocation would exceed budget. Available: ${Number(departmentBudget.totalBudget) - currentAllocated}, Requested: ${allocatedAmount}`,
      },
      { status: 400 }
    );
  }

  // Verify positions exist and belong to the same department
  if (positionIds.length > 0) {
    const positions = await prisma.position.findMany({
      where: {
        id: { in: positionIds },
      },
    });

    if (positions.length !== positionIds.length) {
      return NextResponse.json({ error: 'Some positions not found' }, { status: 404 });
    }

    const invalidPositions = positions.filter(
      (p) => p.deptId !== departmentBudget.deptId
    );
    if (invalidPositions.length > 0) {
      return NextResponse.json(
        { error: 'Some positions do not belong to the budget department' },
        { status: 400 }
      );
    }
  }

  const positionBudget = await prisma.positionBudget.create({
    data: {
      budgetId,
      allocatedAmount,
      positions: positionIds.length > 0
        ? {
            connect: positionIds.map((id: string) => ({ id })),
          }
        : undefined,
    },
    include: {
      departmentBudget: {
        include: {
          cycle: true,
          department: true,
        },
      },
      positions: {
        include: {
          profile: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      ...positionBudget,
      allocatedAmount: Number(positionBudget.allocatedAmount),
    },
    { status: 201 }
  );
}
