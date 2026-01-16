'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Approval {
  id: string
  status: string
  comments: string | null
  createdAt: string
  allocation: {
    id: string
    amount: number
    type: string
    employee: { id: string; name: string; title: string }
    annualPlan: {
      id: string
      fiscalYear: { name: string }
      department: { name: string }
    }
  }
  approver: { id: string; name: string; email: string }
}

const ALLOCATION_TYPE_LABELS: Record<string, string> = {
  BASE_SALARY: 'Base Salary',
  MERIT_INCREASE: 'Merit Increase',
  BONUS: 'Bonus',
  EQUITY: 'Equity',
  OTHER: 'Other',
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')

  useEffect(() => {
    fetchApprovals()
  }, [filter])

  const fetchApprovals = async () => {
    setLoading(true)
    const url = filter ? `/api/approvals?status=${filter}` : '/api/approvals'
    const res = await fetch(url)
    const data = await res.json()
    setApprovals(data)
    setLoading(false)
  }

  const handleApprove = async (id: string) => {
    const comments = prompt('Add approval comments (optional):')
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', comments }),
    })

    if (res.ok) {
      fetchApprovals()
    }
  }

  const handleReject = async (id: string) => {
    const comments = prompt('Add rejection reason:')
    if (!comments) {
      alert('Rejection reason is required')
      return
    }

    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED', comments }),
    })

    if (res.ok) {
      fetchApprovals()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve budget allocations
        </p>
      </div>

      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            No approvals found
          </div>
        ) : (
          approvals.map((approval) => (
            <div key={approval.id} className="card p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium">
                      {approval.allocation.employee.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(approval.status)}`}>
                      {approval.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {approval.allocation.employee.title} •{' '}
                    {approval.allocation.annualPlan.department.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(approval.allocation.amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ALLOCATION_TYPE_LABELS[approval.allocation.type]}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span>Fiscal Year: {approval.allocation.annualPlan.fiscalYear.name}</span>
                    <span className="mx-2">•</span>
                    <span>Submitted: {formatDate(approval.createdAt)}</span>
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
                        onClick={() => handleReject(approval.id)}
                        className="btn-danger text-sm"
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
