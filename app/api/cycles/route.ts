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
  const status = searchParams.get('status');

  const where = status ? { status } : {};

  const limit = parseInt(searchParams.get('limit') || '25');
  const offset = parseInt(searchParams.get('offset') || '0');

  const [cycles, total] = await Promise.all([
    prisma.planningCycle.findMany({
      where,
      include: {
        // Removed full budgetAllocations and headcountPlans - use _count instead
        approvalChainLevels: {
          include: {
            assignees: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { level: 'asc' },
        },
        _count: {
          select: {
            budgetAllocations: true,
            headcountPlans: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.planningCycle.count({ where }),
  ]);

  return NextResponse.json({ data: cycles, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    type,
    startDate,
    endDate,
    totalBudget,
    autoApproveIfMissing = false,
    skipApproverEmails = false,
    approvalLevels = [],
  } = body;

  if (!name || !type || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Name, type, start date, and end date are required' },
      { status: 400 }
    );
  }

  const user = session.user as { id?: string };

  // Build approval chain levels data for nested create
  const approvalChainData = approvalLevels.length > 0
    ? {
        create: approvalLevels.map((level: { level: number; name?: string; assignees: Array<{ assigneeType: string; roleType?: string; userId?: string }> }, index: number) => ({
          level: index + 1,
          name: level.name || null,
          assignees: {
            create: level.assignees.map((assignee: { assigneeType: string; roleType?: string; userId?: string }) => ({
              assigneeType: assignee.assigneeType,
              roleType: assignee.roleType || null,
              userId: assignee.userId || null,
            })),
          },
        })),
      }
    : undefined;

  try {
    // Verify user exists if id is provided
    let createdById = null;
    if (user.id) {
      const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (existingUser) {
        createdById = user.id;
      }
    }

    const cycle = await prisma.planningCycle.create({
      data: {
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalBudget: totalBudget ? parseFloat(totalBudget) : 0,
        status: 'DRAFT',
        autoApproveIfMissing,
        skipApproverEmails,
        createdById,
        approvalChainLevels: approvalChainData,
      },
      include: {
        budgetAllocations: true,
        headcountPlans: true,
        approvalChainLevels: {
          include: {
            assignees: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { level: 'asc' },
        },
      },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error('Error creating cycle:', error);
    return NextResponse.json(
      { error: 'Failed to create cycle' },
      { status: 500 }
    );
  }
}
