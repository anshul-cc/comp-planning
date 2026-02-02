# Compensation Management Platform: PRD Review & V2 Roadmap

**Document Version:** 1.0  
**Review Date:** January 16, 2026  
**Prepared By:** Senior Product Manager (10+ Years Compensation Domain Experience)

---

## Executive Summary

After reviewing both PRD documents, I've identified that you have a solid foundation covering four major modules:

1. **Org Structure & Role Management** - Hierarchy management, RBAC, permissions
2. **Pay Grade & Compensation Budget Mapping** - Grade/band/role to compensation ranges
3. **Compensation Cycle Management** - Linking planning cycles to budgets
4. **Headcount Planning & Budget Allocation** - Hierarchical budget distribution and approval

This review provides:
- **Part 1:** Critical gaps and inconsistencies that need immediate attention for MVP
- **Part 2:** Missing edge cases from real-world compensation management
- **Part 3:** Architectural recommendations for Claude Code implementation
- **Part 4:** V2 Feature Roadmap with industry-standard enhancements

---

## Part 1: Critical Gaps & Inconsistencies for MVP

### 1.1 Data Model Inconsistencies

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Budget Category Mismatch** | Headcount Planning uses "Salary/Benefits/New Hiring" but Pay Grade module uses "Min/Max Range" | High - Calculations will break | Unify: Budget = Salary Fixed + Salary Variable + Benefits (Employee + Employer) + New Hiring Budget |
| **Hierarchy Terminology** | PRD_2 uses "BU → Cost Center → Department → Role", PRD_Documents uses "BU → CC → Dept" interchangeably | Medium - Dev confusion | Standardize in data model: `organization_unit` table with `type` enum |
| **Cycle vs Budget Relationship** | Compensation Cycle says "many cycles to one budget" but Headcount Planning implies one-to-one | High - Schema conflict | Clarify: One Budget Planning Cycle → Multiple Compensation Cycles (Salary, Bonus, Promotion) |
| **Fill Rate Definition** | Defined as "(Actual Hires / Planned Headcount)" but Headcount uses "Actual Headcount" | Medium - Metric confusion | Clarify: Fill Rate = (Actual Headcount / Planned Headcount) × 100 |

### 1.2 Missing Core Validations

**Budget Allocation Module:**
```
MISSING: Sum of child allocations MUST equal parent allocation
MISSING: Cannot approve child before parent allocation is finalized
MISSING: Budget redistribution rules when org structure changes mid-cycle
```

**Headcount Planning Module:**
```
MISSING: What happens when Planned Headcount = 0? (Division by zero in Fill Rate)
MISSING: Currency conversion rules for global organizations
MISSING: Handling of partial FTE (0.5 headcount for part-time)
```

**Compensation Cycle Module:**
```
MISSING: What happens to in-flight approvals when cycle is locked?
MISSING: Rollover rules for unused budget
MISSING: Mid-cycle budget adjustment workflow
```

### 1.3 Approval Workflow Gaps

The PRD specifies the approval chain as:
> Compensation Manager → Business Unit Head → Cost Center Head → Department Head

**Critical Issues:**

1. **Direction Ambiguity**: This implies top-down approval, but the workflow description shows bottom-up submission. Clarify:
   - **Budget ALLOCATION flows top-down**: Comp Manager allocates → BU Head distributes → CC Head distributes → Dept Head receives
   - **Budget APPROVAL flows bottom-up**: Dept Head submits → CC Head approves → BU Head approves → Comp Manager finalizes

2. **Missing Delegation Rules:**
   - What if BU Head is on leave?
   - Can approval be delegated?
   - What's the SLA for each approval step?
   - Auto-escalation after X days?

3. **Missing Rejection Handling:**
   - Can a rejected allocation be partially approved?
   - How many revision cycles before escalation?
   - What happens to downstream approvals when parent rejects?

### 1.4 Status State Machine Gaps

Current statuses mentioned: `Not Started | In Progress | Approved | Partially Filled | Filled`

**Missing States:**
```
Draft              → Initial state before any data entry
Pending Review     → Submitted but awaiting first-level approval
Revision Required  → Sent back for changes
Locked             → Cannot edit (distinct from Approved)
Cancelled          → Cycle/allocation voided
On Hold            → Temporarily paused
```

