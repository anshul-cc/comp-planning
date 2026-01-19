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

export default function NewBudgetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [formData, setFormData] = useState({
    cycleId: '',
    departmentId: '',
    salaryFixed: '',
    salaryVariable: '',
    benefitsEmployee: '',
    benefitsEmployer: '',
    newHiringBudget: '',
    notes: '',
  })

  useEffect(() => {
    // Fetch cycles and departments
    Promise.all([
      fetch('/api/cycles').then(res => res.json()),
      fetch('/api/departments').then(res => res.json()),
    ]).then(([cyclesData, departmentsData]) => {
      setCycles(cyclesData)
      setDepartments(departmentsData)
    })
  }, [])

  const totalBudget =
    (parseFloat(formData.salaryFixed) || 0) +
    (parseFloat(formData.salaryVariable) || 0) +
    (parseFloat(formData.benefitsEmployee) || 0) +
    (parseFloat(formData.benefitsEmployer) || 0) +
    (parseFloat(formData.newHiringBudget) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalBudget,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create allocation')
      }

      router.push('/budgets')
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
          href="/budgets"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Budget Allocations
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Budget Allocation</h1>
        <p className="mt-1 text-slate-500">Create a new budget allocation for a department</p>
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

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Salary Budget</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fixed Salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.salaryFixed}
                  onChange={(e) => setFormData({ ...formData, salaryFixed: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Variable Salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.salaryVariable}
                  onChange={(e) => setFormData({ ...formData, salaryVariable: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Benefits Budget</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Employee Benefits</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.benefitsEmployee}
                  onChange={(e) => setFormData({ ...formData, benefitsEmployee: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Employer Benefits</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full pl-7"
                  placeholder="0.00"
                  value={formData.benefitsEmployer}
                  onChange={(e) => setFormData({ ...formData, benefitsEmployer: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Hiring Budget</h3>
          <div>
            <label className="block text-sm text-slate-600 mb-1">New Hiring Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input w-full pl-7"
                placeholder="0.00"
                value={formData.newHiringBudget}
                onChange={(e) => setFormData({ ...formData, newHiringBudget: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Total Budget</span>
              <span className="text-2xl font-bold text-slate-900">
                ${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
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
            {loading ? 'Creating...' : 'Create Allocation'}
          </button>
          <Link href="/budgets" className="btn flex-1 text-center">
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
