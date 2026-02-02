# Compensation Management Platform - MVP Technical Specification
## For Claude Code Implementation

**Version:** 1.0  
**Target:** MVP / V1 Implementation

---

## Overview

Build a web-based Compensation Management Platform with the following modules:
1. Organization Structure Management
2. Budget Planning & Allocation
3. Headcount Planning
4. Pay Grade Configuration
5. Compensation Cycle Management
6. Approval Workflow
7. Audit Logging

**Tech Stack Recommendation:**
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js/Express or Python/FastAPI
- Database: PostgreSQL
- Auth: JWT-based (future: SAML/SSO)

---

## Module 1: Organization Structure

### Data Model

```typescript
interface OrganizationUnit {
  id: string; // UUID
  parentId: string | null; // NULL for root (Legal Entity)
  code: string; // Unique identifier, immutable
  displayName: string; // Editable
  unitType: 'legal_entity' | 'business_unit' | 'cost_center' | 'department';
  status: 'active' | 'inactive' | 'archived';
  currencyCode: string; // Default: 'USD'
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
}

interface UserOrgAssignment {
  id: string;
  userId: string;
  orgUnitId: string;
  roles: string[]; // Array of role IDs
  createdAt: Date;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean; // true for Super Admin
  permissions: Permission[];
}

interface Permission {
  resource: string; // e.g., 'budget_allocation', 'headcount_plan'
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve')[];
  scope: 'own' | 'department' | 'cost_center' | 'bu' | 'all';
}
```

### Business Rules

```javascript
const orgStructureRules = {
  // Rule 1: Legal Entity is always root and cannot be deleted
  validateRoot: (unit) => {
    if (unit.unitType === 'legal_entity') {
      if (unit.parentId !== null) throw new Error('Legal Entity must be root');
    } else {
      if (unit.parentId === null) throw new Error('Non-root units must have a parent');
    }
  },

  // Rule 2: Valid hierarchy depth
  validParentTypes: {
    'legal_entity': [],
    'business_unit': ['legal_entity'],
    'cost_center': ['business_unit'],
    'department': ['cost_center']
  },

  // Rule 3: Code must be unique and immutable
  validateCode: (code, existingCodes) => {
    if (existingCodes.includes(code)) throw new Error('Code must be unique');
    if (!/^[A-Z0-9_-]{2,20}$/.test(code)) throw new Error('Invalid code format');
  },

  // Rule 4: Cannot delete unit with children
  validateDelete: async (unitId, getChildren) => {
    const children = await getChildren(unitId);
    if (children.length > 0) {
      throw new Error('Cannot delete unit with children. Reassign children first.');
    }
  },

  // Rule 5: Super Admin role is immutable
  validateRoleEdit: (role) => {
    if (role.isSystemRole) throw new Error('System roles cannot be modified');
  }
};
```

### API Endpoints

```yaml
# Organization Units
GET    /api/v1/org/units                    # List all (with filters)
GET    /api/v1/org/units/:id                # Get single unit
GET    /api/v1/org/units/:id/tree           # Get subtree
GET    /api/v1/org/units/:id/ancestors      # Get path to root
POST   /api/v1/org/units                    # Create unit
PUT    /api/v1/org/units/:id                # Update unit
DELETE /api/v1/org/units/:id                # Delete unit (with validation)
POST   /api/v1/org/units/:id/move           # Move to new parent

# User Assignments
GET    /api/v1/org/units/:id/users          # Get users in unit
POST   /api/v1/org/units/:id/users          # Assign users
DELETE /api/v1/org/units/:id/users/:userId  # Remove user

# Roles
GET    /api/v1/roles                        # List roles
POST   /api/v1/roles                        # Create role
PUT    /api/v1/roles/:id                    # Update role
DELETE /api/v1/roles/:id                    # Delete role
```

### UI Components

```
OrgStructurePage
├── OrgTreeView (left panel)
│   ├── TreeNode (recursive)
│   │   ├── ExpandCollapseIcon
│   │   ├── UnitTypeIcon
│   │   ├── DisplayName
│   │   └── ActionMenu (Add Child, Edit, Delete)
│   └── AddRootButton (if no Legal Entity)
├── OrgDetailPanel (right panel)
│   ├── UnitForm
│   │   ├── CodeInput (readonly after create)
│   │   ├── DisplayNameInput
│   │   ├── UnitTypeSelect (readonly after create)
│   │   └── StatusToggle
│   ├── UserAssignmentSection
│   │   ├── UserList
│   │   └── AddUserModal (multi-select)
│   └── AuditTrailSection
└── RoleManagementTab
    ├── RoleList
    ├── RoleEditor
    └── PermissionMatrix
```

