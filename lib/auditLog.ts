/**
 * Audit Logging Utility for Compensation Management Platform
 * Tracks all changes for compliance and traceability
 */

import prisma from './prisma';

export type AuditEntityType =
  | 'org_unit'
  | 'business_unit'
  | 'cost_center'
  | 'department'
  | 'budget_cycle'
  | 'budget_allocation'
  | 'headcount_plan'
  | 'pay_grade'
  | 'compensation_cycle'
  | 'compensation_action'
  | 'hiring_proposal'
  | 'user'
  | 'role'
  | 'employee';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'override'
  | 'status_change';

export interface AuditLogEntry {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  fieldChanged?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string;
  userRole: string;
  comment?: string;
  ipAddress?: string;
  sessionId?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        fieldChanged: entry.fieldChanged || null,
        oldValue: entry.oldValue !== undefined ? JSON.parse(JSON.stringify(entry.oldValue)) : null,
        newValue: entry.newValue !== undefined ? JSON.parse(JSON.stringify(entry.newValue)) : null,
        userId: entry.userId,
        userRole: entry.userRole,
        comment: entry.comment || null,
        ipAddress: entry.ipAddress || null,
        sessionId: entry.sessionId || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Create audit log for entity creation
 */
export async function logCreate(
  entityType: AuditEntityType,
  entityId: string,
  newValue: unknown,
  userId: string,
  userRole: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: 'create',
    newValue,
    userId,
    userRole,
    ...options,
  });
}

/**
 * Create audit log for entity update
 */
export async function logUpdate(
  entityType: AuditEntityType,
  entityId: string,
  fieldChanged: string,
  oldValue: unknown,
  newValue: unknown,
  userId: string,
  userRole: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: 'update',
    fieldChanged,
    oldValue,
    newValue,
    userId,
    userRole,
    ...options,
  });
}

/**
 * Create audit log for entity deletion
 */
export async function logDelete(
  entityType: AuditEntityType,
  entityId: string,
  oldValue: unknown,
  userId: string,
  userRole: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: 'delete',
    oldValue,
    userId,
    userRole,
    ...options,
  });
}

/**
 * Create audit log for status change
 */
export async function logStatusChange(
  entityType: AuditEntityType,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  userRole: string,
  comment?: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: 'status_change',
    fieldChanged: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    userId,
    userRole,
    comment,
    ...options,
  });
}

/**
 * Create audit log for approval action
 */
export async function logApproval(
  entityType: AuditEntityType,
  entityId: string,
  approved: boolean,
  userId: string,
  userRole: string,
  comment?: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: approved ? 'approve' : 'reject',
    userId,
    userRole,
    comment,
    ...options,
  });
}

/**
 * Create audit log for override action
 */
export async function logOverride(
  entityType: AuditEntityType,
  entityId: string,
  fieldChanged: string,
  oldValue: unknown,
  newValue: unknown,
  userId: string,
  userRole: string,
  reason: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: 'override',
    fieldChanged,
    oldValue,
    newValue,
    userId,
    userRole,
    comment: reason,
    ...options,
  });
}

/**
 * Create audit log for submission
 */
export async function logSubmit(
  entityType: AuditEntityType,
  entityId: string,
  userId: string,
  userRole: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  await createAuditLog({
    entityType,
    entityId,
    action: 'submit',
    userId,
    userRole,
    ...options,
  });
}

/**
 * Query audit logs for an entity
 */
export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Query audit logs by user
 */
export async function getAuditLogsByUser(userId: string, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters.entityId) {
    where.entityId = filters.entityId;
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Helper to diff two objects and create audit logs for each changed field
 */
export async function logObjectChanges(
  entityType: AuditEntityType,
  entityId: string,
  oldObject: Record<string, unknown>,
  newObject: Record<string, unknown>,
  userId: string,
  userRole: string,
  options?: { ipAddress?: string; sessionId?: string }
) {
  const ignoredFields = ['updatedAt', 'createdAt', 'id'];
  const changedFields: string[] = [];

  for (const key of Object.keys(newObject)) {
    if (ignoredFields.includes(key)) continue;
    if (JSON.stringify(oldObject[key]) !== JSON.stringify(newObject[key])) {
      changedFields.push(key);
      await logUpdate(
        entityType,
        entityId,
        key,
        oldObject[key],
        newObject[key],
        userId,
        userRole,
        options
      );
    }
  }

  return changedFields;
}
