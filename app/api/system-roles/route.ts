import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RESOURCES } from '@/lib/permissions';

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
    return NextResponse.json({ error: 'Only Super Admin can create roles' }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, description, permissions } = body;

  if (!name || !code) {
    return NextResponse.json(
      { error: 'Name and code are required' },
      { status: 400 }
    );
  }

  // Check if code already exists
  const existing = await prisma.systemRole.findUnique({
    where: { code },
  });

  if (existing) {
    return NextResponse.json({ error: 'Role code already exists' }, { status: 400 });
  }

  // Validate permissions
  const validResources = Object.values(RESOURCES);
  const validActions = ['view', 'create', 'edit', 'delete', 'approve'];
  const validScopes = ['own', 'department', 'cost_center', 'bu', 'all'];

  if (permissions && Array.isArray(permissions)) {
    for (const perm of permissions) {
      if (!validResources.includes(perm.resource)) {
        return NextResponse.json({ error: `Invalid resource: ${perm.resource}` }, { status: 400 });
      }
      if (!validScopes.includes(perm.scope)) {
        return NextResponse.json({ error: `Invalid scope: ${perm.scope}` }, { status: 400 });
      }
      for (const action of perm.actions) {
        if (!validActions.includes(action)) {
          return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
        }
      }
    }
  }

  // Create the role with permissions
  const systemRole = await prisma.systemRole.create({
    data: {
      name,
      code: code.toUpperCase().replace(/\s+/g, '_'),
      description: description || null,
      isSystemRole: false, // Custom roles are not system roles
      permissions: permissions && permissions.length > 0 ? {
        create: permissions.map((perm: { resource: string; actions: string[]; scope: string }) => ({
          resource: perm.resource,
          actions: JSON.stringify(perm.actions),
          scope: perm.scope,
        })),
      } : undefined,
    },
    include: {
      permissions: true,
    },
  });

  // Parse permissions for response
  const roleWithParsedPermissions = {
    ...systemRole,
    permissions: systemRole.permissions.map(perm => ({
      ...perm,
      actions: JSON.parse(perm.actions),
    })),
  };

  return NextResponse.json(roleWithParsedPermissions, { status: 201 });
}
