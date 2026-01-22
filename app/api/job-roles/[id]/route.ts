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

  const jobRole = await prisma.jobRole.findUnique({
    where: { id },
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
        orderBy: { levelCode: 'asc' },
      },
    },
  });

  if (!jobRole) {
    return NextResponse.json({ error: 'Job role not found' }, { status: 404 });
  }

  return NextResponse.json(jobRole);
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
  const { name, code, description, subFamilyId } = body;

  // Check if role exists
  const existing = await prisma.jobRole.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Job role not found' }, { status: 404 });
  }

  // Check for code conflict if code is being changed
  if (code && code !== existing.code) {
    const codeConflict = await prisma.jobRole.findUnique({
      where: { code },
    });
    if (codeConflict) {
      return NextResponse.json(
        { error: 'A role with this code already exists' },
        { status: 400 }
      );
    }
  }

  // Verify new sub-family exists if changing
  if (subFamilyId && subFamilyId !== existing.subFamilyId) {
    const subFamily = await prisma.jobSubFamily.findUnique({
      where: { id: subFamilyId },
    });
    if (!subFamily) {
      return NextResponse.json({ error: 'Sub-family not found' }, { status: 404 });
    }
  }

  const jobRole = await prisma.jobRole.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(description !== undefined && { description }),
      ...(subFamilyId && { subFamilyId }),
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

  return NextResponse.json(jobRole);
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

  // Check if role exists
  const existing = await prisma.jobRole.findUnique({
    where: { id },
    include: {
      _count: {
        select: { planEntries: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Job role not found' }, { status: 404 });
  }

  // Check if role is used in workforce plans
  if (existing._count.planEntries > 0) {
    return NextResponse.json(
      { error: 'Cannot delete role that is used in workforce plans' },
      { status: 400 }
    );
  }

  // Cascade delete will handle levels
  await prisma.jobRole.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
