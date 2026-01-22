'use client'

import { formatCurrency } from '@/lib/utils'

interface BudgetIndicatorProps {
  budgetData: {
    budget: {
      hiringBudget: number
      hasBudgetAllocation: boolean
    }
    payroll: {
      newHiresPayroll: number
    }
    variance: {
      amount: number
      percent: number
      status: 'UNDER' | 'ON_TRACK' | 'OVER'
    }
  } | null
  loading?: boolean
}

export function BudgetIndicator({ budgetData, loading = false }: BudgetIndicatorProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg animate-pulse">
        <div className="h-4 w-20 bg-slate-200 rounded" />
        <div className="h-4 w-16 bg-slate-200 rounded" />
      </div>
    )
  }

  if (!budgetData || !budgetData.budget.hasBudgetAllocation) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-500">
        <AlertIcon className="w-4 h-4" />
        <span>No budget allocated</span>
      </div>
    )
  }

  const { budget, payroll, variance } = budgetData

  const statusColors = {
    UNDER: 'bg-amber-100 text-amber-700 border-amber-200',
    ON_TRACK: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    OVER: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  const statusIcons = {
    UNDER: <TrendingDownIcon className="w-4 h-4" />,
    ON_TRACK: <CheckIcon className="w-4 h-4" />,
    OVER: <AlertIcon className="w-4 h-4" />,
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${statusColors[variance.status]}`}>
      {statusIcons[variance.status]}
      <div className="text-sm">
        <span className="font-medium">{formatCurrency(payroll.newHiresPayroll)}</span>
        <span className="mx-1">/</span>
        <span>{formatCurrency(budget.hiringBudget)}</span>
      </div>
      <div className="text-xs">
        {variance.status === 'OVER' ? (
          <span className="font-medium">{formatCurrency(Math.abs(variance.amount))} over</span>
        ) : variance.status === 'UNDER' ? (
          <span>{formatCurrency(variance.amount)} remaining</span>
        ) : (
          <span>On track</span>
        )}
      </div>
    </div>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function TrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  )
}