---

## Module 2: Budget Planning & Allocation

### Data Model

```typescript
interface BudgetCycle {
  id: string;
  name: string;
  cycleType: 'annual' | 'half_yearly' | 'quarterly';
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'locked' | 'closed';
  baseCurrency: string;
  createdAt: Date;
  activatedAt: Date | null;
  lockedAt: Date | null;
}

interface BudgetAllocation {
  id: string;
  budgetCycleId: string;
  orgUnitId: string;
  parentAllocationId: string | null; // Links to parent org unit's allocation
  
  // Budget Categories
  salaryFixed: number;      // Min: 10000
  salaryVariable: number;   // Min: 0
  benefitsEmployee: number; // Min: 0
  benefitsEmployer: number; // Min: 0
  newHiringBudget: number;  // Min: 0
  
  // Computed
  totalBudget: number; // Sum of above
  
  // Previous Year (readonly)
  previousYearTotal: number | null;
  
  // System Recommendation
  recommendedTotal: number | null;
  
  // Status
  status: 'draft' | 'submitted' | 'pending_approval' | 'revision_required' | 'approved' | 'locked';
  version: number;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  submittedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  
  // Comments
  comments: AllocationComment[];
}

interface AllocationComment {
  id: string;
  allocationId: string;
  userId: string;
  content: string;
  type: 'comment' | 'approval' | 'rejection' | 'revision_request';
  createdAt: Date;
}
```

### Business Rules

```javascript
const budgetAllocationRules = {
  // Rule 1: Minimum values
  minimums: {
    salaryFixed: 10000,
    salaryVariable: 0,
    benefitsEmployee: 0,
    benefitsEmployer: 0,
    newHiringBudget: 0
  },

  // Rule 2: All values must be non-negative
  validateNonNegative: (allocation) => {
    const fields = ['salaryFixed', 'salaryVariable', 'benefitsEmployee', 'benefitsEmployer', 'newHiringBudget'];
    for (const field of fields) {
      if (allocation[field] < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    }
  },

  // Rule 3: Children must sum to parent
  validateChildSum: (parentAllocation, childAllocations) => {
    if (childAllocations.length === 0) return; // No children yet
    
    const childSum = childAllocations.reduce((sum, child) => sum + child.totalBudget, 0);
    const tolerance = 0.01; // Allow for rounding
    
    if (Math.abs(childSum - parentAllocation.totalBudget) > tolerance) {
      throw new Error(
        `Child allocations ($${childSum.toLocaleString()}) must equal parent ($${parentAllocation.totalBudget.toLocaleString()})`
      );
    }
  },

  // Rule 4: Cannot exceed parent
  validateNotExceedParent: (allocation, parentAllocation) => {
    if (!parentAllocation) return; // Root allocation
    
    if (allocation.totalBudget > parentAllocation.totalBudget) {
      throw new Error('Allocation cannot exceed parent allocation');
    }
  },

  // Rule 5: Status transitions
  validTransitions: {
    'draft': ['submitted'],
    'submitted': ['pending_approval', 'draft'],
    'pending_approval': ['approved', 'revision_required'],
    'revision_required': ['submitted'],
    'approved': ['locked'],
    'locked': []
  },

  validateStatusTransition: (from, to) => {
    if (!budgetAllocationRules.validTransitions[from]?.includes(to)) {
      throw new Error(`Invalid status transition: ${from} → ${to}`);
    }
  },

  // Rule 6: Cannot edit approved/locked allocations
  validateEditable: (allocation) => {
    if (['approved', 'locked'].includes(allocation.status)) {
      throw new Error('Cannot edit approved or locked allocations');
    }
  },

  // Rule 7: Approval requires comment for rejection
  validateApprovalAction: (action, comment) => {
    if (['reject', 'request_revision'].includes(action) && !comment?.trim()) {
      throw new Error('Comment is required when rejecting or requesting revision');
    }
  }
};
```

### Calculation Logic

