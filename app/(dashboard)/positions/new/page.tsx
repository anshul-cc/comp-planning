'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Department {
  id: string
  name: string
  code: string
}

interface JobProfile {
  id: string
  title: string
  code: string
  level: number | null
  jobFamily: {
    id: string
    name: string
  }
}

export default function NewPositionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([])

  const [formData, setFormData] = useState({
    profileId: '',
    deptId: '',
    titleOverride: '',
    targetHireDate: '',
    isFrozen: false,
  })

  useEffect(() => {
    const fetchOptions = { credentials: 'include' as RequestCredentials }
    Promise.all([
      fetch('/api/departments', fetchOptions).then(res => res.json()),
      fetch('/api/job-profiles', fetchOptions).then(res => res.json()),
    ]).then(([deptData, profileData]) => {
      setDepartments(Array.isArray(deptData) ? deptData : deptData.data || [])
      setJobProfiles(Array.isArray(profileData) ? profileData : profileData.data || [])
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
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          titleOverride: formData.titleOverride || null,
          targetHireDate: formData.targetHireDate || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create position')
      }

      router.push('/positions')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedProfile = jobProfiles.find(p => p.id === formData.profileId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/positions"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Positions
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">New Position</h1>
        <p className="mt-1 text-slate-500">Create a new funded position slot</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Job Profile *
          </label>
          <select
            required
            className="input w-full"
            value={formData.profileId}
            onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
          >
            <option value="">Select a job profile</option>
            {jobProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.title} ({profile.code}) - {profile.jobFamily.name}
                {profile.level && ` - L${profile.level}`}
              </option>
            ))}
          </select>
          {selectedProfile && (
            <p className="mt-1 text-sm text-slate-500">
              Job Family: {selectedProfile.jobFamily.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Department *
          </label>
          <select
            required
            className="input w-full"
            value={formData.deptId}
            onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
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
            Title Override
          </label>
          <input
            type="text"
            className="input w-full"
            placeholder="Leave empty to use job profile title"
            value={formData.titleOverride}
            onChange={(e) => setFormData({ ...formData, titleOverride: e.target.value })}
          />
          <p className="mt-1 text-sm text-slate-500">
            Optional: Override the default title from the job profile
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Target Hire Date
          </label>
          <input
            type="date"
            className="input w-full"
            value={formData.targetHireDate}
            onChange={(e) => setFormData({ ...formData, targetHireDate: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isFrozen"
            className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            checked={formData.isFrozen}
            onChange={(e) => setFormData({ ...formData, isFrozen: e.target.checked })}
          />
          <label htmlFor="isFrozen" className="text-sm text-slate-700">
            Freeze this position (not available for hiring)
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Position'}
          </button>
          <Link href="/positions" className="btn-secondary flex-1 text-center">
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
