import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const fiscalYearId = searchParams.get('fiscalYearId')
  const costCenterId = searchParams.get('costCenterId')

  const where: { fiscalYearId?: string; costCenterId?: string } = {}
  if (fiscalYearId) where.fiscalYearId = fiscalYearId
  if (costCenterId) where.costCenterId = costCenterId

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      fiscalYear: true,
      costCenter: true,
    },
    orderBy: [{ month: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(expenses)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { fiscalYearId, costCenterId, category, description, amount, month } = body

  if (!fiscalYearId || !costCenterId || !category || !description || !amount || !month) {
    return NextResponse.json(
      { error: 'All fields are required' },
      { status: 400 }
    )
  }

  const expense = await prisma.expense.create({
    data: {
      fiscalYearId,
      costCenterId,
      category,
      description,
      amount: parseFloat(amount),
      month: parseInt(month),
    },
    include: {
      fiscalYear: true,
      costCenter: true,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
