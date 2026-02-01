import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

async function getBudgetData() {
  const activeCycle = await prisma.planningCycle.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  const allocations = await prisma.budgetAllocation.findMany({
    where: activeCycle ? { cycleId: activeCycle.id } : {},
    include: {
      department: true,
      costCenter: true,
      cycle: true,
    },
    orderBy: { department: { name: 'asc' } },
  })

  const cycles = await prisma.planningCycle.findMany({
    orderBy: { startDate: 'desc' },
  })

  return { allocations, activeCycle, cycles }
}

export default async function BudgetsPage() {
  const { allocations, activeCycle, cycles } = await getBudgetData()

  const totalBudget = allocations.reduce((sum, a) => sum + a.totalBudget, 0)
  const totalSalary = allocations.reduce((sum, a) => sum + a.salaryBudget, 0)
  const totalBenefits = allocations.reduce((sum, a) => sum + a.benefitsBudget, 0)
  const totalHiring = allocations.reduce((sum, a) => sum + a.hiringBudget, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Budget Allocation</h1>
          <p className="mt-1 text-slate-500">
            {activeCycle ? `${activeCycle.name} department budgets` : 'No active cycle'}
          </p>
        </div>
        <Link href="/budgets/new" className="btn-primary">
          New Allocation
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Budget"
          value={formatCurrency(totalBudget)}
          subtitle="All departments"
          color="emerald"
        />
        <SummaryCard
          title="Salary Budget"
          value={formatCurrency(totalSalary)}
          subtitle={`${((totalSalary / totalBudget) * 100 || 0).toFixed(0)}% of total`}
          color="emerald"
        />
        <SummaryCard
          title="Benefits Budget"
          value={formatCurrency(totalBenefits)}
          subtitle={`${((totalBenefits / totalBudget) * 100 || 0).toFixed(0)}% of total`}
          color="amber"
        />
        <SummaryCard
          title="Hiring Budget"
          value={formatCurrency(totalHiring)}
          subtitle={`${((totalHiring / totalBudget) * 100 || 0).toFixed(0)}% of total`}
          color="rose"
        />
      </div>

      {/* Budget Breakdown Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget Distribution</h3>
        <div className="h-8 rounded-lg overflow-hidden flex">
          {totalBudget > 0 && (
            <>
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(totalSalary / totalBudget) * 100}%` }}
              >
                {((totalSalary / totalBudget) * 100).toFixed(0)}%
              </div>
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(totalBenefits / totalBudget) * 100}%` }}
              >
                {((totalBenefits / totalBudget) * 100).toFixed(0)}%
              </div>
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(totalHiring / totalBudget) * 100}%` }}
              >
                {((totalHiring / totalBudget) * 100).toFixed(0)}%
              </div>
            </>
          )}
        </div>
        <div className="mt-3 flex gap-6">
          <Legend color="emerald" label="Salary" />
          <Legend color="emerald" label="Benefits" />
          <Legend color="amber" label="Hiring" />
        </div>
      </div>

      {/* Allocations Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Cost Center
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Budget
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Salary
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Benefits
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Hiring
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
            {allocations.map((allocation) => (
              <tr key={allocation.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
                      {allocation.department?.code?.slice(0, 2) || '??'}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {allocation.department?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-slate-500">{allocation.cycle.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {allocation.costCenter?.code || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-right">
                  {formatCurrency(allocation.totalBudget)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                  {formatCurrency(allocation.salaryBudget)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                  {formatCurrency(allocation.benefitsBudget)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                  {formatCurrency(allocation.hiringBudget)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={allocation.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/budgets/${allocation.id}`}
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allocations.length === 0 && (
          <div className="p-12 text-center">
            <BankIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No budget allocations</h3>
            <p className="mt-2 text-slate-500">
              Create budget allocations for your departments.
            </p>
            <Link href="/budgets/new" className="btn-primary mt-4 inline-block">
              Create Allocation
            </Link>
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

function Legend({ color, label }: { color: string; label: string }) {
  const bgColors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded ${bgColors[color]}`} />
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

function BankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )
}
