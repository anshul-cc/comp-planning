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

  const jobLevel = await prisma.jobLevel.findUnique({
    where: { id },
    include: {
      jobRole: {
        include: {
          subFamily: {
            include: {
              jobFamily: true,
            },
          },
        },
      },
      payGrade: true,
    },
  });

  if (!jobLevel) {
    return NextResponse.json({ error: 'Job level not found' }, { status: 404 });
  }

  return NextResponse.json(jobLevel);
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
  const { levelCode, levelName, payGradeId, avgSalary, avgBenefits } = body;

  // Check if level exists
  const existing = await prisma.jobLevel.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Job level not found' }, { status: 404 });
  }

  // Check for level code conflict if code is being changed
  if (levelCode && levelCode !== existing.levelCode) {
    const codeConflict = await prisma.jobLevel.findUnique({
      where: {
        jobRoleId_levelCode: {
          jobRoleId: existing.jobRoleId,
          levelCode,
        },
      },
    });
    if (codeConflict) {
      return NextResponse.json(
        { error: 'This level code already exists for this role' },
        { status: 400 }
      );
    }
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

  const jobLevel = await prisma.jobLevel.update({
    where: { id },
    data: {
      ...(levelCode && { levelCode: levelCode.toUpperCase() }),
      ...(levelName && { levelName }),
      ...(payGradeId !== undefined && { payGradeId: payGradeId || null }),
      ...(avgSalary !== undefined && { avgSalary: parseFloat(String(avgSalary)) }),
      ...(avgBenefits !== undefined && { avgBenefits: parseFloat(String(avgBenefits)) }),
    },
    include: {
      jobRole: true,
      payGrade: true,
    },
  });

  return NextResponse.json(jobLevel);
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

  // Check if level exists
  const existing = await prisma.jobLevel.findUnique({
    where: { id },
    include: {
      _count: {
        select: { planEntries: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Job level not found' }, { status: 404 });
  }

  // Check if level is used in workforce plans
  if (existing._count.planEntries > 0) {
    return NextResponse.json(
      { error: 'Cannot delete level that is used in workforce plans' },
      { status: 400 }
    );
  }

  await prisma.jobLevel.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