**Missing Transitions:**
```
Approved → Revision Required (what if error discovered post-approval?)
Filled → Partially Filled (if hire leaves or position reopened?)
Any State → Cancelled (what happens to child records?)
```

### 1.5 Audit Trail Incompleteness

PRD mentions "audit trail stubbed for future" but for compliance, MVP needs:

```javascript
// Minimum audit schema
{
  id: UUID,
  entity_type: "budget_allocation" | "headcount" | "compensation_cycle" | "approval",
  entity_id: UUID,
  action: "create" | "update" | "delete" | "approve" | "reject" | "override",
  field_changed: string,
  old_value: JSON,
  new_value: JSON,
  user_id: UUID,
  user_role: string,
  timestamp: DateTime,
  ip_address: string,
  session_id: string,
  comment: string // Required for overrides
}
```

---

## Part 2: Missing Edge Cases from Real-World Operations

### 2.1 Organizational Changes Mid-Cycle

**Scenario: Department Merger**
- Department A (Budget: $1M) merges into Department B (Budget: $800K)
- In-progress headcount plans exist for both
- What happens to:
  - Combined budget ($1.8M or needs reapproval?)
  - Filled positions (do they retain department assignment?)
  - Pending approvals (auto-cancelled or transferred?)
  - Historical reporting (which department gets credit?)

**Recommendation for MVP:**
```
Rule: Org changes during active cycle require:
1. Lock all affected allocations
2. Admin manually reassigns budgets
3. All downstream approvals invalidated
4. Audit log captures full trail
```

**Scenario: Department Split**
- Department X splits into Department Y and Department Z
- Budget: $2M needs division
- Historical headcount: 50 people need reassignment

**Missing UI Workflow:**
- Wizard for splitting budget proportionally
- Employee reassignment interface
- Retroactive reporting configuration

### 2.2 Multi-Currency Scenarios

**Current Gap:** PRD assumes single currency but enterprise clients operate globally.

**Edge Cases:**
1. BU in US allocates $100K, Cost Center in India receives ₹8,400,000
2. Exchange rate changes mid-cycle
3. Budget reporting: Local currency vs. consolidated currency
4. Hiring cost varies dramatically by geography (Senior Engineer: $150K US vs $40K India)

**MVP Recommendation:**
```
For V1: Single base currency (USD) with conversion at entry time
Store: amount_local, currency_local, amount_base, currency_base, exchange_rate_used
Display: User preference for local vs base
Reporting: Always in base currency with local currency tooltip
```

### 2.3 Retroactive Adjustments

**Scenario: Bonus Clawback**
- Employee received $50K bonus in Q1
- Terminated for cause in Q2
- Company policy requires clawback
- How does this affect:
  - Budget consumed (reduce?)
  - Historical reports (show negative?)
  - Audit trail (link to termination?)

**Scenario: Salary Correction**
- Payroll error: Employee paid $10K extra over 6 months
- Correction needs processing
- Budget impact calculation

**Missing in PRD:**
```
- Adjustment transaction type
- Negative budget consumption handling
- Correction vs. error classification
- Impact on Fill Rate and metrics
```

### 2.4 Compliance & Legal Edge Cases

**Equal Pay Compliance:**
- When setting compensation ranges, system should flag if:
  - Same role in same location has different ranges
  - Range overlap creates pay equity risk
  - New hire offer exceeds existing employee at same level

**Missing Validation:**
```javascript
// Before saving compensation range
if (newRange.min > existingEmployeesAtRole.avgSalary * 1.1) {
  showWarning("New range minimum exceeds current average by >10%. Review for pay equity.");
}
```

**Audit Requirements (SOX, GDPR, etc.):**
- Who can see salary data? (PRD mentions role-based but not granular)
- Data retention policies (how long to keep compensation history?)
- Right to deletion vs. audit trail requirements
- Cross-border data transfer restrictions

### 2.5 Concurrent Edit Conflicts

**Scenario:** Two HR Admins editing same budget allocation simultaneously.

**Current PRD:** "last-write wins with warning"

**Better Approach for MVP:**
```
1. Optimistic locking with version numbers
2. When conflict detected:
   - Show diff of changes
   - Allow merge or override
   - Require comment for override
3. Real-time collaboration indicators (who's editing what)
```

### 2.6 Bulk Operations Edge Cases

**Scenario: Bulk salary increase of 5% for 500 employees**
- 10 employees already at max of their band
- 5 employees on Performance Improvement Plan (should be excluded)
- 3 employees have pending promotions (which salary to use as base?)

