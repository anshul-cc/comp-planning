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
  const { name, minSalary, maxSalary } = body

  if (parseFloat(minSalary) >= parseFloat(maxSalary)) {
    return NextResponse.json(
      { error: 'Minimum salary must be less than maximum salary' },
      { status: 400 }
    )
  }

  const payGrade = await prisma.payGrade.update({
    where: { id: params.id },
    data: {
      name,
      minSalary: parseFloat(minSalary),
      maxSalary: parseFloat(maxSalary),
    },
  })

  return NextResponse.json(payGrade)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payGrade = await prisma.payGrade.findUnique({
    where: { id: params.id },
    include: { employees: true },
  })

  if (!payGrade) {
    return NextResponse.json({ error: 'Pay grade not found' }, { status: 404 })
  }

  if (payGrade.employees.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete pay grade with assigned employees' },
      { status: 400 }
    )
  }

  await prisma.payGrade.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
