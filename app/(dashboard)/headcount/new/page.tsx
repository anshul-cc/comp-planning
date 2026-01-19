'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Cycle {
  id: string
  name: string
  status: string
}

interface Department {
  id: string
  name: string
  code: string
}

export default function NewHeadcountPlanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [formData, setFormData] = useState({
    cycleId: '',
    departmentId: '',
    plannedHeadcount: '',
    wageBudget: '',
    avgHiringCost: '',
    avgHiringCostFixed: '',
    avgHiringCostVariable: '',
    avgHiringCostBenefits: '',
    notes: '',
  })

  useEffect(() => {
    // Fetch cycles and departments
    Promise.all([
      fetch('/api/cycles').then(res => {
        if (!res.ok) throw new Error('Failed to fetch cycles')
        return res.json()
      }),
      fetch('/api/departments').then(res => {
        if (!res.ok) throw new Error('Failed to fetch departments')
        return res.json()
      }),
    ]).then(([cyclesData, departmentsData]) => {
      setCycles(Array.isArray(cyclesData) ? cyclesData : [])
      setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
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
      const res = await fetch('/api/headcount-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create headcount plan')
      }

      router.push('/headcount')
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
          href="/headcount"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Headcount Plans
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Headcount Plan</h1>
        <p className="mt-1 text-slate-500">Create a new headcount plan for a department</p>
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
            Department *
          </label>
          <select
            required
            className="input w-full"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
          >
            <option value="">Select a department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Planned Headcount *
            </label>
            <input
              type="number"
              required
              min="0"
              className="input w-full"
              placeholder="0"
              value={formData.plannedHeadcount}
              onChange={(e) => setFormData({ ...formData, plannedHeadcount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Wage Budget *
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
                value={formData.wageBudget}
                onChange={(e) => setFormData({ ...formData, wageBudget: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Average Hiring Cost (Optional)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Total Average Cost per Hire</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.avgHiringCost}
                  onChange={(e) => setFormData({ ...formData, avgHiringCost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Fixed Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input w-full pl-7"
                    placeholder="0.00"
                    value={formData.avgHiringCostFixed}
                    onChange={(e) => setFormData({ ...formData, avgHiringCostFixed: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Variable Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input w-full pl-7"
                    placeholder="0.00"
                    value={formData.avgHiringCostVariable}
                    onChange={(e) => setFormData({ ...formData, avgHiringCostVariable: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Benefits Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input w-full pl-7"
                    placeholder="0.00"
                    value={formData.avgHiringCostBenefits}
                    onChange={(e) => setFormData({ ...formData, avgHiringCostBenefits: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            className="input w-full"
            rows={3}
            placeholder="Optional notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Plan'}
          </button>
          <Link href="/headcount" className="btn flex-1 text-center">
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