```javascript
const budgetCalculations = {
  // Calculate total budget
  calculateTotal: (allocation) => {
    return (
      allocation.salaryFixed +
      allocation.salaryVariable +
      allocation.benefitsEmployee +
      allocation.benefitsEmployer +
      allocation.newHiringBudget
    );
  },

  // Calculate variance from recommendation
  calculateVariance: (allocation) => {
    if (!allocation.recommendedTotal) return null;
    return ((allocation.totalBudget - allocation.recommendedTotal) / allocation.recommendedTotal) * 100;
  },

  // Roll up children to parent
  rollUpToParent: (childAllocations) => {
    return {
      salaryFixed: childAllocations.reduce((sum, c) => sum + c.salaryFixed, 0),
      salaryVariable: childAllocations.reduce((sum, c) => sum + c.salaryVariable, 0),
      benefitsEmployee: childAllocations.reduce((sum, c) => sum + c.benefitsEmployee, 0),
      benefitsEmployer: childAllocations.reduce((sum, c) => sum + c.benefitsEmployer, 0),
      newHiringBudget: childAllocations.reduce((sum, c) => sum + c.newHiringBudget, 0)
    };
  },

  // Generate recommendation based on previous year + growth
  generateRecommendation: (previousYearTotal, growthRate = 0.05) => {
    if (!previousYearTotal) return null;
    return previousYearTotal * (1 + growthRate);
  }
};
```

### API Endpoints

```yaml
# Budget Cycles
GET    /api/v1/budget-cycles                    # List cycles
POST   /api/v1/budget-cycles                    # Create cycle
PUT    /api/v1/budget-cycles/:id                # Update cycle
POST   /api/v1/budget-cycles/:id/activate       # Activate cycle
POST   /api/v1/budget-cycles/:id/lock           # Lock cycle
GET    /api/v1/budget-cycles/:id/allocations    # Get all allocations

# Budget Allocations
GET    /api/v1/allocations                      # List (with filters)
GET    /api/v1/allocations/:id                  # Get single
POST   /api/v1/allocations                      # Create
PUT    /api/v1/allocations/:id                  # Update
POST   /api/v1/allocations/:id/submit           # Submit for approval
POST   /api/v1/allocations/:id/approve          # Approve
POST   /api/v1/allocations/:id/reject           # Reject (requires comment)
POST   /api/v1/allocations/:id/request-revision # Request revision
GET    /api/v1/allocations/:id/children         # Get child allocations
POST   /api/v1/allocations/:id/distribute       # Auto-distribute to children

# Bulk Operations
POST   /api/v1/allocations/bulk-upload          # CSV upload
GET    /api/v1/allocations/export               # CSV export
```

### UI Components

```
BudgetPlanningPage
├── CycleSelectorBar
│   ├── CycleDropdown
│   ├── StatusBadge
│   └── CycleActions (Activate, Lock)
├── SummaryCards (sticky)
│   ├── TotalBudgetCard
│   ├── AllocatedCard
│   ├── RemainingCard
│   └── VarianceCard
├── HierarchicalAllocationTable
│   ├── TableHeader
│   │   ├── ColumnName (BU/CC/Dept)
│   │   ├── ColumnSalaryFixed
│   │   ├── ColumnSalaryVariable
│   │   ├── ColumnBenefitsEmployee
│   │   ├── ColumnBenefitsEmployer
│   │   ├── ColumnNewHiring
│   │   ├── ColumnTotal
│   │   ├── ColumnPreviousYear
│   │   ├── ColumnVariance
│   │   └── ColumnStatus
│   ├── TableRow (expandable)
│   │   ├── ExpandIcon
│   │   ├── UnitName
│   │   ├── EditableCell (for each budget category)
│   │   ├── TotalCell (readonly)
│   │   ├── PreviousYearCell (readonly)
│   │   ├── VarianceIndicator
│   │   ├── StatusChip
│   │   └── RowActions (Submit, View Comments)
│   └── TotalsRow
├── AllocationDetailModal
│   ├── AllocationForm
│   ├── CommentThread
│   └── AuditHistory
└── BulkActionsBar
    ├── UploadCSVButton
    ├── DownloadCSVButton
    └── ApplyRecommendationButton
```

---

## Module 3: Headcount Planning

### Data Model

