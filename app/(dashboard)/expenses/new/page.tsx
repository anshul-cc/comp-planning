'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface PlanningCycle {
  id: string
  name: string
  status: string
}

interface CostCenter {
  id: string
  code: string
  name: string
  type: string
}

const EXPENSE_CATEGORIES = [
  { value: 'SALARY', label: 'Salary' },
  { value: 'BENEFITS', label: 'Benefits' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'RECRUITMENT', label: 'Recruitment' },
  { value: 'OTHER', label: 'Other' },
]

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export default function NewExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cycles, setCycles] = useState<PlanningCycle[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])

  const currentMonth = new Date().getMonth() + 1

  const [formData, setFormData] = useState({
    cycleId: '',
    costCenterId: '',
    category: 'SALARY',
    description: '',
    amount: '',
    month: currentMonth.toString(),
    isActual: true,
  })

  useEffect(() => {
    const fetchOptions = { credentials: 'include' as RequestCredentials }
    Promise.all([
      fetch('/api/cycles', fetchOptions).then(res => res.json()),
      fetch('/api/cost-centers', fetchOptions).then(res => res.json()),
    ]).then(([cyclesData, costCentersData]) => {
      const cyclesList = Array.isArray(cyclesData) ? cyclesData : cyclesData.data || []
      setCycles(cyclesList)
      setCostCenters(Array.isArray(costCentersData) ? costCentersData : costCentersData.data || [])

      // Auto-select active cycle if available
      const activeCycle = cyclesList.find((c: PlanningCycle) => c.status === 'ACTIVE')
      if (activeCycle) {
        setFormData(prev => ({ ...prev, cycleId: activeCycle.id }))
      }
    }).catch(err => {
      console.error('Error fetching data:', err)
      setError('Failed to load form data. Please refresh the page.')
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          month: parseInt(formData.month),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to record expense')
      }

      router.push('/expenses')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedCostCenter = costCenters.find(cc => cc.id === formData.costCenterId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/expenses"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Expenses
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Record Expense</h1>
        <p className="mt-1 text-slate-500">Track OPEX spending by cost center</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Planning Cycle *
          </label>
          <select
            required
            className="input w-full"
            value={formData.cycleId}
            onChange={(e) => setFormData({ ...formData, cycleId: e.target.value })}
          >
            <option value="">Select a cycle</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cost Center *
          </label>
          <select
            required
            className="input w-full"
            value={formData.costCenterId}
            onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
          >
            <option value="">Select a cost center</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name} ({cc.code}) - {cc.type}
              </option>
            ))}
          </select>
          {selectedCostCenter && (
            <p className="mt-1 text-sm text-slate-500">
              Type: {selectedCostCenter.type}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category *
            </label>
            <select
              required
              className="input w-full"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Month *
            </label>
            <select
              required
              className="input w-full"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., Q1 salary payments, Training workshop"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              className="input w-full pl-7"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="isActual"
              name="expenseType"
              className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
              checked={formData.isActual}
              onChange={() => setFormData({ ...formData, isActual: true })}
            />
            <label htmlFor="isActual" className="text-sm text-slate-700">
              Actual Expense
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="isForecast"
              name="expenseType"
              className="h-4 w-4 text-amber-600 border-slate-300 focus:ring-amber-500"
              checked={!formData.isActual}
              onChange={() => setFormData({ ...formData, isActual: false })}
            />
            <label htmlFor="isForecast" className="text-sm text-slate-700">
              Forecast / Projected
            </label>
          </div>
        </div>

        {/* Summary */}
        {formData.amount && (
          <div className="border-t pt-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {formData.isActual ? 'Actual Expense' : 'Forecasted Expense'}
                  </span>
                  <p className="text-xs text-slate-500">
                    {EXPENSE_CATEGORIES.find(c => c.value === formData.category)?.label} - {MONTHS.find(m => m.value === parseInt(formData.month))?.label}
                  </p>
                </div>
                <span className={`text-2xl font-bold ${formData.isActual ? 'text-slate-900' : 'text-amber-600'}`}>
                  {formatCurrency(parseFloat(formData.amount) || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Recording...' : 'Record Expense'}
          </button>
          <Link href="/expenses" className="btn-secondary flex-1 text-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}
