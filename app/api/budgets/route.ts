import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cycleId = searchParams.get('cycleId');
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (cycleId) where.cycleId = cycleId;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  const limit = parseInt(searchParams.get('limit') || '25');
  const offset = parseInt(searchParams.get('offset') || '0');

  const [allocations, total] = await Promise.all([
    prisma.budgetAllocation.findMany({
      where,
      include: {
        cycle: true,
        department: true,
        costCenter: true,
        businessUnit: true,
        // Moved approvals and comments to detail view to reduce overfetching
        _count: {
          select: { approvals: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.budgetAllocation.count({ where }),
  ]);

  return NextResponse.json({ data: allocations, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    cycleId,
    departmentId,
    costCenterId,
    businessUnitId,
    salaryFixed = 0,
    salaryVariable = 0,
    benefitsEmployee = 0,
    benefitsEmployer = 0,
    newHiringBudget = 0,
    totalBudget,
    notes,
  } = body;

  if (!cycleId) {
    return NextResponse.json(
      { error: 'Cycle ID is required' },
      { status: 400 }
    );
  }

  // Must have at least one org unit
  if (!departmentId && !costCenterId && !businessUnitId) {
    return NextResponse.json(
      { error: 'Department, Cost Center, or Business Unit is required' },
      { status: 400 }
    );
  }

  // Verify cycle exists
  const cycle = await prisma.planningCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  // Calculate total if not provided
  const calculatedTotal = totalBudget ?? (
    parseFloat(String(salaryFixed)) +
    parseFloat(String(salaryVariable)) +
    parseFloat(String(benefitsEmployee)) +
    parseFloat(String(benefitsEmployer)) +
    parseFloat(String(newHiringBudget))
  );

  // For backward compatibility, also set the legacy fields
  const salaryBudget = parseFloat(String(salaryFixed)) + parseFloat(String(salaryVariable));
  const benefitsBudget = parseFloat(String(benefitsEmployee)) + parseFloat(String(benefitsEmployer));
  const hiringBudget = parseFloat(String(newHiringBudget));

  const allocation = await prisma.budgetAllocation.create({
    data: {
      cycleId,
      departmentId: departmentId || null,
      costCenterId: costCenterId || null,
      businessUnitId: businessUnitId || null,
      salaryFixed: parseFloat(String(salaryFixed)),
      salaryVariable: parseFloat(String(salaryVariable)),
      benefitsEmployee: parseFloat(String(benefitsEmployee)),
      benefitsEmployer: parseFloat(String(benefitsEmployer)),
      newHiringBudget: parseFloat(String(newHiringBudget)),
      totalBudget: calculatedTotal,
      salaryBudget,
      benefitsBudget,
      hiringBudget,
      notes,
      status: 'DRAFT',
    },
    include: {
      cycle: true,
      department: true,
      costCenter: true,
      businessUnit: true,
    },
  });

  return NextResponse.json(allocation, { status: 201 });
}
