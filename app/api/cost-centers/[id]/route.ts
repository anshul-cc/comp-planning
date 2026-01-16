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
  const { name, type } = body

  const costCenter = await prisma.costCenter.update({
    where: { id: params.id },
    data: { name, type },
  })

  return NextResponse.json(costCenter)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const costCenter = await prisma.costCenter.findUnique({
    where: { id: params.id },
    include: { departments: true, expenses: true },
  })

  if (!costCenter) {
    return NextResponse.json({ error: 'Cost center not found' }, { status: 404 })
  }

  if (costCenter.departments.length > 0 || costCenter.expenses.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete cost center with linked departments or expenses' },
      { status: 400 }
    )
  }

  await prisma.costCenter.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
