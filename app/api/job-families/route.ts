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
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const includeHierarchy = searchParams.get('includeHierarchy') === 'true';

  const [jobFamilies, total] = await Promise.all([
    prisma.jobFamily.findMany({
      include: includeHierarchy
        ? {
            jobSubFamilies: {
              include: {
                jobRoles: {
                  include: {
                    levels: true,
                  },
                },
              },
            },
          }
        : {
            _count: {
              select: { jobSubFamilies: true },
            },
          },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.jobFamily.count(),
  ]);

  return NextResponse.json({ data: jobFamilies, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, code, description } = body;

  if (!name || !code) {
    return NextResponse.json(
      { error: 'Name and code are required' },
      { status: 400 }
    );
  }

  // Check for existing code
  const existing = await prisma.jobFamily.findUnique({
    where: { code },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A job family with this code already exists' },
      { status: 400 }
    );
  }

  const jobFamily = await prisma.jobFamily.create({
    data: {
      name,
      code: code.toUpperCase(),
      description,
    },
    include: {
      _count: {
        select: { jobSubFamilies: true },
      },
    },
  });

  return NextResponse.json(jobFamily, { status: 201 });
}
