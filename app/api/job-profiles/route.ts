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
  const familyId = searchParams.get('familyId');
  const subFamilyId = searchParams.get('subFamilyId');

  const where: Record<string, unknown> = {};

  if (familyId) {
    where.familyId = familyId;
  }

  if (subFamilyId) {
    where.subFamilyId = subFamilyId;
  }

  const profiles = await prisma.jobProfile.findMany({
    where,
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
      _count: {
        select: { positions: true },
      },
    },
    orderBy: [
      { jobFamily: { name: 'asc' } },
      { title: 'asc' },
    ],
  });

  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, code, familyId, subFamilyId, level, description, kpis } = body;

  if (!title || !code || !familyId) {
    return NextResponse.json(
      { error: 'title, code, and familyId are required' },
      { status: 400 }
    );
  }

  // Verify job family exists
  const family = await prisma.jobFamily.findUnique({
    where: { id: familyId },
  });
  if (!family) {
    return NextResponse.json({ error: 'Job family not found' }, { status: 404 });
  }

  // Check for duplicate code
  const existing = await prisma.jobProfile.findUnique({
    where: { code },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'A job profile with this code already exists' },
      { status: 400 }
    );
  }

  const profile = await prisma.jobProfile.create({
    data: {
      title,
      code,
      familyId,
      subFamilyId: subFamilyId || null,
      level: level ? parseInt(level) : null,
      description: description || null,
      kpis: kpis || null,
    },
    include: {
      jobFamily: true,
      subFamily: true,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
