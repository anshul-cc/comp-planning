import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/assignments/[id]/compensation - Get compensation snapshots for an assignment
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
  const asOf = searchParams.get('asOf');
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  // Check if assignment exists
  const assignment = await prisma.assignment.findUnique({
    where: { id },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const queryDate = asOf ? new Date(asOf) : new Date();

  const where: Record<string, unknown> = {
    assignmentId: id,
  };

  if (activeOnly) {
    where.effectiveFrom = { lte: queryDate };
    where.effectiveTo = { gte: queryDate };
  }

  const snapshots = await prisma.compensationSnapshot.findMany({
    where,
    orderBy: [{ componentType: 'asc' }, { effectiveFrom: 'desc' }],
  });

  // Group by component type and calculate totals
  const byComponent: Record<string, { current: number; history: unknown[] }> = {};
  let totalCompensation = 0;

  for (const snap of snapshots) {
    const amount = Number(snap.amountLocal);
    const isActive =
      new Date(snap.effectiveFrom) <= queryDate &&
      new Date(snap.effectiveTo) >= queryDate;

    if (!byComponent[snap.componentType]) {
      byComponent[snap.componentType] = { current: 0, history: [] };
    }

    byComponent[snap.componentType].history.push({
      ...snap,
      amountLocal: amount,
      isActive,
    });

    if (isActive) {
      byComponent[snap.componentType].current = amount;
      totalCompensation += amount;
    }
  }

  return NextResponse.json({
    assignmentId: id,
    asOf: queryDate.toISOString().split('T')[0],
    totalCompensation,
    byComponent,
    snapshots: snapshots.map((s) => ({
      ...s,
      amountLocal: Number(s.amountLocal),
    })),
  });
}

// POST /api/assignments/[id]/compensation - Add a new compensation snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    componentType,
    amountLocal,
    currencyLocal = 'INR',
    effectiveFrom,
    effectiveTo,
  } = body;

  // Validate required fields
  if (!componentType || amountLocal === undefined || !effectiveFrom) {
    return NextResponse.json(
      { error: 'componentType, amountLocal, and effectiveFrom are required' },
      { status: 400 }
    );
  }

  // Check if assignment exists
  const assignment = await prisma.assignment.findUnique({
    where: { id },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const startDate = new Date(effectiveFrom);
  const endDate = effectiveTo
    ? new Date(effectiveTo)
    : new Date(assignment.validTo); // Default to assignment end date

  // Validate dates are within assignment period
  if (startDate < new Date(assignment.validFrom)) {
    return NextResponse.json(
      { error: 'Compensation effective date cannot be before assignment start date' },
      { status: 400 }
    );
  }

  if (endDate > new Date(assignment.validTo)) {
    return NextResponse.json(
      { error: 'Compensation end date cannot be after assignment end date' },
      { status: 400 }
    );
  }

  // End any existing snapshots of the same component type that overlap
  const existingSnapshots = await prisma.compensationSnapshot.findMany({
    where: {
      assignmentId: id,
      componentType,
      effectiveFrom: { lte: endDate },
      effectiveTo: { gte: startDate },
    },
  });

  // Close out overlapping snapshots
  const updates = existingSnapshots
    .filter((snap) => new Date(snap.effectiveTo) >= startDate)
    .map((snap) =>
      prisma.compensationSnapshot.update({
        where: { id: snap.id },
        data: {
          effectiveTo: new Date(
            startDate.getTime() - 24 * 60 * 60 * 1000 // Day before new snapshot
          ),
        },
      })
    );

  await prisma.$transaction(updates);

  // Create new snapshot
  const snapshot = await prisma.compensationSnapshot.create({
    data: {
      assignmentId: id,
      componentType,
      amountLocal,
      currencyLocal,
      effectiveFrom: startDate,
      effectiveTo: endDate,
    },
  });

  return NextResponse.json(
    {
      ...snapshot,
      amountLocal: Number(snapshot.amountLocal),
    },
    { status: 201 }
  );
}
