'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export default function NewPayGradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: '',
    band: '1',
    minSalary: '',
    midSalary: '',
    maxSalary: '',
    currencyCode: 'USD',
    status: 'DRAFT',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate salary range
    const min = parseFloat(formData.minSalary)
    const mid = parseFloat(formData.midSalary)
    const max = parseFloat(formData.maxSalary)

    if (min >= mid || mid >= max) {
      setError('Salary range must be: Min < Mid < Max')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/pay-grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          level: parseInt(formData.level),
          band: parseInt(formData.band),
          minSalary: min,
          midSalary: mid,
          maxSalary: max,
          notes: formData.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create pay grade')
      }

      router.push('/pay-grades')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Auto-calculate midpoint when min/max change
  const handleSalaryChange = (field: 'minSalary' | 'maxSalary', value: string) => {
    const newData = { ...formData, [field]: value }

    const min = parseFloat(field === 'minSalary' ? value : formData.minSalary)
    const max = parseFloat(field === 'maxSalary' ? value : formData.maxSalary)

    if (!isNaN(min) && !isNaN(max) && min < max) {
      newData.midSalary = ((min + max) / 2).toFixed(2)
    }

    setFormData(newData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/pay-grades"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Pay Grades
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Pay Grade</h1>
        <p className="mt-1 text-slate-500">Define a new salary band for your organization</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Grade Code *
            </label>
            <input
              type="text"
              required
              className="input w-full"
              placeholder="e.g., A, B, C"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Grade Name *
            </label>
            <input
              type="text"
              required
              className="input w-full"
              placeholder="e.g., Senior Band, L5"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Level *
            </label>
            <input
              type="number"
              required
              min="1"
              className="input w-full"
              placeholder="e.g., 1, 2, 3"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">Unique numeric level for sorting</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Band
            </label>
            <select
              className="input w-full"
              value={formData.band}
              onChange={(e) => setFormData({ ...formData, band: e.target.value })}
            >
              <option value="1">Band 1</option>
              <option value="2">Band 2</option>
              <option value="3">Band 3</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">Sub-band within the grade</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Salary Range</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Minimum *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.minSalary}
                  onChange={(e) => handleSalaryChange('minSalary', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Midpoint *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.midSalary}
                  onChange={(e) => setFormData({ ...formData, midSalary: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Maximum *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.maxSalary}
                  onChange={(e) => handleSalaryChange('maxSalary', e.target.value)}
                />
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Midpoint is auto-calculated as the average of min and max
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Currency
            </label>
            <select
              className="input w-full"
              value={formData.currencyCode}
              onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="INR">INR - Indian Rupee</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              className="input w-full"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            className="input w-full"
            rows={3}
            placeholder="Optional notes about this pay grade..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {/* Preview */}
        {formData.minSalary && formData.maxSalary && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Min: {formatCurrency(parseFloat(formData.minSalary) || 0)}</span>
                <span>Mid: {formatCurrency(parseFloat(formData.midSalary) || 0)}</span>
                <span>Max: {formatCurrency(parseFloat(formData.maxSalary) || 0)}</span>
              </div>
              <div className="relative h-6 bg-slate-200 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-600"
                  style={{ left: '50%' }}
                />
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
            {loading ? 'Creating...' : 'Create Pay Grade'}
          </button>
          <Link href="/pay-grades" className="btn-secondary flex-1 text-center">
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
