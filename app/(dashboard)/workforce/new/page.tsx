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

export default function NewWorkforcePlanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cycles, setCycles] = useState<Cycle[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [formData, setFormData] = useState({
    cycleId: '',
    departmentId: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/cycles').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
    ])
      .then(([cyclesData, depsData]) => {
        const cyclesList = Array.isArray(cyclesData) ? cyclesData : cyclesData.data || []
        const depsList = Array.isArray(depsData) ? depsData : depsData.data || []
        setCycles(cyclesList)
        setDepartments(depsList)

        // Set default cycle if available
        const activeCycle = cyclesList.find(
          (c: Cycle) => c.status === 'ACTIVE' || c.status === 'ALLOCATION'
        )
        if (activeCycle) {
          setFormData((prev) => ({ ...prev, cycleId: activeCycle.id }))
        }
      })
      .catch(() => {
        setError('Failed to load options')
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/workforce-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create workforce plan')
      }

      const newPlan = await res.json()
      router.push(`/workforce/${newPlan.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workforce plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/workforce" className="hover:text-emerald-600">
            Workforce Planning
          </Link>
          <span>/</span>
          <span>New Plan</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Create Workforce Plan</h1>
        <p className="mt-1 text-slate-500">
          Start planning headcount for a department
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Planning Cycle <span className="text-rose-500">*</span>
          </label>
          <select
            className="input w-full"
            value={formData.cycleId}
            onChange={(e) => setFormData({ ...formData, cycleId: e.target.value })}
            required
          >
            <option value="">Select a cycle...</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Department <span className="text-rose-500">*</span>
          </label>
          <select
            className="input w-full"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            required
          >
            <option value="">Select a department...</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            className="input w-full"
            rows={3}
            placeholder="Any initial notes or context for this plan..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link href="/workforce" className="btn">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  )
}