```typescript
interface HeadcountPlan {
  id: string;
  budgetAllocationId: string;
  roleId: string | null; // NULL for org-unit level summary
  
  // Planning
  plannedHeadcount: number;
  actualHeadcount: number;
  
  // Computed
  shortfall: number; // planned - actual
  fillRate: number | null; // (actual / planned) * 100, null if planned = 0
  
  // Costs
  avgHiringCost: number;
  avgHiringCostFixed: number;
  avgHiringCostVariable: number;
  avgHiringCostBenefits: number;
  
  // Budget
  hiringBudget: number; // max(0, shortfall) * avgHiringCost
  actualBudgetConsumed: number;
  remainingBudget: number; // hiringBudget - actualBudgetConsumed
  
  // Overrides
  fillRateOverride: number | null;
  hiringBudgetOverride: number | null;
  overrideReason: string | null;
  
  // Status
  status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'partially_filled' | 'filled';
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

### Business Rules

```javascript
const headcountPlanRules = {
  // Rule 1: Headcount must be non-negative integers
  validateHeadcount: (plan) => {
    if (!Number.isInteger(plan.plannedHeadcount) || plan.plannedHeadcount < 0) {
      throw new Error('Planned headcount must be a non-negative integer');
    }
    if (!Number.isInteger(plan.actualHeadcount) || plan.actualHeadcount < 0) {
      throw new Error('Actual headcount must be a non-negative integer');
    }
  },

  // Rule 2: Cost breakdown must sum to total
  validateCostBreakdown: (plan) => {
    const sum = plan.avgHiringCostFixed + plan.avgHiringCostVariable + plan.avgHiringCostBenefits;
    const tolerance = 0.01;
    if (Math.abs(sum - plan.avgHiringCost) > tolerance) {
      throw new Error('Cost breakdown must equal average hiring cost');
    }
  },

  // Rule 3: Override requires comment
  validateOverride: (plan) => {
    if ((plan.fillRateOverride !== null || plan.hiringBudgetOverride !== null) && !plan.overrideReason?.trim()) {
      throw new Error('Override requires a comment explaining the reason');
    }
  },

  // Rule 4: Warning if overstaffed (actual > planned)
  checkOverstaffed: (plan) => {
    if (plan.actualHeadcount > plan.plannedHeadcount) {
      return {
        type: 'warning',
        message: `Overstaffed by ${plan.actualHeadcount - plan.plannedHeadcount} positions`
      };
    }
    return null;
  },

  // Rule 5: Warning if budget exceeded
  checkBudgetExceeded: (plan) => {
    if (plan.actualBudgetConsumed > plan.hiringBudget) {
      return {
        type: 'warning',
        message: `Budget exceeded by $${(plan.actualBudgetConsumed - plan.hiringBudget).toLocaleString()}`
      };
    }
    return null;
  }
};
```

### Calculation Logic

```javascript
const headcountCalculations = {
  // Calculate shortfall
  calculateShortfall: (planned, actual) => {
    return planned - actual;
  },

  // Calculate fill rate (handle division by zero)
  calculateFillRate: (planned, actual) => {
    if (planned === 0) {
      return actual === 0 ? 100 : null; // 100% if both zero, null otherwise
    }
    return (actual / planned) * 100;
  },

  // Calculate hiring budget
  calculateHiringBudget: (shortfall, avgHiringCost) => {
    return Math.max(0, shortfall) * avgHiringCost;
  },

  // Calculate remaining budget
  calculateRemainingBudget: (hiringBudget, consumed) => {
    return hiringBudget - consumed;
  },

  // Get effective value (use override if set)
  getEffectiveFillRate: (plan) => {
    return plan.fillRateOverride !== null ? plan.fillRateOverride : plan.fillRate;
  },

  getEffectiveHiringBudget: (plan) => {
    return plan.hiringBudgetOverride !== null ? plan.hiringBudgetOverride : plan.hiringBudget;
  },

  // Roll up to parent org unit
  rollUpHeadcount: (childPlans) => {
    return {
      plannedHeadcount: childPlans.reduce((sum, p) => sum + p.plannedHeadcount, 0),
      actualHeadcount: childPlans.reduce((sum, p) => sum + p.actualHeadcount, 0),
      hiringBudget: childPlans.reduce((sum, p) => sum + headcountCalculations.getEffectiveHiringBudget(p), 0),
      actualBudgetConsumed: childPlans.reduce((sum, p) => sum + p.actualBudgetConsumed, 0)
    };
  }
};
```

### API Endpoints

```yaml
# Headcount Plans
GET    /api/v1/headcount                        # List (with filters)
GET    /api/v1/headcount/:id                    # Get single
POST   /api/v1/headcount                        # Create
PUT    /api/v1/headcount/:id                    # Update
POST   /api/v1/headcount/:id/override           # Set override
DELETE /api/v1/headcount/:id/override           # Clear override
POST   /api/v1/headcount/:id/status             # Update status

