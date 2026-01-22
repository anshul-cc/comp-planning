'use client'

import { formatCurrency } from '@/lib/utils'
import { useCallback } from 'react'

interface JobRole {
  id: string
  name: string
  code: string
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

interface PlanningGridProps {
  entries: PlanEntry[]
  totals: Totals
  onUpdateEntry: (entry: Partial<PlanEntry> & { jobRoleId: string; jobLevelId: string }) => void
  onDeleteEntry?: (jobRoleId: string, jobLevelId: string) => void
  disabled?: boolean
}

export function PlanningGrid({
  entries,
  totals,
  onUpdateEntry,
  onDeleteEntry,
  disabled = false,
}: PlanningGridProps) {
  const handleChange = useCallback(
    (entry: PlanEntry, field: keyof PlanEntry, value: number) => {
      const updated = {
        ...entry,
        [field]: value,
      }

      // Recalculate payroll impact
      const totalHires = updated.q1Hires + updated.q2Hires + updated.q3Hires + updated.q4Hires
      updated.totalPayrollImpact = totalHires * updated.avgCompensation

      onUpdateEntry({
        jobRoleId: entry.jobRoleId,
        jobLevelId: entry.jobLevelId,
        [field]: value,
        totalPayrollImpact: updated.totalPayrollImpact,
      })
    },
    [onUpdateEntry]
  )

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
              Role + Level
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
              Current
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
              Q1
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
              Q2
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
              Q3
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
              Q4
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
              Exits
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
              Net
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-28">
              Avg Comp
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
              Payroll Impact
            </th>
            {onDeleteEntry && !disabled && (
              <th className="px-2 py-3 w-10"></th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {entries.map((entry) => {
            const totalHires = entry.q1Hires + entry.q2Hires + entry.q3Hires + entry.q4Hires
            const netChange = totalHires - entry.plannedExits

            return (
              <tr key={`${entry.jobRoleId}-${entry.jobLevelId}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div className="font-medium text-slate-900">
                    {entry.jobRole.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.jobLevel.levelCode}: {entry.jobLevel.levelName}
                    {entry.jobLevel.payGrade && (
                      <span className="ml-1 text-slate-400">({entry.jobLevel.payGrade.code})</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={entry.currentHeadcount}
                    onChange={(e) => handleChange(entry, 'currentHeadcount', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={entry.q1Hires}
                    onChange={(e) => handleChange(entry, 'q1Hires', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={entry.q2Hires}
                    onChange={(e) => handleChange(entry, 'q2Hires', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={entry.q3Hires}
                    onChange={(e) => handleChange(entry, 'q3Hires', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={entry.q4Hires}
                    onChange={(e) => handleChange(entry, 'q4Hires', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={entry.plannedExits}
                    onChange={(e) => handleChange(entry, 'plannedExits', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-sm font-medium ${
                      netChange > 0
                        ? 'text-emerald-600'
                        : netChange < 0
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {netChange > 0 ? '+' : ''}
                    {netChange}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <span className="text-slate-400 text-sm mr-1">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="w-24 px-2 py-1 text-right text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      value={entry.avgCompensation}
                      onChange={(e) => handleChange(entry, 'avgCompensation', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-900 font-medium">
                  {formatCurrency(entry.totalPayrollImpact)}
                </td>
                {onDeleteEntry && !disabled && (
                  <td className="px-2 py-3">
                    <button
                      onClick={() => onDeleteEntry(entry.jobRoleId, entry.jobLevelId)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Remove row"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}

          {/* Totals Row */}
          <tr className="bg-slate-100 font-medium">
            <td className="px-4 py-3 text-slate-900 sticky left-0 bg-slate-100 z-10">
              Total
            </td>
            <td className="px-4 py-3 text-center text-slate-900">
              {totals.currentHeadcount}
            </td>
            <td className="px-4 py-3 text-center text-slate-900">{totals.q1Hires}</td>
            <td className="px-4 py-3 text-center text-slate-900">{totals.q2Hires}</td>
            <td className="px-4 py-3 text-center text-slate-900">{totals.q3Hires}</td>
            <td className="px-4 py-3 text-center text-slate-900">{totals.q4Hires}</td>
            <td className="px-4 py-3 text-center text-slate-900">{totals.plannedExits}</td>
            <td className="px-4 py-3 text-center">
              <span
                className={`font-medium ${
                  totals.netChange > 0
                    ? 'text-emerald-600'
                    : totals.netChange < 0
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                {totals.netChange > 0 ? '+' : ''}
                {totals.netChange}
              </span>
            </td>
            <td className="px-4 py-3 text-right text-slate-500">-</td>
            <td className="px-4 py-3 text-right text-slate-900">
              {formatCurrency(totals.totalPayrollImpact)}
            </td>
            {onDeleteEntry && !disabled && <td className="px-2 py-3"></td>}
          </tr>
        </tbody>
      </table>

      {entries.length === 0 && (
        <div className="p-12 text-center text-slate-500">
          No entries yet. Click &quot;Add Role&quot; to start planning.
        </div>
      )}
    </div>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}
