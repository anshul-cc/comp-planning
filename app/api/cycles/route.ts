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

  const where = status ? { status } : {};

  const cycles = await prisma.planningCycle.findMany({
    where,
    include: {
      budgetAllocations: true,
      headcountPlans: true,
      _count: {
        select: {
          budgetAllocations: true,
          headcountPlans: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(cycles);
}

export async function POST(request: NextRequest) {
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
    requireDeptApproval = true,
    requireBUApproval = true,
    requireFinalApproval = true,
  } = body;

  if (!name || !type || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Name, type, start date, and end date are required' },
      { status: 400 }
    );
  }

  const user = session.user as { id?: string };

  const cycle = await prisma.planningCycle.create({
    data: {
      name,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalBudget: totalBudget ? parseFloat(totalBudget) : 0,
      status: 'DRAFT',
      requireDeptApproval,
      requireBUApproval,
      requireFinalApproval,
      createdById: user.id,
    },
    include: {
      budgetAllocations: true,
      headcountPlans: true,
    },
  });

  return NextResponse.json(cycle, { status: 201 });
}
