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
  const departmentId = searchParams.get('departmentId');

  const where = departmentId ? { departmentId } : {};

  const roles = await prisma.role.findMany({
    where,
    include: {
      department: true,
      payGrade: true,
      _count: {
        select: { employees: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(roles);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, code, departmentId, payGradeId } = body;

  if (!name || !code || !departmentId) {
    return NextResponse.json(
      { error: 'Name, code, and department are required' },
      { status: 400 }
    );
  }

  const existing = await prisma.role.findUnique({
    where: { code },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Role code already exists' },
      { status: 400 }
    );
  }

  const role = await prisma.role.create({
    data: {
      name,
      code,
      departmentId,
      payGradeId: payGradeId || null,
    },
    include: {
      department: true,
      payGrade: true,
    },
  });

  return NextResponse.json(role, { status: 201 });
}
