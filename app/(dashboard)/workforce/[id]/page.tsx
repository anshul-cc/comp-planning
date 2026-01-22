'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScenarioSelector } from '@/components/workforce/ScenarioSelector'
import { BudgetIndicator } from '@/components/workforce/BudgetIndicator'
import { PlanningGrid } from '@/components/workforce/PlanningGrid'
import { formatCurrency } from '@/lib/utils'

interface JobRole {
  id: string
  name: string
  code: string
  levels: JobLevel[]
  subFamily?: {
    name: string
    jobFamily?: {
      name: string
    }
  }
}

interface JobLevel {
  id: string
  levelCode: string
  levelName: string
  avgSalary: number
  avgBenefits: number
  payGrade?: {
    id: string
    code: string
  }
}

interface PlanEntry {
  id?: string
  jobRoleId: string
  jobLevelId: string
  jobRole: JobRole
  jobLevel: JobLevel
  currentHeadcount: number
  q1Hires: number
  q2Hires: number
  q3Hires: number
  q4Hires: number
  plannedExits: number
  avgCompensation: number
  totalPayrollImpact: number
  notes?: string
}

interface Scenario {
  id: string
  name: string
  isBaseline: boolean
}

interface WorkforcePlan {
  id: string
  status: string
  notes?: string
  cycle: { id: string; name: string }
  department: { id: string; name: string; head?: { name: string } }
  scenarios: Scenario[]
}

interface BudgetData {
  budget: { hiringBudget: number; hasBudgetAllocation: boolean }
  payroll: { newHiresPayroll: number }
  variance: { amount: number; percent: number; status: 'UNDER' | 'ON_TRACK' | 'OVER' }
}

interface Totals {
  currentHeadcount: number
  q1Hires: number
  q2Hires: number
  q3Hires: number
  q4Hires: number
  plannedExits: number
  totalHires: number
  netChange: number
  totalPayrollImpact: number
}