# By Allocation
GET    /api/v1/allocations/:id/headcount        # Get headcount for allocation
POST   /api/v1/allocations/:id/headcount        # Create headcount entry

# Bulk
POST   /api/v1/headcount/bulk-upload            # CSV upload
GET    /api/v1/headcount/export                 # CSV export
```

### UI Components

```
HeadcountPlanningPage
├── AllocationSelector
│   ├── OrgUnitBreadcrumb
│   ├── CycleInfo
│   └── BudgetSummary
├── SummaryBanner (sticky)
│   ├── PlannedHeadcountTotal
│   ├── ActualHeadcountTotal
│   ├── ShortfallTotal
│   ├── FillRateOverall
│   ├── HiringBudgetTotal
│   └── RemainingBudgetTotal
├── HeadcountTable
│   ├── TableHeader
│   │   ├── ColumnRole
│   │   ├── ColumnPlanned
│   │   ├── ColumnActual
│   │   ├── ColumnShortfall
│   │   ├── ColumnFillRate
│   │   ├── ColumnAvgCost
│   │   ├── ColumnHiringBudget
│   │   ├── ColumnConsumed
│   │   ├── ColumnRemaining
│   │   └── ColumnStatus
│   ├── RoleRow (expandable)
│   │   ├── RoleName
│   │   ├── EditableCell(planned)
│   │   ├── EditableCell(actual)
│   │   ├── ShortfallCell (readonly, color-coded)
│   │   ├── FillRateCell (overridable)
│   │   ├── AvgCostCell (expandable to breakdown)
│   │   ├── HiringBudgetCell (overridable)
│   │   ├── ConsumedCell
│   │   ├── RemainingCell (color-coded)
│   │   └── StatusChip
│   ├── CostBreakdownExpansion
│   │   ├── FixedCostRow
│   │   ├── VariableCostRow
│   │   └── BenefitsCostRow
│   └── AddRoleButton
├── OverrideModal
│   ├── CurrentValue
│   ├── NewValueInput
│   ├── ReasonTextarea (required)
│   └── SaveButton
└── StatusBar
    ├── AutoSaveIndicator
    ├── WarningsList
    └── SubmitButton
```

---

## Module 4: Pay Grade Configuration

### Data Model

```typescript
interface PayGrade {
  id: string;
  code: string; // e.g., 'A', 'B', 'C'
  band: number; // e.g., 1, 2, 3
  roleId: string;
  
  compMin: number;
  compMax: number;
  compMidpoint: number; // Calculated: (min + max) / 2
  
