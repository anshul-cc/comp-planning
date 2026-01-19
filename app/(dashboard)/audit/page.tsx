'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  fieldChanged: string | null
  oldValue: unknown
  newValue: unknown
  userId: string
  userRole: string
  comment: string | null
  ipAddress: string | null
  createdAt: string
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  org_unit: 'Organization Unit',
  business_unit: 'Business Unit',
  cost_center: 'Cost Center',
  department: 'Department',
  budget_cycle: 'Budget Cycle',
  budget_allocation: 'Budget Allocation',
  headcount_plan: 'Headcount Plan',
  pay_grade: 'Pay Grade',
  compensation_cycle: 'Compensation Cycle',
  compensation_action: 'Compensation Action',
  hiring_proposal: 'Hiring Proposal',
  user: 'User',
  role: 'Role',
  employee: 'Employee',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  approve: 'Approved',
  reject: 'Rejected',
  submit: 'Submitted',
  override: 'Override',
  status_change: 'Status Changed',
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-rose-100 text-rose-800',
  submit: 'bg-purple-100 text-purple-800',
  override: 'bg-orange-100 text-orange-800',
  status_change: 'bg-yellow-100 text-yellow-800',
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (filters.entityType) params.append('entityType', filters.entityType)
    if (filters.action) params.append('action', filters.action)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    try {
      const res = await fetch(`/api/audit?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('You do not have permission to view audit logs')
        }
        throw new Error('Failed to fetch audit logs')
      }
      const responseData = await res.json()
      setData(responseData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  if (loading && !data) {
    return <div className="flex justify-center py-12">Loading audit logs...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-600 text-lg font-medium">{error}</div>
        <button
          onClick={fetchAuditLogs}
          className="mt-4 btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track all changes and actions in the system for compliance and traceability
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="input w-full"
            >
              <option value="">All Types</option>
              {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="input w-full"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setFilters({ entityType: '', action: '', startDate: '', endDate: '' })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Filters
          </button>
          {data && (
            <span className="text-sm text-gray-500">
              Showing {data.logs.length} of {data.total} entries
            </span>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Field
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              data?.logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {log.entityId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.userId.substring(0, 8)}...</div>
                      <div className="text-xs text-gray-500">{log.userRole}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.fieldChanged || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                      {expandedRows.has(log.id) ? 'Hide' : 'Show'} Details
                    </td>
                  </tr>
                  {expandedRows.has(log.id) && (
                    <tr key={`${log.id}-details`}>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Old Value</h4>
                            <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                              {formatValue(log.oldValue)}
                            </pre>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">New Value</h4>
                            <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                              {formatValue(log.newValue)}
                            </pre>
                          </div>
                          {log.comment && (
                            <div className="col-span-2">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Comment</h4>
                              <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                                {log.comment}
                              </p>
                            </div>
                          )}
                          {log.ipAddress && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">IP Address</h4>
                              <p className="text-sm text-gray-600">{log.ipAddress}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              // TODO: Implement pagination
            }}
            className="btn-primary"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
