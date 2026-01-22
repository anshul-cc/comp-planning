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
  const empId = searchParams.get('empId');
  const positionId = searchParams.get('positionId');
  const asOf = searchParams.get('asOf'); // Point-in-time query
  const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to active only
  const assignmentType = searchParams.get('assignmentType');

  const queryDate = asOf ? new Date(asOf) : new Date();

  const where: Record<string, unknown> = {};

  if (empId) {
    where.empId = empId;
  }

  if (positionId) {
    where.positionId = positionId;
  }

  if (assignmentType) {
    where.assignmentType = assignmentType;
  }

  // Temporal filter: show only assignments valid at the query date
  if (activeOnly) {
    where.validFrom = { lte: queryDate };
    where.validTo = { gte: queryDate };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          title: true,
        },
      },
      position: {
        include: {
          profile: {
            include: {
              jobFamily: true,
            },
          },
          department: true,
        },
      },
      compensationSnapshots: {
        where: activeOnly
          ? {
              effectiveFrom: { lte: queryDate },
              effectiveTo: { gte: queryDate },
            }
          : undefined,
        orderBy: { effectiveFrom: 'desc' },
      },
    },
    orderBy: [{ validFrom: 'desc' }],
  });

  // Compute total compensation for each assignment
  const result = assignments.map((assignment) => {
    const totalCompensation = assignment.compensationSnapshots.reduce(
      (sum, snap) => sum + Number(snap.amountLocal),
      0
    );

    return {
      ...assignment,
      allocationPct: Number(assignment.allocationPct),
      totalCompensation,
      isActive:
        new Date(assignment.validFrom) <= queryDate &&
        new Date(assignment.validTo) >= queryDate,
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
  const {
    empId,
    positionId,
    assignmentType = 'PRIMARY',
    allocationPct = 100,
    validFrom,
    validTo,
  } = body;

  // Validate required fields
  if (!empId || !positionId || !validFrom) {
    return NextResponse.json(
      { error: 'empId, positionId, and validFrom are required' },
      { status: 400 }
    );
  }

  // Verify employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: empId },
  });
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Verify position exists
  const position = await prisma.position.findUnique({
    where: { id: positionId },
  });
  if (!position) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 });
  }

  // Check if position is frozen
  if (position.isFrozen) {
    return NextResponse.json(
      { error: 'Cannot assign to a frozen position' },
      { status: 400 }
    );
  }

  const startDate = new Date(validFrom);
  const endDate = validTo ? new Date(validTo) : new Date('9999-12-31');

  // For PRIMARY assignments, check if position already has an active primary assignment
  if (assignmentType === 'PRIMARY') {
    const existingPrimary = await prisma.assignment.findFirst({
      where: {
        positionId,
        assignmentType: 'PRIMARY',
        validFrom: { lte: endDate },
        validTo: { gte: startDate },
      },
    });

    if (existingPrimary) {
      return NextResponse.json(
        {
          error:
            'Position already has a primary assignment during this period. End the existing assignment first.',
        },
        { status: 400 }
      );
    }
  }

  // For any assignment type, check employee's total allocation doesn't exceed 100%
  const existingAssignments = await prisma.assignment.findMany({
    where: {
      empId,
      validFrom: { lte: endDate },
      validTo: { gte: startDate },
    },
  });

  const totalAllocation = existingAssignments.reduce(
    (sum, a) => sum + Number(a.allocationPct),
    0
  );

  if (totalAllocation + allocationPct > 100) {
    return NextResponse.json(
      {
        error: `Employee allocation would exceed 100%. Current: ${totalAllocation}%, Requested: ${allocationPct}%`,
      },
      { status: 400 }
    );
  }

  const assignment = await prisma.assignment.create({
    data: {
      empId,
      positionId,
      assignmentType,
      allocationPct,
      validFrom: startDate,
      validTo: endDate,
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

  return NextResponse.json(
    {
      ...assignment,
      allocationPct: Number(assignment.allocationPct),
    },
    { status: 201 }
  );
}
