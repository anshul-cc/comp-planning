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

  const position = await prisma.position.findUnique({
    where: { id },
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
      assignments: {
        include: {
          employee: true,
          compensationSnapshots: {
            where: {
              effectiveTo: { gte: new Date() },
            },
            orderBy: { effectiveFrom: 'desc' },
          },
        },
        orderBy: { validFrom: 'desc' },
      },
    },
  });

  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 });
  }

  // Compute additional fields
  const primaryAssignment = position.assignments.find(
    (a) => a.assignmentType === 'PRIMARY' && new Date(a.validTo) >= new Date()
  );

  const currentBand = position.profile.compensationBands.find(
    (b) => !b.effectiveTo || new Date(b.effectiveTo) >= new Date()
  );

  return NextResponse.json({
    ...position,
    isVacant: !primaryAssignment,
    currentEmployee: primaryAssignment?.employee || null,
    currentAssignment: primaryAssignment || null,
    compensationRange: currentBand
      ? {
          min: Number(currentBand.minSalary),
          mid: Number(currentBand.midSalary),
          max: Number(currentBand.maxSalary),
          currency: currentBand.currency,
        }
      : null,
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
  const { profileId, deptId, titleOverride, targetHireDate, isFrozen } = body;

  // Check if position exists
  const existing = await prisma.position.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 });
  }

  // Verify new profile exists if changing
  if (profileId && profileId !== existing.profileId) {
    const profile = await prisma.jobProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Job profile not found' }, { status: 404 });
    }
  }

  // Verify new department exists if changing
  if (deptId && deptId !== existing.deptId) {
    const department = await prisma.department.findUnique({
      where: { id: deptId },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
  }

  const position = await prisma.position.update({
    where: { id },
    data: {
      ...(profileId && { profileId }),
      ...(deptId && { deptId }),
      ...(titleOverride !== undefined && { titleOverride }),
      ...(targetHireDate !== undefined && {
        targetHireDate: targetHireDate ? new Date(targetHireDate) : null,
      }),
      ...(isFrozen !== undefined && { isFrozen }),
    },
    include: {
      profile: {
        include: {
          jobFamily: true,
          subFamily: true,
        },
      },
      department: true,
      assignments: {
        where: {
          validTo: { gte: new Date() },
        },
        include: {
          employee: true,
        },
      },
    },
  });

  return NextResponse.json(position);
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

  // Check if position exists
  const existing = await prisma.position.findUnique({
    where: { id },
    include: {
      assignments: {
        where: {
          validTo: { gte: new Date() },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 });
  }

  // Cannot delete position with active assignments
  if (existing.assignments.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete position with active assignments. End the assignments first.' },
      { status: 400 }
    );
  }

  await prisma.position.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
