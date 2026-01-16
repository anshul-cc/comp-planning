import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { DashboardCharts } from '@/components/DashboardCharts'

async function getDashboardData() {
  const activeCycle = await prisma.planningCycle.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  const [
    totalEmployees,
    totalDepartments,
    budgetAllocations,
    headcountPlans,
    pendingHiring,
    pendingCompActions,
    expenses,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.department.count(),
    prisma.budgetAllocation.findMany({
      where: activeCycle ? { cycleId: activeCycle.id } : {},
      include: { department: true },
    }),
    prisma.headcountPlan.findMany({
      where: activeCycle ? { cycleId: activeCycle.id } : {},
      include: { department: true },
    }),
    prisma.hiringProposal.count({
      where: { status: { in: ['SUBMITTED', 'HR_REVIEW', 'FINANCE_REVIEW'] } },
    }),
    prisma.compensationAction.count({
      where: { status: 'SUBMITTED' },
    }),
    prisma.expense.findMany({
      where: activeCycle ? { cycleId: activeCycle.id, isActual: true } : { isActual: true },
    }),
  ])

  const totalBudget = budgetAllocations.reduce((sum, b) => sum + b.totalBudget, 0)
  const totalActualSpend = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalPlannedHeadcount = headcountPlans.reduce((sum, h) => sum + h.plannedHeadcount, 0)
  const totalActualHeadcount = headcountPlans.reduce((sum, h) => sum + h.actualHeadcount, 0)
  const totalWageBudget = headcountPlans.reduce((sum, h) => sum + h.wageBudget, 0)
  const totalActualWage = headcountPlans.reduce((sum, h) => sum + h.actualWageCost, 0)

  const departmentData = budgetAllocations.map((b) => ({
    name: b.department?.name || 'Unknown',
    budget: b.totalBudget,
    allocated: b.salaryBudget + b.benefitsBudget + b.hiringBudget,
  }))

  return {
    activeCycle,
    totalEmployees,
    totalDepartments,
    totalBudget,
    totalActualSpend,
    totalPlannedHeadcount,
    totalActualHeadcount,
    totalWageBudget,
    totalActualWage,
    pendingHiring,
    pendingCompActions,
    departmentData,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const budgetUtilization = data.totalBudget > 0 ? (data.totalActualSpend / data.totalBudget) * 100 : 0
  const headcountFill = data.totalPlannedHeadcount > 0 ? (data.totalActualHeadcount / data.totalPlannedHeadcount) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">
            {data.activeCycle ? `${data.activeCycle.name} Overview` : 'No active planning cycle'}
          </p>
        </div>
        {data.activeCycle && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">{data.activeCycle.status}</span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Budget"
          value={formatCurrency(data.totalBudget)}
          subtitle={`${formatCurrency(data.totalActualSpend)} spent`}
          progress={budgetUtilization}
          color="teal"
        />
        <MetricCard
          title="Wage Budget"
          value={formatCurrency(data.totalWageBudget)}
          subtitle={`${formatCurrency(data.totalActualWage)} actual`}
          progress={data.totalWageBudget > 0 ? (data.totalActualWage / data.totalWageBudget) * 100 : 0}
          color="emerald"
        />
        <MetricCard
          title="Headcount"
          value={`${data.totalActualHeadcount} / ${data.totalPlannedHeadcount}`}
          subtitle={`${data.totalPlannedHeadcount - data.totalActualHeadcount} positions open`}
          progress={headcountFill}
          color="amber"
        />
        <MetricCard
          title="Pending Actions"
          value={(data.pendingHiring + data.pendingCompActions).toString()}
          subtitle={`${data.pendingHiring} hiring, ${data.pendingCompActions} comp`}
          color="rose"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Organization Stats */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Organization</h3>
          <dl className="space-y-4">
            <StatRow label="Active Employees" value={data.totalEmployees} />
            <StatRow label="Departments" value={data.totalDepartments} />
            <StatRow label="Budget Utilization" value={`${budgetUtilization.toFixed(1)}%`} />
            <StatRow label="Headcount Fill Rate" value={`${headcountFill.toFixed(1)}%`} />
          </dl>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Budget vs Actual</h4>
            <div className="space-y-3">
              <ProgressBar label="Budget Spend" value={budgetUtilization} color="teal" />
              <ProgressBar label="Headcount" value={headcountFill} color="emerald" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2">
          <DashboardCharts departmentData={data.departmentData} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  progress,
  color,
}: {
  title: string
  value: string
  subtitle: string
  progress?: number
  color: 'teal' | 'emerald' | 'amber' | 'rose'
}) {
  const colorClasses = {
    teal: 'from-teal-50 to-emerald-50 text-teal-600',
    emerald: 'from-emerald-50 to-teal-50 text-emerald-600',
    amber: 'from-amber-50 to-orange-50 text-amber-600',
    rose: 'from-rose-50 to-pink-50 text-rose-600',
  }

  const progressColors = {
    teal: 'from-teal-500 to-emerald-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
  }

  return (
    <div className="card p-6">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`bg-gradient-to-r ${progressColors[color]} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  )
}

function ProgressBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'teal' | 'emerald'
}) {
  const progressColors = {
    teal: 'from-teal-500 to-emerald-500',
    emerald: 'from-emerald-500 to-teal-500',
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`bg-gradient-to-r ${progressColors[color]} h-2 rounded-full`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}
