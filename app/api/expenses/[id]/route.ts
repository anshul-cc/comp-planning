import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { category, description, amount, month } = body

  const expense = await prisma.expense.update({
    where: { id: params.id },
    data: {
      category,
      description,
      amount: amount ? parseFloat(amount) : undefined,
      month: month ? parseInt(month) : undefined,
    },
    include: {
      cycle: true,
      costCenter: true,
    },
  })

  return NextResponse.json(expense)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.expense.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
