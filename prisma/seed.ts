import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SYSTEM_ROLES } from '../lib/permissions'

const prisma = new PrismaClient()

// Security: Use same bcrypt rounds as auth.ts (12 rounds per security requirements)
const BCRYPT_ROUNDS = 12

async function main() {
  console.log('🌱 Seeding database...\n')

  const hashedPassword = await bcrypt.hash('password123', BCRYPT_ROUNDS)

  // ============================================
  // SYSTEM ROLES & PERMISSIONS
  // ============================================
  console.log('Creating system roles and permissions...')

  const createdSystemRoles: Record<string, string> = {}

  for (const roleDef of SYSTEM_ROLES) {
    const systemRole = await prisma.systemRole.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
      },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: roleDef.isSystemRole,
      },
    })

    createdSystemRoles[roleDef.code] = systemRole.id

    // Create permissions for this role
    for (const perm of roleDef.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          systemRoleId_resource: {
            systemRoleId: systemRole.id,
            resource: perm.resource,
          },
        },
        update: {
          actions: JSON.stringify(perm.actions),
          scope: perm.scope,
        },
        create: {
          systemRoleId: systemRole.id,
          resource: perm.resource,
          actions: JSON.stringify(perm.actions),
          scope: perm.scope,
        },
      })
    }
  }

  console.log('✓ System roles created:', Object.keys(createdSystemRoles).join(', '))

  // ============================================
  // USERS - Different Personas
  // ============================================
  console.log('Creating users...')

  // Compensation Manager (Admin)
  const compManager = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: 'COMPENSATION_MANAGER',
      name: 'Admin User',
      systemRoleId: createdSystemRoles['COMPENSATION_MANAGER'],
    },
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'COMPENSATION_MANAGER',
      systemRoleId: createdSystemRoles['COMPENSATION_MANAGER'],
    },
  })

  // HR Admin
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hr@example.com' },
    update: {
      role: 'HR_ADMIN',
      name: 'HR Admin',
      systemRoleId: createdSystemRoles['HR_ADMIN'],
    },
    create: {
      email: 'hr@example.com',
      password: hashedPassword,
      name: 'HR Admin',
      role: 'HR_ADMIN',
      systemRoleId: createdSystemRoles['HR_ADMIN'],
    },
  })

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
      systemRoleId: createdSystemRoles['SUPER_ADMIN'],
    },
    create: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      systemRoleId: createdSystemRoles['SUPER_ADMIN'],
    },
  })

  // Finance Head
  const financeHead = await prisma.user.upsert({
    where: { email: 'finance@example.com' },
    update: {
      role: 'FINANCE_HEAD',
      name: 'Finance Head',
      systemRoleId: createdSystemRoles['FINANCE_HEAD'],
    },
    create: {
      email: 'finance@example.com',
      password: hashedPassword,
      name: 'Finance Head',
      role: 'FINANCE_HEAD',
      systemRoleId: createdSystemRoles['FINANCE_HEAD'],
    },
  })

  // BU Leaders
  const brad = await prisma.user.upsert({
    where: { email: 'brad@example.com' },
    update: { systemRoleId: createdSystemRoles['BU_LEADER'] },
    create: {
      email: 'brad@example.com',
      password: hashedPassword,
      name: 'Brad Wilson',
      role: 'BU_LEADER',
      systemRoleId: createdSystemRoles['BU_LEADER'],
    },
  })

  const maggi = await prisma.user.upsert({
    where: { email: 'maggi@example.com' },
    update: { systemRoleId: createdSystemRoles['BU_LEADER'] },
    create: {
      email: 'maggi@example.com',
      password: hashedPassword,
      name: 'Maggi Chen',
      role: 'BU_LEADER',
      systemRoleId: createdSystemRoles['BU_LEADER'],
    },
  })

  const ashley = await prisma.user.upsert({
    where: { email: 'ashley@example.com' },
    update: { systemRoleId: createdSystemRoles['BU_LEADER'] },
    create: {
      email: 'ashley@example.com',
      password: hashedPassword,
      name: 'Ashley Roberts',
      role: 'BU_LEADER',
      systemRoleId: createdSystemRoles['BU_LEADER'],
    },
  })

  // Department Heads
  const jack = await prisma.user.upsert({
    where: { email: 'jack@example.com' },
    update: { systemRoleId: createdSystemRoles['DEPARTMENT_HEAD'] },
    create: {
      email: 'jack@example.com',
      password: hashedPassword,
      name: 'Jack Thompson',
      role: 'DEPARTMENT_HEAD',
      systemRoleId: createdSystemRoles['DEPARTMENT_HEAD'],
    },
  })

  const matt = await prisma.user.upsert({
    where: { email: 'matt@example.com' },
    update: { systemRoleId: createdSystemRoles['DEPARTMENT_HEAD'] },
    create: {
      email: 'matt@example.com',
      password: hashedPassword,
      name: 'Matt Johnson',
      role: 'DEPARTMENT_HEAD',
      systemRoleId: createdSystemRoles['DEPARTMENT_HEAD'],
    },
  })

  const simon = await prisma.user.upsert({
    where: { email: 'simon@example.com' },
    update: { systemRoleId: createdSystemRoles['DEPARTMENT_HEAD'] },
    create: {
      email: 'simon@example.com',
      password: hashedPassword,
      name: 'Simon Lee',
      role: 'DEPARTMENT_HEAD',
      systemRoleId: createdSystemRoles['DEPARTMENT_HEAD'],
    },
  })

  console.log('✓ Users created')

  // ============================================
  // BUSINESS UNITS
  // ============================================
  console.log('Creating business units...')

  const buElectronics = await prisma.businessUnit.upsert({
    where: { code: 'JE' },
    update: { leaderId: brad.id },
    create: {
      name: 'Jarvis Electronics',
      code: 'JE',
      description: 'Consumer electronics and mobile devices',
      leaderId: brad.id,
    },
  })

  const buTelecom = await prisma.businessUnit.upsert({
    where: { code: 'JT' },
    update: { leaderId: maggi.id },
    create: {
      name: 'Jarvis Telecom',
      code: 'JT',
      description: 'Telecommunications and network infrastructure',
      leaderId: maggi.id,
    },
  })

  const buMining = await prisma.businessUnit.upsert({
    where: { code: 'JM' },
    update: { leaderId: ashley.id },
    create: {
      name: 'Jarvis Mining',
      code: 'JM',
      description: 'Mining operations and resource extraction',
      leaderId: ashley.id,
    },
  })

  console.log('✓ Business units created')

  // ============================================
  // COST CENTERS
  // ============================================
  console.log('Creating cost centers...')

  // Jarvis Electronics Cost Centers
  const ccMobilePhones = await prisma.costCenter.upsert({
    where: { code: 'JE-MP' },
    update: { businessUnitId: buElectronics.id },
    create: {
      code: 'JE-MP',
      name: 'Mobile Phones',
      type: 'OPEX',
      businessUnitId: buElectronics.id,
    },
  })

  const ccHardwareDevices = await prisma.costCenter.upsert({
    where: { code: 'JE-HD' },
    update: { businessUnitId: buElectronics.id },
    create: {
      code: 'JE-HD',
      name: 'Hardware Devices',
      type: 'OPEX',
      businessUnitId: buElectronics.id,
    },
  })

  const ccSatelliteEquip = await prisma.costCenter.upsert({
    where: { code: 'JE-SE' },
    update: { businessUnitId: buElectronics.id },
    create: {
      code: 'JE-SE',
      name: 'Satellite Equipment',
      type: 'CAPEX',
      businessUnitId: buElectronics.id,
    },
  })

  // Jarvis Telecom Cost Centers
  const ccNetworkInfra = await prisma.costCenter.upsert({
    where: { code: 'JT-NI' },
    update: { businessUnitId: buTelecom.id },
    create: {
      code: 'JT-NI',
      name: 'Network Infrastructure',
      type: 'CAPEX',
      businessUnitId: buTelecom.id,
    },
  })

  const ccCustomerSupport = await prisma.costCenter.upsert({
    where: { code: 'JT-CS' },
    update: { businessUnitId: buTelecom.id },
    create: {
      code: 'JT-CS',
      name: 'Customer Support',
      type: 'OPEX',
      businessUnitId: buTelecom.id,
    },
  })

  const ccFieldOps = await prisma.costCenter.upsert({
    where: { code: 'JT-FO' },
    update: { businessUnitId: buTelecom.id },
    create: {
      code: 'JT-FO',
      name: 'Field Operations',
      type: 'OPEX',
      businessUnitId: buTelecom.id,
    },
  })

  // Jarvis Mining Cost Centers
  const ccExtraction = await prisma.costCenter.upsert({
    where: { code: 'JM-EX' },
    update: { businessUnitId: buMining.id },
    create: {
      code: 'JM-EX',
      name: 'Extraction',
      type: 'OPEX',
      businessUnitId: buMining.id,
    },
  })

  const ccProcessing = await prisma.costCenter.upsert({
    where: { code: 'JM-PR' },
    update: { businessUnitId: buMining.id },
    create: {
      code: 'JM-PR',
      name: 'Processing',
      type: 'OPEX',
      businessUnitId: buMining.id,
    },
  })

  const ccLogistics = await prisma.costCenter.upsert({
    where: { code: 'JM-LG' },
    update: { businessUnitId: buMining.id },
    create: {
      code: 'JM-LG',
      name: 'Logistics',
      type: 'OPEX',
      businessUnitId: buMining.id,
    },
  })

  console.log('✓ Cost centers created')

  // ============================================
  // DEPARTMENTS (Shared across Cost Centers)
  // ============================================
  console.log('Creating departments...')

  // Engineering - assigned to Jack
  const deptEngineering = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: { headId: jack.id, costCenterId: ccMobilePhones.id },
    create: {
      name: 'Engineering',
      code: 'ENG',
      headId: jack.id,
      costCenterId: ccMobilePhones.id,
      location: 'HQ - San Francisco',
    },
  })

  // Product - assigned to Matt
  const deptProduct = await prisma.department.upsert({
    where: { code: 'PROD' },
    update: { headId: matt.id, costCenterId: ccMobilePhones.id },
    create: {
      name: 'Product',
      code: 'PROD',
      headId: matt.id,
      costCenterId: ccMobilePhones.id,
      location: 'HQ - San Francisco',
    },
  })

  // Sales - assigned to Simon
  const deptSales = await prisma.department.upsert({
    where: { code: 'SALES' },
    update: { headId: simon.id, costCenterId: ccMobilePhones.id },
    create: {
      name: 'Sales',
      code: 'SALES',
      headId: simon.id,
      costCenterId: ccMobilePhones.id,
      location: 'NYC Office',
    },
  })

  // HR
  const deptHR = await prisma.department.upsert({
    where: { code: 'HR' },
    update: { costCenterId: ccHardwareDevices.id },
    create: {
      name: 'Human Resources',
      code: 'HR',
      costCenterId: ccHardwareDevices.id,
      location: 'HQ - San Francisco',
    },
  })

  // Finance
  const deptFinance = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: { costCenterId: ccHardwareDevices.id },
    create: {
      name: 'Finance',
      code: 'FIN',
      costCenterId: ccHardwareDevices.id,
      location: 'HQ - San Francisco',
    },
  })

  // Marketing
  const deptMarketing = await prisma.department.upsert({
    where: { code: 'MKT' },
    update: { costCenterId: ccSatelliteEquip.id },
    create: {
      name: 'Marketing',
      code: 'MKT',
      costCenterId: ccSatelliteEquip.id,
      location: 'LA Office',
    },
  })

  // Support
  const deptSupport = await prisma.department.upsert({
    where: { code: 'SUP' },
    update: { costCenterId: ccSatelliteEquip.id },
    create: {
      name: 'Customer Support',
      code: 'SUP',
      costCenterId: ccSatelliteEquip.id,
      location: 'Austin Office',
    },
  })

  console.log('✓ Departments created')

  // ============================================
  // PAY GRADES
  // ============================================
  console.log('Creating pay grades...')

  const payGrades = await Promise.all([
    prisma.payGrade.upsert({
      where: { level: 1 },
      update: {},
      create: { name: 'Entry Level', code: 'PG-1', level: 1, minSalary: 40000, midSalary: 50000, maxSalary: 60000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 2 },
      update: {},
      create: { name: 'Associate', code: 'PG-2', level: 2, minSalary: 55000, midSalary: 70000, maxSalary: 85000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 3 },
      update: {},
      create: { name: 'Senior', code: 'PG-3', level: 3, minSalary: 80000, midSalary: 100000, maxSalary: 120000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 4 },
      update: {},
      create: { name: 'Lead', code: 'PG-4', level: 4, minSalary: 110000, midSalary: 135000, maxSalary: 160000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 5 },
      update: {},
      create: { name: 'Manager', code: 'PG-5', level: 5, minSalary: 140000, midSalary: 170000, maxSalary: 200000 },
    }),
    prisma.payGrade.upsert({
      where: { level: 6 },
      update: {},
      create: { name: 'Director', code: 'PG-6', level: 6, minSalary: 180000, midSalary: 220000, maxSalary: 260000 },
    }),
  ])

  console.log('✓ Pay grades created')

  // ============================================
  // ROLES
  // ============================================
  console.log('Creating roles...')

  const roleEngLead = await prisma.role.upsert({
    where: { code: 'ENG-LEAD' },
    update: {},
    create: {
      name: 'Engineering Lead',
      code: 'ENG-LEAD',
      departmentId: deptEngineering.id,
      payGradeId: payGrades[3].id,
    },
  })

  const roleSrEngineer = await prisma.role.upsert({
    where: { code: 'SR-ENG' },
    update: {},
    create: {
      name: 'Senior Engineer',
      code: 'SR-ENG',
      departmentId: deptEngineering.id,
      payGradeId: payGrades[2].id,
    },
  })

  const roleEngineer = await prisma.role.upsert({
    where: { code: 'JR-ENG' },
    update: {},
    create: {
      name: 'Engineer',
      code: 'JR-ENG',
      departmentId: deptEngineering.id,
      payGradeId: payGrades[1].id,
    },
  })

  const roleProdManager = await prisma.role.upsert({
    where: { code: 'PM' },
    update: {},
    create: {
      name: 'Product Manager',
      code: 'PM',
      departmentId: deptProduct.id,
      payGradeId: payGrades[3].id,
    },
  })

  const roleSalesRep = await prisma.role.upsert({
    where: { code: 'SALES-REP' },
    update: {},
    create: {
      name: 'Sales Representative',
      code: 'SALES-REP',
      departmentId: deptSales.id,
      payGradeId: payGrades[1].id,
    },
  })

  const roleSalesMgr = await prisma.role.upsert({
    where: { code: 'SALES-MGR' },
    update: {},
    create: {
      name: 'Sales Manager',
      code: 'SALES-MGR',
      departmentId: deptSales.id,
      payGradeId: payGrades[4].id,
    },
  })

  console.log('✓ Roles created')

  // ============================================
  // JOB ARCHITECTURE
  // ============================================
  console.log('Creating job architecture...')

  // Job Families
  const jfEngineering = await prisma.jobFamily.upsert({
    where: { code: 'JF-ENG' },
    update: {},
    create: {
      code: 'JF-ENG',
      name: 'Engineering',
      description: 'Software engineering, infrastructure, and technical roles',
    },
  })

  const jfProduct = await prisma.jobFamily.upsert({
    where: { code: 'JF-PROD' },
    update: {},
    create: {
      code: 'JF-PROD',
      name: 'Product',
      description: 'Product management and design roles',
    },
  })

  const jfSales = await prisma.jobFamily.upsert({
    where: { code: 'JF-SALES' },
    update: {},
    create: {
      code: 'JF-SALES',
      name: 'Sales & Marketing',
      description: 'Sales, marketing, and business development roles',
    },
  })

  const jfOperations = await prisma.jobFamily.upsert({
    where: { code: 'JF-OPS' },
    update: {},
    create: {
      code: 'JF-OPS',
      name: 'Operations',
      description: 'Operations, finance, and HR roles',
    },
  })

  // Job Sub-Families
  const jsfSoftware = await prisma.jobSubFamily.upsert({
    where: { code: 'JSF-SWE' },
    update: {},
    create: {
      code: 'JSF-SWE',
      name: 'Software Engineering',
      jobFamilyId: jfEngineering.id,
    },
  })

  const jsfInfra = await prisma.jobSubFamily.upsert({
    where: { code: 'JSF-INFRA' },
    update: {},
    create: {
      code: 'JSF-INFRA',
      name: 'Infrastructure',
      jobFamilyId: jfEngineering.id,
    },
  })

  const jsfProdMgmt = await prisma.jobSubFamily.upsert({
    where: { code: 'JSF-PM' },
    update: {},
    create: {
      code: 'JSF-PM',
      name: 'Product Management',
      jobFamilyId: jfProduct.id,
    },
  })

  const jsfDesign = await prisma.jobSubFamily.upsert({
    where: { code: 'JSF-DES' },
    update: {},
    create: {
      code: 'JSF-DES',
      name: 'Design',
      jobFamilyId: jfProduct.id,
    },
  })

  // Job Roles linked to Sub-Families
  const jrSwe = await prisma.jobRole.upsert({
    where: { code: 'JR-SWE' },
    update: {},
    create: {
      code: 'JR-SWE',
      name: 'Software Engineer',
      subFamilyId: jsfSoftware.id,
    },
  })

  const jrSrSwe = await prisma.jobRole.upsert({
    where: { code: 'JR-SR-SWE' },
    update: {},
    create: {
      code: 'JR-SR-SWE',
      name: 'Senior Software Engineer',
      subFamilyId: jsfSoftware.id,
    },
  })

  const jrStaffSwe = await prisma.jobRole.upsert({
    where: { code: 'JR-STAFF-SWE' },
    update: {},
    create: {
      code: 'JR-STAFF-SWE',
      name: 'Staff Software Engineer',
      subFamilyId: jsfSoftware.id,
    },
  })

  const jrSre = await prisma.jobRole.upsert({
    where: { code: 'JR-SRE' },
    update: {},
    create: {
      code: 'JR-SRE',
      name: 'Site Reliability Engineer',
      subFamilyId: jsfInfra.id,
    },
  })

  const jrPm = await prisma.jobRole.upsert({
    where: { code: 'JR-PM' },
    update: {},
    create: {
      code: 'JR-PM',
      name: 'Product Manager',
      subFamilyId: jsfProdMgmt.id,
    },
  })

  const jrSrPm = await prisma.jobRole.upsert({
    where: { code: 'JR-SR-PM' },
    update: {},
    create: {
      code: 'JR-SR-PM',
      name: 'Senior Product Manager',
      subFamilyId: jsfProdMgmt.id,
    },
  })

  // Create Job Levels for each Job Role
  const levelCodes = ['IC1', 'IC2', 'IC3', 'M1', 'M2']
  const levelNames = ['Junior', 'Mid-Level', 'Senior', 'Manager', 'Senior Manager']

  for (const jobRole of [jrSwe, jrSrSwe, jrStaffSwe, jrSre, jrPm, jrSrPm]) {
    for (let i = 0; i < levelCodes.length; i++) {
      await prisma.jobLevel.upsert({
        where: {
          jobRoleId_levelCode: {
            jobRoleId: jobRole.id,
            levelCode: levelCodes[i],
          },
        },
        update: {},
        create: {
          jobRoleId: jobRole.id,
          levelCode: levelCodes[i],
          levelName: levelNames[i],
          payGradeId: payGrades[Math.min(i, payGrades.length - 1)].id,
          avgSalary: 50000 + i * 25000,
          avgBenefits: 10000 + i * 5000,
        },
      })
    }
  }

  console.log('✓ Job architecture created')

  // ============================================
  // EMPLOYEES
  // ============================================
  console.log('Creating employees...')

  const employees = [
    { employeeId: 'EMP001', name: 'Alice Chen', email: 'alice@company.com', title: 'Engineering Lead', departmentId: deptEngineering.id, roleId: roleEngLead.id, payGradeId: payGrades[3].id, currentSalary: 145000 },
    { employeeId: 'EMP002', name: 'Bob Martinez', email: 'bob@company.com', title: 'Senior Engineer', departmentId: deptEngineering.id, roleId: roleSrEngineer.id, payGradeId: payGrades[2].id, currentSalary: 105000 },
    { employeeId: 'EMP003', name: 'Carol Davis', email: 'carol@company.com', title: 'Engineer', departmentId: deptEngineering.id, roleId: roleEngineer.id, payGradeId: payGrades[1].id, currentSalary: 72000 },
    { employeeId: 'EMP004', name: 'David Kim', email: 'david@company.com', title: 'Senior Engineer', departmentId: deptEngineering.id, roleId: roleSrEngineer.id, payGradeId: payGrades[2].id, currentSalary: 110000 },
    { employeeId: 'EMP005', name: 'Eva Wilson', email: 'eva@company.com', title: 'Product Manager', departmentId: deptProduct.id, roleId: roleProdManager.id, payGradeId: payGrades[3].id, currentSalary: 130000 },
    { employeeId: 'EMP006', name: 'Frank Brown', email: 'frank@company.com', title: 'Sales Manager', departmentId: deptSales.id, roleId: roleSalesMgr.id, payGradeId: payGrades[4].id, currentSalary: 155000 },
    { employeeId: 'EMP007', name: 'Grace Lee', email: 'grace@company.com', title: 'Sales Representative', departmentId: deptSales.id, roleId: roleSalesRep.id, payGradeId: payGrades[1].id, currentSalary: 65000 },
    { employeeId: 'EMP008', name: 'Henry Taylor', email: 'henry@company.com', title: 'Sales Representative', departmentId: deptSales.id, roleId: roleSalesRep.id, payGradeId: payGrades[1].id, currentSalary: 68000 },
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
  // SUMMARY
  // ============================================
  console.log('\n✅ Seed completed successfully!\n')
  console.log('='.repeat(50))
  console.log('LOGIN CREDENTIALS (password: password123)')
  console.log('='.repeat(50))
  console.log('\n🔐 Super Admin:')
  console.log('   superadmin@example.com')
  console.log('\n📊 Compensation Manager:')
  console.log('   admin@example.com')
  console.log('\n👥 HR Admin:')
  console.log('   hr@example.com')
  console.log('\n💰 Finance Head:')
  console.log('   finance@example.com')
  console.log('\n🏢 BU Leaders:')
  console.log('   brad@example.com   (Jarvis Electronics)')
  console.log('   maggi@example.com  (Jarvis Telecom)')
  console.log('   ashley@example.com (Jarvis Mining)')
  console.log('\n👤 Department Heads:')
  console.log('   jack@example.com   (Engineering)')
  console.log('   matt@example.com   (Product)')
  console.log('   simon@example.com  (Sales)')
  console.log('\n' + '='.repeat(50))
  console.log('\nORGANIZATION HIERARCHY:')
  console.log('='.repeat(50))
  console.log('\n🏛️  Jarvis Electronics (Brad)')
  console.log('    ├── Mobile Phones')
  console.log('    │   ├── Engineering (Jack)')
  console.log('    │   ├── Product (Matt)')
  console.log('    │   └── Sales (Simon)')
  console.log('    ├── Hardware Devices')
  console.log('    │   ├── HR')
  console.log('    │   └── Finance')
  console.log('    └── Satellite Equipment')
  console.log('        ├── Marketing')
  console.log('        └── Customer Support')
  console.log('\n🏛️  Jarvis Telecom (Maggi)')
  console.log('    ├── Network Infrastructure')
  console.log('    ├── Customer Support')
  console.log('    └── Field Operations')
  console.log('\n🏛️  Jarvis Mining (Ashley)')
  console.log('    ├── Extraction')
  console.log('    ├── Processing')
  console.log('    └── Logistics')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
