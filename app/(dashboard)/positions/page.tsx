'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Position {
  id: string
  titleOverride: string | null
  profileId: string
  deptId: string
  isFrozen: boolean
  targetHireDate: string | null
  isVacant: boolean
  currentEmployee: {
    id: string
    name: string
    employeeId: string
  } | null
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
    jobFamily: {
      id: string
      name: string
    }
  }
  department: {
    id: string
    name: string
    code: string
  }
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'vacant' | 'filled' | 'frozen'>('all')
  const [deptFilter, setDeptFilter] = useState<string>('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/positions').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
    ])
      .then(([positionsData, deptData]) => {
        setPositions(positionsData)
        setDepartments(deptData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredPositions = positions.filter((p) => {
    if (deptFilter && p.deptId !== deptFilter) return false
    if (filter === 'vacant') return p.isVacant
    if (filter === 'filled') return !p.isVacant
    if (filter === 'frozen') return p.isFrozen
    return true
  })

  const totalPositions = positions.length
  const vacantPositions = positions.filter((p) => p.isVacant).length
  const filledPositions = positions.filter((p) => !p.isVacant).length
  const frozenPositions = positions.filter((p) => p.isFrozen).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Positions</h1>
          <p className="mt-1 text-slate-500">
            Manage funded positions across the organization
          </p>
        </div>
        <Link href="/positions/new" className="btn-primary">
          New Position
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setFilter('all')}
          className={`card p-6 text-left transition-all ${filter === 'all' ? 'ring-2 ring-indigo-500' : ''}`}
        >
          <p className="text-sm font-medium text-slate-600">Total Positions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalPositions}</p>
          <p className="mt-1 text-sm text-slate-500">Funded slots</p>
        </button>
        <button
          onClick={() => setFilter('vacant')}
          className={`card p-6 text-left transition-all ${filter === 'vacant' ? 'ring-2 ring-amber-500' : ''}`}
        >
          <p className="text-sm font-medium text-slate-600">Vacant</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{vacantPositions}</p>
          <p className="mt-1 text-sm text-slate-500">Open to hire</p>
        </button>
        <button
          onClick={() => setFilter('filled')}
          className={`card p-6 text-left transition-all ${filter === 'filled' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <p className="text-sm font-medium text-slate-600">Filled</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{filledPositions}</p>
          <p className="mt-1 text-sm text-slate-500">Currently occupied</p>
        </button>
        <button
          onClick={() => setFilter('frozen')}
          className={`card p-6 text-left transition-all ${filter === 'frozen' ? 'ring-2 ring-rose-500' : ''}`}
        >
          <p className="text-sm font-medium text-slate-600">Frozen</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{frozenPositions}</p>
          <p className="mt-1 text-sm text-slate-500">Not available</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="input"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Positions Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Current Holder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Compensation Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredPositions.map((position) => (
              <tr key={position.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-slate-900">
                    {position.titleOverride || position.profile.title}
                  </div>
                  <div className="text-sm text-slate-500">
                    {position.profile.jobFamily.name}
                    {position.profile.level && ` - L${position.profile.level}`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{position.department.name}</div>
                  <div className="text-xs text-slate-500">{position.department.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {position.currentEmployee ? (
                    <div>
                      <div className="text-sm text-slate-900">
                        {position.currentEmployee.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {position.currentEmployee.employeeId}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-amber-600 font-medium">Vacant</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {position.compensationRange ? (
                    <span>
                      {formatCurrency(position.compensationRange.min)} -{' '}
                      {formatCurrency(position.compensationRange.max)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {position.isFrozen ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                      Frozen
                    </span>
                  ) : position.isVacant ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Vacant
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Filled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/positions/${position.id}`}
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPositions.length === 0 && (
          <div className="p-12 text-center">
            <ChairIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No positions found</h3>
            <p className="mt-2 text-slate-500">
              {filter !== 'all'
                ? `No ${filter} positions in the selected department.`
                : 'Create positions to manage funded slots.'}
            </p>
          </div>
        )}
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
