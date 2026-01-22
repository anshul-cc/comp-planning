'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewJobFamilyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/job-families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create job family')
      }

      const newFamily = await res.json()
      router.push(`/job-architecture/${newFamily.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job family')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/job-architecture" className="hover:text-emerald-600">
            Job Architecture
          </Link>
          <span>/</span>
          <span>New Job Family</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Create Job Family</h1>
        <p className="mt-1 text-slate-500">
          Job families are top-level categories for organizing roles
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
            Family Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            className="input w-full"
            placeholder="e.g., Engineering, Sales, Marketing"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Code <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            className="input w-full"
            placeholder="e.g., ENG, SALES, MKTG"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Unique identifier for this job family
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            className="input w-full"
            rows={3}
            placeholder="Brief description of this job family..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link href="/job-architecture" className="btn">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Job Family'}
          </button>
        </div>
      </form>
    </div>
  )
}
