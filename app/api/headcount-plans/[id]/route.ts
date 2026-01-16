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
  const { plannedHeadcount, wageBudget, notes } = body

  const headcountPlan = await prisma.headcountPlan.update({
    where: { id: params.id },
    data: {
      plannedHeadcount: plannedHeadcount ? parseInt(plannedHeadcount) : undefined,
      wageBudget: wageBudget ? parseFloat(wageBudget) : undefined,
      notes,
    },
    include: {
      fiscalYear: true,
      department: true,
    },
  })

  return NextResponse.json(headcountPlan)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.headcountPlan.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
