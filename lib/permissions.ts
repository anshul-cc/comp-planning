/**
 * Predefined System Roles and Permissions
 * Based on PRD specification
 */

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type Scope = 'own' | 'department' | 'cost_center' | 'bu' | 'all';

export interface Permission {
  resource: string;
  actions: Action[];
  scope: Scope;
}

export interface SystemRoleDefinition {
  code: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: Permission[];
}

// Resources that can be controlled by permissions
export const RESOURCES = {
  BUDGET_ALLOCATION: 'budget_allocation',
  HEADCOUNT_PLAN: 'headcount_plan',
  PAY_GRADE: 'pay_grade',
  COMPENSATION_CYCLE: 'compensation_cycle',
  PLANNING_CYCLE: 'planning_cycle',
  ORGANIZATION: 'organization',
  EMPLOYEE: 'employee',
  JOB_ROLE: 'job_role',
  USER: 'user',
  APPROVAL: 'approval',
  AUDIT_LOG: 'audit_log',
  HIRING_PROPOSAL: 'hiring_proposal',
} as const;

/**
 * Predefined System Roles
 */
export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystemRole: true,
    permissions: Object.values(RESOURCES).map(resource => ({
      resource,
      actions: ['view', 'create', 'edit', 'delete', 'approve'] as Action[],
      scope: 'all' as Scope,
    })),
  },
  {
    code: 'COMPENSATION_MANAGER',
    name: 'Compensation Manager',
    description: 'Manages compensation cycles, pay grades, and budget allocations across the organization',
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.BUDGET_ALLOCATION, actions: ['view', 'create', 'edit', 'delete', 'approve'], scope: 'all' },
      { resource: RESOURCES.HEADCOUNT_PLAN, actions: ['view', 'create', 'edit', 'approve'], scope: 'all' },
      { resource: RESOURCES.PAY_GRADE, actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: RESOURCES.COMPENSATION_CYCLE, actions: ['view', 'create', 'edit', 'delete', 'approve'], scope: 'all' },
      { resource: RESOURCES.PLANNING_CYCLE, actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: RESOURCES.ORGANIZATION, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.EMPLOYEE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.JOB_ROLE, actions: ['view', 'create', 'edit'], scope: 'all' },
      { resource: RESOURCES.APPROVAL, actions: ['view', 'create', 'approve'], scope: 'all' },
      { resource: RESOURCES.AUDIT_LOG, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.HIRING_PROPOSAL, actions: ['view', 'approve'], scope: 'all' },
    ],
  },
  {
    code: 'HR_ADMIN',
    name: 'HR Admin',
    description: 'Manages employees, pay grades, and compensation actions',
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.BUDGET_ALLOCATION, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.HEADCOUNT_PLAN, actions: ['view', 'create', 'edit'], scope: 'all' },
      { resource: RESOURCES.PAY_GRADE, actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: RESOURCES.COMPENSATION_CYCLE, actions: ['view', 'create', 'edit'], scope: 'all' },
      { resource: RESOURCES.PLANNING_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.ORGANIZATION, actions: ['view', 'edit'], scope: 'all' },
      { resource: RESOURCES.EMPLOYEE, actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: RESOURCES.JOB_ROLE, actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: RESOURCES.USER, actions: ['view', 'create', 'edit'], scope: 'all' },
      { resource: RESOURCES.APPROVAL, actions: ['view', 'approve'], scope: 'all' },
      { resource: RESOURCES.AUDIT_LOG, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.HIRING_PROPOSAL, actions: ['view', 'create', 'edit', 'approve'], scope: 'all' },
    ],
  },
  {
    code: 'FINANCE_HEAD',
    name: 'Finance Head',
    description: 'Manages budget allocations and financial approvals',
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.BUDGET_ALLOCATION, actions: ['view', 'create', 'edit', 'delete', 'approve'], scope: 'all' },
      { resource: RESOURCES.HEADCOUNT_PLAN, actions: ['view', 'approve'], scope: 'all' },
      { resource: RESOURCES.PAY_GRADE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.COMPENSATION_CYCLE, actions: ['view', 'approve'], scope: 'all' },
      { resource: RESOURCES.PLANNING_CYCLE, actions: ['view', 'create', 'edit'], scope: 'all' },
      { resource: RESOURCES.ORGANIZATION, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.EMPLOYEE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.JOB_ROLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.APPROVAL, actions: ['view', 'create', 'approve'], scope: 'all' },
      { resource: RESOURCES.AUDIT_LOG, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.HIRING_PROPOSAL, actions: ['view', 'approve'], scope: 'all' },
    ],
  },
  {
    code: 'BU_LEADER',
    name: 'BU Leader',
    description: 'Manages budgets and headcount within their business unit',
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.BUDGET_ALLOCATION, actions: ['view', 'create', 'edit', 'approve'], scope: 'bu' },
      { resource: RESOURCES.HEADCOUNT_PLAN, actions: ['view', 'create', 'edit', 'approve'], scope: 'bu' },
      { resource: RESOURCES.PAY_GRADE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.COMPENSATION_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.PLANNING_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.ORGANIZATION, actions: ['view', 'edit'], scope: 'bu' },
      { resource: RESOURCES.EMPLOYEE, actions: ['view'], scope: 'bu' },
      { resource: RESOURCES.JOB_ROLE, actions: ['view'], scope: 'bu' },
      { resource: RESOURCES.APPROVAL, actions: ['view', 'create', 'approve'], scope: 'bu' },
      { resource: RESOURCES.AUDIT_LOG, actions: ['view'], scope: 'bu' },
      { resource: RESOURCES.HIRING_PROPOSAL, actions: ['view', 'create', 'edit', 'approve'], scope: 'bu' },
    ],
  },
  {
    code: 'DEPARTMENT_HEAD',
    name: 'Department Head',
    description: 'Manages budgets and headcount within their department',
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.BUDGET_ALLOCATION, actions: ['view', 'create', 'edit'], scope: 'department' },
      { resource: RESOURCES.HEADCOUNT_PLAN, actions: ['view', 'create', 'edit'], scope: 'department' },
      { resource: RESOURCES.PAY_GRADE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.COMPENSATION_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.PLANNING_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.ORGANIZATION, actions: ['view'], scope: 'department' },
      { resource: RESOURCES.EMPLOYEE, actions: ['view', 'edit'], scope: 'department' },
      { resource: RESOURCES.JOB_ROLE, actions: ['view', 'create', 'edit'], scope: 'department' },
      { resource: RESOURCES.APPROVAL, actions: ['view', 'create'], scope: 'department' },
      { resource: RESOURCES.AUDIT_LOG, actions: ['view'], scope: 'department' },
      { resource: RESOURCES.HIRING_PROPOSAL, actions: ['view', 'create', 'edit'], scope: 'department' },
    ],
  },
  {
    code: 'USER',
    name: 'User',
    description: 'Basic user with view access to relevant data',
    isSystemRole: true,
    permissions: [
      { resource: RESOURCES.BUDGET_ALLOCATION, actions: ['view'], scope: 'own' },
      { resource: RESOURCES.HEADCOUNT_PLAN, actions: ['view'], scope: 'own' },
      { resource: RESOURCES.PAY_GRADE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.COMPENSATION_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.PLANNING_CYCLE, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.ORGANIZATION, actions: ['view'], scope: 'all' },
      { resource: RESOURCES.EMPLOYEE, actions: ['view'], scope: 'own' },
      { resource: RESOURCES.JOB_ROLE, actions: ['view'], scope: 'all' },
    ],
  },
];

/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(
  userPermissions: Permission[],
  resource: string,
  action: Action,
  targetScope?: Scope
): boolean {
  const permission = userPermissions.find(p => p.resource === resource);
  if (!permission) return false;

  if (!permission.actions.includes(action)) return false;

  // Check scope hierarchy: all > bu > cost_center > department > own
  if (targetScope) {
    const scopeHierarchy: Scope[] = ['own', 'department', 'cost_center', 'bu', 'all'];
    const userScopeIndex = scopeHierarchy.indexOf(permission.scope);
    const targetScopeIndex = scopeHierarchy.indexOf(targetScope);

    // User's scope must be equal or higher than target scope
    return userScopeIndex >= targetScopeIndex;
  }

  return true;
}

/**
 * Get role definition by code
 */
export function getRoleByCode(code: string): SystemRoleDefinition | undefined {
  return SYSTEM_ROLES.find(role => role.code === code);
}
