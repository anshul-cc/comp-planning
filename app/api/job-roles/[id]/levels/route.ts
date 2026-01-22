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

  const levels = await prisma.jobLevel.findMany({
    where: { jobRoleId: id },
    include: {
      payGrade: true,
    },
    orderBy: { levelCode: 'asc' },
  });

  return NextResponse.json(levels);
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
  const { levelCode, levelName, payGradeId, avgSalary = 0, avgBenefits = 0 } = body;

  if (!levelCode || !levelName) {
    return NextResponse.json(
      { error: 'Level code and level name are required' },
      { status: 400 }
    );
  }

  // Verify job role exists
  const jobRole = await prisma.jobRole.findUnique({
    where: { id },
  });

  if (!jobRole) {
    return NextResponse.json({ error: 'Job role not found' }, { status: 404 });
  }

  // Check for existing level code for this role
  const existing = await prisma.jobLevel.findUnique({
    where: {
      jobRoleId_levelCode: {
        jobRoleId: id,
        levelCode,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'This level code already exists for this role' },
      { status: 400 }
    );
  }

  // Verify pay grade exists if provided
  if (payGradeId) {
    const payGrade = await prisma.payGrade.findUnique({
      where: { id: payGradeId },
    });
    if (!payGrade) {
      return NextResponse.json({ error: 'Pay grade not found' }, { status: 404 });
    }
  }

  const jobLevel = await prisma.jobLevel.create({
    data: {
      jobRoleId: id,
      levelCode: levelCode.toUpperCase(),
      levelName,
      payGradeId: payGradeId || null,
      avgSalary: parseFloat(String(avgSalary)),
      avgBenefits: parseFloat(String(avgBenefits)),
    },
    include: {
      jobRole: true,
      payGrade: true,
    },
  });

  return NextResponse.json(jobLevel, { status: 201 });
}
