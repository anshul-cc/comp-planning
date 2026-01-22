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

export default function NewCompensationCyclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planningCycles, setPlanningCycles] = useState<PlanningCycle[]>([])

  const [formData, setFormData] = useState({
    cycleId: '',
    name: '',
    type: 'ANNUAL_REVIEW',
    budgetAmount: '',
    effectiveDate: '',
    startDate: '',
    endDate: '',
    enableSalaryRevision: true,
    enableBonus: false,
    enablePromotion: false,
  })

  useEffect(() => {
    const fetchOptions = { credentials: 'include' as RequestCredentials }
    fetch('/api/cycles', fetchOptions)
      .then(res => res.json())
      .then(data => {
        setPlanningCycles(Array.isArray(data) ? data : data.data || [])
      })
      .catch(err => {
        console.error('Error fetching cycles:', err)
        setError('Failed to load planning cycles. Please refresh the page.')
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/compensation-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          budgetAmount: parseFloat(formData.budgetAmount),
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create compensation cycle')
      }

      router.push('/compensation')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/compensation"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Compensation Cycles
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Compensation Cycle</h1>
        <p className="mt-1 text-slate-500">Create a new salary revision, bonus, or promotion cycle</p>
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
            <option value="">Select a planning cycle</option>
            {planningCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cycle Name *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., Annual Review 2025, Q1 Bonus"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cycle Type *
          </label>
          <select
            required
            className="input w-full"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="ANNUAL_REVIEW">Annual Review</option>
            <option value="MID_YEAR_REVIEW">Mid-Year Review</option>
            <option value="BONUS">Bonus Cycle</option>
            <option value="PROMOTION">Promotion Cycle</option>
            <option value="MARKET_ADJUSTMENT">Market Adjustment</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Budget Amount *
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
              value={formData.budgetAmount}
              onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">Total budget allocated for this compensation cycle</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Effective Date *
          </label>
          <input
            type="date"
            required
            className="input w-full"
            value={formData.effectiveDate}
            onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
          />
          <p className="mt-1 text-sm text-slate-500">Date when compensation changes take effect</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="input w-full"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">When submissions open</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="input w-full"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">When submissions close</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Enabled Features</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enableSalaryRevision"
                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                checked={formData.enableSalaryRevision}
                onChange={(e) => setFormData({ ...formData, enableSalaryRevision: e.target.checked })}
              />
              <label htmlFor="enableSalaryRevision" className="text-sm text-slate-700">
                Enable Salary Revision
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enableBonus"
                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                checked={formData.enableBonus}
                onChange={(e) => setFormData({ ...formData, enableBonus: e.target.checked })}
              />
              <label htmlFor="enableBonus" className="text-sm text-slate-700">
                Enable Bonus Payments
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enablePromotion"
                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                checked={formData.enablePromotion}
                onChange={(e) => setFormData({ ...formData, enablePromotion: e.target.checked })}
              />
              <label htmlFor="enablePromotion" className="text-sm text-slate-700">
                Enable Promotions
              </label>
            </div>
          </div>
        </div>

        {/* Budget Summary */}
        {formData.budgetAmount && (
          <div className="border-t pt-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Total Budget</span>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(parseFloat(formData.budgetAmount) || 0)}
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
            {loading ? 'Creating...' : 'Create Cycle'}
          </button>
          <Link href="/compensation" className="btn-secondary flex-1 text-center">
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
