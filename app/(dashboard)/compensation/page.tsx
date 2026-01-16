import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

async function getCompensationCycles() {
  return prisma.compensationCycle.findMany({
    include: {
      planningCycle: true,
      actions: {
        include: {
          employee: true,
        },
      },
    },
    orderBy: { effectiveDate: 'desc' },
  })
}

export default async function CompensationPage() {
  const cycles = await getCompensationCycles()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Compensation Cycles</h1>
          <p className="mt-1 text-slate-500">Manage salary revisions, bonuses, and promotions</p>
        </div>
        <Link href="/compensation/new" className="btn-primary">
          New Cycle
        </Link>
      </div>

      <div className="space-y-6">
        {cycles.map((cycle) => {
          const totalBudget = cycle.budgetAmount
          const totalProposed = cycle.actions.reduce(
            (sum, a) => sum + (a.proposedSalary ? a.proposedSalary - a.currentSalary : 0) + (a.proposedBonus || 0),
            0
          )
          const approvedActions = cycle.actions.filter((a) => a.status === 'APPROVED').length
          const pendingActions = cycle.actions.filter((a) => ['DRAFT', 'SUBMITTED'].includes(a.status)).length

          return (
            <div key={cycle.id} className="card overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${getTypeIcon(cycle.type).bg}`}>
                      {getTypeIcon(cycle.type).icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{cycle.name}</h3>
                      <p className="text-sm text-slate-500">
                        {cycle.planningCycle.name} • Effective {formatDate(cycle.effectiveDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TypeBadge type={cycle.type} />
                    <StatusBadge status={cycle.status} />
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Budget Utilization</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(totalProposed)} / {formatCurrency(totalBudget)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        totalProposed > totalBudget
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${Math.min((totalProposed / totalBudget) * 100, 100)}%` }}
                    />
                  </div>
                  {totalProposed > totalBudget && (
                    <p className="mt-2 text-xs text-rose-600 font-medium">
                      Over budget by {formatCurrency(totalProposed - totalBudget)}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                  <StatBox label="Total Actions" value={cycle.actions.length.toString()} />
                  <StatBox label="Approved" value={approvedActions.toString()} color="emerald" />
                  <StatBox label="Pending" value={pendingActions.toString()} color="amber" />
                  <StatBox
                    label="Avg Change"
                    value={
                      cycle.actions.length > 0
                        ? `${(cycle.actions.reduce((sum, a) => sum + (a.percentageChange || 0), 0) / cycle.actions.length).toFixed(1)}%`
                        : 'N/A'
                    }
                  />
                </div>

                {/* Recent Actions Preview */}
                {cycle.actions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Actions</h4>
                    <div className="space-y-2">
                      {cycle.actions.slice(0, 3).map((action) => (
                        <div key={action.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                              {action.employee.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{action.employee.name}</p>
                              <p className="text-xs text-slate-500">{action.actionType.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              {action.proposedSalary
                                ? formatCurrency(action.proposedSalary)
                                : action.proposedBonus
                                ? formatCurrency(action.proposedBonus)
                                : 'N/A'}
                            </p>
                            {action.percentageChange && (
                              <p className={`text-xs ${action.percentageChange > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {action.percentageChange > 0 ? '+' : ''}{action.percentageChange.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-slate-50 flex gap-4">
                <Link
                  href={`/compensation/${cycle.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View All Actions
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  href={`/compensation/${cycle.id}/add`}
                  className="text-sm font-medium text-slate-600 hover:text-slate-700"
                >
                  Add Action
                </Link>
              </div>
            </div>
          )
        })}

        {cycles.length === 0 && (
          <div className="card p-12 text-center">
            <TrendingUpIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No compensation cycles</h3>
            <p className="mt-2 text-slate-500">Create a compensation cycle to manage salary revisions and bonuses.</p>
            <Link href="/compensation/new" className="btn-primary mt-4 inline-block">
              Create Compensation Cycle
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'SALARY_REVISION':
      return {
        bg: 'bg-gradient-to-br from-indigo-500 to-purple-500',
        icon: <TrendingUpIcon className="h-6 w-6 text-white" />,
      }
    case 'BONUS':
      return {
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
        icon: <GiftIcon className="h-6 w-6 text-white" />,
      }
    case 'PROMOTION':
      return {
        bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
        icon: <StarIcon className="h-6 w-6 text-white" />,
      }
    default:
      return {
        bg: 'bg-gradient-to-br from-slate-500 to-slate-600',
        icon: <TrendingUpIcon className="h-6 w-6 text-white" />,
      }
  }
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    SALARY_REVISION: 'bg-indigo-100 text-indigo-700',
    BONUS: 'bg-emerald-100 text-emerald-700',
    PROMOTION: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-slate-100 text-slate-700'}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    OPEN: 'bg-blue-100 text-blue-700',
    IN_REVIEW: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'amber' }) {
  const textColor = color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-slate-900'

  return (
    <div className="bg-white p-3 rounded-lg border border-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${textColor}`}>{value}</p>
    </div>
  )
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}
