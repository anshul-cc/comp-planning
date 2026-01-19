import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const systemRoles = await prisma.systemRole.findMany({
    include: {
      permissions: true,
      _count: {
        select: { users: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Parse the JSON actions string for each permission
  const rolesWithParsedPermissions = systemRoles.map(role => ({
    ...role,
    permissions: role.permissions.map(perm => ({
      ...perm,
      actions: JSON.parse(perm.actions),
    })),
  }));

  return NextResponse.json(rolesWithParsedPermissions);
}
