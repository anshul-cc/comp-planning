import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logCreate } from '@/lib/auditLog';

/**
 * GET /api/budgets/[id]/comments - Get all comments for a budget allocation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const comments = await prisma.budgetComment.findMany({
      where: { budgetAllocationId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching budget comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budgets/[id]/comments - Add a comment to a budget allocation
 *
 * Body:
 * - comment: string (required)
 * - isRevisionRequest: boolean (optional, default false)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { comment, isRevisionRequest = false } = body;

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }

    // Verify allocation exists
    const allocation = await prisma.budgetAllocation.findUnique({
      where: { id: params.id },
    });

    if (!allocation) {
      return NextResponse.json(
        { error: 'Budget allocation not found' },
        { status: 404 }
      );
    }

    const user = session.user as { id?: string; name?: string; role?: string };

    // Create the comment
    const budgetComment = await prisma.budgetComment.create({
      data: {
        budgetAllocationId: params.id,
        userId: user.id || 'unknown',
        userName: user.name || 'Unknown User',
        comment: comment.trim(),
        isRevisionRequest,
      },
    });

    // If it's a revision request, update the allocation status
    if (isRevisionRequest) {
      await prisma.budgetAllocation.update({
        where: { id: params.id },
        data: {
          status: 'REVISION_REQUIRED',
        },
      });

      // Log the status change
      await logCreate(
        'budget_allocation',
        params.id,
        { status: 'REVISION_REQUIRED', comment: comment.trim() },
        user.id || 'unknown',
        user.role || 'unknown'
      );
    }

    return NextResponse.json(budgetComment, { status: 201 });
  } catch (error) {
    console.error('Error creating budget comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