**Missing Business Rules:**
```
- Cap at band maximum with overflow flag
- Exclusion list management (PIP, Notice Period, etc.)
- Effective date handling for pending changes
- Proration rules for mid-year hires
```

### 2.7 Integration Edge Cases (Even for MVP)

Even without full HRMS integration, MVP needs:

**Manual Data Import Validation:**
```
- Duplicate employee detection (name, email, employee ID)
- Invalid org unit reference handling
- Data type coercion (string "50,000" → number 50000)
- Required field enforcement with clear error messages
```

**Export Integrity:**
```
- Large export handling (>10K rows)
- Character encoding (UTF-8 for international names)
- Formula preservation in Excel exports
- PII masking options for compliance
```

---

## Part 3: Architectural Recommendations for Claude Code

### 3.1 Recommended Data Model

```sql
-- Core Hierarchy (replaces separate BU/CC/Dept tables)
CREATE TABLE organization_units (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES organization_units(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  unit_type ENUM('legal_entity', 'business_unit', 'cost_center', 'department') NOT NULL,
  status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
  currency_code CHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  CONSTRAINT valid_hierarchy CHECK (
    (unit_type = 'legal_entity' AND parent_id IS NULL) OR
    (unit_type != 'legal_entity' AND parent_id IS NOT NULL)
  )
);

-- Budget Planning Cycles
CREATE TABLE budget_cycles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cycle_type ENUM('annual', 'half_yearly', 'quarterly') NOT NULL,
  fiscal_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft', 'active', 'locked', 'closed') DEFAULT 'draft',
  base_currency CHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  locked_at TIMESTAMP,
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT no_overlap UNIQUE (fiscal_year, cycle_type, status) -- Prevents duplicate active cycles
);

-- Budget Allocations (Hierarchical)
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY,
  budget_cycle_id UUID REFERENCES budget_cycles(id) NOT NULL,
  org_unit_id UUID REFERENCES organization_units(id) NOT NULL,
  parent_allocation_id UUID REFERENCES budget_allocations(id),
  
  -- Salary Budget
  salary_fixed DECIMAL(15,2) DEFAULT 0 CHECK (salary_fixed >= 0),
  salary_variable DECIMAL(15,2) DEFAULT 0 CHECK (salary_variable >= 0),
  
  -- Benefits Budget
  benefits_employee DECIMAL(15,2) DEFAULT 0 CHECK (benefits_employee >= 0),
  benefits_employer DECIMAL(15,2) DEFAULT 0 CHECK (benefits_employer >= 0),
  
  -- Hiring Budget
  new_hiring_budget DECIMAL(15,2) DEFAULT 0 CHECK (new_hiring_budget >= 0),
  
  -- Computed (stored for performance)
  total_budget DECIMAL(15,2) GENERATED ALWAYS AS (
    salary_fixed + salary_variable + benefits_employee + benefits_employer + new_hiring_budget
  ) STORED,
  
  -- Status & Workflow
  status ENUM('draft', 'submitted', 'pending_approval', 'revision_required', 'approved', 'locked') DEFAULT 'draft',
  version INT DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  
  UNIQUE (budget_cycle_id, org_unit_id)
);

-- Headcount Planning
CREATE TABLE headcount_plans (
  id UUID PRIMARY KEY,
  budget_allocation_id UUID REFERENCES budget_allocations(id) NOT NULL,
  role_id UUID REFERENCES roles(id),
  
  planned_headcount INT DEFAULT 0 CHECK (planned_headcount >= 0),
  actual_headcount INT DEFAULT 0 CHECK (actual_headcount >= 0),
  
  -- Computed
  shortfall INT GENERATED ALWAYS AS (planned_headcount - actual_headcount) STORED,
  fill_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN planned_headcount > 0 
         THEN (actual_headcount::DECIMAL / planned_headcount) * 100 
         ELSE 0 
    END
  ) STORED,
  
  -- Costs
  avg_hiring_cost DECIMAL(15,2) DEFAULT 0,
  avg_hiring_cost_fixed DECIMAL(15,2) DEFAULT 0,
  avg_hiring_cost_variable DECIMAL(15,2) DEFAULT 0,
  avg_hiring_cost_benefits DECIMAL(15,2) DEFAULT 0,
  
  -- Budget Tracking
  hiring_budget DECIMAL(15,2) GENERATED ALWAYS AS (
    GREATEST(0, planned_headcount - actual_headcount) * avg_hiring_cost
  ) STORED,
  actual_budget_consumed DECIMAL(15,2) DEFAULT 0,
  
  -- Overrides (NULL means use calculated value)
  fill_rate_override DECIMAL(5,2),
  hiring_budget_override DECIMAL(15,2),
  override_reason TEXT,
  
  status ENUM('not_started', 'in_progress', 'submitted', 'approved', 'partially_filled', 'filled') DEFAULT 'not_started',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pay Grades & Bands
CREATE TABLE pay_grades (
  id UUID PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  band INT NOT NULL,
  role_id UUID REFERENCES roles(id) NOT NULL,
  
  comp_min DECIMAL(15,2) NOT NULL CHECK (comp_min >= 0),
  comp_max DECIMAL(15,2) NOT NULL CHECK (comp_max >= comp_min),
  comp_midpoint DECIMAL(15,2) GENERATED ALWAYS AS ((comp_min + comp_max) / 2) STORED,
  
  currency_code CHAR(3) DEFAULT 'USD',
  status ENUM('draft', 'active', 'inactive') DEFAULT 'draft',
  effective_date DATE NOT NULL,
  expiry_date DATE,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (code, band, role_id, effective_date)
);

-- Compensation Cycles
CREATE TABLE compensation_cycles (
  id UUID PRIMARY KEY,
  budget_cycle_id UUID REFERENCES budget_cycles(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  cycle_type ENUM('annual_review', 'mid_year_review', 'bonus', 'promotion', 'market_adjustment') NOT NULL,
  
  -- Feature Flags
  enable_salary_revision BOOLEAN DEFAULT FALSE,
  enable_bonus BOOLEAN DEFAULT FALSE,
  enable_promotion BOOLEAN DEFAULT FALSE,
  
  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  status ENUM('draft', 'open', 'in_progress', 'locked', 'completed', 'cancelled') DEFAULT 'draft',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unified Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  user_id UUID NOT NULL,
  user_role VARCHAR(100),
  comment TEXT,
  ip_address INET,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_user (user_id),
  INDEX idx_timestamp (created_at)
);
```

