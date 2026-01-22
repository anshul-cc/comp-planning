'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface JobLevel {
  id: string
  levelCode: string
  levelName: string
  avgSalary: number
  avgBenefits: number
  payGrade?: {
    id: string
    name: string
    code: string
  }
}

interface JobRole {
  id: string
  name: string
  code: string
  description?: string
  levels: JobLevel[]
}

interface JobSubFamily {
  id: string
  name: string
  code: string
  description?: string
  jobRoles: JobRole[]
}

interface JobFamily {
  id: string
  name: string
  code: string
  description?: string
  subFamilies: JobSubFamily[]
}

interface PayGrade {
  id: string
  name: string
  code: string
}

export default function JobFamilyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const familyId = params.familyId as string

  const [family, setFamily] = useState<JobFamily | null>(null)
  const [payGrades, setPayGrades] = useState<PayGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [showSubFamilyForm, setShowSubFamilyForm] = useState(false)
  const [showRoleForm, setShowRoleForm] = useState<string | null>(null)
  const [showLevelForm, setShowLevelForm] = useState<string | null>(null)

  const [subFamilyForm, setSubFamilyForm] = useState({ name: '', code: '', description: '' })
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '' })
  const [levelForm, setLevelForm] = useState({
    levelCode: 'IC1',
    levelName: '',
    payGradeId: '',
    avgSalary: 0,
    avgBenefits: 0,
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/job-families/${familyId}`).then((r) => r.json()),
      fetch('/api/pay-grades').then((r) => r.json()),
    ])
      .then(([familyData, gradesData]) => {
        if (familyData.error) {
          setError(familyData.error)
        } else {
          setFamily(familyData)
        }
        setPayGrades(Array.isArray(gradesData) ? gradesData : gradesData.data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError('Failed to load data')
        setLoading(false)
      })
  }, [familyId])

  const handleAddSubFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/job-families/${familyId}/sub-families`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subFamilyForm),
      })
      if (res.ok) {
        const newSubFamily = await res.json()
        setFamily((prev) =>
          prev ? { ...prev, subFamilies: [...prev.subFamilies, { ...newSubFamily, jobRoles: [] }] } : null
        )
        setShowSubFamilyForm(false)
        setSubFamilyForm({ name: '', code: '', description: '' })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add sub-family')
      }
    } catch {
      alert('Failed to add sub-family')
    }
  }

  const handleAddRole = async (e: React.FormEvent, subFamilyId: string) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/job-sub-families/${subFamilyId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      })
      if (res.ok) {
        const newRole = await res.json()
        setFamily((prev) =>
          prev
            ? {
                ...prev,
                subFamilies: prev.subFamilies.map((sf) =>
                  sf.id === subFamilyId
                    ? { ...sf, jobRoles: [...sf.jobRoles, { ...newRole, levels: newRole.levels || [] }] }
                    : sf
                ),
              }
            : null
        )
        setShowRoleForm(null)
        setRoleForm({ name: '', code: '', description: '' })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add role')
      }
    } catch {
      alert('Failed to add role')
    }
  }

  const handleAddLevel = async (e: React.FormEvent, roleId: string, subFamilyId: string) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/job-roles/${roleId}/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelForm),
      })
      if (res.ok) {
        const newLevel = await res.json()
        setFamily((prev) =>
          prev
            ? {
                ...prev,
                subFamilies: prev.subFamilies.map((sf) =>
                  sf.id === subFamilyId
                    ? {
                        ...sf,
                        jobRoles: sf.jobRoles.map((r) =>
                          r.id === roleId ? { ...r, levels: [...r.levels, newLevel] } : r
                        ),
                      }
                    : sf
                ),
              }
            : null
        )
        setShowLevelForm(null)
        setLevelForm({ levelCode: 'IC1', levelName: '', payGradeId: '', avgSalary: 0, avgBenefits: 0 })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add level')
      }
    } catch {
      alert('Failed to add level')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (error || !family) {
    return (
      <div className="card p-12 text-center">
        <p className="text-rose-600">{error || 'Job family not found'}</p>
        <Link href="/job-architecture" className="btn mt-4 inline-block">
          Back to Job Architecture
        </Link>
      </div>
    )
  }

  const levelCodes = ['IC1', 'IC2', 'IC3', 'M1', 'M2']
  const levelNames: Record<string, string> = {
    IC1: 'Junior',
    IC2: 'Mid-Level',
    IC3: 'Senior',
    M1: 'Manager',
    M2: 'Senior Manager',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/job-architecture" className="hover:text-emerald-600">
              Job Architecture
            </Link>
            <span>/</span>
            <span>{family.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{family.name}</h1>
          <p className="mt-1 text-slate-500">Code: {family.code}</p>
          {family.description && (
            <p className="mt-2 text-slate-600">{family.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowSubFamilyForm(true)}
          className="btn-primary"
        >
          Add Sub-Family
        </button>
      </div>

      {/* Add Sub-Family Form */}
      {showSubFamilyForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Add Sub-Family</h3>
          <form onSubmit={handleAddSubFamily} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  className="input w-full"
                  value={subFamilyForm.name}
                  onChange={(e) => setSubFamilyForm({ ...subFamilyForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  className="input w-full"
                  value={subFamilyForm.code}
                  onChange={(e) => setSubFamilyForm({ ...subFamilyForm, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                className="input w-full"
                rows={2}
                value={subFamilyForm.description}
                onChange={(e) => setSubFamilyForm({ ...subFamilyForm, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Add Sub-Family</button>
              <button type="button" className="btn" onClick={() => setShowSubFamilyForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Families */}
      <div className="space-y-6">
        {family.subFamilies.map((subFamily) => (
          <div key={subFamily.id} className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{subFamily.name}</h3>
                  <p className="text-sm text-slate-500">Code: {subFamily.code}</p>
                </div>
                <button
                  onClick={() => setShowRoleForm(subFamily.id)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  + Add Role
                </button>
              </div>
            </div>

            {/* Add Role Form */}
            {showRoleForm === subFamily.id && (
              <div className="p-6 border-b border-slate-100 bg-emerald-50">
                <h4 className="font-medium mb-3">Add Role</h4>
                <form onSubmit={(e) => handleAddRole(e, subFamily.id)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Role Name"
                      className="input"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Code"
                      className="input"
                      value={roleForm.code}
                      onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm">Add</button>
                    <button type="button" className="btn text-sm" onClick={() => setShowRoleForm(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Roles */}
            <div className="divide-y divide-slate-100">
              {subFamily.jobRoles.map((role) => (
                <div key={role.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-slate-900">{role.name}</h4>
                      <p className="text-sm text-slate-500">Code: {role.code}</p>
                    </div>
                    <button
                      onClick={() => setShowLevelForm(role.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      + Add Level
                    </button>
                  </div>

                  {/* Add Level Form */}
                  {showLevelForm === role.id && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                      <form onSubmit={(e) => handleAddLevel(e, role.id, subFamily.id)} className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <select
                            className="input"
                            value={levelForm.levelCode}
                            onChange={(e) =>
                              setLevelForm({
                                ...levelForm,
                                levelCode: e.target.value,
                                levelName: levelNames[e.target.value] || '',
                              })
                            }
                          >
                            {levelCodes.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Level Name"
                            className="input"
                            value={levelForm.levelName}
                            onChange={(e) => setLevelForm({ ...levelForm, levelName: e.target.value })}
                            required
                          />
                          <select
                            className="input"
                            value={levelForm.payGradeId}
                            onChange={(e) => setLevelForm({ ...levelForm, payGradeId: e.target.value })}
                          >
                            <option value="">Select Pay Grade</option>
                            {payGrades.map((pg) => (
                              <option key={pg.id} value={pg.id}>
                                {pg.name} ({pg.code})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Avg Salary"
                            className="input"
                            value={levelForm.avgSalary || ''}
                            onChange={(e) => setLevelForm({ ...levelForm, avgSalary: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary text-sm">Add Level</button>
                          <button type="button" className="btn text-sm" onClick={() => setShowLevelForm(null)}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Levels */}
                  {role.levels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {role.levels.map((level) => (
                        <div
                          key={level.id}
                          className="px-3 py-2 bg-slate-100 rounded-lg"
                        >
                          <div className="text-sm font-medium text-slate-700">
                            {level.levelCode}: {level.levelName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatCurrency(level.avgSalary)}
                            {level.payGrade && ` • ${level.payGrade.code}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {role.levels.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No levels defined</p>
                  )}
                </div>
              ))}

              {subFamily.jobRoles.length === 0 && (
                <div className="p-6 text-center text-slate-400">
                  No roles yet. Click &quot;+ Add Role&quot; to create one.
                </div>
              )}
            </div>
          </div>
        ))}

        {family.subFamilies.length === 0 && !showSubFamilyForm && (
          <div className="card p-12 text-center">
            <p className="text-slate-500">
              No sub-families yet. Click &quot;Add Sub-Family&quot; to create one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
