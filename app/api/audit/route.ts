import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/audit - Query audit logs with filters
 *
 * Query parameters:
 * - entityType: Filter by entity type
 * - entityId: Filter by specific entity
 * - userId: Filter by user who performed action
 * - action: Filter by action type
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - limit: Number of records (default 50, max 500)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow ADMIN and COMPENSATION_MANAGER roles to view audit logs
  const userRole = (session.user as { role?: string })?.role;
  if (!['ADMIN', 'COMPENSATION_MANAGER'].includes(userRole || '')) {
    return NextResponse.json(
      { error: 'Insufficient permissions to view audit logs' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');

  // Build where clause
  const where: Record<string, unknown> = {};

  if (entityType) {
    where.entityType = entityType;
  }
  if (entityId) {
    where.entityId = entityId;
  }
  if (userId) {
    where.userId = userId;
  }
  if (action) {
    where.action = action;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/entity/:type/:id - Get audit history for specific entity
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Manual audit log creation (for special cases)
  // Only allow ADMIN role
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admins can manually create audit logs' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      action,
      fieldChanged,
      oldValue,
      newValue,
      comment,
    } = body;

    if (!entityType || !entityId || !action) {
      return NextResponse.json(
        { error: 'entityType, entityId, and action are required' },
        { status: 400 }
      );
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        fieldChanged: fieldChanged || null,
        oldValue: oldValue || null,
        newValue: newValue || null,
        userId: (session.user as { id?: string })?.id || 'unknown',
        userRole: userRole || 'unknown',
        comment: comment || null,
      },
    });

    return NextResponse.json(auditLog, { status: 201 });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
