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

  const department = await prisma.department.findUnique({
    where: { id: params.id },
    include: {
      parent: true,
      children: true,
      manager: {
        select: { id: true, name: true, email: true },
      },
      employees: true,
    },
  })

  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  return NextResponse.json(department)
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
  const { name, code, parentId, managerId, costCenterId, location } = body

  const department = await prisma.department.update({
    where: { id: params.id },
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

  return NextResponse.json(department)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const department = await prisma.department.findUnique({
    where: { id: params.id },
    include: {
      children: true,
      employees: true,
    },
  })

  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  if (department.children.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete department with child departments' },
      { status: 400 }
    )
  }

  if (department.employees.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete department with employees' },
      { status: 400 }
    )
  }

  await prisma.department.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
