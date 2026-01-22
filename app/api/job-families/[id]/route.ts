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

  const jobFamily = await prisma.jobFamily.findUnique({
    where: { id },
    include: {
      jobSubFamilies: {
        include: {
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
      },
    },
  });

  if (!jobFamily) {
    return NextResponse.json({ error: 'Job family not found' }, { status: 404 });
  }

  return NextResponse.json(jobFamily);
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
  const { name, code, description } = body;

  // Check if family exists
  const existing = await prisma.jobFamily.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Job family not found' }, { status: 404 });
  }

  // Check for code conflict if code is being changed
  if (code && code !== existing.code) {
    const codeConflict = await prisma.jobFamily.findUnique({
      where: { code },
    });
    if (codeConflict) {
      return NextResponse.json(
        { error: 'A job family with this code already exists' },
        { status: 400 }
      );
    }
  }

  const jobFamily = await prisma.jobFamily.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(description !== undefined && { description }),
    },
    include: {
      _count: {
        select: { jobSubFamilies: true },
      },
    },
  });

  return NextResponse.json(jobFamily);
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

  // Check if family exists
  const existing = await prisma.jobFamily.findUnique({
    where: { id },
    include: {
      _count: {
        select: { jobSubFamilies: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Job family not found' }, { status: 404 });
  }

  // Cascade delete will handle subfamilies, roles, and levels
  await prisma.jobFamily.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
