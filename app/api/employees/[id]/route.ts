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

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      allocations: {
        include: {
          annualPlan: {
            include: { fiscalYear: true },
          },
        },
      },
    },
  })

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  return NextResponse.json(employee)
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
  const { name, email, title, departmentId, currentSalary, hireDate } = body

  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: {
      name,
      email,
      title,
      departmentId,
      currentSalary: parseFloat(currentSalary),
      hireDate: hireDate ? new Date(hireDate) : undefined,
    },
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  })

  return NextResponse.json(employee)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.employee.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
