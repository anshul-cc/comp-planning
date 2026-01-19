import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cycle = await prisma.planningCycle.findUnique({
    where: { id: params.id },
    include: {
      budgetAllocations: {
        include: {
          department: true,
          costCenter: true,
          businessUnit: true,
        },
      },
      headcountPlans: {
        include: {
          department: true,
        },
      },
      compensationCycles: true,
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  return NextResponse.json(cycle);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    type,
    startDate,
    endDate,
    totalBudget,
    status,
    requireDeptApproval,
    requireBUApproval,
    requireFinalApproval,
  } = body;

  const existing = await prisma.planningCycle.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  const cycle = await prisma.planningCycle.update({
    where: { id: params.id },
    data: {
      name: name ?? existing.name,
      type: type ?? existing.type,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      totalBudget: totalBudget !== undefined ? parseFloat(totalBudget) : existing.totalBudget,
      status: status ?? existing.status,
      requireDeptApproval: requireDeptApproval ?? existing.requireDeptApproval,
      requireBUApproval: requireBUApproval ?? existing.requireBUApproval,
      requireFinalApproval: requireFinalApproval ?? existing.requireFinalApproval,
    },
    include: {
      budgetAllocations: true,
      headcountPlans: true,
    },
  });

  return NextResponse.json(cycle);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.planningCycle.findUnique({
    where: { id: params.id },
    include: {
      budgetAllocations: true,
      headcountPlans: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  if (existing.budgetAllocations.length > 0 || existing.headcountPlans.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete cycle with existing allocations or headcount plans' },
      { status: 400 }
    );
  }

  await prisma.planningCycle.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