### 3.2 API Structure Recommendation

```
/api/v1/
├── auth/
│   ├── login
│   ├── logout
│   └── refresh
├── org/
│   ├── units/                    # CRUD for org hierarchy
│   ├── units/{id}/children       # Get direct children
│   ├── units/{id}/ancestors      # Get path to root
│   └── units/{id}/tree          # Get full subtree
├── users/
│   ├── /                         # CRUD for users
│   ├── {id}/roles               # Get/Set user roles per org unit
│   └── {id}/permissions         # Get effective permissions
├── budget-cycles/
│   ├── /                         # CRUD for cycles
│   ├── {id}/activate            # Activate cycle
│   ├── {id}/lock                # Lock cycle
│   └── {id}/allocations         # Get all allocations in cycle
├── allocations/
│   ├── /                         # CRUD for allocations
│   ├── {id}/submit              # Submit for approval
│   ├── {id}/approve             # Approve allocation
│   ├── {id}/reject              # Reject with comment
│   ├── {id}/distribute          # Distribute to children
│   └── bulk/                    # Bulk operations
├── headcount/
│   ├── /                         # CRUD for headcount plans
│   ├── {id}/override            # Override calculated fields
│   └── {id}/status              # Update status
├── pay-grades/
│   ├── /                         # CRUD for pay grades
│   ├── lookup                   # Find grade by role/band
│   └── export                   # Export to CSV
├── compensation-cycles/
│   ├── /                         # CRUD for comp cycles
│   ├── {id}/components          # Toggle salary/bonus/promotion
│   └── {id}/link-budget         # Link to budget cycle
└── audit/
    ├── /                         # Query audit logs
    └── export                   # Export audit report
```

### 3.3 Component Architecture for Frontend

