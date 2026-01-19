import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      systemRoleId: true,
      systemRole: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if current user is Super Admin
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
    include: { systemRole: true },
  });

  if (currentUser?.systemRole?.code !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admin can create users' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, systemRoleId } = body;

  if (!name || !email || !password || !systemRoleId) {
    return NextResponse.json(
      { error: 'Name, email, password, and system role are required' },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  // Get the system role to set the legacy role field
  const systemRole = await prisma.systemRole.findUnique({
    where: { id: systemRoleId },
  });

  if (!systemRole) {
    return NextResponse.json({ error: 'Invalid system role' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: systemRole.code,
      systemRoleId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      systemRole: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return NextResponse.json(user, { status: 201 });
}
