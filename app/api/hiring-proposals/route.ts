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

  const proposals = await prisma.hiringProposal.findMany({
    where,
    include: {
      department: true,
      role: {
        include: { payGrade: true },
      },
      proposer: {
        select: { id: true, name: true, email: true },
      },
      cycle: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(proposals);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id?: string };
  if (!user.id) {
    return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
  }

  const body = await request.json();
  const {
    cycleId,
    departmentId,
    roleId,
    positionTitle,
    quantity,
    proposedSalary,
    startMonth,
    justification,
  } = body;

  if (!cycleId || !departmentId || !positionTitle || !quantity || !proposedSalary || !justification) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify cycle exists
  const cycle = await prisma.planningCycle.findUnique({
    where: { id: cycleId },
  });
  if (!cycle) {
    return NextResponse.json({ error: 'Planning cycle not found' }, { status: 404 });
  }

  // Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  const proposal = await prisma.hiringProposal.create({
    data: {
      cycleId,
      departmentId,
      roleId: roleId || null,
      positionTitle,
      quantity: parseInt(quantity),
      proposedSalary: parseFloat(proposedSalary),
      startMonth: startMonth || new Date().getMonth() + 1,
      justification,
      proposedBy: user.id,
      status: 'DRAFT',
    },
    include: {
      department: true,
      role: {
        include: { payGrade: true },
      },
      proposer: {
        select: { id: true, name: true, email: true },
      },
      cycle: true,
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