```
src/
├── components/
│   ├── common/
│   │   ├── HierarchicalTable/     # Reusable expandable table
│   │   ├── ApprovalWorkflow/      # Status chips, approval buttons
│   │   ├── BudgetSummaryCard/     # Sticky summary component
│   │   ├── AuditTrail/            # History panel
│   │   ├── CommentModal/          # Required for overrides/rejections
│   │   └── CurrencyInput/         # Formatted currency fields
│   ├── org/
│   │   ├── OrgTreeView/           # Drag-drop hierarchy
│   │   ├── OrgNodeEditor/         # Add/edit org units
│   │   └── UserAssignment/        # Multi-select user assignment
│   ├── budget/
│   │   ├── CycleLauncher/         # Create new cycle wizard
│   │   ├── AllocationTable/       # Hierarchical budget entry
│   │   ├── ApprovalDashboard/     # Review and approve
│   │   └── VarianceReport/        # Budget vs actual
│   ├── headcount/
│   │   ├── HeadcountPlanner/      # Role-level planning
│   │   ├── CostBreakdown/         # Expandable cost details
│   │   └── FillRateTracker/       # Visual progress
│   ├── paygrade/
│   │   ├── PayGradeGrid/          # Master grid view
│   │   ├── RangeLookup/           # Typeahead search
│   │   └── BulkEditor/            # Multi-row operations
│   └── compensation/
│       ├── CycleManager/          # Create/configure cycles
│       ├── ComponentToggle/       # Enable salary/bonus/promo
│       └── BudgetLinker/          # Link to budget cycles
├── hooks/
│   ├── useOrgHierarchy.ts         # Fetch and cache org tree
│   ├── useBudgetCalculations.ts   # Real-time roll-ups
│   ├── useApprovalWorkflow.ts     # Status transitions
│   └── useAuditLog.ts             # Audit trail operations
├── store/
│   ├── orgSlice.ts
│   ├── budgetSlice.ts
│   ├── headcountSlice.ts
│   └── compensationSlice.ts
└── utils/
    ├── currencyFormatter.ts
    ├── hierarchyUtils.ts          # Tree traversal helpers
    ├── validationRules.ts         # Business rule validators
    └── permissionChecker.ts       # RBAC utilities
```

### 3.4 Key Business Logic for Claude Code

