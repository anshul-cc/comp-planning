import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await prisma.role.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      payGrade: true,
      employees: true,
    },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  return NextResponse.json(role);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, code, departmentId, payGradeId } = body;

  const role = await prisma.role.update({
    where: { id: params.id },
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

  return NextResponse.json(role);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await prisma.role.findUnique({
    where: { id: params.id },
    include: {
      employees: true,
    },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  if (role.employees.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete role with assigned employees' },
      { status: 400 }
    );
  }

  await prisma.role.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
