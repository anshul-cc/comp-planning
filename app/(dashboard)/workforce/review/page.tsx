'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PlanSummary {
  id: string
  cycleId: string
  cycleName: string
  departmentId: string
  departmentName: string
  departmentHead?: { id: string; name: string; email: string }
  status: string
  submittedAt?: string
  stats: {
    currentHeadcount: number
    totalHires: number
    netChange: number
    totalPayrollImpact: number
  }
  latestApproval?: {
    status: string
    approver: { id: string; name: string; email: string }
    comments?: string
    updatedAt: string
  }
}

interface Summary {
  pending: number
  approved: number
  rejected: number
}

export default function FinanceReviewPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [summary, setSummary] = useState<Summary>({ pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState('SUBMITTED')
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = () => {
    setLoading(true)
    setError(null)
    fetch(`/api/workforce-review?status=${filter}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setPlans(data.data || [])
        setSummary(data.summary || { pending: 0, approved: 0, rejected: 0 })
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading plans:', err)
        setError('Failed to load plans. Please try again.')
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchPlans()
  }, [filter])

  const handleApprove = async (planId: string) => {
    setActionLoading(planId)
    try {
      const res = await fetch(`/api/workforce-review/${planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: 'Approved' }),
      })

      if (res.ok) {
        fetchPlans()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve')
      }
    } catch {
      alert('Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (planId: string) => {
    const comments = prompt('Please provide a reason for rejection:')
    if (!comments) return

    setActionLoading(planId)
    try {
      const res = await fetch(`/api/workforce-review/${planId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      })

      if (res.ok) {
        fetchPlans()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject')
      }
    } catch {
      alert('Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRequestRevision = async (planId: string) => {
    const comments = prompt('Please specify what needs to be revised:')
    if (!comments) return

    setActionLoading(planId)
    try {
      const res = await fetch(`/api/workforce-review/${planId}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      })

      if (res.ok) {
        fetchPlans()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to request revision')
      }
    } catch {
      alert('Failed to request revision')
    } finally {
      setActionLoading(null)
    }
  }

  const totalBudget = plans.reduce((sum, p) => sum + p.stats.totalPayrollImpact, 0)
  const totalHires = plans.reduce((sum, p) => sum + p.stats.totalHires, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Finance Review</h1>
          <p className="mt-1 text-slate-500">Review and approve workforce plans</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Pending Review"
          value={summary.pending.toString()}
          subtitle="Awaiting decision"
          color="amber"
        />
        <SummaryCard
          title="Approved"
          value={summary.approved.toString()}
          subtitle="This cycle"
          color="emerald"
        />
        <SummaryCard
          title="Total Planned Hires"
          value={totalHires.toString()}
          subtitle="Across pending plans"
          color="indigo"
        />
        <SummaryCard
          title="Total Budget Impact"
          value={formatCurrency(totalBudget)}
          subtitle="Pending approval"
          color="purple"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['SUBMITTED', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Plans Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600">{error}</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  HC Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Payroll Impact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{plan.departmentName}</div>
                    <div className="text-sm text-slate-500">
                      {plan.departmentHead?.name || 'No head'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {plan.submittedAt ? formatDate(new Date(plan.submittedAt)) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        plan.stats.netChange > 0
                          ? 'text-emerald-600'
                          : plan.stats.netChange < 0
                          ? 'text-rose-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {plan.stats.netChange > 0 ? '+' : ''}
                      {plan.stats.netChange}
                    </span>
                    <span className="text-sm text-slate-400 ml-1">
                      ({plan.stats.totalHires} hires)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {formatCurrency(plan.stats.totalPayrollImpact)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={plan.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/workforce/${plan.id}`}
                        className="text-sm text-slate-600 hover:text-emerald-600"
                      >
                        View
                      </Link>
                      {plan.status === 'SUBMITTED' && (
                        <>
                          <button
                            onClick={() => handleApprove(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRequestRevision(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="text-sm text-amber-600 hover:text-amber-700 disabled:opacity-50"
                          >
                            Revise
                          </button>
                          <button
                            onClick={() => handleReject(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="text-sm text-rose-600 hover:text-rose-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && plans.length === 0 && (
          <div className="p-12 text-center">
            <DocumentIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No plans to review</h3>
            <p className="mt-2 text-slate-500">
              {filter === 'SUBMITTED'
                ? 'No workforce plans are pending review.'
                : `No ${filter.toLowerCase()} plans found.`}
            </p>
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
  color: 'amber' | 'emerald' | 'indigo' | 'purple'
}) {
  const bgColors = {
    amber: 'from-amber-50 to-orange-50',
    emerald: 'from-emerald-50 to-teal-50',
    indigo: 'from-indigo-50 to-blue-50',
    purple: 'from-purple-50 to-fuchsia-50',
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
    SUBMITTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
