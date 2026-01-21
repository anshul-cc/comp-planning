'use client'

import { useState, useRef, useEffect } from 'react'

// Types
export interface ApprovalChainAssignee {
  id?: string
  assigneeType: 'ROLE' | 'USER'
  roleType?: string
  userId?: string
  userName?: string
}

export interface ApprovalChainLevel {
  id?: string
  level: number
  name?: string
  assignees: ApprovalChainAssignee[]
}

interface User {
  id: string
  name: string
  email: string
}

interface ApprovalChainBuilderProps {
  levels: ApprovalChainLevel[]
  onChange: (levels: ApprovalChainLevel[]) => void
  users?: User[]
  disabled?: boolean
}

const AVAILABLE_ROLES = [
  { value: 'REPORTING_MANAGER', label: 'Reporting Manager' },
  { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
  { value: 'BU_LEADER', label: 'Business Unit Leader' },
  { value: 'HR_ADMIN', label: 'HR Admin' },
  { value: 'COMPENSATION_MANAGER', label: 'Compensation Manager' },
]

export function ApprovalChainBuilder({ levels, onChange, users = [], disabled = false }: ApprovalChainBuilderProps) {
  // Collect all selected roles across all levels
  const selectedRoles = levels.flatMap((level) =>
    level.assignees
      .filter((a) => a.assigneeType === 'ROLE' && a.roleType)
      .map((a) => a.roleType!)
  )

  const addLevel = () => {
    const newLevel: ApprovalChainLevel = {
      level: levels.length + 1,
      assignees: [],
    }
    onChange([...levels, newLevel])
  }

  const removeLevel = (levelIndex: number) => {
    const newLevels = levels
      .filter((_, i) => i !== levelIndex)
      .map((level, i) => ({ ...level, level: i + 1 }))
    onChange(newLevels)
  }

  const addAssignee = (levelIndex: number, assignee: ApprovalChainAssignee) => {
    const newLevels = levels.map((level, i) => {
      if (i === levelIndex) {
        return { ...level, assignees: [...level.assignees, assignee] }
      }
      return level
    })
    onChange(newLevels)
  }

  const removeAssignee = (levelIndex: number, assigneeIndex: number) => {
    const newLevels = levels.map((level, i) => {
      if (i === levelIndex) {
        return {
          ...level,
          assignees: level.assignees.filter((_, j) => j !== assigneeIndex),
        }
      }
      return level
    })
    onChange(newLevels)
  }

  return (
    <div className="space-y-4">
      {levels.map((level, levelIndex) => (
        <LevelCard
          key={level.id || levelIndex}
          level={level}
          levelIndex={levelIndex}
          users={users}
          disabled={disabled}
          selectedRoles={selectedRoles}
          onRemoveLevel={() => removeLevel(levelIndex)}
          onAddAssignee={(assignee) => addAssignee(levelIndex, assignee)}
          onRemoveAssignee={(assigneeIndex) => removeAssignee(levelIndex, assigneeIndex)}
        />
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={addLevel}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add New Level
        </button>
      )}
    </div>
  )
}

// Level Card Component
interface LevelCardProps {
  level: ApprovalChainLevel
  levelIndex: number
  users: User[]
  disabled: boolean
  selectedRoles: string[]
  onRemoveLevel: () => void
  onAddAssignee: (assignee: ApprovalChainAssignee) => void
  onRemoveAssignee: (assigneeIndex: number) => void
}

function LevelCard({
  level,
  levelIndex,
  users,
  disabled,
  selectedRoles,
  onRemoveLevel,
  onAddAssignee,
  onRemoveAssignee,
}: LevelCardProps) {
  const [showSelector, setShowSelector] = useState(false)

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Level {level.level}
          </span>
          <span className="text-sm font-semibold text-slate-900">Approval</span>
        </div>
        {!disabled && levelIndex > 0 && (
          <button
            type="button"
            onClick={onRemoveLevel}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <label className="block text-xs font-medium text-slate-600 mb-2">Assignees</label>
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg min-h-[48px]">
          {level.assignees.map((assignee, assigneeIndex) => (
            <AssigneeChip
              key={assignee.id || assigneeIndex}
              assignee={assignee}
              disabled={disabled}
              onRemove={() => onRemoveAssignee(assigneeIndex)}
            />
          ))}

          {!disabled && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSelector(!showSelector)}
                className="text-sm text-slate-400 hover:text-emerald-600 transition-colors px-2"
              >
                Role / Employee
              </button>
              {showSelector && (
                <AssigneeSelector
                  users={users}
                  selectedRoles={selectedRoles}
                  onSelect={(assignee) => {
                    onAddAssignee(assignee)
                    setShowSelector(false)
                  }}
                  onClose={() => setShowSelector(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Assignee Chip Component
interface AssigneeChipProps {
  assignee: ApprovalChainAssignee
  disabled: boolean
  onRemove: () => void
}

function AssigneeChip({ assignee, disabled, onRemove }: AssigneeChipProps) {
  const label =
    assignee.assigneeType === 'ROLE'
      ? AVAILABLE_ROLES.find((r) => r.value === assignee.roleType)?.label || assignee.roleType
      : assignee.userName || 'User'

  const initials = label
    ?.split(' ')
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
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="text-teal-600 hover:text-teal-800 transition-colors"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// Assignee Selector Dropdown
interface AssigneeSelectorProps {
  users: User[]
  selectedRoles: string[]
  onSelect: (assignee: ApprovalChainAssignee) => void
  onClose: () => void
}

function AssigneeSelector({ users, selectedRoles, onSelect, onClose }: AssigneeSelectorProps) {
  const [tab, setTab] = useState<'roles' | 'users'>('roles')
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Filter out already-selected roles
  const availableRoles = AVAILABLE_ROLES.filter(
    (role) => !selectedRoles.includes(role.value)
  )

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50"
    >
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('roles')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'roles'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Roles
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'users'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Employees
        </button>
      </div>

      {tab === 'roles' ? (
        <div className="max-h-48 overflow-y-auto py-1">
          {availableRoles.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">All roles have been assigned</p>
          ) : (
            availableRoles.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() =>
                  onSelect({ assigneeType: 'ROLE', roleType: role.value })
                }
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {role.label}
              </button>
            ))
          )}
        </div>
      ) : (
        <div>
          <div className="p-2">
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No employees found</p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() =>
                    onSelect({
                      assigneeType: 'USER',
                      userId: user.id,
                      userName: user.name,
                    })
                  }
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-700">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
