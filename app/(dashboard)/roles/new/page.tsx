'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Department {
  id: string
  name: string
  code: string
}

interface PayGrade {
  id: string
  name: string
  level: number
}

export default function NewRolePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [payGrades, setPayGrades] = useState<PayGrade[]>([])

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    payGradeId: '',
  })

  useEffect(() => {
    const fetchOptions = { credentials: 'include' as RequestCredentials }
    Promise.all([
      fetch('/api/departments', fetchOptions).then(res => {
        if (!res.ok) throw new Error('Failed to fetch departments')
        return res.json()
      }),
      fetch('/api/pay-grades', fetchOptions).then(res => {
        if (!res.ok) throw new Error('Failed to fetch pay grades')
        return res.json()
      }),
    ]).then(([departmentsData, payGradesData]) => {
      setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
      setPayGrades(Array.isArray(payGradesData) ? payGradesData : [])
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
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create role')
      }

      router.push('/roles')
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
          href="/roles"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Roles
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Role</h1>
        <p className="mt-1 text-slate-500">Create a new job role</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role Name *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., Software Engineer"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role Code *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., SWE-001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pay Grade
          </label>
          <select
            className="input w-full"
            value={formData.payGradeId}
            onChange={(e) => setFormData({ ...formData, payGradeId: e.target.value })}
          >
            <option value="">Select a pay grade (optional)</option>
            {payGrades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name} (Level {grade.level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Role'}
          </button>
          <Link href="/roles" className="btn flex-1 text-center">
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
