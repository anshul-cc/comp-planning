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

  const positionBudget = await prisma.positionBudget.findUnique({
    where: { id },
    include: {
      departmentBudget: {
        include: {
          cycle: true,
          department: true,
        },
      },
      positions: {
        include: {
          profile: {
            include: {
              jobFamily: true,
              compensationBands: {
                where: {
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: new Date() } },
                  ],
                },
                orderBy: { effectiveFrom: 'desc' },
                take: 1,
              },
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
  });

  if (!positionBudget) {
    return NextResponse.json({ error: 'Position budget not found' }, { status: 404 });
  }

  // Calculate metrics from transactions
  const encumbered = positionBudget.budgetTransactions
    .filter((tx) => tx.txType === 'ENCUMBER')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

  const released = positionBudget.budgetTransactions
    .filter((tx) => tx.txType === 'RELEASE')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const adjustments = positionBudget.budgetTransactions
    .filter((tx) => tx.txType === 'ADJUST')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const consumed = encumbered - released + adjustments;

  return NextResponse.json({
    ...positionBudget,
    allocatedAmount: Number(positionBudget.allocatedAmount),
    consumedAmount: consumed,
    availableAmount: Number(positionBudget.allocatedAmount) - consumed,
    metrics: {
      encumbered,
      released,
      adjustments,
    },
    positions: positionBudget.positions.map((pos) => ({
      ...pos,
      isVacant: !pos.assignments.some((a) => a.assignmentType === 'PRIMARY'),
      currentEmployee: pos.assignments.find((a) => a.assignmentType === 'PRIMARY')
        ?.employee || null,
      currentCompensation: pos.assignments
        .flatMap((a) => a.compensationSnapshots)
        .reduce((sum, snap) => sum + Number(snap.amountLocal), 0),
    })),
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
  const { allocatedAmount, addPositionIds = [], removePositionIds = [] } = body;

  const existing = await prisma.positionBudget.findUnique({
    where: { id },
    include: {
      departmentBudget: {
        include: {
          positionBudgets: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Position budget not found' }, { status: 404 });
  }

  // If changing allocation, verify it doesn't exceed department budget
  if (allocatedAmount !== undefined && allocatedAmount !== Number(existing.allocatedAmount)) {
    const otherAllocated = existing.departmentBudget.positionBudgets
      .filter((pb) => pb.id !== id)
      .reduce((sum, pb) => sum + Number(pb.allocatedAmount), 0);

    const totalBudget = Number(existing.departmentBudget.totalBudget);

    if (otherAllocated + allocatedAmount > totalBudget) {
      return NextResponse.json(
        {
          error: `Allocation would exceed budget. Available: ${totalBudget - otherAllocated}, Requested: ${allocatedAmount}`,
        },
        { status: 400 }
      );
    }
  }

  // Verify positions to add belong to the same department
  if (addPositionIds.length > 0) {
    const positions = await prisma.position.findMany({
      where: { id: { in: addPositionIds } },
    });

    const invalidPositions = positions.filter(
      (p) => p.deptId !== existing.departmentBudget.deptId
    );
    if (invalidPositions.length > 0) {
      return NextResponse.json(
        { error: 'Some positions do not belong to the budget department' },
        { status: 400 }
      );
    }
  }

  const positionBudget = await prisma.positionBudget.update({
    where: { id },
    data: {
      ...(allocatedAmount !== undefined && { allocatedAmount }),
      positions: {
        connect: addPositionIds.map((posId: string) => ({ id: posId })),
        disconnect: removePositionIds.map((posId: string) => ({ id: posId })),
      },
    },
    include: {
      departmentBudget: true,
      positions: {
        include: {
          profile: true,
        },
      },
    },
  });

  return NextResponse.json({
    ...positionBudget,
    allocatedAmount: Number(positionBudget.allocatedAmount),
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

  const existing = await prisma.positionBudget.findUnique({
    where: { id },
    include: {
      positions: true,
      budgetTransactions: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Position budget not found' }, { status: 404 });
  }

  // Cannot delete if there are linked positions
  if (existing.positions.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete position budget with linked positions' },
      { status: 400 }
    );
  }

  // Cannot delete if there are transactions
  if (existing.budgetTransactions.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete position budget with transactions. Use adjustments instead.' },
      { status: 400 }
    );
  }

  await prisma.positionBudget.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
