'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCyclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    totalBudget: '',
    requireDeptApproval: true,
    requireBUApproval: true,
    requireFinalApproval: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create cycle')
      }

      router.push('/cycles')
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
          href="/cycles"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Cycles
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Planning Cycle</h1>
        <p className="mt-1 text-slate-500">Create a new budget planning cycle</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cycle Name *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., FY 2025, H1 2025"
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
            <option value="ANNUAL">Annual</option>
            <option value="HALF_YEARLY">Half-Yearly</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              className="input w-full"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              required
              className="input w-full"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Total Budget
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full pl-7"
              placeholder="0.00"
              value={formData.totalBudget}
              onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Approval Workflow</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.requireDeptApproval}
                onChange={(e) => setFormData({ ...formData, requireDeptApproval: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Require Department Head Approval</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.requireBUApproval}
                onChange={(e) => setFormData({ ...formData, requireBUApproval: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Require Business Unit Approval</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.requireFinalApproval}
                onChange={(e) => setFormData({ ...formData, requireFinalApproval: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Require Final Approval</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Cycle'}
          </button>
          <Link href="/cycles" className="btn flex-1 text-center">
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
