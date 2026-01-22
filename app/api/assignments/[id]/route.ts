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

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      employee: true,
      position: {
        include: {
          profile: {
            include: {
              jobFamily: true,
              subFamily: true,
              compensationBands: {
                orderBy: { effectiveFrom: 'desc' },
              },
            },
          },
          department: true,
        },
      },
      compensationSnapshots: {
        orderBy: { effectiveFrom: 'desc' },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const now = new Date();
  const totalCompensation = assignment.compensationSnapshots
    .filter(
      (snap) =>
        new Date(snap.effectiveFrom) <= now &&
        new Date(snap.effectiveTo) >= now
    )
    .reduce((sum, snap) => sum + Number(snap.amountLocal), 0);

  return NextResponse.json({
    ...assignment,
    allocationPct: Number(assignment.allocationPct),
    totalCompensation,
    isActive:
      new Date(assignment.validFrom) <= now &&
      new Date(assignment.validTo) >= now,
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
  const { assignmentType, allocationPct, validTo } = body;

  // Check if assignment exists
  const existing = await prisma.assignment.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // If changing allocation, verify total doesn't exceed 100%
  if (allocationPct !== undefined && allocationPct !== Number(existing.allocationPct)) {
    const newEndDate = validTo ? new Date(validTo) : existing.validTo;

    const existingAssignments = await prisma.assignment.findMany({
      where: {
        empId: existing.empId,
        id: { not: id },
        validFrom: { lte: newEndDate },
        validTo: { gte: existing.validFrom },
      },
    });

    const totalAllocation = existingAssignments.reduce(
      (sum, a) => sum + Number(a.allocationPct),
      0
    );

    if (totalAllocation + allocationPct > 100) {
      return NextResponse.json(
        {
          error: `Employee allocation would exceed 100%. Other assignments: ${totalAllocation}%, Requested: ${allocationPct}%`,
        },
        { status: 400 }
      );
    }
  }

  const assignment = await prisma.assignment.update({
    where: { id },
    data: {
      ...(assignmentType && { assignmentType }),
      ...(allocationPct !== undefined && { allocationPct }),
      ...(validTo !== undefined && {
        validTo: validTo ? new Date(validTo) : new Date('9999-12-31'),
      }),
    },
    include: {
      employee: true,
      position: {
        include: {
          profile: true,
          department: true,
        },
      },
    },
  });

  return NextResponse.json({
    ...assignment,
    allocationPct: Number(assignment.allocationPct),
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

  // Check if assignment exists
  const existing = await prisma.assignment.findUnique({
    where: { id },
    include: {
      compensationSnapshots: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Delete related compensation snapshots first (cascade)
  await prisma.assignment.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