```javascript
// budgetValidation.js - Core validation rules

export const validateBudgetAllocation = (allocation, parentAllocation, childAllocations) => {
  const errors = [];
  const warnings = [];

  // Rule 1: Salary Fixed minimum
  if (allocation.salaryFixed < 10000) {
    errors.push({
      field: 'salaryFixed',
      message: 'Salary Fixed must be at least 10,000',
      code: 'MIN_SALARY_FIXED'
    });
  }

  // Rule 2: Sum of children must equal parent (if children exist)
  if (childAllocations && childAllocations.length > 0) {
    const childSum = childAllocations.reduce((sum, child) => sum + child.totalBudget, 0);
    if (Math.abs(childSum - allocation.totalBudget) > 0.01) {
      errors.push({
        field: 'totalBudget',
        message: `Child allocations (${formatCurrency(childSum)}) must equal parent (${formatCurrency(allocation.totalBudget)})`,
        code: 'CHILD_SUM_MISMATCH'
      });
    }
  }

  // Rule 3: Cannot exceed parent allocation
  if (parentAllocation && allocation.totalBudget > parentAllocation.totalBudget) {
    errors.push({
      field: 'totalBudget',
      message: 'Allocation cannot exceed parent allocation',
      code: 'EXCEEDS_PARENT'
    });
  }

  // Rule 4: Warning if variance > 10% from recommendation
  if (allocation.recommendedBudget) {
    const variance = Math.abs(allocation.totalBudget - allocation.recommendedBudget) / allocation.recommendedBudget;
    if (variance > 0.1) {
      warnings.push({
        field: 'totalBudget',
        message: `Allocation varies ${(variance * 100).toFixed(1)}% from recommendation`,
        code: 'HIGH_VARIANCE'
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const validateHeadcountPlan = (plan) => {
  const errors = [];
  const warnings = [];

  // Rule 1: Actual cannot be negative
  if (plan.actualHeadcount < 0) {
    errors.push({
      field: 'actualHeadcount',
      message: 'Actual headcount cannot be negative',
      code: 'NEGATIVE_ACTUAL'
    });
  }

  // Rule 2: Warning if overstaffed
  if (plan.actualHeadcount > plan.plannedHeadcount) {
    warnings.push({
      field: 'actualHeadcount',
      message: 'Actual exceeds planned (overstaffed)',
      code: 'OVERSTAFFED'
    });
  }

  // Rule 3: Fill rate override requires comment
  if (plan.fillRateOverride !== null && !plan.overrideReason) {
    errors.push({
      field: 'fillRateOverride',
      message: 'Override requires a comment',
      code: 'OVERRIDE_COMMENT_REQUIRED'
    });
  }

  // Rule 4: Average hiring cost breakdown must sum correctly
  const costBreakdownSum = plan.avgHiringCostFixed + plan.avgHiringCostVariable + plan.avgHiringCostBenefits;
  if (Math.abs(costBreakdownSum - plan.avgHiringCost) > 0.01) {
    errors.push({
      field: 'avgHiringCost',
      message: 'Cost breakdown must equal average hiring cost',
      code: 'COST_BREAKDOWN_MISMATCH'
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const validateApprovalTransition = (currentStatus, newStatus, userRole, allocation) => {
  const validTransitions = {
    'draft': ['submitted'],
    'submitted': ['pending_approval', 'draft'], // Can withdraw
    'pending_approval': ['approved', 'revision_required'],
    'revision_required': ['submitted'],
    'approved': ['locked'],
    'locked': [] // Terminal state
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`
    };
  }

  // Role-based approval rules
  const approvalRoles = {
    'pending_approval': ['cost_center_head', 'bu_head', 'compensation_manager'],
    'locked': ['compensation_manager']
  };

  if (approvalRoles[newStatus] && !approvalRoles[newStatus].includes(userRole)) {
    return {
      allowed: false,
      reason: `Role ${userRole} cannot perform this action`
    };
  }

  return { allowed: true };
};
```

---

## Part 4: V2 Feature Roadmap

### Phase 1: Enhanced Workflow & Collaboration (Q2)

#### 1.1 Approval Delegation & Escalation
- **Delegate Authority**: Allow approvers to delegate to backup during absence
- **Auto-Escalation**: Configurable SLA (e.g., 3 days) with automatic escalation
- **Bulk Approval**: Approve multiple allocations with single action
- **Approval Dashboard**: Kanban-style view of pending approvals

#### 1.2 Real-Time Collaboration
- **Live Presence**: See who's currently editing which allocation
- **Collaborative Comments**: @mention users, threaded discussions
- **Change Notifications**: Real-time alerts for status changes
- **Conflict Resolution UI**: Visual diff when concurrent edits occur

#### 1.3 Advanced Audit & Compliance
- **Compliance Reports**: Pre-built reports for SOX, GDPR
- **Data Access Logging**: Track who viewed sensitive compensation data
- **Export Audit Trail**: PDF reports for external auditors
- **Retention Policies**: Configurable data retention rules

### Phase 2: Analytics & Intelligence (Q3)

#### 2.1 Budget Analytics Dashboard
- **Variance Analysis**: Budget vs. Actual with drill-down
- **Trend Analysis**: Year-over-year budget comparisons
- **Forecasting**: ML-based budget predictions
- **What-If Scenarios**: Model impact of different allocation strategies

#### 2.2 Compensation Intelligence
- **Market Benchmarking**: Compare pay grades to market data
- **Pay Equity Analysis**: Identify potential pay gaps
- **Compa-Ratio Tracking**: Monitor position in range for all employees
- **Promotion Readiness**: Flag employees approaching band maximum

#### 2.3 Headcount Analytics
- **Attrition Prediction**: ML model for turnover risk
- **Hiring Velocity**: Track time-to-fill trends
- **Cost-per-Hire Analysis**: Breakdown by department, role, source
- **Capacity Planning**: Model scenarios for growth/contraction

### Phase 3: Integration & Automation (Q4)

#### 3.1 HRMS Integration
- **Workday Connector**: Real-time employee data sync
- **SAP SuccessFactors**: Bi-directional integration
- **BambooHR**: Small/mid-market integration
- **Generic API**: REST/GraphQL for custom HRMS

#### 3.2 Payroll Integration
- **ADP Integration**: Push approved salary changes
- **Gusto/Rippling**: Small business payroll sync
- **Reconciliation Reports**: Match budget to actual payroll

#### 3.3 ATS Integration
- **Greenhouse/Lever**: Sync requisitions to headcount plans
- **Offer Approval Workflow**: Route offers through budget validation
- **Auto-Update on Hire**: Mark positions filled automatically

#### 3.4 Finance System Integration
- **NetSuite/QuickBooks**: Budget sync for financial planning
- **Anaplan/Adaptive**: Planning system integration
- **GL Mapping**: Map compensation to chart of accounts

### Phase 4: Advanced Features (Q1 Next Year)

#### 4.1 Configurable Workflows
- **Workflow Builder**: Drag-drop approval workflow designer
- **Conditional Routing**: Route based on amount, role, org unit
- **Parallel Approvals**: Multiple approvers simultaneously
- **Custom Statuses**: Organization-defined status labels

#### 4.2 Multi-Entity & Global Support
- **Multi-Currency**: Full multi-currency with auto-conversion
- **Multi-Language**: UI localization
- **Regional Compliance**: Country-specific rules (US, UK, EU, APAC)
- **Entity Consolidation**: Roll up across legal entities

#### 4.3 Mobile Experience
- **Mobile Approvals**: Approve/reject from phone
- **Push Notifications**: Real-time alerts
- **Offline Mode**: Queue approvals for sync

#### 4.4 Advanced Security
- **SSO/SAML**: Enterprise identity integration
- **MFA**: Multi-factor authentication
- **IP Whitelisting**: Restrict access by network
- **Data Encryption**: At-rest and in-transit encryption

---

## Part 5: MVP Scope Clarification

Based on this review, here's what I recommend for a true MVP that can be built with Claude Code:

### MVP Must-Have (Week 1-4)

| Module | Features | Complexity |
|--------|----------|------------|
| **Org Structure** | Create/Edit/Delete hierarchy (BU→CC→Dept), Basic role assignment | Medium |
| **Budget Cycle** | Create cycle, Set dates, Activate/Lock | Low |
| **Budget Allocation** | Top-down allocation entry, Three-way split (Salary/Benefits/Hiring), Parent-child validation | High |
| **Headcount Planning** | Plan by role, Auto-calculate shortfall/fill rate, Override with comment | Medium |
| **Approval Workflow** | Submit→Approve→Lock, Single-level approval, Required comments | Medium |
| **Pay Grades** | CRUD for grade/band/role mapping, Min/Max ranges | Low |
| **Audit Log** | All changes logged with user/timestamp | Low |
| **Basic Reporting** | Export to CSV | Low |

### MVP Should-Have (Week 5-6)

| Feature | Benefit |
|---------|---------|
| Bulk CSV upload/download | Efficiency for large orgs |
| Status dashboard | Visibility for managers |
| Basic variance warnings | Prevent errors |
| Auto-save | Prevent data loss |

### MVP Nice-to-Have (Week 7-8)

| Feature | Benefit |
|---------|---------|
| Drag-drop org editor | Better UX |
| Real-time roll-up calculations | Immediate feedback |
| Comment threads | Better collaboration |
| Mobile-responsive UI | Flexibility |

### Explicitly Out of MVP

- HRMS/ATS/Payroll integrations
- Multi-currency support
- Advanced analytics
- Configurable workflows
- Delegation/escalation
- SSO/SAML

---

## Part 6: Specific PRD Corrections

### Corrections to PRD_2.pdf

**Page 1 - Section 1.1 Role-Based Access:**
```diff
- Verify BU Leader can: Cannot edit role-level data
+ Verify BU Leader can: Cannot edit role-level data EXCEPT for departments in their BU
+ ADD: Verify permissions are inherited down hierarchy unless explicitly overridden
```

**Page 2 - Section 4.2 Role-Level Calculations:**
```diff
- Hiring Budget = Shortfall × Avg Hiring Cost
+ Hiring Budget = MAX(0, Shortfall) × Avg Hiring Cost
+ (Negative shortfall means overstaffed; hiring budget should be 0, not negative)
```

**Page 3 - Section 7.1 Manual Status Control:**
```diff
- Status change does NOT lock editing
+ Status change to 'Approved' DOES lock editing (read-only)
+ Status change to 'Filled' DOES lock editing (read-only)
+ Other status changes do not lock editing
```

**Page 4 - Section 9.2 Visibility:**
```diff
+ ADD: Compensation Manager can filter audit history by:
+   - Date range
+   - User
+   - Entity type
+   - Action type
+   - Org unit
```

### Corrections to PRD_Documents.pdf

**Page 11 - Approval Chain:**
```diff
- Compensation Manager → Business Unit Head → Cost Center Head → Department Head
+ Budget ALLOCATION flows: Compensation Manager → BU Head → CC Head → Dept Head
+ Budget APPROVAL flows: Dept Head → CC Head → BU Head → Compensation Manager
+ (Clarify bidirectional flow)
```

**Page 17 - Salary Fixed Validation:**
```diff
- Salary Fixed ≥ 10,000
+ Salary Fixed ≥ 10,000 (configurable per organization)
+ ADD: Minimum should be stored in org_settings table
```

**Page 23 - Fill Rate Calculation:**
```diff
- Fill Rate = (Actual Headcount / Planned Headcount) × 100
+ Fill Rate = CASE 
+   WHEN Planned Headcount = 0 THEN NULL (or 100% if Actual also 0)
+   ELSE (Actual Headcount / Planned Headcount) × 100
+ END
+ (Handle division by zero)
```

---

## Appendix A: Test Cases to Add

### Critical Path Tests

```gherkin
Feature: Budget Allocation Validation

