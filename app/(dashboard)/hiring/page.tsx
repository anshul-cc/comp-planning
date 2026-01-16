import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

async function getHiringProposals() {
  const activeCycle = await prisma.planningCycle.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })

  const proposals = await prisma.hiringProposal.findMany({
    where: activeCycle ? { cycleId: activeCycle.id } : {},
    include: {
      department: true,
      role: { include: { payGrade: true } },
      proposer: true,
      cycle: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return { proposals, activeCycle }
}

export default async function HiringPage() {
  const { proposals, activeCycle } = await getHiringProposals()

  const statusCounts = {
    DRAFT: proposals.filter((p) => p.status === 'DRAFT').length,
    SUBMITTED: proposals.filter((p) => p.status === 'SUBMITTED').length,
    HR_REVIEW: proposals.filter((p) => p.status === 'HR_REVIEW').length,
    FINANCE_REVIEW: proposals.filter((p) => p.status === 'FINANCE_REVIEW').length,
    APPROVED: proposals.filter((p) => p.status === 'APPROVED').length,
    REJECTED: proposals.filter((p) => p.status === 'REJECTED').length,
  }

  const totalPositions = proposals.reduce((sum, p) => sum + p.quantity, 0)
  const approvedPositions = proposals
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + p.quantity, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hiring Proposals</h1>
          <p className="mt-1 text-slate-500">
            {activeCycle ? `${activeCycle.name} hiring requests` : 'No active cycle'}
          </p>
        </div>
        <Link href="/hiring/new" className="btn-primary">
          New Proposal
        </Link>
      </div>

      {/* Status Pipeline */}
      <div className="card p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Proposal Pipeline</h3>
        <div className="grid grid-cols-6 gap-4">
          <PipelineStage label="Draft" count={statusCounts.DRAFT} color="slate" />
          <PipelineStage label="Submitted" count={statusCounts.SUBMITTED} color="blue" />
          <PipelineStage label="HR Review" count={statusCounts.HR_REVIEW} color="purple" />
          <PipelineStage label="Finance Review" count={statusCounts.FINANCE_REVIEW} color="amber" />
          <PipelineStage label="Approved" count={statusCounts.APPROVED} color="emerald" />
          <PipelineStage label="Rejected" count={statusCounts.REJECTED} color="rose" />
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totalPositions}</p>
            <p className="text-xs text-slate-500">Total Positions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{approvedPositions}</p>
            <p className="text-xs text-slate-500">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{totalPositions - approvedPositions}</p>
            <p className="text-xs text-slate-500">Pending/Draft</p>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${getStatusIconBg(proposal.status)}`}>
                  <UserPlusIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{proposal.positionTitle}</h3>
                  <p className="text-sm text-slate-500">
                    {proposal.department.name} • {proposal.quantity} position{proposal.quantity > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <StatusBadge status={proposal.status} />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4">
              <InfoCell label="Role" value={proposal.role?.name || 'Custom'} />
              <InfoCell label="Proposed Salary" value={formatCurrency(proposal.proposedSalary)} />
              <InfoCell label="Start Month" value={getMonthName(proposal.startMonth)} />
              <InfoCell label="Proposed By" value={proposal.proposer.name} />
            </div>

            {proposal.role?.payGrade && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">Pay Grade Range:</span>
                  <span className="text-xs text-slate-700">
                    {formatCurrency(proposal.role.payGrade.minSalary)} - {formatCurrency(proposal.role.payGrade.maxSalary)}
                  </span>
                  {proposal.proposedSalary < proposal.role.payGrade.minSalary && (
                    <span className="text-xs text-amber-600 font-medium">Below minimum</span>
                  )}
                  {proposal.proposedSalary > proposal.role.payGrade.maxSalary && (
                    <span className="text-xs text-rose-600 font-medium">Above maximum</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600">{proposal.justification}</p>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href={`/hiring/${proposal.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View Details
              </Link>
              {['SUBMITTED', 'HR_REVIEW', 'FINANCE_REVIEW'].includes(proposal.status) && (
                <>
                  <span className="text-slate-300">|</span>
                  <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                    Approve
                  </button>
                  <span className="text-slate-300">|</span>
                  <button className="text-sm font-medium text-rose-600 hover:text-rose-700">
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {proposals.length === 0 && (
          <div className="card p-12 text-center">
            <UserPlusIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No hiring proposals</h3>
            <p className="mt-2 text-slate-500">Create proposals for new positions in your departments.</p>
            <Link href="/hiring/new" className="btn-primary mt-4 inline-block">
              Create Proposal
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function PipelineStage({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className={`p-3 rounded-lg text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    HR_REVIEW: 'bg-purple-100 text-purple-700',
    FINANCE_REVIEW: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function getStatusIconBg(status: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-400',
    SUBMITTED: 'bg-blue-500',
    HR_REVIEW: 'bg-purple-500',
    FINANCE_REVIEW: 'bg-amber-500',
    APPROVED: 'bg-emerald-500',
    REJECTED: 'bg-rose-500',
  }
  return styles[status] || styles.DRAFT
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function getMonthName(month: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month - 1] || 'Unknown'
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}
