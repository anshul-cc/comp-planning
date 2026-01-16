import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const departments = await prisma.department.findMany({
    include: {
      parent: true,
      children: true,
      manager: {
        select: { id: true, name: true, email: true },
      },
      costCenter: true,
      _count: {
        select: { employees: true, roles: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(departments)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, code, parentId, managerId, costCenterId, location } = body

  if (!name || !code) {
    return NextResponse.json(
      { error: 'Name and code are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.department.findUnique({
    where: { code },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Department code already exists' },
      { status: 400 }
    )
  }

  const department = await prisma.department.create({
    data: {
      name,
      code,
      parentId: parentId || null,
      managerId: managerId || null,
      costCenterId: costCenterId || null,
      location: location || null,
    },
    include: {
      parent: true,
      manager: {
        select: { id: true, name: true, email: true },
      },
      costCenter: true,
    },
  })

  return NextResponse.json(department, { status: 201 })
}
