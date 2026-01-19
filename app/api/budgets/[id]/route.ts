import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allocation = await prisma.budgetAllocation.findUnique({
    where: { id: params.id },
    include: {
      cycle: true,
      department: true,
      costCenter: true,
      businessUnit: true,
      approvals: {
        include: {
          approver: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      comments: true,
    },
  });

  if (!allocation) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  return NextResponse.json(allocation);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    salaryFixed,
    salaryVariable,
    benefitsEmployee,
    benefitsEmployer,
    newHiringBudget,
    totalBudget,
    notes,
    status,
  } = body;

  const existing = await prisma.budgetAllocation.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  // Check if allocation is editable
  if (['APPROVED', 'LOCKED'].includes(existing.status)) {
    return NextResponse.json(
      { error: 'Cannot edit approved or locked allocations' },
      { status: 400 }
    );
  }

  // Calculate values
  const newSalaryFixed = salaryFixed !== undefined ? parseFloat(String(salaryFixed)) : existing.salaryFixed;
  const newSalaryVariable = salaryVariable !== undefined ? parseFloat(String(salaryVariable)) : existing.salaryVariable;
  const newBenefitsEmployee = benefitsEmployee !== undefined ? parseFloat(String(benefitsEmployee)) : existing.benefitsEmployee;
  const newBenefitsEmployer = benefitsEmployer !== undefined ? parseFloat(String(benefitsEmployer)) : existing.benefitsEmployer;
  const newHiringBudgetVal = newHiringBudget !== undefined ? parseFloat(String(newHiringBudget)) : existing.newHiringBudget;

  const calculatedTotal = totalBudget !== undefined
    ? parseFloat(String(totalBudget))
    : newSalaryFixed + newSalaryVariable + newBenefitsEmployee + newBenefitsEmployer + newHiringBudgetVal;

  // Legacy fields
  const salaryBudget = newSalaryFixed + newSalaryVariable;
  const benefitsBudget = newBenefitsEmployee + newBenefitsEmployer;
  const hiringBudget = newHiringBudgetVal;

  const allocation = await prisma.budgetAllocation.update({
    where: { id: params.id },
    data: {
      salaryFixed: newSalaryFixed,
      salaryVariable: newSalaryVariable,
      benefitsEmployee: newBenefitsEmployee,
      benefitsEmployer: newBenefitsEmployer,
      newHiringBudget: newHiringBudgetVal,
      totalBudget: calculatedTotal,
      salaryBudget,
      benefitsBudget,
      hiringBudget,
      notes: notes ?? existing.notes,
      status: status ?? existing.status,
    },
    include: {
      cycle: true,
      department: true,
      costCenter: true,
      businessUnit: true,
    },
  });

  return NextResponse.json(allocation);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.budgetAllocation.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
  }

  if (['APPROVED', 'LOCKED'].includes(existing.status)) {
    return NextResponse.json(
      { error: 'Cannot delete approved or locked allocations' },
      { status: 400 }
    );
  }

  await prisma.budgetAllocation.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
