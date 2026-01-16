import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

async function getExpenses() {
  const activeCycle = await prisma.planningCycle.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  const [expenses, costCenters, budgetAllocations] = await Promise.all([
    prisma.expense.findMany({
      where: activeCycle ? { cycleId: activeCycle.id } : {},
      include: {
        costCenter: true,
        cycle: true,
      },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.costCenter.findMany(),
    prisma.budgetAllocation.findMany({
      where: activeCycle ? { cycleId: activeCycle.id } : {},
      include: { costCenter: true, department: true },
    }),
  ])

  return { expenses, costCenters, budgetAllocations, activeCycle }
}

export default async function ExpensesPage() {
  const { expenses, costCenters, budgetAllocations, activeCycle } = await getExpenses()

  // Group expenses by cost center
  const expensesByCostCenter = expenses.reduce((acc, expense) => {
    const ccId = expense.costCenterId
    if (!acc[ccId]) {
      acc[ccId] = {
        costCenter: expense.costCenter,
        expenses: [],
        total: 0,
      }
    }
    acc[ccId].expenses.push(expense)
    acc[ccId].total += expense.amount
    return acc
  }, {} as Record<string, { costCenter: typeof costCenters[0]; expenses: typeof expenses; total: number }>)

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0
    }
    acc[expense.category] += expense.amount
    return acc
  }, {} as Record<string, number>)

  // Monthly totals
  const monthlyTotals = expenses.reduce((acc, expense) => {
    if (!acc[expense.month]) {
      acc[expense.month] = 0
    }
    acc[expense.month] += expense.amount
    return acc
  }, {} as Record<number, number>)

  const totalActual = expenses.filter((e) => e.isActual).reduce((sum, e) => sum + e.amount, 0)
  const totalForecast = expenses.filter((e) => !e.isActual).reduce((sum, e) => sum + e.amount, 0)
  const totalBudget = budgetAllocations.reduce((sum, b) => sum + b.totalBudget, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">OPEX Tracking</h1>
          <p className="mt-1 text-slate-500">
            {activeCycle ? `${activeCycle.name} expenses by cost center` : 'No active cycle'}
          </p>
        </div>
        <Link href="/expenses/new" className="btn-primary">
          Record Expense
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Budget"
          value={formatCurrency(totalBudget)}
          subtitle="Allocated"
          color="indigo"
        />
        <SummaryCard
          title="Actual Spend"
          value={formatCurrency(totalActual)}
          subtitle={`${((totalActual / totalBudget) * 100 || 0).toFixed(1)}% utilized`}
          color="emerald"
        />
        <SummaryCard
          title="Forecasted"
          value={formatCurrency(totalForecast)}
          subtitle="Projected additional"
          color="amber"
        />
        <SummaryCard
          title="Remaining"
          value={formatCurrency(totalBudget - totalActual)}
          subtitle={totalBudget - totalActual < 0 ? 'Over budget!' : 'Available'}
          color={totalBudget - totalActual < 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Expense Breakdown by Category */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Expenses by Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(expensesByCategory).map(([category, amount]) => (
            <div key={category} className="p-4 bg-slate-50 rounded-lg">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${getCategoryColor(category)}`}>
                {getCategoryIcon(category)}
              </div>
              <p className="text-xs text-slate-500">{category}</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Spend</h3>
        <div className="flex gap-2 h-32">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
            const monthTotal = monthlyTotals[month] || 0
            const maxMonthly = Math.max(...Object.values(monthlyTotals), 1)
            const height = (monthTotal / maxMonthly) * 100

            return (
              <div key={month} className="flex-1 flex flex-col items-center justify-end">
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    monthTotal > 0 ? 'bg-gradient-to-t from-indigo-500 to-purple-500' : 'bg-slate-100'
                  }`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={formatCurrency(monthTotal)}
                />
                <span className="mt-2 text-xs text-slate-500">{getMonthShort(month)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cost Center Breakdown */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">By Cost Center</h3>
        {Object.values(expensesByCostCenter).map(({ costCenter, expenses: ccExpenses, total }) => {
          const budget = budgetAllocations.find((b) => b.costCenterId === costCenter.id)?.totalBudget || 0
          const utilization = budget > 0 ? (total / budget) * 100 : 0

          return (
            <div key={costCenter.id} className="card overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <BuildingIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{costCenter.name}</h4>
                      <p className="text-sm text-slate-500">{costCenter.code} • {costCenter.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
                    <p className="text-sm text-slate-500">of {formatCurrency(budget)} budget</p>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mt-4">
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        utilization > 100
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                          : utilization > 80
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{utilization.toFixed(1)}% utilized</p>
                </div>

                {/* Recent Expenses */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="text-left pb-2">Description</th>
                        <th className="text-left pb-2">Category</th>
                        <th className="text-left pb-2">Month</th>
                        <th className="text-right pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ccExpenses.slice(0, 5).map((expense) => (
                        <tr key={expense.id} className="text-sm">
                          <td className="py-2 text-slate-900">{expense.description}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryBadge(expense.category)}`}>
                              {expense.category}
                            </span>
                          </td>
                          <td className="py-2 text-slate-500">{getMonthShort(expense.month)}</td>
                          <td className="py-2 text-right font-medium text-slate-900">
                            {formatCurrency(expense.amount)}
                            {!expense.isActual && (
                              <span className="ml-1 text-xs text-amber-600">(forecast)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })}

        {Object.keys(expensesByCostCenter).length === 0 && (
          <div className="card p-12 text-center">
            <ReceiptIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No expenses recorded</h3>
            <p className="mt-2 text-slate-500">Start tracking OPEX by recording expenses.</p>
            <Link href="/expenses/new" className="btn-primary mt-4 inline-block">
              Record Expense
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
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate'
}) {
  const bgColors = {
    indigo: 'from-indigo-50 to-purple-50',
    emerald: 'from-emerald-50 to-teal-50',
    amber: 'from-amber-50 to-orange-50',
    rose: 'from-rose-50 to-pink-50',
    slate: 'from-slate-50 to-slate-100',
  }

  return (
    <div className={`card p-6 bg-gradient-to-br ${bgColors[color]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    SALARY: 'bg-indigo-100',
    BENEFITS: 'bg-emerald-100',
    TRAINING: 'bg-amber-100',
    EQUIPMENT: 'bg-blue-100',
    RECRUITMENT: 'bg-purple-100',
    OTHER: 'bg-slate-100',
  }
  return colors[category] || colors.OTHER
}

function getCategoryBadge(category: string) {
  const colors: Record<string, string> = {
    SALARY: 'bg-indigo-100 text-indigo-700',
    BENEFITS: 'bg-emerald-100 text-emerald-700',
    TRAINING: 'bg-amber-100 text-amber-700',
    EQUIPMENT: 'bg-blue-100 text-blue-700',
    RECRUITMENT: 'bg-purple-100 text-purple-700',
    OTHER: 'bg-slate-100 text-slate-700',
  }
  return colors[category] || colors.OTHER
}

function getCategoryIcon(category: string) {
  return <span className="text-xs font-bold text-slate-600">{category.slice(0, 2)}</span>
}

function getMonthShort(month: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month - 1] || ''
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}
