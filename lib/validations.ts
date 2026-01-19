/**
 * Business Validation Rules for Compensation Management Platform
 * Based on PRD Technical Specification
 */

// ============================================
// TYPES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface BudgetAllocation {
  id?: string;
  salaryFixed: number;
  salaryVariable: number;
  benefitsEmployee: number;
  benefitsEmployer: number;
  newHiringBudget: number;
  totalBudget: number;
  recommendedAllocation?: number | null;
  status: string;
}

export interface HeadcountPlan {
  plannedHeadcount: number;
  actualHeadcount: number;
  avgHiringCost: number;
  avgHiringCostFixed: number;
  avgHiringCostVariable: number;
  avgHiringCostBenefits: number;
  fillRateOverride?: number | null;
  hiringBudgetOverride?: number | null;
  overrideReason?: string | null;
}

// ============================================
// BUDGET ALLOCATION VALIDATION
// ============================================

const MINIMUM_SALARY_FIXED = 10000;

export const budgetAllocationRules = {
  minimums: {
    salaryFixed: MINIMUM_SALARY_FIXED,
    salaryVariable: 0,
    benefitsEmployee: 0,
    benefitsEmployer: 0,
    newHiringBudget: 0,
  },

  validTransitions: {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['PENDING_APPROVAL', 'DRAFT'],
    PENDING_APPROVAL: ['APPROVED', 'REVISION_REQUIRED'],
    REVISION_REQUIRED: ['SUBMITTED'],
    APPROVED: ['LOCKED'],
    LOCKED: [],
  } as Record<string, string[]>,
};