Scenario: Child allocations must sum to parent
  Given a BU with total budget $1,000,000
  And the BU has 3 cost centers
  When I allocate $300,000 to CC1
  And I allocate $400,000 to CC2
  And I allocate $200,000 to CC3
  Then validation should fail with "Child sum ($900,000) does not equal parent ($1,000,000)"

Scenario: Cannot submit with negative values
  Given a department allocation form
  When I enter -50,000 for Salary Fixed
  Then the field should show error "Value must be non-negative"
  And the Submit button should be disabled

Scenario: Override requires comment
  Given a headcount plan with calculated Fill Rate of 75%
  When I override Fill Rate to 80%
  And I try to save without a comment
  Then a modal should appear requiring a comment
  And save should be blocked until comment is provided

Scenario: Approval chain enforcement
  Given a department allocation in "Submitted" status
  And I am logged in as BU Head
  When I try to approve the allocation
  Then I should see error "Requires Cost Center Head approval first"

Scenario: Concurrent edit handling
  Given User A and User B both open the same allocation
  When User A saves changes at 10:00:00
  And User B tries to save different changes at 10:00:05
  Then User B should see conflict warning
  And User B should be shown the diff between versions
```

### Edge Case Tests

```gherkin
Scenario: Zero planned headcount
  Given a role with Planned Headcount = 0
  And Actual Headcount = 0
  Then Fill Rate should display "N/A" or "100%"
  And Hiring Budget should be $0

