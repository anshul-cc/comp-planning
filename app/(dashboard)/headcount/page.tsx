import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

async function getHeadcountPlans() {
  const activeCycle = await prisma.planningCycle.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  const plans = await prisma.headcountPlan.findMany({
    where: activeCycle ? { cycleId: activeCycle.id } : {},
    include: {
      department: true,
      cycle: true,
    },
    orderBy: { department: { name: 'asc' } },
  })

  return { plans, activeCycle }
}

export default async function HeadcountPage() {
  const { plans, activeCycle } = await getHeadcountPlans()

  const totalPlanned = plans.reduce((sum, p) => sum + p.plannedHeadcount, 0)
  const totalActual = plans.reduce((sum, p) => sum + p.actualHeadcount, 0)
  const totalWageBudget = plans.reduce((sum, p) => sum + p.wageBudget, 0)
  const totalActualWage = plans.reduce((sum, p) => sum + p.actualWageCost, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Headcount Plans</h1>
          <p className="mt-1 text-slate-500">
            {activeCycle ? `${activeCycle.name} headcount planning` : 'No active cycle'}
          </p>
        </div>
        <Link href="/headcount/new" className="btn-primary">
          New Plan
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Planned Headcount"
          value={totalPlanned.toString()}
          subtitle="Total positions"
          color="emerald"
        />
        <SummaryCard
          title="Actual Headcount"
          value={totalActual.toString()}
          subtitle={`${totalPlanned - totalActual} open positions`}
          color="emerald"
        />
        <SummaryCard
          title="Wage Budget"
          value={formatCurrency(totalWageBudget)}
          subtitle="Total allocated"
          color="amber"
        />
        <SummaryCard
          title="Actual Wage Cost"
          value={formatCurrency(totalActualWage)}
          subtitle={`${((totalActualWage / totalWageBudget) * 100 || 0).toFixed(1)}% utilized`}
          color="rose"
        />
      </div>

      {/* Plans Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Headcount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Fill Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Wage Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actual Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {plans.map((plan) => {
              const fillRate = plan.plannedHeadcount > 0
                ? (plan.actualHeadcount / plan.plannedHeadcount) * 100
                : 0
              const costRate = plan.wageBudget > 0
                ? (plan.actualWageCost / plan.wageBudget) * 100
                : 0

              return (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{plan.department.name}</div>
                    <div className="text-sm text-slate-500">{plan.department.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {plan.actualHeadcount} / {plan.plannedHeadcount}
                    </div>
                    <div className="text-xs text-slate-500">
                      {plan.approvedHires} approved hires
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            fillRate >= 80 ? 'bg-emerald-500' : fillRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(fillRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600">{fillRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {formatCurrency(plan.wageBudget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{formatCurrency(plan.actualWageCost)}</div>
                    <div className="text-xs text-slate-500">{costRate.toFixed(1)}% utilized</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={plan.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/headcount/${plan.id}`} className="text-emerald-600 hover:text-emerald-900">
                      Edit
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {plans.length === 0 && (
          <div className="p-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No headcount plans</h3>
            <p className="mt-2 text-slate-500">Create headcount plans for each department.</p>
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
  color: 'emerald' | 'blue' | 'amber' | 'rose'
}) {
  const bgColors = {
    emerald: 'from-emerald-50 to-teal-50',
    blue: 'from-blue-50 to-indigo-50',
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
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.DRAFT}`}>
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
