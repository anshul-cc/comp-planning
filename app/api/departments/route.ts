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
  const limit = parseInt(searchParams.get('limit') || '25')
  const offset = parseInt(searchParams.get('offset') || '0')

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      include: {
        head: {
          select: { id: true, name: true, email: true },
        },
        costCenter: true,
        _count: {
          select: { employees: true, roles: true },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.department.count(),
  ])

  return NextResponse.json({ data: departments, total, limit, offset })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, code, headId, costCenterId, location } = body

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
      headId: headId || null,
      costCenterId: costCenterId || null,
      location: location || null,
    },
    include: {
      head: {
        select: { id: true, name: true, email: true },
      },
      costCenter: true,
    },
  })

  return NextResponse.json(department, { status: 201 })
}
