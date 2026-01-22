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

  const roles = await prisma.jobRole.findMany({
    where: { subFamilyId: id },
    include: {
      levels: {
        include: {
          payGrade: true,
        },
        orderBy: { levelCode: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(roles);
}

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
  const { name, code, description, levels } = body;

  if (!name || !code) {
    return NextResponse.json(
      { error: 'Name and code are required' },
      { status: 400 }
    );
  }

  // Verify sub-family exists
  const subFamily = await prisma.jobSubFamily.findUnique({
    where: { id },
  });

  if (!subFamily) {
    return NextResponse.json({ error: 'Sub-family not found' }, { status: 404 });
  }

  // Check for existing code
  const existing = await prisma.jobRole.findUnique({
    where: { code },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A role with this code already exists' },
      { status: 400 }
    );
  }

  // Create role with levels if provided
  const jobRole = await prisma.jobRole.create({
    data: {
      subFamilyId: id,
      name,
      code: code.toUpperCase(),
      description,
      ...(levels && levels.length > 0
        ? {
            levels: {
              create: levels.map((level: { levelCode: string; levelName: string; payGradeId?: string; avgSalary?: number; avgBenefits?: number }) => ({
                levelCode: level.levelCode,
                levelName: level.levelName,
                payGradeId: level.payGradeId || null,
                avgSalary: level.avgSalary || 0,
                avgBenefits: level.avgBenefits || 0,
              })),
            },
          }
        : {}),
    },
    include: {
      subFamily: {
        include: {
          jobFamily: true,
        },
      },
      levels: {
        include: {
          payGrade: true,
        },
      },
    },
  });

  return NextResponse.json(jobRole, { status: 201 });
}
