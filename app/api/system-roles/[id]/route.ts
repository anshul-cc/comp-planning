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

  const systemRole = await prisma.systemRole.findUnique({
    where: { id: params.id },
    include: {
      permissions: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!systemRole) {
    return NextResponse.json({ error: 'System role not found' }, { status: 404 });
  }

  // Parse the JSON actions string for each permission
  const roleWithParsedPermissions = {
    ...systemRole,
    permissions: systemRole.permissions.map(perm => ({
      ...perm,
      actions: JSON.parse(perm.actions),
    })),
  };

  return NextResponse.json(roleWithParsedPermissions);
}
