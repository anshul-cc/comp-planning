'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ApprovalChainBuilder, ApprovalChainLevel } from '@/components/ApprovalChainBuilder'

interface User {
  id: string
  name: string
  email: string
}

interface CycleData {
  id: string
  name: string
  type: string
  startDate: string
  endDate: string
  totalBudget: number
  status: string
  autoApproveIfMissing: boolean
  skipApproverEmails: boolean
  approvalChainLevels: Array<{
    id: string
    level: number
    name?: string
    assignees: Array<{
      id: string
      assigneeType: string
      roleType?: string
      userId?: string
      user?: { id: string; name: string; email: string }
    }>
  }>
}

export default function EditCyclePage() {
  const router = useRouter()
  const params = useParams()
  const cycleId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [cycle, setCycle] = useState<CycleData | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    totalBudget: '',
    autoApproveIfMissing: false,
    skipApproverEmails: false,
  })

  const [approvalLevels, setApprovalLevels] = useState<ApprovalChainLevel[]>([])
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => {
    // Fetch cycle data
    fetch(`/api/cycles/${cycleId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Cycle not found')
        return res.json()
      })
      .then((data: CycleData) => {
        setCycle(data)

        // Check if cycle can be edited
        if (data.status !== 'DRAFT') {
          setError('Only cycles in DRAFT status can be edited')
          setLoading(false)
          return
        }

        // Populate form data
        setFormData({
          name: data.name,
          type: data.type,
          startDate: data.startDate.split('T')[0],
          endDate: data.endDate.split('T')[0],
          totalBudget: data.totalBudget.toString(),
          autoApproveIfMissing: data.autoApproveIfMissing,
          skipApproverEmails: data.skipApproverEmails,
        })

        // Populate approval levels
        const levels: ApprovalChainLevel[] = data.approvalChainLevels.map((level) => ({
          id: level.id,
          level: level.level,
          name: level.name,
          assignees: level.assignees.map((a) => ({
            id: a.id,
            assigneeType: a.assigneeType as 'ROLE' | 'USER',
            roleType: a.roleType,
            userId: a.userId,
            userName: a.user?.name,
          })),
        }))
        setApprovalLevels(levels.length > 0 ? levels : [{ level: 1, assignees: [] }])

        setLoading(false)
        setInitialLoadComplete(true)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })

    // Fetch users for the assignee selector
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
  }, [cycleId])

  // Auto-calculate end date based on cycle type and start date (only after initial load)
  useEffect(() => {
    if (!initialLoadComplete || !formData.startDate) return

    const startDate = new Date(formData.startDate)
    let endDate: Date

    switch (formData.type) {
      case 'ANNUAL':
        endDate = new Date(startDate)
        endDate.setFullYear(endDate.getFullYear() + 1)
        endDate.setDate(endDate.getDate() - 1)
        break
      case 'HALF_YEARLY':
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 6)
        endDate.setDate(endDate.getDate() - 1)
        break
      case 'QUARTERLY':
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 3)
        endDate.setDate(endDate.getDate() - 1)
        break
      default:
        return
    }

    const formattedEndDate = endDate.toISOString().split('T')[0]
    setFormData((prev) => ({ ...prev, endDate: formattedEndDate }))
  }, [formData.startDate, formData.type, initialLoadComplete])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/cycles/${cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          approvalLevels,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update cycle')
      }

      router.push(`/cycles/${cycleId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 text-center">
          <p className="text-slate-500">Loading cycle...</p>
        </div>
      </div>
    )
  }

  if (error && !cycle) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/cycles" className="btn">
            Back to Cycles
          </Link>
        </div>
      </div>
    )
  }

  if (cycle?.status !== 'DRAFT') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6">
          <div className="text-amber-600 mb-4">
            This cycle is in {cycle?.status} status and cannot be edited.
          </div>
          <Link href={`/cycles/${cycleId}`} className="btn">
            View Cycle
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/cycles/${cycleId}`}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Cycle
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Edit Planning Cycle</h1>
        <p className="mt-1 text-slate-500">Update cycle details and approval workflow</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cycle Name *
          </label>
          <input
            type="text"
            required
            className="input w-full"
            placeholder="e.g., FY 2025, H1 2025"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cycle Type *
          </label>
          <select
            required
            className="input w-full"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="ANNUAL">Annual</option>
            <option value="HALF_YEARLY">Half-Yearly</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              className="input w-full"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              required
              className="input w-full"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Total Budget
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full pl-7"
              placeholder="0.00"
              value={formData.totalBudget}
              onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Approval Workflow</h3>
          <p className="text-xs text-slate-500 mb-4">
            Set up approval chain for budget allocations, headcount plans, and hiring proposals.
          </p>

          <ApprovalChainBuilder
            levels={approvalLevels}
            onChange={setApprovalLevels}
            users={users}
          />

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.autoApproveIfMissing}
                onChange={(e) => setFormData({ ...formData, autoApproveIfMissing: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Auto-approve if approver is missing</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.skipApproverEmails}
                onChange={(e) => setFormData({ ...formData, skipApproverEmails: e.target.checked })}
              />
              <div>
                <span className="text-sm text-slate-700">Do not email approvers for every request</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  They will view these requests as part of the daily email digest.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href={`/cycles/${cycleId}`} className="btn flex-1 text-center">
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
