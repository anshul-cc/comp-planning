import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getCycle(id: string) {
  const cycle = await prisma.planningCycle.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      approvalChainLevels: {
        include: {
          assignees: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { level: 'asc' },
      },
      _count: {
        select: {
          budgetAllocations: true,
          headcountPlans: true,
          hiringProposals: true,
        },
      },
    },
  })

  return cycle
}

const ROLE_LABELS: Record<string, string> = {
  REPORTING_MANAGER: 'Reporting Manager',
  DEPARTMENT_HEAD: 'Department Head',
  BU_LEADER: 'Business Unit Leader',
  HR_ADMIN: 'HR Admin',
  COMPENSATION_MANAGER: 'Compensation Manager',
}

export default async function CycleDetailPage({ params }: { params: { id: string } }) {
  const cycle = await getCycle(params.id)

  if (!cycle) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/cycles"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Cycles
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">{cycle.name}</h1>
          <p className="mt-1 text-slate-500">
            {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={cycle.status} />
          {cycle.status === 'DRAFT' && (
            <Link
              href={`/cycles/${cycle.id}/edit`}
              className="btn-primary"
            >
              Edit Cycle
            </Link>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-slate-500">Type</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {cycle.type.replace('_', ' ')}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Total Budget</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatCurrency(cycle.totalBudget)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Budget Allocations</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {cycle._count.budgetAllocations}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Headcount Plans</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {cycle._count.headcountPlans}
          </p>
        </div>
      </div>

      {/* Approval Workflow Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Approval Workflow</h2>

        {cycle.approvalChainLevels.length === 0 ? (
          <p className="text-slate-500 text-sm">No approval chain configured for this cycle.</p>
        ) : (
          <div className="space-y-4">
            {cycle.approvalChainLevels.map((level) => (
              <div key={level.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Level {level.level}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Approval</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {level.assignees.map((assignee) => (
                    <AssigneeChip key={assignee.id} assignee={assignee} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckboxIndicator checked={cycle.autoApproveIfMissing} />
            <span className={cycle.autoApproveIfMissing ? 'text-slate-700' : 'text-slate-400'}>
              Auto-approve if approver is missing
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckboxIndicator checked={cycle.skipApproverEmails} />
            <span className={cycle.skipApproverEmails ? 'text-slate-700' : 'text-slate-400'}>
              Do not email approvers for every request
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Links</h2>
        <div className="flex gap-4">
          <Link
            href={`/budgets?cycle=${cycle.id}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Budget Allocations ({cycle._count.budgetAllocations})
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/headcount?cycle=${cycle.id}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Headcount Plans ({cycle._count.headcountPlans})
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/hiring?cycle=${cycle.id}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Hiring Proposals ({cycle._count.hiringProposals})
          </Link>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-slate-400">
        Created by {cycle.createdBy?.name || 'Unknown'} on {formatDate(cycle.createdAt)}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PLANNING: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

function AssigneeChip({ assignee }: { assignee: { assigneeType: string; roleType?: string | null; user?: { name: string } | null } }) {
  const label =
    assignee.assigneeType === 'ROLE'
      ? ROLE_LABELS[assignee.roleType || ''] || assignee.roleType
      : assignee.user?.name || 'User'

  const initials = (label || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-sm">
      <div className="h-6 w-6 rounded-full bg-teal-200 flex items-center justify-center text-xs font-medium">
        {initials}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function CheckboxIndicator({ checked }: { checked: boolean }) {
  return checked ? (
    <div className="h-4 w-4 rounded bg-emerald-500 flex items-center justify-center">
      <CheckIcon className="h-3 w-3 text-white" />
    </div>
  ) : (
    <div className="h-4 w-4 rounded border border-slate-300" />
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
