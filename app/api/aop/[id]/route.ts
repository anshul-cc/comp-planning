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

  const annualPlan = await prisma.annualPlan.findUnique({
    where: { id: params.id },
    include: {
      fiscalYear: true,
      department: {
        include: {
          employees: true,
        },
      },
      allocations: {
        include: {
          employee: true,
          approvals: {
            include: {
              approver: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  })

  if (!annualPlan) {
    return NextResponse.json({ error: 'Annual plan not found' }, { status: 404 })
  }

  return NextResponse.json(annualPlan)
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
  const { totalBudget, status, notes } = body

  const annualPlan = await prisma.annualPlan.update({
    where: { id: params.id },
    data: {
      totalBudget: totalBudget !== undefined ? parseFloat(totalBudget) : undefined,
      status,
      notes,
    },
    include: {
      fiscalYear: true,
      department: true,
    },
  })

  return NextResponse.json(annualPlan)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.annualPlan.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