Scenario: Overstaffed department
  Given a role with Planned Headcount = 10
  When I enter Actual Headcount = 15
  Then Shortfall should show -5 (negative)
  And a warning should display "Overstaffed by 5 positions"
  And Hiring Budget should be $0 (not negative)

Scenario: Budget cycle date overlap
  Given an active Annual cycle for FY2025 (Jan 1 - Dec 31)
  When I try to create another Annual cycle for FY2025
  Then creation should be blocked
  With message "Active cycle already exists for this period"

Scenario: Delete org unit with children
  Given a Cost Center with 3 departments
  When I try to delete the Cost Center
  Then I should be prompted to reassign children
  And deletion should be blocked until children are reassigned

Scenario: Pay grade duplicate detection
  Given a pay grade exists: Grade A, Band 1, Engineer, $50K-$80K
  When I try to create: Grade A, Band 1, Engineer, $60K-$90K
  Then creation should fail with "Duplicate grade/band/role combination"
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **BU** | Business Unit - Top-level organizational division |
| **CC** | Cost Center - Financial grouping under a BU |
| **Department** | Operational unit under a Cost Center |
| **Role** | Job position/title with associated pay grade |
| **Pay Grade** | Classification level (e.g., A, B, C) |
| **Pay Band** | Numeric level within a grade (e.g., 1, 2, 3) |
| **Compa-Ratio** | Employee salary ÷ Range midpoint |
| **Fill Rate** | Actual headcount ÷ Planned headcount × 100 |
| **Shortfall** | Planned headcount - Actual headcount |
| **Budget Cycle** | Time period for budget planning (Annual/Half-Yearly) |
| **Compensation Cycle** | Specific compensation event (Salary Review, Bonus, Promotion) |
| **Allocation** | Budget amount assigned to an org unit |
| **Override** | Manual replacement of auto-calculated value |

---

## Appendix C: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 16, 2026 | Senior PM | Initial PRD review and V2 roadmap |

---

*End of Document*
