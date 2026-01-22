'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Department {
  id: string
  name: string
  code: string
}

interface Role {
  id: string
  name: string
  code: string
  payGrade?: {
    minSalary: number
    maxSalary: number
  }
}

interface Cycle {
  id: string
  name: string
  status: string
}

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

export default function NewHiringProposalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])

  const [formData, setFormData] = useState({
    cycleId: '',
    departmentId: '',
    roleId: '',
    positionTitle: '',
    quantity: '1',
    proposedSalary: '',
    startMonth: new Date().getMonth() + 1,
    justification: '',
  })

  useEffect(() => {
    const fetchOptions = { credentials: 'include' as RequestCredentials }
    Promise.all([
      fetch('/api/cycles', fetchOptions).then(r => r.json()),
      fetch('/api/departments', fetchOptions).then(r => r.json()),
      fetch('/api/roles', fetchOptions).then(r => r.json()),
    ]).then(([cyclesData, deptData, rolesData]) => {
      const cyclesList = Array.isArray(cyclesData) ? cyclesData : cyclesData.data || []
      setCycles(cyclesList)
      setDepartments(Array.isArray(deptData) ? deptData : deptData.data || [])
      setRoles(Array.isArray(rolesData) ? rolesData : rolesData.data || [])

      // Auto-select active cycle
      const activeCycle = cyclesList.find((c: Cycle) => c.status === 'ACTIVE')
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
      const res = await fetch('/api/hiring-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          proposedSalary: parseFloat(formData.proposedSalary),
          roleId: formData.roleId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create proposal')
      }

      router.push('/hiring')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedRole = roles.find(r => r.id === formData.roleId)
  const filteredRoles = formData.departmentId
    ? roles.filter(r => (r as Role & { departmentId?: string }).departmentId === formData.departmentId)
    : roles

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/hiring"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Hiring Proposals
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Hiring Proposal</h1>
        <p className="mt-1 text-slate-500">Request approval for a new hire</p>
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
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, roleId: '' })}
          >
            <option value="">Select a department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Position Title *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., Senior Software Engineer"
            value={formData.positionTitle}
            onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role (Optional)
          </label>
          <select
            className="input w-full"
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
          >
            <option value="">Select a role (or leave for custom position)</option>
            {filteredRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.code})
              </option>
            ))}
          </select>
          {selectedRole?.payGrade && (
            <p className="mt-1 text-sm text-slate-500">
              Pay grade range: {formatCurrency(selectedRole.payGrade.minSalary)} - {formatCurrency(selectedRole.payGrade.maxSalary)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Number of Positions *
            </label>
            <input
              type="number"
              required
              min="1"
              className="input w-full"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Month *
            </label>
            <select
              required
              className="input w-full"
              value={formData.startMonth}
              onChange={(e) => setFormData({ ...formData, startMonth: parseInt(e.target.value) })}
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
            Proposed Salary (per position) *
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
              value={formData.proposedSalary}
              onChange={(e) => setFormData({ ...formData, proposedSalary: e.target.value })}
            />
          </div>
          {selectedRole?.payGrade && formData.proposedSalary && (
            <div className="mt-1">
              {parseFloat(formData.proposedSalary) < selectedRole.payGrade.minSalary && (
                <p className="text-sm text-amber-600">Below pay grade minimum</p>
              )}
              {parseFloat(formData.proposedSalary) > selectedRole.payGrade.maxSalary && (
                <p className="text-sm text-rose-600">Above pay grade maximum</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Justification *
          </label>
          <textarea
            required
            className="input w-full"
            rows={4}
            placeholder="Explain why this position is needed..."
            value={formData.justification}
            onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
          />
        </div>

        {/* Summary */}
        {formData.proposedSalary && formData.quantity && (
          <div className="border-t pt-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-slate-700">Total Annual Cost</span>
                  <p className="text-xs text-slate-500">
                    {formData.quantity} position{parseInt(formData.quantity) > 1 ? 's' : ''} × {formatCurrency(parseFloat(formData.proposedSalary) || 0)}
                  </p>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency((parseFloat(formData.proposedSalary) || 0) * (parseInt(formData.quantity) || 1))}
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
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
          <Link href="/hiring" className="btn-secondary flex-1 text-center">
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
