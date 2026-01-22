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

  const subFamily = await prisma.jobSubFamily.findUnique({
    where: { id },
    include: {
      jobFamily: true,
      jobRoles: {
        include: {
          levels: {
            include: {
              payGrade: true,
            },
          },
        },
      },
    },
  });

  if (!subFamily) {
    return NextResponse.json({ error: 'Sub-family not found' }, { status: 404 });
  }

  return NextResponse.json(subFamily);
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
  const { name, code, description, jobFamilyId } = body;

  // Check if sub-family exists
  const existing = await prisma.jobSubFamily.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Sub-family not found' }, { status: 404 });
  }

  // Check for code conflict if code is being changed
  if (code && code !== existing.code) {
    const codeConflict = await prisma.jobSubFamily.findUnique({
      where: { code },
    });
    if (codeConflict) {
      return NextResponse.json(
        { error: 'A sub-family with this code already exists' },
        { status: 400 }
      );
    }
  }

  // Verify new job family exists if changing
  if (jobFamilyId && jobFamilyId !== existing.jobFamilyId) {
    const jobFamily = await prisma.jobFamily.findUnique({
      where: { id: jobFamilyId },
    });
    if (!jobFamily) {
      return NextResponse.json({ error: 'Job family not found' }, { status: 404 });
    }
  }

  const subFamily = await prisma.jobSubFamily.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(description !== undefined && { description }),
      ...(jobFamilyId && { jobFamilyId }),
    },
    include: {
      jobFamily: true,
      _count: {
        select: { jobRoles: true },
      },
    },
  });

  return NextResponse.json(subFamily);
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

  // Check if sub-family exists
  const existing = await prisma.jobSubFamily.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Sub-family not found' }, { status: 404 });
  }

  // Cascade delete will handle roles and levels
  await prisma.jobSubFamily.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
