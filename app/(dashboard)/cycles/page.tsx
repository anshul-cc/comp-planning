import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

async function getPlanningCycles() {
  return prisma.planningCycle.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      _count: {
        select: {
          budgetAllocations: true,
          headcountPlans: true,
          hiringProposals: true,
        },
      },
    },
  })
}

export default async function CyclesPage() {
  const cycles = await getPlanningCycles()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Planning Cycles</h1>
          <p className="mt-1 text-slate-500">Manage annual and half-yearly planning periods</p>
        </div>
        <Link
          href="/cycles/new"
          className="btn-primary"
        >
          New Cycle
        </Link>
      </div>

      <div className="grid gap-6">
        {cycles.map((cycle) => (
          <div key={cycle.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  cycle.status === 'ACTIVE'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                    : cycle.status === 'CLOSED'
                    ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                    : 'bg-gradient-to-br from-amber-500 to-orange-500'
                }`}>
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{cycle.name}</h3>
                  <p className="text-sm text-slate-500">
                    {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                  </p>
                </div>
              </div>
              <StatusBadge status={cycle.status} />
            </div>

            <div className="mt-6 grid grid-cols-4 gap-4">
              <StatBox label="Type" value={cycle.type.replace('_', ' ')} />
              <StatBox label="Budget Allocations" value={cycle._count.budgetAllocations} />
              <StatBox label="Headcount Plans" value={cycle._count.headcountPlans} />
              <StatBox label="Hiring Proposals" value={cycle._count.hiringProposals} />
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href={`/cycles/${cycle.id}`}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View Details
              </Link>
              {cycle.status === 'DRAFT' && (
                <>
                  <span className="text-slate-300">|</span>
                  <Link
                    href={`/cycles/${cycle.id}/edit`}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Edit
                  </Link>
                </>
              )}
              <span className="text-slate-300">|</span>
              <Link
                href={`/budgets?cycle=${cycle.id}`}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Budget Allocations
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href={`/headcount?cycle=${cycle.id}`}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Headcount Plans
              </Link>
            </div>
          </div>
        ))}

        {cycles.length === 0 && (
          <div className="card p-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No planning cycles</h3>
            <p className="mt-2 text-slate-500">Get started by creating your first planning cycle.</p>
            <Link href="/cycles/new" className="btn-primary mt-4 inline-block">
              Create Planning Cycle
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PLANNING: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}
