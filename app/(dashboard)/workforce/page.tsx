import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

async function getWorkforcePlans() {
  const activeCycle = await prisma.planningCycle.findFirst({
    where: { status: { in: ['ACTIVE', 'ALLOCATION', 'REVIEW'] } },
    orderBy: { startDate: 'desc' },
  })

  const cycles = await prisma.planningCycle.findMany({
    orderBy: { startDate: 'desc' },
    take: 5,
  })

  const plans = await prisma.workforcePlan.findMany({
    where: activeCycle ? { cycleId: activeCycle.id } : {},
    include: {
      department: {
        include: {
          head: {
            select: { id: true, name: true },
          },
        },
      },
      cycle: true,
      scenarios: {
        where: { isBaseline: true },
        include: {
          entries: true,
        },
      },
      _count: {
        select: { approvals: true },
      },
    },
    orderBy: { department: { name: 'asc' } },
  })

  // Calculate stats for each plan
  const plansWithStats = plans.map((plan) => {
    const baselineScenario = plan.scenarios[0]
    let totalHeadcount = 0
    let totalHires = 0
    let totalPayrollImpact = 0

    if (baselineScenario) {
      baselineScenario.entries.forEach((entry) => {
        totalHeadcount += entry.currentHeadcount
        totalHires += entry.q1Hires + entry.q2Hires + entry.q3Hires + entry.q4Hires
        totalPayrollImpact += entry.totalPayrollImpact
      })
    }

    return {
      ...plan,
      stats: {
        totalHeadcount,
        totalHires,
        totalPayrollImpact,
      },
    }
  })

  return { plans: plansWithStats, activeCycle, cycles }
}

export default async function WorkforcePage() {
  const { plans, activeCycle, cycles } = await getWorkforcePlans()

  const totalHeadcount = plans.reduce((sum, p) => sum + p.stats.totalHeadcount, 0)
  const totalHires = plans.reduce((sum, p) => sum + p.stats.totalHires, 0)
  const totalPayrollImpact = plans.reduce((sum, p) => sum + p.stats.totalPayrollImpact, 0)
  const submittedCount = plans.filter((p) => p.status === 'SUBMITTED').length
  const approvedCount = plans.filter((p) => p.status === 'APPROVED').length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workforce Planning</h1>
          <p className="mt-1 text-slate-500">
            {activeCycle ? `${activeCycle.name} workforce plans` : 'No active cycle'}
          </p>
        </div>
        <Link href="/workforce/new" className="btn-primary">
          New Plan
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Total Plans"
          value={plans.length.toString()}
          subtitle={`${approvedCount} approved`}
          color="indigo"
        />
        <SummaryCard
          title="Current Headcount"
          value={totalHeadcount.toString()}
          subtitle="Across all departments"
          color="emerald"
        />
        <SummaryCard
          title="Planned Hires"
          value={totalHires.toString()}
          subtitle="For the cycle"
          color="purple"
        />
        <SummaryCard
          title="Payroll Impact"
          value={formatCurrency(totalPayrollImpact)}
          subtitle="New hire cost"
          color="amber"
        />
        <SummaryCard
          title="Pending Review"
          value={submittedCount.toString()}
          subtitle="Awaiting approval"
          color="rose"
        />
      </div>

      {/* Plans Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Workforce Plans</h2>
          {cycles.length > 1 && (
            <select className="input text-sm">
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Current HC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Planned Hires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Payroll Impact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-slate-900">{plan.department.name}</div>
                  <div className="text-sm text-slate-500">
                    {plan.department.head?.name || 'No head assigned'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {plan.stats.totalHeadcount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {plan.stats.totalHires}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {formatCurrency(plan.stats.totalPayrollImpact)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={plan.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(plan.updatedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/workforce/${plan.id}`}
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    {plan.status === 'DRAFT' || plan.status === 'REJECTED' ? 'Edit' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {plans.length === 0 && (
          <div className="p-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No workforce plans</h3>
            <p className="mt-2 text-slate-500">Create workforce plans for each department.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string
  subtitle: string
  color: 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose'
}) {
  const bgColors = {
    indigo: 'from-indigo-50 to-blue-50',
    purple: 'from-purple-50 to-fuchsia-50',
    emerald: 'from-emerald-50 to-teal-50',
    amber: 'from-amber-50 to-orange-50',
    rose: 'from-rose-50 to-pink-50',
  }

  return (
    <div className={`card p-6 bg-gradient-to-br ${bgColors[color]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    LOCKED: 'bg-indigo-100 text-indigo-700',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}
