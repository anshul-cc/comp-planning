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
  const allocationId = searchParams.get('allocationId');
  const txType = searchParams.get('txType');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const referenceId = searchParams.get('referenceId');

  const where: Record<string, unknown> = {};

  if (allocationId) {
    where.allocationId = allocationId;
  }

  if (txType) {
    where.txType = txType;
  }

  if (referenceId) {
    where.referenceId = referenceId;
  }

  if (startDate || endDate) {
    where.txDate = {};
    if (startDate) {
      (where.txDate as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.txDate as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const transactions = await prisma.budgetTransaction.findMany({
    where,
    include: {
      positionBudget: {
        include: {
          departmentBudget: {
            include: {
              department: {
                select: { id: true, name: true, code: true },
              },
              cycle: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ txDate: 'desc' }, { createdAt: 'desc' }],
  });

  // Calculate running balance for the allocation
  const result = transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { allocationId, amount, txType, txDate, referenceId } = body;

  // Validate required fields
  if (!allocationId || amount === undefined || !txType || !txDate) {
    return NextResponse.json(
      { error: 'allocationId, amount, txType, and txDate are required' },
      { status: 400 }
    );
  }

  // Validate txType
  const validTxTypes = ['ENCUMBER', 'RELEASE', 'ADJUST'];
  if (!validTxTypes.includes(txType)) {
    return NextResponse.json(
      { error: `txType must be one of: ${validTxTypes.join(', ')}` },
      { status: 400 }
    );
  }

  // Verify position budget exists
  const positionBudget = await prisma.positionBudget.findUnique({
    where: { id: allocationId },
    include: {
      budgetTransactions: true,
    },
  });

  if (!positionBudget) {
    return NextResponse.json({ error: 'Position budget not found' }, { status: 404 });
  }

  // Calculate current balance
  const currentEncumbered = positionBudget.budgetTransactions
    .filter((tx) => tx.txType === 'ENCUMBER')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

  const currentReleased = positionBudget.budgetTransactions
    .filter((tx) => tx.txType === 'RELEASE')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const currentAdjustments = positionBudget.budgetTransactions
    .filter((tx) => tx.txType === 'ADJUST')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const currentConsumed = currentEncumbered - currentReleased + currentAdjustments;
  const available = Number(positionBudget.allocatedAmount) - currentConsumed;

  // For ENCUMBER, check if there's enough budget available
  if (txType === 'ENCUMBER') {
    const encumberAmount = Math.abs(amount);
    if (encumberAmount > available) {
      return NextResponse.json(
        {
          error: `Insufficient budget. Available: ${available}, Requested: ${encumberAmount}`,
        },
        { status: 400 }
      );
    }
  }

  // For RELEASE, check that we're not releasing more than encumbered
  if (txType === 'RELEASE') {
    const releaseAmount = Math.abs(amount);
    if (releaseAmount > currentConsumed) {
      return NextResponse.json(
        {
          error: `Cannot release more than consumed. Consumed: ${currentConsumed}, Requested: ${releaseAmount}`,
        },
        { status: 400 }
      );
    }
  }

  // Create the transaction (encumbrances stored as negative)
  const transactionAmount = txType === 'ENCUMBER' ? -Math.abs(amount) : amount;

  const transaction = await prisma.budgetTransaction.create({
    data: {
      allocationId,
      amount: transactionAmount,
      txType,
      txDate: new Date(txDate),
      referenceId: referenceId || null,
    },
    include: {
      positionBudget: {
        include: {
          departmentBudget: {
            include: {
              department: true,
              cycle: true,
            },
          },
        },
      },
    },
  });

  // Calculate new balance
  const newConsumed =
    txType === 'ENCUMBER'
      ? currentConsumed + Math.abs(amount)
      : txType === 'RELEASE'
      ? currentConsumed - Math.abs(amount)
      : currentConsumed + amount;

  return NextResponse.json(
    {
      ...transaction,
      amount: Number(transaction.amount),
      newBalance: {
        allocated: Number(positionBudget.allocatedAmount),
        consumed: newConsumed,
        available: Number(positionBudget.allocatedAmount) - newConsumed,
      },
    },
    { status: 201 }
  );
}