  currencyCode: string;
  status: 'draft' | 'active' | 'inactive';
  effectiveDate: Date;
  expiryDate: Date | null;
  
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Business Rules

```javascript
const payGradeRules = {
  // Rule 1: Min must be <= Max
  validateRange: (payGrade) => {
    if (payGrade.compMin > payGrade.compMax) {
      throw new Error('Minimum compensation cannot exceed maximum');
    }
  },

  // Rule 2: No negative values
  validatePositive: (payGrade) => {
    if (payGrade.compMin < 0 || payGrade.compMax < 0) {
      throw new Error('Compensation values must be non-negative');
    }
  },

  // Rule 3: Unique combination (code + band + role + effective date)
  validateUnique: async (payGrade, existingGrades) => {
    const duplicate = existingGrades.find(
      g => g.code === payGrade.code &&
           g.band === payGrade.band &&
           g.roleId === payGrade.roleId &&
           g.effectiveDate.getTime() === payGrade.effectiveDate.getTime() &&
           g.id !== payGrade.id
    );
    if (duplicate) {
      throw new Error('Pay grade combination already exists for this effective date');
    }
  },

  // Rule 4: Effective date must be before or equal to expiry date
  validateDates: (payGrade) => {
    if (payGrade.expiryDate && payGrade.effectiveDate > payGrade.expiryDate) {
      throw new Error('Effective date must be before expiry date');
    }
  },

  // Rule 5: Cannot deactivate if in use
  validateDeactivation: async (payGrade, isInUse) => {
    if (payGrade.status === 'inactive' && await isInUse(payGrade.id)) {
      return {
        type: 'warning',
        message: 'This pay grade is currently in use. Deactivating will affect active compensation cycles.'
      };
    }
  }
};
```

### API Endpoints

```yaml
# Pay Grades
GET    /api/v1/pay-grades                       # List (with filters)
GET    /api/v1/pay-grades/:id                   # Get single
POST   /api/v1/pay-grades                       # Create
PUT    /api/v1/pay-grades/:id                   # Update
DELETE /api/v1/pay-grades/:id                   # Delete (soft)

# Lookup
GET    /api/v1/pay-grades/lookup                # Find by grade/band/role

# Bulk
POST   /api/v1/pay-grades/bulk-upload           # CSV upload
GET    /api/v1/pay-grades/export                # CSV export
```

---

## Module 5: Compensation Cycles

### Data Model

```typescript
interface CompensationCycle {
  id: string;
  budgetCycleId: string; // Links to budget planning cycle
  name: string;
  cycleType: 'annual_review' | 'mid_year_review' | 'bonus' | 'promotion' | 'market_adjustment';
  
  // Feature Flags
  enableSalaryRevision: boolean;
  enableBonus: boolean;
  enablePromotion: boolean;
  
  startDate: Date;
  endDate: Date;
  
  status: 'draft' | 'open' | 'in_progress' | 'locked' | 'completed' | 'cancelled';
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Business Rules

```javascript
const compensationCycleRules = {
  // Rule 1: Must link to budget cycle
  validateBudgetLink: (cycle) => {
    if (!cycle.budgetCycleId) {
      throw new Error('Compensation cycle must be linked to a budget cycle');
    }
  },

  // Rule 2: At least one feature must be enabled
  validateFeatures: (cycle) => {
    if (!cycle.enableSalaryRevision && !cycle.enableBonus && !cycle.enablePromotion) {
      throw new Error('At least one compensation component must be enabled');
    }
  },

  // Rule 3: Dates must fall within budget cycle dates
  validateDates: async (cycle, budgetCycle) => {
    if (cycle.startDate < budgetCycle.startDate || cycle.endDate > budgetCycle.endDate) {
      throw new Error('Compensation cycle dates must fall within budget cycle dates');
    }
  },

  // Rule 4: Cannot modify locked/completed cycles
  validateEditable: (cycle) => {
    if (['locked', 'completed'].includes(cycle.status)) {
      throw new Error('Cannot modify locked or completed cycles');
    }
  }
};
```

### API Endpoints

```yaml
GET    /api/v1/compensation-cycles              # List
POST   /api/v1/compensation-cycles              # Create
PUT    /api/v1/compensation-cycles/:id          # Update
POST   /api/v1/compensation-cycles/:id/open     # Open cycle
POST   /api/v1/compensation-cycles/:id/lock     # Lock cycle
POST   /api/v1/compensation-cycles/:id/complete # Complete cycle
```

---

## Module 6: Audit Logging

### Data Model

```typescript
interface AuditLog {
  id: string;
  entityType: 'org_unit' | 'budget_cycle' | 'budget_allocation' | 'headcount_plan' | 'pay_grade' | 'compensation_cycle' | 'user' | 'role';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'submit' | 'override' | 'status_change';
  fieldChanged: string | null; // Specific field if update
  oldValue: any;
  newValue: any;
  userId: string;
  userRole: string;
  comment: string | null;
  ipAddress: string;
  sessionId: string;
  createdAt: Date;
}
```

### Implementation

```javascript
// Audit middleware
const auditMiddleware = (entityType) => async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    if (res.statusCode < 400) {
      // Log successful operations
      createAuditLog({
        entityType,
        entityId: req.params.id || JSON.parse(body)?.id,
        action: methodToAction(req.method),
        fieldChanged: req.body.field || null,
        oldValue: req.originalEntity || null,
        newValue: req.body,
        userId: req.user.id,
        userRole: req.user.role,
        comment: req.body.comment || null,
        ipAddress: req.ip,
        sessionId: req.sessionId
      });
    }
    return originalSend.call(this, body);
  };
  
  next();
};

