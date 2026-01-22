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

  const subFamilies = await prisma.jobSubFamily.findMany({
    where: { jobFamilyId: id },
    include: {
      _count: {
        select: { jobRoles: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(subFamilies);
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
  const { name, code, description } = body;

  if (!name || !code) {
    return NextResponse.json(
      { error: 'Name and code are required' },
      { status: 400 }
    );
  }

  // Verify job family exists
  const jobFamily = await prisma.jobFamily.findUnique({
    where: { id },
  });

  if (!jobFamily) {
    return NextResponse.json({ error: 'Job family not found' }, { status: 404 });
  }

  // Check for existing code
  const existing = await prisma.jobSubFamily.findUnique({
    where: { code },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A sub-family with this code already exists' },
      { status: 400 }
    );
  }

  const subFamily = await prisma.jobSubFamily.create({
    data: {
      jobFamilyId: id,
      name,
      code: code.toUpperCase(),
      description,
    },
    include: {
      jobFamily: true,
      _count: {
        select: { jobRoles: true },
      },
    },
  });

  return NextResponse.json(subFamily, { status: 201 });
}
