/*
  Warnings:

  - You are about to drop the `AnnualPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApprovalWorkflow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FiscalYear` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `amount` on the `BudgetAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `annualPlanId` on the `BudgetAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `BudgetAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `BudgetAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalYearId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalYearId` on the `HeadcountPlan` table. All the data in the column will be lost.
  - Added the required column `cycleId` to the `BudgetAllocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salaryBudget` to the `BudgetAllocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalBudget` to the `BudgetAllocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cycleId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cycleId` to the `HeadcountPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `midSalary` to the `PayGrade` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AnnualPlan_fiscalYearId_departmentId_key";

-- DropIndex
DROP INDEX "FiscalYear_year_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnnualPlan";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ApprovalWorkflow";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FiscalYear";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PlanningCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "payGradeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Role_payGradeId_fkey" FOREIGN KEY ("payGradeId") REFERENCES "PayGrade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HiringProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "roleId" TEXT,
    "proposedBy" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "justification" TEXT NOT NULL,
    "proposedSalary" REAL NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HiringProposal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PlanningCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HiringProposal_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HiringProposal_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HiringProposal_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompensationCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "budgetAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompensationCycle_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PlanningCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompensationAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compensationCycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "currentSalary" REAL NOT NULL,
    "proposedSalary" REAL,
    "proposedBonus" REAL,
    "percentageChange" REAL,
    "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompensationAction_compensationCycleId_fkey" FOREIGN KEY ("compensationCycleId") REFERENCES "CompensationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompensationAction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompensationAction_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "budgetAllocationId" TEXT,
    "headcountPlanId" TEXT,
    "hiringProposalId" TEXT,
    "compensationActionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_budgetAllocationId_fkey" FOREIGN KEY ("budgetAllocationId") REFERENCES "BudgetAllocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Approval_headcountPlanId_fkey" FOREIGN KEY ("headcountPlanId") REFERENCES "HeadcountPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Approval_hiringProposalId_fkey" FOREIGN KEY ("hiringProposalId") REFERENCES "HiringProposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Approval_compensationActionId_fkey" FOREIGN KEY ("compensationActionId") REFERENCES "CompensationAction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BudgetAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "departmentId" TEXT,
    "totalBudget" REAL NOT NULL,
    "salaryBudget" REAL NOT NULL,
    "benefitsBudget" REAL NOT NULL DEFAULT 0,
    "hiringBudget" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetAllocation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PlanningCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BudgetAllocation_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BudgetAllocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BudgetAllocation" ("createdAt", "id", "notes", "status", "updatedAt") SELECT "createdAt", "id", "notes", "status", "updatedAt" FROM "BudgetAllocation";
DROP TABLE "BudgetAllocation";
ALTER TABLE "new_BudgetAllocation" RENAME TO "BudgetAllocation";
CREATE UNIQUE INDEX "BudgetAllocation_cycleId_departmentId_key" ON "BudgetAllocation"("cycleId", "departmentId");
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "roleId" TEXT,
    "payGradeId" TEXT,
    "currentSalary" REAL NOT NULL,
    "hireDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_payGradeId_fkey" FOREIGN KEY ("payGradeId") REFERENCES "PayGrade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("createdAt", "currentSalary", "departmentId", "email", "employeeId", "hireDate", "id", "name", "payGradeId", "status", "title", "updatedAt") SELECT "createdAt", "currentSalary", "departmentId", "email", "employeeId", "hireDate", "id", "name", "payGradeId", "status", "title", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "month" INTEGER NOT NULL,
    "isActual" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PlanningCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "category", "costCenterId", "createdAt", "description", "id", "month", "updatedAt") SELECT "amount", "category", "costCenterId", "createdAt", "description", "id", "month", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE TABLE "new_HeadcountPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "plannedHeadcount" INTEGER NOT NULL,
    "approvedHires" INTEGER NOT NULL DEFAULT 0,
    "actualHeadcount" INTEGER NOT NULL DEFAULT 0,
    "wageBudget" REAL NOT NULL,
    "actualWageCost" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HeadcountPlan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PlanningCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HeadcountPlan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_HeadcountPlan" ("actualHeadcount", "actualWageCost", "createdAt", "departmentId", "id", "notes", "plannedHeadcount", "updatedAt", "wageBudget") SELECT "actualHeadcount", "actualWageCost", "createdAt", "departmentId", "id", "notes", "plannedHeadcount", "updatedAt", "wageBudget" FROM "HeadcountPlan";
DROP TABLE "HeadcountPlan";
ALTER TABLE "new_HeadcountPlan" RENAME TO "HeadcountPlan";
CREATE UNIQUE INDEX "HeadcountPlan_cycleId_departmentId_key" ON "HeadcountPlan"("cycleId", "departmentId");
CREATE TABLE "new_PayGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "minSalary" REAL NOT NULL,
    "midSalary" REAL NOT NULL,
    "maxSalary" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PayGrade" ("createdAt", "id", "level", "maxSalary", "minSalary", "name", "updatedAt") SELECT "createdAt", "id", "level", "maxSalary", "minSalary", "name", "updatedAt" FROM "PayGrade";
DROP TABLE "PayGrade";
ALTER TABLE "new_PayGrade" RENAME TO "PayGrade";
CREATE UNIQUE INDEX "PayGrade_level_key" ON "PayGrade"("level");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
