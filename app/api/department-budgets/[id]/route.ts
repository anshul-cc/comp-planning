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

  const budget = await prisma.departmentBudget.findUnique({
    where: { id },
    include: {
      cycle: true,
      department: {
        include: {
          head: {
            select: { id: true, name: true, email: true },
          },
          budgetOwner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      positionBudgets: {
        include: {
          positions: {
            include: {
              profile: {
                include: {
                  jobFamily: true,
                },
              },
              assignments: {
                where: {
                  validTo: { gte: new Date() },
                },
                include: {
                  employee: true,
                  compensationSnapshots: {
                    where: {
                      effectiveTo: { gte: new Date() },
                    },
                  },
                },
              },
            },
          },
          budgetTransactions: {
            orderBy: { txDate: 'desc' },
          },
        },
      },
    },
  });

  if (!budget) {
    return NextResponse.json({ error: 'Department budget not found' }, { status: 404 });
  }

  // Calculate detailed metrics
  const positionBudgetDetails = budget.positionBudgets.map((pb) => {
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
      positions: pb.positions.map((pos) => ({
        ...pos,
        isVacant: !pos.assignments.some((a) => a.assignmentType === 'PRIMARY'),
        currentEmployee: pos.assignments.find((a) => a.assignmentType === 'PRIMARY')
          ?.employee || null,
        currentCompensation: pos.assignments
          .flatMap((a) => a.compensationSnapshots)
          .reduce((sum, snap) => sum + Number(snap.amountLocal), 0),
      })),
    };
  });

  const totalAllocated = positionBudgetDetails.reduce(
    (sum, pb) => sum + pb.allocatedAmount,
    0
  );
  const totalConsumed = positionBudgetDetails.reduce(
    (sum, pb) => sum + pb.consumedAmount,
    0
  );

  return NextResponse.json({
    ...budget,
    totalBudget: Number(budget.totalBudget),
    totalAllocated,
    totalConsumed,
    available: Number(budget.totalBudget) - totalAllocated,
    unallocated: Number(budget.totalBudget) - totalAllocated,
    positionBudgets: positionBudgetDetails,
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
  const { totalBudget, currency } = body;

  const existing = await prisma.departmentBudget.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Department budget not found' }, { status: 404 });
  }

  const budget = await prisma.departmentBudget.update({
    where: { id },
    data: {
      ...(totalBudget !== undefined && { totalBudget }),
      ...(currency && { currency }),
    },
    include: {
      cycle: true,
      department: true,
    },
  });

  return NextResponse.json({
    ...budget,
    totalBudget: Number(budget.totalBudget),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.departmentBudget.findUnique({
    where: { id },
    include: {
      positionBudgets: {
        include: {
          positions: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Department budget not found' }, { status: 404 });
  }

  // Check if there are positions linked to this budget
  const hasPositions = existing.positionBudgets.some((pb) => pb.positions.length > 0);
  if (hasPositions) {
    return NextResponse.json(
      { error: 'Cannot delete budget with linked positions' },
      { status: 400 }
    );
  }

  await prisma.departmentBudget.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
