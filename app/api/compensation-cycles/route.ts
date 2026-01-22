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
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};

  if (cycleId) {
    where.cycleId = cycleId;
  }

  if (status) {
    where.status = status;
  }

  const compensationCycles = await prisma.compensationCycle.findMany({
    where,
    include: {
      planningCycle: true,
      _count: {
        select: { actions: true },
      },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  return NextResponse.json(compensationCycles);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    cycleId,
    name,
    type,
    budgetAmount,
    effectiveDate,
    startDate,
    endDate,
    enableSalaryRevision,
    enableBonus,
    enablePromotion,
  } = body;

  if (!cycleId || !name || !type || budgetAmount === undefined || !effectiveDate) {
    return NextResponse.json(
      { error: 'cycleId, name, type, budgetAmount, and effectiveDate are required' },
      { status: 400 }
    );
  }

  // Verify planning cycle exists
  const planningCycle = await prisma.planningCycle.findUnique({
    where: { id: cycleId },
  });
  if (!planningCycle) {
    return NextResponse.json({ error: 'Planning cycle not found' }, { status: 404 });
  }

  const compensationCycle = await prisma.compensationCycle.create({
    data: {
      cycleId,
      name,
      type,
      budgetAmount: parseFloat(budgetAmount),
      effectiveDate: new Date(effectiveDate),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      enableSalaryRevision: enableSalaryRevision ?? true,
      enableBonus: enableBonus ?? false,
      enablePromotion: enablePromotion ?? false,
      status: 'DRAFT',
    },
    include: {
      planningCycle: true,
    },
  });

  return NextResponse.json(compensationCycle, { status: 201 });
}
