import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/assignments/[id]/end - End an assignment on a specific date
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
  const { endDate } = body;

  if (!endDate) {
    return NextResponse.json({ error: 'endDate is required' }, { status: 400 });
  }

  // Check if assignment exists
  const existing = await prisma.assignment.findUnique({
    where: { id },
    include: {
      compensationSnapshots: {
        where: {
          effectiveTo: { gte: new Date(endDate) },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const newEndDate = new Date(endDate);

  // Validate end date is not before start date
  if (newEndDate < new Date(existing.validFrom)) {
    return NextResponse.json(
      { error: 'End date cannot be before the assignment start date' },
      { status: 400 }
    );
  }

  // Update assignment end date and end any active compensation snapshots
  await prisma.$transaction([
    // Update the assignment
    prisma.assignment.update({
      where: { id },
      data: { validTo: newEndDate },
    }),
    // End compensation snapshots that extend beyond the new end date
    ...existing.compensationSnapshots.map((snap) =>
      prisma.compensationSnapshot.update({
        where: { id: snap.id },
        data: { effectiveTo: newEndDate },
      })
    ),
  ]);

  const updatedAssignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      employee: true,
      position: {
        include: {
          profile: true,
          department: true,
        },
      },
      compensationSnapshots: {
        orderBy: { effectiveFrom: 'desc' },
      },
    },
  });

  return NextResponse.json({
    ...updatedAssignment,
    allocationPct: Number(updatedAssignment?.allocationPct),
    message: `Assignment ended on ${newEndDate.toISOString().split('T')[0]}`,
  });
}