export function validateBudgetAllocation(
  allocation: BudgetAllocation,
  parentAllocation?: BudgetAllocation | null,
  childAllocations?: BudgetAllocation[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rule 1: Salary Fixed minimum (only for department-level)
  if (allocation.salaryFixed < budgetAllocationRules.minimums.salaryFixed) {
    errors.push({
      field: 'salaryFixed',
      message: `Salary Fixed must be at least ${formatCurrency(budgetAllocationRules.minimums.salaryFixed)}`,
      code: 'MIN_SALARY_FIXED',
    });
  }

  // Rule 2: All values must be non-negative
  const fields = ['salaryFixed', 'salaryVariable', 'benefitsEmployee', 'benefitsEmployer', 'newHiringBudget'] as const;
  for (const field of fields) {
    if (allocation[field] < 0) {
      errors.push({
        field,
        message: `${formatFieldName(field)} cannot be negative`,
        code: 'NEGATIVE_VALUE',
      });
    }
  }

  // Rule 3: Sum of children must equal parent (if children exist)
  if (childAllocations && childAllocations.length > 0) {
    const childSum = childAllocations.reduce((sum, child) => sum + child.totalBudget, 0);
    const tolerance = 0.01;

    if (Math.abs(childSum - allocation.totalBudget) > tolerance) {
      errors.push({
        field: 'totalBudget',
        message: `Child allocations (${formatCurrency(childSum)}) must equal parent (${formatCurrency(allocation.totalBudget)})`,
        code: 'CHILD_SUM_MISMATCH',
      });
    }
  }

  // Rule 4: Cannot exceed parent allocation
  if (parentAllocation && allocation.totalBudget > parentAllocation.totalBudget) {
    errors.push({
      field: 'totalBudget',
      message: 'Allocation cannot exceed parent allocation',
      code: 'EXCEEDS_PARENT',
    });
  }

  // Rule 5: Warning if variance > 10% from recommendation
  if (allocation.recommendedAllocation) {
    const variance = Math.abs(allocation.totalBudget - allocation.recommendedAllocation) / allocation.recommendedAllocation;
    if (variance > 0.1) {
      warnings.push({
        field: 'totalBudget',
        message: `Allocation varies ${(variance * 100).toFixed(1)}% from recommendation`,
        code: 'HIGH_VARIANCE',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateBudgetStatusTransition(
  currentStatus: string,
  newStatus: string,
  comment?: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const validTransitions = budgetAllocationRules.validTransitions[currentStatus];

  if (!validTransitions?.includes(newStatus)) {
    errors.push({
      field: 'status',
      message: `Invalid status transition: ${currentStatus} to ${newStatus}`,
      code: 'INVALID_TRANSITION',
    });
  }

  // Rejection/revision requires comment
  if (['REVISION_REQUIRED'].includes(newStatus) && !comment?.trim()) {
    errors.push({
      field: 'comment',
      message: 'Comment is required when requesting revision',
      code: 'COMMENT_REQUIRED',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateBudgetEditable(status: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (['APPROVED', 'LOCKED'].includes(status)) {
    errors.push({
      field: 'status',
      message: 'Cannot edit approved or locked allocations',
      code: 'NOT_EDITABLE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

// ============================================
// HEADCOUNT PLANNING VALIDATION
// ============================================

export function validateHeadcountPlan(plan: HeadcountPlan): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rule 1: Headcount must be non-negative integers
  if (!Number.isInteger(plan.plannedHeadcount) || plan.plannedHeadcount < 0) {
    errors.push({
      field: 'plannedHeadcount',
      message: 'Planned headcount must be a non-negative integer',
      code: 'INVALID_HEADCOUNT',
    });
  }

  if (!Number.isInteger(plan.actualHeadcount) || plan.actualHeadcount < 0) {
    errors.push({
      field: 'actualHeadcount',
      message: 'Actual headcount must be a non-negative integer',
      code: 'INVALID_HEADCOUNT',
    });
  }

  // Rule 2: Cost breakdown must sum to total
  const costSum = plan.avgHiringCostFixed + plan.avgHiringCostVariable + plan.avgHiringCostBenefits;
  const tolerance = 0.01;
  if (Math.abs(costSum - plan.avgHiringCost) > tolerance) {
    errors.push({
      field: 'avgHiringCost',
      message: 'Cost breakdown must equal average hiring cost',
      code: 'COST_BREAKDOWN_MISMATCH',
    });
  }

  // Rule 3: Override requires comment
  if ((plan.fillRateOverride !== null || plan.hiringBudgetOverride !== null) && !plan.overrideReason?.trim()) {
    errors.push({
      field: 'overrideReason',
      message: 'Override requires a comment explaining the reason',
      code: 'OVERRIDE_COMMENT_REQUIRED',
    });
  }

  // Rule 4: Warning if overstaffed (actual > planned)
  if (plan.actualHeadcount > plan.plannedHeadcount) {
    warnings.push({
      field: 'actualHeadcount',
      message: `Overstaffed by ${plan.actualHeadcount - plan.plannedHeadcount} positions`,
      code: 'OVERSTAFFED',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// HEADCOUNT CALCULATIONS
// ============================================

export const headcountCalculations = {
  /**
   * Calculate shortfall (planned - actual)
   */
  calculateShortfall(planned: number, actual: number): number {
    return planned - actual;
  },

  /**
   * Calculate fill rate with division by zero handling
   * Returns null if cannot be calculated meaningfully
   */
  calculateFillRate(planned: number, actual: number): number | null {
    if (planned === 0) {
      // If both are 0, consider it 100% filled (no need to hire)
      // If actual > 0 but planned is 0, return null (invalid state)
      return actual === 0 ? 100 : null;
    }
    return (actual / planned) * 100;
  },

  /**
   * Calculate hiring budget
   * Only positive shortfall generates hiring budget
   */
  calculateHiringBudget(shortfall: number, avgHiringCost: number): number {
    return Math.max(0, shortfall) * avgHiringCost;
  },

  /**
   * Calculate remaining budget
   */
  calculateRemainingBudget(hiringBudget: number, consumed: number): number {
    return hiringBudget - consumed;
  },

  /**
   * Get effective fill rate (use override if set)
   */
  getEffectiveFillRate(plan: HeadcountPlan): number | null {
    if (plan.fillRateOverride !== null && plan.fillRateOverride !== undefined) {
      return plan.fillRateOverride;
    }
    return this.calculateFillRate(plan.plannedHeadcount, plan.actualHeadcount);
  },

  /**
   * Get effective hiring budget (use override if set)
   */
  getEffectiveHiringBudget(plan: HeadcountPlan): number {
    if (plan.hiringBudgetOverride !== null && plan.hiringBudgetOverride !== undefined) {
      return plan.hiringBudgetOverride;
    }
    const shortfall = this.calculateShortfall(plan.plannedHeadcount, plan.actualHeadcount);
    return this.calculateHiringBudget(shortfall, plan.avgHiringCost);
  },
};

// ============================================
// BUDGET CALCULATIONS
// ============================================

export const budgetCalculations = {
  /**
   * Calculate total budget from components
   */
  calculateTotal(allocation: Partial<BudgetAllocation>): number {
    return (
      (allocation.salaryFixed || 0) +
      (allocation.salaryVariable || 0) +
      (allocation.benefitsEmployee || 0) +
      (allocation.benefitsEmployer || 0) +
      (allocation.newHiringBudget || 0)
    );
  },

  /**
   * Calculate variance from recommendation
   */
  calculateVariance(allocation: BudgetAllocation): number | null {
    if (!allocation.recommendedAllocation) return null;
    return ((allocation.totalBudget - allocation.recommendedAllocation) / allocation.recommendedAllocation) * 100;
  },

  /**
   * Generate recommendation based on previous year + growth rate
   */
  generateRecommendation(previousYearTotal: number | null, growthRate: number = 0.05): number | null {
    if (!previousYearTotal) return null;
    return previousYearTotal * (1 + growthRate);
  },
};

// ============================================
// PAY GRADE VALIDATION
// ============================================

export function validatePayGrade(payGrade: {
  minSalary: number;
  maxSalary: number;
  effectiveDate: Date;
  expiryDate?: Date | null;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rule 1: Min must be <= Max
  if (payGrade.minSalary > payGrade.maxSalary) {
    errors.push({
      field: 'minSalary',
      message: 'Minimum compensation cannot exceed maximum',
      code: 'INVALID_RANGE',
    });
  }

  // Rule 2: No negative values
  if (payGrade.minSalary < 0 || payGrade.maxSalary < 0) {
    errors.push({
      field: 'minSalary',
      message: 'Compensation values must be non-negative',
      code: 'NEGATIVE_VALUE',
    });
  }

  // Rule 3: Effective date must be before or equal to expiry date
  if (payGrade.expiryDate && payGrade.effectiveDate > payGrade.expiryDate) {
    errors.push({
      field: 'effectiveDate',
      message: 'Effective date must be before expiry date',
      code: 'INVALID_DATES',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// COMPENSATION CYCLE VALIDATION
// ============================================

export function validateCompensationCycle(cycle: {
  budgetCycleId?: string;
  enableSalaryRevision: boolean;
  enableBonus: boolean;
  enablePromotion: boolean;
  startDate?: Date;
  endDate?: Date;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rule 1: Must link to budget cycle
  if (!cycle.budgetCycleId) {
    errors.push({
      field: 'budgetCycleId',
      message: 'Compensation cycle must be linked to a budget cycle',
      code: 'MISSING_BUDGET_LINK',
    });
  }

  // Rule 2: At least one feature must be enabled
  if (!cycle.enableSalaryRevision && !cycle.enableBonus && !cycle.enablePromotion) {
    errors.push({
      field: 'enableSalaryRevision',
      message: 'At least one compensation component must be enabled',
      code: 'NO_FEATURES_ENABLED',
    });
  }

  // Rule 3: Start date must be before end date
  if (cycle.startDate && cycle.endDate && cycle.startDate > cycle.endDate) {
    errors.push({
      field: 'startDate',
      message: 'Start date must be before end date',
      code: 'INVALID_DATES',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// HELPERS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
