import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
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
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    return NextResponse.json({ error: 'Only Super Admin can update users' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, systemRoleId } = body;

  // Build update data
  const updateData: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    systemRoleId?: string;
  } = {};

  if (name) updateData.name = name;
  if (email) {
    // Check if email is taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: params.id },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    updateData.email = email;
  }

  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  if (systemRoleId) {
    const systemRole = await prisma.systemRole.findUnique({
      where: { id: systemRoleId },
    });
    if (!systemRole) {
      return NextResponse.json({ error: 'Invalid system role' }, { status: 400 });
    }
    updateData.systemRoleId = systemRoleId;
    updateData.role = systemRole.code;
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
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

  return NextResponse.json(user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    return NextResponse.json({ error: 'Only Super Admin can delete users' }, { status: 403 });
  }

  // Prevent deleting self
  if (currentUser.id === params.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
