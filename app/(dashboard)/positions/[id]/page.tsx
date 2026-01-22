'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Assignment {
  id: string
  empId: string
  assignmentType: string
  allocationPct: number
  validFrom: string
  validTo: string
  employee: {
    id: string
    employeeId: string
    name: string
    email: string
    title: string
  }
  compensationSnapshots: {
    id: string
    componentType: string
    amountLocal: number
    currencyLocal: string
    effectiveFrom: string
    effectiveTo: string
  }[]
}

interface Position {
  id: string
  titleOverride: string | null
  isFrozen: boolean
  targetHireDate: string | null
  isVacant: boolean
  currentEmployee: {
    id: string
    name: string
    employeeId: string
  } | null
  currentAssignment: Assignment | null
  compensationRange: {
    min: number
    mid: number
    max: number
    currency: string
  } | null
  profile: {
    id: string
    title: string
    code: string
    level: number | null
    description: string | null
    jobFamily: {
      id: string
      name: string
      code: string
    }
    subFamily: {
      id: string
      name: string
    } | null
    compensationBands: {
      id: string
      geoCode: string
      minSalary: number
      midSalary: number
      maxSalary: number
      currency: string
      effectiveFrom: string
    }[]
  }
  department: {
    id: string
    name: string
    code: string
  }
  assignments: Assignment[]
}

export default function PositionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetch(`/api/positions/${params.id}`)
        .then((r) => r.json())
        .then((data) => {
          setPosition(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [params.id])

  const handleFreeze = async () => {
    if (!position) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/positions/${position.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFrozen: !position.isFrozen }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPosition((prev) => (prev ? { ...prev, isFrozen: updated.isFrozen } : null))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!position || !confirm('Are you sure you want to delete this position?')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/positions/${position.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/positions')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete position')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!position) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Position not found</h2>
        <Link href="/positions" className="text-emerald-600 hover:underline mt-2 inline-block">
          Back to Positions
        </Link>
      </div>
    )
  }

  const currentCompensation = position.currentAssignment?.compensationSnapshots.reduce(
    (sum, snap) => sum + snap.amountLocal,
    0
  ) || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">
              {position.titleOverride || position.profile.title}
            </h1>
            {position.isFrozen && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700">
                Frozen
              </span>
            )}
            {position.isVacant && !position.isFrozen && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                Vacant
              </span>
            )}
          </div>
          <p className="mt-1 text-slate-500">
            {position.profile.jobFamily.name}
            {position.profile.level && ` - Level ${position.profile.level}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFreeze}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              position.isFrozen
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            } disabled:opacity-50`}
          >
            {position.isFrozen ? 'Unfreeze' : 'Freeze'}
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading || !position.isVacant}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Position Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Assignment */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Assignment</h2>
            {position.currentAssignment ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {position.currentAssignment.employee.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {position.currentAssignment.employee.employeeId} -{' '}
                      {position.currentAssignment.employee.email}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      position.currentAssignment.assignmentType === 'PRIMARY'
                        ? 'bg-emerald-100 text-emerald-700'
                        : position.currentAssignment.assignmentType === 'ACTING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {position.currentAssignment.assignmentType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Allocation</p>
                    <p className="font-medium">{position.currentAssignment.allocationPct}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Since</p>
                    <p className="font-medium">
                      {formatDate(new Date(position.currentAssignment.validFrom))}
                    </p>
                  </div>
                </div>

                {/* Compensation Breakdown */}
                {position.currentAssignment.compensationSnapshots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Compensation</h3>
                    <div className="space-y-2">
                      {position.currentAssignment.compensationSnapshots.map((snap) => (
                        <div key={snap.id} className="flex justify-between text-sm">
                          <span className="text-slate-600">{snap.componentType}</span>
                          <span className="font-medium">
                            {formatCurrency(snap.amountLocal)} {snap.currencyLocal}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-100">
                        <span>Total</span>
                        <span>{formatCurrency(currentCompensation)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <ChairIcon className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-slate-600">This position is currently vacant</p>
                {position.targetHireDate && (
                  <p className="text-sm text-slate-500 mt-2">
                    Target hire date: {formatDate(new Date(position.targetHireDate))}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Assignment History */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Assignment History</h2>
            {position.assignments.length > 0 ? (
              <div className="space-y-3">
                {position.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{assignment.employee.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(new Date(assignment.validFrom))} -{' '}
                        {assignment.validTo === '9999-12-31T00:00:00.000Z'
                          ? 'Present'
                          : formatDate(new Date(assignment.validTo))}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-slate-600">{assignment.assignmentType}</span>
                      <p className="text-xs text-slate-500">{assignment.allocationPct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No assignment history</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Position Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Position Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-slate-500">Department</dt>
                <dd className="font-medium text-slate-900">{position.department.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Job Profile</dt>
                <dd className="font-medium text-slate-900">{position.profile.title}</dd>
                <dd className="text-sm text-slate-500">{position.profile.code}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Job Family</dt>
                <dd className="font-medium text-slate-900">{position.profile.jobFamily.name}</dd>
              </div>
              {position.profile.subFamily && (
                <div>
                  <dt className="text-sm text-slate-500">Sub-Family</dt>
                  <dd className="font-medium text-slate-900">{position.profile.subFamily.name}</dd>
                </div>
              )}
              {position.profile.level && (
                <div>
                  <dt className="text-sm text-slate-500">Level</dt>
                  <dd className="font-medium text-slate-900">Level {position.profile.level}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Compensation Bands */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Compensation Bands</h2>
            {position.profile.compensationBands.length > 0 ? (
              <div className="space-y-4">
                {position.profile.compensationBands.map((band) => (
                  <div key={band.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">{band.geoCode}</span>
                      <span className="text-xs text-slate-500">{band.currency}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Min</p>
                        <p className="font-medium">{formatCurrency(band.minSalary)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Mid</p>
                        <p className="font-medium">{formatCurrency(band.midSalary)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Max</p>
                        <p className="font-medium">{formatCurrency(band.maxSalary)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No compensation bands defined</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChairIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  )
}