const methodToAction = (method) => {
  const map = {
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return map[method] || 'unknown';
};
```

### API Endpoints

```yaml
GET    /api/v1/audit                            # Query logs (with filters)
GET    /api/v1/audit/entity/:type/:id           # Logs for specific entity
GET    /api/v1/audit/export                     # Export to CSV
```

---

## Cross-Cutting Concerns

### Authentication & Authorization

```javascript
// Permission check middleware
const checkPermission = (resource, action) => async (req, res, next) => {
  const user = req.user;
  const orgUnitId = req.params.orgUnitId || req.body.orgUnitId;
  
  const hasPermission = await userHasPermission(user.id, resource, action, orgUnitId);
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  next();
};

const userHasPermission = async (userId, resource, action, orgUnitId) => {
  // Get user's roles for this org unit (and ancestors)
  const roles = await getUserRolesForOrgUnit(userId, orgUnitId);
  
  // Check if any role grants the required permission
  for (const role of roles) {
    const permission = role.permissions.find(p => p.resource === resource);
    if (permission && permission.actions.includes(action)) {
      return true;
    }
  }
  
  return false;
};
```

### Auto-Save

```javascript
// Frontend auto-save hook
const useAutoSave = (data, saveFunction, debounceMs = 2000) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  
  const debouncedSave = useMemo(
    () => debounce(async (data) => {
      setIsSaving(true);
      setError(null);
      try {
        await saveFunction(data);
        setLastSaved(new Date());
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs),
    [saveFunction, debounceMs]
  );
  
  useEffect(() => {
    if (data) {
      debouncedSave(data);
    }
    return () => debouncedSave.cancel();
  }, [data, debouncedSave]);
  
  return { isSaving, lastSaved, error };
};
```

### Validation Response Format

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}
```

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "salaryFixed",
        "message": "Value must be at least 10,000",
        "code": "MIN_VALUE"
      }
    ]
  }
}
```

---

## Database Schema (PostgreSQL)

```sql
-- Run this in order

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
CREATE TYPE unit_type AS ENUM ('legal_entity', 'business_unit', 'cost_center', 'department');
CREATE TYPE unit_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE cycle_type AS ENUM ('annual', 'half_yearly', 'quarterly');
CREATE TYPE budget_cycle_status AS ENUM ('draft', 'active', 'locked', 'closed');
CREATE TYPE allocation_status AS ENUM ('draft', 'submitted', 'pending_approval', 'revision_required', 'approved', 'locked');
CREATE TYPE headcount_status AS ENUM ('not_started', 'in_progress', 'submitted', 'approved', 'partially_filled', 'filled');
CREATE TYPE pay_grade_status AS ENUM ('draft', 'active', 'inactive');
CREATE TYPE comp_cycle_type AS ENUM ('annual_review', 'mid_year_review', 'bonus', 'promotion', 'market_adjustment');
CREATE TYPE comp_cycle_status AS ENUM ('draft', 'open', 'in_progress', 'locked', 'completed', 'cancelled');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'submit', 'override', 'status_change');

-- 3. Tables (see data model section for full schema)

-- 4. Indexes
CREATE INDEX idx_org_units_parent ON organization_units(parent_id);
CREATE INDEX idx_allocations_cycle ON budget_allocations(budget_cycle_id);
CREATE INDEX idx_allocations_org ON budget_allocations(org_unit_id);
CREATE INDEX idx_headcount_allocation ON headcount_plans(budget_allocation_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(created_at);

-- 5. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_units_timestamp
  BEFORE UPDATE ON organization_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Repeat for other tables...
```

---

## Testing Checklist

### Unit Tests
- [ ] Budget allocation validation rules
- [ ] Headcount calculation logic
- [ ] Status transition validation
- [ ] Permission checking
- [ ] Roll-up calculations

### Integration Tests
- [ ] Create full budget cycle workflow
- [ ] Approval chain (submit → approve → lock)
- [ ] Hierarchy operations (add, move, delete)
- [ ] Concurrent edit handling
- [ ] CSV import/export

### E2E Tests
- [ ] Compensation Manager creates and activates cycle
- [ ] Department Head enters allocations and submits
- [ ] BU Head reviews and approves
- [ ] Override with comment
- [ ] Audit trail verification

---

*End of Technical Specification*
