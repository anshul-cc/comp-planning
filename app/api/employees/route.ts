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
  const departmentId = searchParams.get('departmentId')

  const where = departmentId ? { departmentId } : {}

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(employees)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { employeeId, name, email, title, departmentId, currentSalary, hireDate } = body

  if (!employeeId || !name || !email || !title || !departmentId || !currentSalary) {
    return NextResponse.json(
      { error: 'All fields are required' },
      { status: 400 }
    )
  }

  // Parallelize validation queries for better performance
  const [existingById, existingByEmail] = await Promise.all([
    prisma.employee.findUnique({ where: { employeeId } }),
    prisma.employee.findUnique({ where: { email } }),
  ])

  if (existingById) {
    return NextResponse.json(
      { error: 'Employee ID already exists' },
      { status: 400 }
    )
  }

  if (existingByEmail) {
    return NextResponse.json(
      { error: 'Employee email already exists' },
      { status: 400 }
    )
  }

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      name,
      email,
      title,
      departmentId,
      currentSalary: parseFloat(currentSalary),
      hireDate: new Date(hireDate || Date.now()),
    },
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  })

  return NextResponse.json(employee, { status: 201 })
}
