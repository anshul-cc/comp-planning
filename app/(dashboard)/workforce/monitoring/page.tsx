'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface DepartmentStats {
  departmentId: string
  departmentName: string
  cycleId: string
  cycleName: string
  planned: {
    startHeadcount: number
    hires: number
    exits: number
    endHeadcount: number
    payrollImpact: number
  }
  actual: {
    headcount: number
    payroll: number
  }
  variance: {
    headcount: number
    headcountPercent: string
    adherenceRate: string
  }
}

interface Alert {
  id: string
  type: 'HEADCOUNT_VARIANCE' | 'BUDGET_OVERRUN' | 'HIRING_DELAY' | 'EXIT_SPIKE'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  departmentId: string
  departmentName: string
  message: string
  details: Record<string, unknown>
}

interface VelocityData {
  quarterly: {
    q1: { planned: number; actual: number }
    q2: { planned: number; actual: number }
    q3: { planned: number; actual: number }
    q4: { planned: number; actual: number }
  }
  velocity: {
    rate: string
    status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND'
    expectedByNow: number
    actualByNow: number
    variance: number
  }
  projection: {
    totalPlanned: number
    totalActual: number
    projectedYearEnd: number
    gap: number
  }
}

export default function MonitoringDashboardPage() {
  const [summary, setSummary] = useState<{
    overall: {
      planned: { headcount: number; hires: number; exits: number; payroll: number }
      actual: { headcount: number; payroll: number }
      variance: { headcount: number; headcountPercent: string; adherenceRate: string }
    }
    byDepartment: DepartmentStats[]
  } | null>(null)
  const [alerts, setAlerts] = useState<{ alerts: Alert[]; summary: { total: number; high: number; medium: number; low: number } } | null>(null)
  const [velocity, setVelocity] = useState<VelocityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/workforce-monitoring/summary').then((r) => r.json()),
      fetch('/api/workforce-monitoring/alerts').then((r) => r.json()),
      fetch('/api/workforce-monitoring/velocity').then((r) => r.json()),
    ])
      .then(([summaryData, alertsData, velocityData]) => {
        setSummary(summaryData)
        setAlerts(alertsData)
        setVelocity(velocityData)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const adherenceRate = parseFloat(summary?.overall.variance.adherenceRate || '0')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Workforce Monitoring</h1>
        <p className="mt-1 text-slate-500">Plan vs Actual tracking and deviation alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Plan Adherence"
          value={`${adherenceRate}%`}
          subtitle={adherenceRate >= 90 ? 'On track' : adherenceRate >= 70 ? 'At risk' : 'Behind'}
          color={adherenceRate >= 90 ? 'emerald' : adherenceRate >= 70 ? 'amber' : 'rose'}
        />
        <SummaryCard
          title="Headcount Variance"
          value={summary?.overall.variance.headcount?.toString() || '0'}
          subtitle={`${summary?.overall.variance.headcountPercent || '0'}% from plan`}
          color="indigo"
        />
        <SummaryCard
          title="Hiring Velocity"
          value={`${velocity?.velocity.rate || '0'}%`}
          subtitle={velocity?.velocity.status === 'ON_TRACK' ? 'On track' : velocity?.velocity.status === 'AT_RISK' ? 'At risk' : 'Behind'}
          color={velocity?.velocity.status === 'ON_TRACK' ? 'emerald' : velocity?.velocity.status === 'AT_RISK' ? 'amber' : 'rose'}
        />
        <SummaryCard
          title="Critical Alerts"
          value={alerts?.summary.high.toString() || '0'}
          subtitle={`${alerts?.summary.total || 0} total alerts`}
          color="rose"
        />
      </div>

      {/* Alerts Section */}
      {alerts && alerts.alerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Critical Deviations</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="px-6 py-4 flex items-start gap-4">
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full ${
                    alert.severity === 'HIGH'
                      ? 'bg-rose-500'
                      : alert.severity === 'MEDIUM'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{alert.departmentName}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        alert.severity === 'HIGH'
                          ? 'bg-rose-100 text-rose-700'
                          : alert.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                </div>
                <AlertTypeIcon type={alert.type} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quarterly Progress */}
      {velocity && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Quarterly Hiring Progress</h2>
          <div className="grid grid-cols-4 gap-4">
            {(['q1', 'q2', 'q3', 'q4'] as const).map((q) => {
              const data = velocity.quarterly[q]
              const progress = data.planned > 0 ? (data.actual / data.planned) * 100 : 0
              return (
                <div key={q} className="text-center">
                  <div className="text-sm font-medium text-slate-500 uppercase mb-2">{q}</div>
                  <div className="relative h-32 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={`absolute bottom-0 left-0 right-0 ${
                        progress >= 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ height: `${Math.min(progress, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-slate-900">{data.actual}</span>
                      <span className="text-sm text-slate-500">/{data.planned}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {progress.toFixed(0)}% complete
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      {summary && summary.byDepartment.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Department Breakdown</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Department
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                  Planned HC
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                  Actual HC
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                  Variance
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                  Adherence
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Payroll Impact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {summary.byDepartment.map((dept) => {
                const adherence = parseFloat(dept.variance.adherenceRate)
                return (
                  <tr key={dept.departmentId} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                      {dept.departmentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600">
                      {dept.planned.endHeadcount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-slate-900 font-medium">
                      {dept.actual.headcount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`font-medium ${
                          dept.variance.headcount > 0
                            ? 'text-emerald-600'
                            : dept.variance.headcount < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {dept.variance.headcount > 0 ? '+' : ''}
                        {dept.variance.headcount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          adherence >= 90
                            ? 'bg-emerald-100 text-emerald-700'
                            : adherence >= 70
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {dept.variance.adherenceRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900">
                      {formatCurrency(dept.planned.payrollImpact)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
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
  color: 'emerald' | 'amber' | 'rose' | 'indigo'
}) {
  const bgColors = {
    emerald: 'from-emerald-50 to-teal-50',
    amber: 'from-amber-50 to-orange-50',
    rose: 'from-rose-50 to-pink-50',
    indigo: 'from-indigo-50 to-blue-50',
  }

  return (
    <div className={`card p-6 bg-gradient-to-br ${bgColors[color]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function AlertTypeIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    HEADCOUNT_VARIANCE: (
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    BUDGET_OVERRUN: (
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    HIRING_DELAY: (
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    EXIT_SPIKE: (
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
      </svg>
    ),
  }

  return icons[type] || null
}
