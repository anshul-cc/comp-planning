import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const costCenters = await prisma.costCenter.findMany({
    include: {
      departments: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: { expenses: true },
      },
    },
    orderBy: { code: 'asc' },
  })

  return NextResponse.json(costCenters)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { code, name, type } = body

  if (!code || !name) {
    return NextResponse.json(
      { error: 'Code and name are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.costCenter.findUnique({
    where: { code },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'A cost center with this code already exists' },
      { status: 400 }
    )
  }

  const costCenter = await prisma.costCenter.create({
    data: {
      code,
      name,
      type: type || 'OPEX',
    },
  })

  return NextResponse.json(costCenter, { status: 201 })
}
