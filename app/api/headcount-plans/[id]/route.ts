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

  const headcountPlan = await prisma.headcountPlan.findUnique({
    where: { id: params.id },
    include: {
      cycle: true,
      department: true,
      approvals: {
        include: {
          approver: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!headcountPlan) {
    return NextResponse.json({ error: 'Headcount plan not found' }, { status: 404 });
  }

  return NextResponse.json(headcountPlan);
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
    plannedHeadcount,
    wageBudget,
    avgHiringCost,
    avgHiringCostFixed,
    avgHiringCostVariable,
    avgHiringCostBenefits,
    fillRateOverride,
    hiringBudgetOverride,
    overrideReason,
    status,
    notes,
  } = body;

  const existing = await prisma.headcountPlan.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Headcount plan not found' }, { status: 404 });
  }

  // Validate override requires reason
  if ((fillRateOverride !== undefined || hiringBudgetOverride !== undefined) && !overrideReason?.trim()) {
    return NextResponse.json(
      { error: 'Override requires a reason' },
      { status: 400 }
    );
  }

  const headcountPlan = await prisma.headcountPlan.update({
    where: { id: params.id },
    data: {
      plannedHeadcount: plannedHeadcount !== undefined ? parseInt(String(plannedHeadcount)) : undefined,
      wageBudget: wageBudget !== undefined ? parseFloat(String(wageBudget)) : undefined,
      avgHiringCost: avgHiringCost !== undefined ? parseFloat(String(avgHiringCost)) : undefined,
      avgHiringCostFixed: avgHiringCostFixed !== undefined ? parseFloat(String(avgHiringCostFixed)) : undefined,
      avgHiringCostVariable: avgHiringCostVariable !== undefined ? parseFloat(String(avgHiringCostVariable)) : undefined,
      avgHiringCostBenefits: avgHiringCostBenefits !== undefined ? parseFloat(String(avgHiringCostBenefits)) : undefined,
      fillRateOverride: fillRateOverride !== undefined ? parseFloat(String(fillRateOverride)) : undefined,
      hiringBudgetOverride: hiringBudgetOverride !== undefined ? parseFloat(String(hiringBudgetOverride)) : undefined,
      overrideReason: overrideReason ?? existing.overrideReason,
      status: status ?? existing.status,
      notes: notes ?? existing.notes,
    },
    include: {
      cycle: true,
      department: true,
    },
  });

  return NextResponse.json(headcountPlan);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.headcountPlan.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Headcount plan not found' }, { status: 404 });
  }

  await prisma.headcountPlan.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