export default function WorkforcePlanBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string

  const [plan, setPlan] = useState<WorkforcePlan | null>(null)
  const [entries, setEntries] = useState<PlanEntry[]>([])
  const [totals, setTotals] = useState<Totals>({
    currentHeadcount: 0,
    q1Hires: 0,
    q2Hires: 0,
    q3Hires: 0,
    q4Hires: 0,
    plannedExits: 0,
    totalHires: 0,
    netChange: 0,
    totalPayrollImpact: 0,
  })
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('')
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)

  const pendingChanges = useRef<Map<string, Partial<PlanEntry>>>(new Map())
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Load plan data
  useEffect(() => {
    fetch(`/api/workforce-plans/${planId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setPlan(data)
          const baseline = data.scenarios.find((s: Scenario) => s.isBaseline)
          setSelectedScenarioId(baseline?.id || data.scenarios[0]?.id || '')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load plan')
        setLoading(false)
      })
  }, [planId])

  // Load entries when scenario changes
  useEffect(() => {
    if (!selectedScenarioId) return

    fetch(`/api/workforce-plans/${planId}/entries?scenarioId=${selectedScenarioId}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || [])
        setTotals(data.totals || totals)
      })
      .catch(() => {
        setError('Failed to load entries')
      })
  }, [planId, selectedScenarioId])

  // Load budget check
  useEffect(() => {
    if (!selectedScenarioId) return

    fetch(`/api/workforce-plans/${planId}/budget-check?scenarioId=${selectedScenarioId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setBudgetData(data)
        }
      })
      .catch(() => {
        // Budget check is optional
      })
  }, [planId, selectedScenarioId, entries])

  // Load job roles for adding entries
  useEffect(() => {
    fetch('/api/job-families?includeHierarchy=true')
      .then((r) => r.json())
      .then((data) => {
        const families = data.data || []
        const roles: JobRole[] = []
        families.forEach((family: { subFamilies: { jobRoles: JobRole[]; name: string }[]; name: string }) => {
          family.subFamilies?.forEach((sf) => {
            sf.jobRoles?.forEach((role) => {
              roles.push({
                ...role,
                subFamily: { name: sf.name, jobFamily: { name: family.name } },
              })
            })
          })
        })
        setJobRoles(roles)
      })
      .catch(() => {
        // Optional
      })
  }, [])

  // Auto-save functionality
  const saveChanges = useCallback(async () => {
    if (pendingChanges.current.size === 0) return

    setSaving(true)
    const changes = Array.from(pendingChanges.current.values())
    pendingChanges.current.clear()

    try {
      await fetch(`/api/workforce-plans/${planId}/entries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenarioId,
          entries: changes,
        }),
      })
    } catch {
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [planId, selectedScenarioId])

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }
    autoSaveTimer.current = setTimeout(saveChanges, 2000)
  }, [saveChanges])

  // Handle entry updates
  const handleUpdateEntry = useCallback(
    (update: Partial<PlanEntry> & { jobRoleId: string; jobLevelId: string }) => {
      const key = `${update.jobRoleId}-${update.jobLevelId}`

      // Update local state immediately
      setEntries((prev) =>
        prev.map((e) =>
          e.jobRoleId === update.jobRoleId && e.jobLevelId === update.jobLevelId
            ? { ...e, ...update }
            : e
        )
      )

      // Recalculate totals
      setEntries((prev) => {
        const newTotals = prev.reduce(
          (acc, entry) => {
            const e =
              entry.jobRoleId === update.jobRoleId && entry.jobLevelId === update.jobLevelId
                ? { ...entry, ...update }
                : entry
            acc.currentHeadcount += e.currentHeadcount
            acc.q1Hires += e.q1Hires
            acc.q2Hires += e.q2Hires
            acc.q3Hires += e.q3Hires
            acc.q4Hires += e.q4Hires
            acc.plannedExits += e.plannedExits
            acc.totalPayrollImpact += e.totalPayrollImpact
            return acc
          },
          {
            currentHeadcount: 0,
            q1Hires: 0,
            q2Hires: 0,
            q3Hires: 0,
            q4Hires: 0,
            plannedExits: 0,
            totalHires: 0,
            netChange: 0,
            totalPayrollImpact: 0,
          }
        )
        newTotals.totalHires =
          newTotals.q1Hires + newTotals.q2Hires + newTotals.q3Hires + newTotals.q4Hires
        newTotals.netChange = newTotals.totalHires - newTotals.plannedExits
        setTotals(newTotals)
        return prev
      })

      // Queue for auto-save
      const existing = pendingChanges.current.get(key) || {}
      pendingChanges.current.set(key, { ...existing, ...update })
      scheduleAutoSave()
    },
    [scheduleAutoSave]
  )

  // Add new role/level
  const handleAddRole = async (roleId: string, levelId: string) => {
    const role = jobRoles.find((r) => r.id === roleId)
    const level = role?.levels.find((l) => l.id === levelId)
    if (!role || !level) return

    const newEntry: PlanEntry = {
      jobRoleId: roleId,
      jobLevelId: levelId,
      jobRole: role,
      jobLevel: level,
      currentHeadcount: 0,
      q1Hires: 0,
      q2Hires: 0,
      q3Hires: 0,
      q4Hires: 0,
      plannedExits: 0,
      avgCompensation: level.avgSalary || 0,
      totalPayrollImpact: 0,
    }

    setEntries((prev) => [...prev, newEntry])
    setShowAddRoleModal(false)

    // Save immediately
    await fetch(`/api/workforce-plans/${planId}/entries`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: selectedScenarioId,
        entries: [newEntry],
      }),
    })
  }

  // Submit for review
  const handleSubmit = async () => {
    // Save any pending changes first
    await saveChanges()

    try {
      const res = await fetch(`/api/workforce-plans/${planId}/submit`, {
        method: 'POST',
      })

      if (res.ok) {
        router.push('/workforce')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to submit')
      }
    } catch {
      setError('Failed to submit plan')
    }
  }

  const isEditable = plan?.status === 'DRAFT' || plan?.status === 'REJECTED'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="card p-12 text-center">
        <p className="text-rose-600">{error || 'Plan not found'}</p>
        <Link href="/workforce" className="btn mt-4 inline-block">
          Back to Workforce Plans
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/workforce" className="hover:text-emerald-600">
              Workforce Planning
            </Link>
            <span>/</span>
            <span>{plan.department.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{plan.department.name}</h1>
          <p className="mt-1 text-slate-500">
            {plan.cycle.name} • {plan.department.head?.name || 'No head assigned'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={plan.status} />
          {saving && <span className="text-sm text-slate-400">Saving...</span>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ScenarioSelector
            scenarios={plan.scenarios}
            selectedId={selectedScenarioId}
            onSelect={setSelectedScenarioId}
            disabled={!isEditable}
          />
          <BudgetIndicator budgetData={budgetData} />
        </div>
        <div className="flex items-center gap-3">
          {isEditable && (
            <>
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="btn"
              >
                + Add Role
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={entries.length === 0}
              >
                Submit for Review
              </button>
            </>
          )}
        </div>
      </div>

      {/* Planning Grid */}
      <div className="card overflow-hidden">
        <PlanningGrid
          entries={entries}
          totals={totals}
          onUpdateEntry={handleUpdateEntry}
          disabled={!isEditable}
        />
      </div>

      {/* Summary Footer */}
      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500">Current Headcount</p>
            <p className="text-2xl font-bold text-slate-900">{totals.currentHeadcount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total New Hires</p>
            <p className="text-2xl font-bold text-emerald-600">+{totals.totalHires}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Planned Exits</p>
            <p className="text-2xl font-bold text-rose-600">-{totals.plannedExits}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Payroll Impact</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totals.totalPayrollImpact)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <AddRoleModal
          roles={jobRoles}
          existingEntries={entries}
          onAdd={handleAddRole}
          onClose={() => setShowAddRoleModal(false)}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    LOCKED: 'bg-indigo-100 text-indigo-700',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

function AddRoleModal({
  roles,
  existingEntries,
  onAdd,
  onClose,
}: {
  roles: JobRole[]
  existingEntries: PlanEntry[]
  onAdd: (roleId: string, levelId: string) => void
  onClose: () => void
}) {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')

  const selectedRole = roles.find((r) => r.id === selectedRoleId)
  const availableLevels =
    selectedRole?.levels.filter(
      (l) =>
        !existingEntries.some(
          (e) => e.jobRoleId === selectedRoleId && e.jobLevelId === l.id
        )
    ) || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Add Role to Plan</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job Role
            </label>
            <select
              className="input w-full"
              value={selectedRoleId}
              onChange={(e) => {
                setSelectedRoleId(e.target.value)
                setSelectedLevelId('')
              }}
            >
              <option value="">Select a role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.subFamily?.jobFamily?.name} / {role.subFamily?.name} / {role.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRoleId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Level
              </label>
              <select
                className="input w-full"
                value={selectedLevelId}
                onChange={(e) => setSelectedLevelId(e.target.value)}
              >
                <option value="">Select a level...</option>
                {availableLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.levelCode}: {level.levelName}
                    {level.avgSalary > 0 && ` (${formatCurrency(level.avgSalary)})`}
                  </option>
                ))}
              </select>
              {availableLevels.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  All levels for this role have been added
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button
            onClick={() => onAdd(selectedRoleId, selectedLevelId)}
            className="btn-primary"
            disabled={!selectedRoleId || !selectedLevelId}
          >
            Add to Plan
          </button>
        </div>
      </div>
    </div>
  )
}
