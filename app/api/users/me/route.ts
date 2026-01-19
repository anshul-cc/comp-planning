import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
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
          isSystemRole: true,
          permissions: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Parse permissions
  const userWithParsedPermissions = {
    ...user,
    isSuperAdmin: user.systemRole?.code === 'SUPER_ADMIN',
    systemRole: user.systemRole ? {
      ...user.systemRole,
      permissions: user.systemRole.permissions.map(perm => ({
        ...perm,
        actions: JSON.parse(perm.actions),
      })),
    } : null,
  };

  return NextResponse.json(userWithParsedPermissions);
}
