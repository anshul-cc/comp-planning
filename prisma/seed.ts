import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ============================================
  // USERS
  // ============================================
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  const hrManager = await prisma.user.upsert({
    where: { email: 'hr@example.com' },
    update: {},
    create: {
      email: 'hr@example.com',
      password: hashedPassword,
      name: 'HR Manager',
      role: 'HR',
    },
  })

  const financeManager = await prisma.user.upsert({
    where: { email: 'finance@example.com' },
    update: {},
    create: {
      email: 'finance@example.com',
      password: hashedPassword,
      name: 'Finance Manager',
      role: 'FINANCE',
    },
  })

  console.log('✓ Users created')

  // ============================================
  // PAY GRADES
  // ============================================
  const payGrades = await Promise.all([
    prisma.payGrade.upsert({
      where: { level: 1 },
      update: {},
      create: { name: 'Entry Level', level: 1, minSalary: 40000, midSalary: 50000, maxSalary: 60000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 2 },
      update: {},
      create: { name: 'Associate', level: 2, minSalary: 55000, midSalary: 70000, maxSalary: 85000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 3 },
      update: {},
      create: { name: 'Senior', level: 3, minSalary: 80000, midSalary: 100000, maxSalary: 120000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 4 },
      update: {},
      create: { name: 'Lead', level: 4, minSalary: 110000, midSalary: 135000, maxSalary: 160000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 5 },
      update: {},
      create: { name: 'Manager', level: 5, minSalary: 140000, midSalary: 170000, maxSalary: 200000 },
    }),
  ])
  console.log('✓ Pay grades created')

  // ============================================
  // COST CENTERS
  // ============================================
  const ccEngineering = await prisma.costCenter.upsert({
    where: { code: 'CC-ENG' },
    update: {},
    create: { code: 'CC-ENG', name: 'Engineering Cost Center', type: 'OPEX' },
  })

  const ccSales = await prisma.costCenter.upsert({
    where: { code: 'CC-SALES' },
    update: {},
    create: { code: 'CC-SALES', name: 'Sales Cost Center', type: 'OPEX' },
  })

  const ccOperations = await prisma.costCenter.upsert({
    where: { code: 'CC-OPS' },
    update: {},
    create: { code: 'CC-OPS', name: 'Operations Cost Center', type: 'OPEX' },
  })
  console.log('✓ Cost centers created')

  // ============================================
  // DEPARTMENTS
  // ============================================
  const engineering = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: {
      name: 'Engineering',
      code: 'ENG',
      costCenterId: ccEngineering.id,
      managerId: admin.id,
      location: 'HQ - San Francisco',
    },
  })

  const frontend = await prisma.department.upsert({
    where: { code: 'FE' },
    update: {},
    create: {
      name: 'Frontend Team',
      code: 'FE',
      parentId: engineering.id,
      costCenterId: ccEngineering.id,
      location: 'HQ - San Francisco',
    },
  })

  const backend = await prisma.department.upsert({
    where: { code: 'BE' },
    update: {},
    create: {
      name: 'Backend Team',
      code: 'BE',
      parentId: engineering.id,
      costCenterId: ccEngineering.id,
      location: 'HQ - San Francisco',
    },
  })

  const sales = await prisma.department.upsert({
    where: { code: 'SALES' },
    update: {},
    create: {
      name: 'Sales',
      code: 'SALES',
      costCenterId: ccSales.id,
      location: 'NYC Office',
    },
  })

  const operations = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: {
      name: 'Operations',
      code: 'OPS',
      costCenterId: ccOperations.id,
      location: 'Austin Office',
    },
  })
  console.log('✓ Departments created')

  // ============================================
  // ROLES
  // ============================================
  const roleFeEngineer = await prisma.role.upsert({
    where: { code: 'FE-ENG' },
    update: {},
    create: {
      name: 'Frontend Engineer',
      code: 'FE-ENG',
      departmentId: frontend.id,
      payGradeId: payGrades[2].id, // Senior
    },
  })

  const roleBeEngineer = await prisma.role.upsert({
    where: { code: 'BE-ENG' },
    update: {},
    create: {
      name: 'Backend Engineer',
      code: 'BE-ENG',
      departmentId: backend.id,
      payGradeId: payGrades[2].id,
    },
  })

  const roleSalesRep = await prisma.role.upsert({
    where: { code: 'SALES-REP' },
    update: {},
    create: {
      name: 'Sales Representative',
      code: 'SALES-REP',
      departmentId: sales.id,
      payGradeId: payGrades[1].id,
    },
  })

  const roleSalesMgr = await prisma.role.upsert({
    where: { code: 'SALES-MGR' },
    update: {},
    create: {
      name: 'Sales Manager',
      code: 'SALES-MGR',
      departmentId: sales.id,
      payGradeId: payGrades[4].id,
    },
  })
  console.log('✓ Roles created')

  // ============================================
  // EMPLOYEES
  // ============================================
  const employees = [
    { employeeId: 'EMP001', name: 'Alice Johnson', email: 'alice@example.com', title: 'Senior Frontend Engineer', departmentId: frontend.id, roleId: roleFeEngineer.id, payGradeId: payGrades[2].id, currentSalary: 115000 },
    { employeeId: 'EMP002', name: 'Bob Smith', email: 'bob@example.com', title: 'Frontend Engineer', departmentId: frontend.id, roleId: roleFeEngineer.id, payGradeId: payGrades[1].id, currentSalary: 75000 },
    { employeeId: 'EMP003', name: 'Carol Williams', email: 'carol@example.com', title: 'Senior Backend Engineer', departmentId: backend.id, roleId: roleBeEngineer.id, payGradeId: payGrades[2].id, currentSalary: 120000 },
    { employeeId: 'EMP004', name: 'David Brown', email: 'david@example.com', title: 'Backend Engineer', departmentId: backend.id, roleId: roleBeEngineer.id, payGradeId: payGrades[1].id, currentSalary: 78000 },
    { employeeId: 'EMP005', name: 'Eve Davis', email: 'eve@example.com', title: 'Sales Manager', departmentId: sales.id, roleId: roleSalesMgr.id, payGradeId: payGrades[4].id, currentSalary: 155000 },
    { employeeId: 'EMP006', name: 'Frank Miller', email: 'frank@example.com', title: 'Sales Representative', departmentId: sales.id, roleId: roleSalesRep.id, payGradeId: payGrades[1].id, currentSalary: 65000 },
  ]

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: { ...emp, hireDate: new Date('2023-01-15'), status: 'ACTIVE' },
    })
  }
  console.log('✓ Employees created')

  // ============================================
  // PLANNING CYCLE
  // ============================================
  const fy2025 = await prisma.planningCycle.create({
    data: {
      name: 'FY 2025',
      type: 'ANNUAL',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
    },
  })
  console.log('✓ Planning cycle created')

  // ============================================
  // BUDGET ALLOCATIONS
  // ============================================
  await prisma.budgetAllocation.create({
    data: {
      cycleId: fy2025.id,
      departmentId: engineering.id,
      costCenterId: ccEngineering.id,
      totalBudget: 800000,
      salaryBudget: 600000,
      benefitsBudget: 100000,
      hiringBudget: 100000,
      status: 'APPROVED',
    },
  })

  await prisma.budgetAllocation.create({
    data: {
      cycleId: fy2025.id,
      departmentId: sales.id,
      costCenterId: ccSales.id,
      totalBudget: 400000,
      salaryBudget: 300000,
      benefitsBudget: 50000,
      hiringBudget: 50000,
      status: 'APPROVED',
    },
  })
  console.log('✓ Budget allocations created')

  // ============================================
  // HEADCOUNT PLANS
  // ============================================
  await prisma.headcountPlan.create({
    data: {
      cycleId: fy2025.id,
      departmentId: engineering.id,
      plannedHeadcount: 8,
      approvedHires: 4,
      actualHeadcount: 4,
      wageBudget: 600000,
      actualWageCost: 388000,
      status: 'APPROVED',
    },
  })

  await prisma.headcountPlan.create({
    data: {
      cycleId: fy2025.id,
      departmentId: sales.id,
      plannedHeadcount: 5,
      approvedHires: 3,
      actualHeadcount: 2,
      wageBudget: 300000,
      actualWageCost: 220000,
      status: 'APPROVED',
    },
  })
  console.log('✓ Headcount plans created')

  // ============================================
  // HIRING PROPOSALS
  // ============================================
  await prisma.hiringProposal.create({
    data: {
      cycleId: fy2025.id,
      departmentId: frontend.id,
      roleId: roleFeEngineer.id,
      proposedBy: admin.id,
      positionTitle: 'Senior Frontend Engineer',
      quantity: 2,
      justification: 'Expanding team to support new product features',
      proposedSalary: 110000,
      startMonth: 3,
      status: 'APPROVED',
    },
  })

  await prisma.hiringProposal.create({
    data: {
      cycleId: fy2025.id,
      departmentId: backend.id,
      roleId: roleBeEngineer.id,
      proposedBy: admin.id,
      positionTitle: 'Backend Engineer',
      quantity: 1,
      justification: 'Replace departing team member',
      proposedSalary: 95000,
      startMonth: 2,
      status: 'HR_REVIEW',
    },
  })
  console.log('✓ Hiring proposals created')

  // ============================================
  // COMPENSATION CYCLE
  // ============================================
  const compCycle = await prisma.compensationCycle.create({
    data: {
      cycleId: fy2025.id,
      name: 'Annual Review 2025',
      type: 'SALARY_REVISION',
      budgetAmount: 50000,
      status: 'OPEN',
      effectiveDate: new Date('2025-04-01'),
    },
  })

  // Sample compensation action
  await prisma.compensationAction.create({
    data: {
      compensationCycleId: compCycle.id,
      employeeId: (await prisma.employee.findUnique({ where: { employeeId: 'EMP002' } }))!.id,
      proposedBy: admin.id,
      actionType: 'MERIT_INCREASE',
      currentSalary: 75000,
      proposedSalary: 82000,
      percentageChange: 9.3,
      justification: 'Excellent performance, taking on senior responsibilities',
      status: 'SUBMITTED',
    },
  })
  console.log('✓ Compensation cycle created')

  // ============================================
  // EXPENSES (OPEX Tracking)
  // ============================================
  const months = [1, 2, 3]
  for (const month of months) {
    await prisma.expense.create({
      data: {
        cycleId: fy2025.id,
        costCenterId: ccEngineering.id,
        category: 'SALARY',
        description: `Engineering salaries - Month ${month}`,
        amount: 48000,
        month,
        isActual: true,
      },
    })
    await prisma.expense.create({
      data: {
        cycleId: fy2025.id,
        costCenterId: ccSales.id,
        category: 'SALARY',
        description: `Sales salaries - Month ${month}`,
        amount: 22000,
        month,
        isActual: true,
      },
    })
  }
  console.log('✓ Expenses created')

  console.log('\n✅ Seed completed successfully!')
  console.log('\nLogin credentials:')
  console.log('  Admin: admin@example.com / password123')
  console.log('  HR: hr@example.com / password123')
  console.log('  Finance: finance@example.com / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
