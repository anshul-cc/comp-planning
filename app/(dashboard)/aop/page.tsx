'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface FiscalYear {
  id: string
  year: number
  name: string
  status: string
  startDate: string
  endDate: string
}

interface Department {
  id: string
  name: string
  code: string
}

interface AnnualPlan {
  id: string
  fiscalYearId: string
  departmentId: string
  totalBudget: number
  status: string
  notes: string | null
  fiscalYear: FiscalYear
  department: Department
  allocations: { amount: number }[]
  createdAt: string
}

export default function AOPPage() {
  const [annualPlans, setAnnualPlans] = useState<AnnualPlan[]>([])
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showFYForm, setShowFYForm] = useState(false)
  const [selectedYear, setSelectedYear] = useState('')
  const [form, setForm] = useState({
    fiscalYearId: '',
    departmentId: '',
    totalBudget: '',
    notes: '',
  })
  const [fyForm, setFYForm] = useState({
    year: new Date().getFullYear().toString(),
    name: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/aop').then((r) => r.json()),
      fetch('/api/fiscal-years').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
    ]).then(([plans, years, depts]) => {
      setAnnualPlans(plans)
      setFiscalYears(years)
      setDepartments(depts)
      setLoading(false)
    })
  }, [])

  const fetchPlans = async () => {
    const res = await fetch('/api/aop')
    const data = await res.json()
    setAnnualPlans(data)
  }

  const fetchFiscalYears = async () => {
    const res = await fetch('/api/fiscal-years')
    const data = await res.json()
    setFiscalYears(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/aop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setShowForm(false)
      setForm({ fiscalYearId: '', departmentId: '', totalBudget: '', notes: '' })
      fetchPlans()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const handleFYSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/fiscal-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fyForm),
    })

    if (res.ok) {
      setShowFYForm(false)
      setFYForm({
        year: new Date().getFullYear().toString(),
        name: '',
        startDate: '',
        endDate: '',
      })
      fetchFiscalYears()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AOP?')) return

    const res = await fetch(`/api/aop/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchPlans()
    }
  }

  const filteredPlans = selectedYear
    ? annualPlans.filter((p) => p.fiscalYearId === selectedYear)
    : annualPlans

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AOP Planning</h1>
          <p className="mt-1 text-sm text-gray-500">
            Annual Operating Plan management
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFYForm(true)}
            className="btn-secondary"
          >
            New Fiscal Year
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Create AOP
          </button>
        </div>
      </div>

      {showFYForm && (
        <div className="card p-6">
          <h2 className="text-lg font-medium mb-4">New Fiscal Year</h2>
          <form onSubmit={handleFYSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <input
                  type="number"
                  value={fyForm.year}
                  onChange={(e) => setFYForm({ ...fyForm, year: e.target.value })}
                  className="input mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={fyForm.name}
                  onChange={(e) => setFYForm({ ...fyForm, name: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g., FY 2025"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={fyForm.startDate}
                  onChange={(e) => setFYForm({ ...fyForm, startDate: e.target.value })}
                  className="input mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  value={fyForm.endDate}
                  onChange={(e) => setFYForm({ ...fyForm, endDate: e.target.value })}
                  className="input mt-1"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowFYForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-medium mb-4">Create AOP</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fiscal Year
                </label>
                <select
                  value={form.fiscalYearId}
                  onChange={(e) => setForm({ ...form, fiscalYearId: e.target.value })}
                  className="input mt-1"
                  required
                >
                  <option value="">Select fiscal year</option>
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {fy.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="input mt-1"
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Budget
                </label>
                <input
                  type="number"
                  value={form.totalBudget}
                  onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                  className="input mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="input w-64"
        >
          <option value="">All Fiscal Years</option>
          {fiscalYears.map((fy) => (
            <option key={fy.id} value={fy.id}>
              {fy.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6">
        {filteredPlans.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            No AOPs created yet. Create a fiscal year and AOP to get started.
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const allocated = plan.allocations.reduce((sum, a) => sum + a.amount, 0)
            const utilization = plan.totalBudget > 0 ? (allocated / plan.totalBudget) * 100 : 0

            return (
              <div key={plan.id} className="card p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium">{plan.department.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(plan.status)}`}>
                        {plan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.fiscalYear.name} • Created {formatDate(plan.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/budgets?planId=${plan.id}`}
                      className="btn-primary text-sm"
                    >
                      Manage Allocations
                    </Link>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="btn-danger text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Budget</p>
                    <p className="text-xl font-semibold">{formatCurrency(plan.totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Allocated</p>
                    <p className="text-xl font-semibold">{formatCurrency(allocated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-xl font-semibold">{formatCurrency(plan.totalBudget - allocated)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Utilization</span>
                    <span className="font-medium">{utilization.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
