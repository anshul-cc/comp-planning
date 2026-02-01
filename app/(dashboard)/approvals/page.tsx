'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Approval {
  id: string
  status: string
  comments: string | null
  step: number
  approverRole: string
  createdAt: string
  approvalType: string
  entityName: string
  entityDetails: Record<string, unknown>
  approver: {
    id: string
    name: string
    email: string
  }
}

const TYPE_LABELS: Record<string, string> = {
  budget: 'Budget Allocation',
  headcount: 'Headcount Plan',
  hiring: 'Hiring Proposal',
  compensation: 'Compensation Action',
}

const TYPE_COLORS: Record<string, string> = {
  budget: 'bg-blue-100 text-blue-800',
  headcount: 'bg-purple-100 text-purple-800',
  hiring: 'bg-green-100 text-green-800',
  compensation: 'bg-orange-100 text-orange-800',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)

      const res = await fetch(`/api/approvals?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to fetch approvals')
      }

      const data = await res.json()
      setApprovals(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  const handleApprove = useCallback(async (id: string) => {
    const comments = prompt('Add approval comments (optional):')

    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'APPROVED', comments }),
      })

      if (res.ok) {
        fetchApprovals()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve')
      }
    } catch {
      alert('Failed to approve')
    }
  }, [fetchApprovals])

  const handleReject = useCallback(async (id: string) => {
    const comments = prompt('Add rejection reason (required):')
    if (!comments) {
      alert('Rejection reason is required')
      return
    }

    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'REJECTED', comments }),
      })

      if (res.ok) {
        fetchApprovals()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject')
      }
    } catch {
      alert('Failed to reject')
    }
  }, [fetchApprovals])

  const handleRequestRevision = useCallback(async (id: string) => {
    const comments = prompt('Add revision request details (required):')
    if (!comments) {
      alert('Revision details are required')
      return
    }

    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'REVISION_REQUESTED', comments }),
      })

      if (res.ok) {
        fetchApprovals()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to request revision')
      }
    } catch {
      alert('Failed to request revision')
    }
  }, [fetchApprovals])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-600 text-lg font-medium">{error}</div>
        <button onClick={fetchApprovals} className="mt-4 btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve budget allocations, headcount plans, hiring proposals, and compensation actions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <div className="flex gap-2">
            {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex gap-2">
            {['', 'budget', 'headcount', 'hiring', 'compensation'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  typeFilter === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type ? TYPE_LABELS[type] : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardIcon className="h-12 w-12 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No approvals found</h3>
            <p className="mt-2 text-gray-500">
              {statusFilter === 'PENDING'
                ? 'No pending approvals at this time'
                : 'No approvals match your filters'}
            </p>
          </div>
        ) : (
          approvals.map((approval) => (
            <div key={approval.id} className="card p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-medium text-gray-900">
                      {approval.entityName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${TYPE_COLORS[approval.approvalType] || 'bg-gray-100 text-gray-800'}`}>
                      {TYPE_LABELS[approval.approvalType] || approval.approvalType}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[approval.status] || 'bg-gray-100 text-gray-800'}`}>
                      {approval.status}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
                      Step {approval.step}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    {typeof approval.entityDetails.cycleName === 'string' && approval.entityDetails.cycleName && (
                      <span>Cycle: {approval.entityDetails.cycleName} • </span>
                    )}
                    {typeof approval.entityDetails.department === 'string' && approval.entityDetails.department && (
                      <span>Dept: {approval.entityDetails.department} • </span>
                    )}
                    {typeof approval.entityDetails.proposedBy === 'string' && approval.entityDetails.proposedBy && (
                      <span>Proposed by: {approval.entityDetails.proposedBy} • </span>
                    )}
                    <span>Approver: {approval.approver.name}</span>
                  </div>
                </div>

                <div className="text-right">
                  {typeof approval.entityDetails.totalBudget === 'number' && (
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(approval.entityDetails.totalBudget)}
                    </p>
                  )}
                  {typeof approval.entityDetails.proposedSalary === 'number' && (
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(approval.entityDetails.proposedSalary)}
                    </p>
                  )}
                  {typeof approval.entityDetails.plannedHeadcount === 'number' && (
                    <p className="text-xl font-semibold text-gray-900">
                      {approval.entityDetails.plannedHeadcount} positions
                    </p>
                  )}
                  {typeof approval.entityDetails.quantity === 'number' && (
                    <p className="text-xl font-semibold text-gray-900">
                      {approval.entityDetails.quantity} position(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span>Created: {formatDate(approval.createdAt)}</span>
                    {typeof approval.entityDetails.actionType === 'string' && (
                      <span className="ml-4">Action: {approval.entityDetails.actionType}</span>
                    )}
                  </div>

                  {approval.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="btn-primary text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestRevision(approval.id)}
                        className="btn text-sm"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {approval.comments && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Comments:</span> {approval.comments}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}
