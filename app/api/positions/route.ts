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
  const deptId = searchParams.get('deptId');
  const profileId = searchParams.get('profileId');
  const isFrozen = searchParams.get('isFrozen');
  const vacant = searchParams.get('vacant'); // Show only vacant positions

  const where: Record<string, unknown> = {};

  if (deptId) {
    where.deptId = deptId;
  }

  if (profileId) {
    where.profileId = profileId;
  }

  if (isFrozen !== null && isFrozen !== undefined) {
    where.isFrozen = isFrozen === 'true';
  }

  const positions = await prisma.position.findMany({
    where,
    include: {
      profile: {
        include: {
          jobFamily: true,
          subFamily: true,
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
      department: true,
      assignments: {
        where: {
          validTo: { gte: new Date() },
        },
        include: {
          employee: true,
        },
        orderBy: { validFrom: 'desc' },
      },
    },
    orderBy: [
      { department: { name: 'asc' } },
      { createdAt: 'desc' },
    ],
  });

  // Filter for vacant positions if requested
  let filteredPositions = positions;
  if (vacant === 'true') {
    filteredPositions = positions.filter(
      (p) => !p.assignments.some((a) => a.assignmentType === 'PRIMARY')
    );
  }

  // Transform to include computed fields
  const result = filteredPositions.map((position) => {
    const primaryAssignment = position.assignments.find(
      (a) => a.assignmentType === 'PRIMARY'
    );
    const currentBand = position.profile.compensationBands[0];

    return {
      ...position,
      isVacant: !primaryAssignment,
      currentEmployee: primaryAssignment?.employee || null,
      compensationRange: currentBand
        ? {
            min: Number(currentBand.minSalary),
            mid: Number(currentBand.midSalary),
            max: Number(currentBand.maxSalary),
            currency: currentBand.currency,
          }
        : null,
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
  const { profileId, deptId, titleOverride, targetHireDate, isFrozen } = body;

  // Validate required fields
  if (!profileId || !deptId) {
    return NextResponse.json(
      { error: 'profileId and deptId are required' },
      { status: 400 }
    );
  }

  // Verify profile exists
  const profile = await prisma.jobProfile.findUnique({
    where: { id: profileId },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Job profile not found' }, { status: 404 });
  }

  // Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: deptId },
  });
  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  const position = await prisma.position.create({
    data: {
      profileId,
      deptId,
      titleOverride: titleOverride || null,
      targetHireDate: targetHireDate ? new Date(targetHireDate) : null,
      isFrozen: isFrozen || false,
    },
    include: {
      profile: {
        include: {
          jobFamily: true,
          subFamily: true,
        },
      },
      department: true,
    },
  });

  return NextResponse.json(position, { status: 201 });
}
