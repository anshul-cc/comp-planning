import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fiscalYear = await prisma.fiscalYear.findUnique({
    where: { id: params.id },
    include: {
      annualPlans: {
        include: {
          department: true,
          allocations: true,
        },
      },
    },
  })

  if (!fiscalYear) {
    return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 })
  }

  return NextResponse.json(fiscalYear)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, startDate, endDate, status } = body

  const fiscalYear = await prisma.fiscalYear.update({
    where: { id: params.id },
    data: {
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    },
  })

  return NextResponse.json(fiscalYear)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fiscalYear = await prisma.fiscalYear.findUnique({
    where: { id: params.id },
    include: { annualPlans: true },
  })

  if (!fiscalYear) {
    return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 })
  }

  if (fiscalYear.annualPlans.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete fiscal year with associated plans' },
      { status: 400 }
    )
  }

  await prisma.fiscalYear.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
