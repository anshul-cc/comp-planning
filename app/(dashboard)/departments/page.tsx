'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CostCenter {
  id: string
  code: string
  name: string
  type: string
}

interface Department {
  id: string
  name: string
  code: string
  parentId: string | null
  costCenterId: string | null
  location: string | null
  parent?: Department | null
  children?: Department[]
  costCenter?: CostCenter | null
  manager?: { id: string; name: string; email: string } | null
  _count?: { employees: number; roles: number }
  createdAt: string
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', code: '', parentId: '', costCenterId: '', location: '' })

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchCostCenters()])
  }, [])

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments')
    const data = await res.json()
    setDepartments(data)
    setLoading(false)
  }

  const fetchCostCenters = async () => {
    const res = await fetch('/api/cost-centers')
    if (res.ok) {
      const data = await res.json()
      setCostCenters(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/departments/${editingId}` : '/api/departments'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', code: '', parentId: '', costCenterId: '', location: '' })
      fetchDepartments()
    }
  }

  const handleEdit = (dept: Department) => {
    setForm({
      name: dept.name,
      code: dept.code,
      parentId: dept.parentId || '',
      costCenterId: dept.costCenterId || '',
      location: dept.location || '',
    })
    setEditingId(dept.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchDepartments()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const getRootDepartments = () => departments.filter((d) => !d.parentId)

  const renderDepartmentTree = (dept: Department, level = 0) => {
    const children = departments.filter((d) => d.parentId === dept.id)
    return (
      <div key={dept.id}>
        <div
          className={`flex items-center justify-between py-4 px-4 hover:bg-slate-50 transition-colors ${
            level > 0 ? 'border-l-2 border-slate-200' : ''
          }`}
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {dept.code.slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{dept.name}</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {dept.code}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <UsersIcon className="h-3.5 w-3.5" />
                  {dept._count?.employees || 0} employees
                </span>
                <span className="flex items-center gap-1">
                  <BriefcaseIcon className="h-3.5 w-3.5" />
                  {dept._count?.roles || 0} roles
                </span>
                {dept.location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="h-3.5 w-3.5" />
                    {dept.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {dept.costCenter && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Cost Center</p>
                  <p className="text-sm font-medium text-slate-700">{dept.costCenter.code}</p>
                </div>
              )}
              {dept.manager && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Manager</p>
                  <p className="text-sm font-medium text-slate-700">{dept.manager.name}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => handleEdit(dept)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(dept.id)}
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Delete
            </button>
          </div>
        </div>
        {children.map((child) => renderDepartmentTree(child, level + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
          <p className="mt-1 text-slate-500">
            Manage organizational structure and cost center assignments
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setForm({ name: '', code: '', parentId: '', costCenterId: '', location: '' })
          }}
          className="btn-primary"
        >
          Add Department
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="card p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
          <p className="text-sm font-medium text-slate-600">Total Departments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{departments.length}</p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-emerald-50 to-teal-50">
          <p className="text-sm font-medium text-slate-600">Total Employees</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {departments.reduce((sum, d) => sum + (d._count?.employees || 0), 0)}
          </p>
        </div>
        <div className="card p-6 bg-gradient-to-br from-amber-50 to-orange-50">
          <p className="text-sm font-medium text-slate-600">Cost Centers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{costCenters.length}</p>
        </div>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit Department' : 'New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="input mt-1"
                  required
                  disabled={!!editingId}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Parent Department
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="input mt-1"
                >
                  <option value="">None (Root Department)</option>
                  {departments
                    .filter((d) => d.id !== editingId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cost Center
                </label>
                <select
                  value={form.costCenterId}
                  onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}
                  className="input mt-1"
                >
                  <option value="">None</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} ({cc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Location / Venue
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input mt-1"
                placeholder="e.g., HQ - San Francisco"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Create'}
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

      <div className="card overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-12">
            <BuildingIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No departments yet</h3>
            <p className="mt-2 text-slate-500">Create your first department to build your org structure.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {getRootDepartments().map((dept) => renderDepartmentTree(dept))}
          </div>
        )}
      </div>
    </div>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}
