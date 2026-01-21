'use client'

import { useState, useEffect } from 'react'
import { RESOURCES } from '@/lib/permissions'

interface SystemRole {
  id: string
  name: string
  code: string
  description: string | null
  isSystemRole: boolean
  _count: { users: number }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  systemRole: {
    id: string
    name: string
    code: string
  } | null
  managedBusinessUnits: Array<{
    id: string
    name: string
    code: string
  }>
  managedDepartments: Array<{
    id: string
    name: string
    code: string
  }>
}

interface CurrentUser {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

export default function RolesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [editingEmailUserId, setEditingEmailUserId] = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, meRes] = await Promise.all([
        fetch('/api/users', { credentials: 'include' }),
        fetch('/api/system-roles', { credentials: 'include' }),
        fetch('/api/users/me', { credentials: 'include' }),
      ])

      if (!usersRes.ok || !rolesRes.ok || !meRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [usersData, rolesData, meData] = await Promise.all([
        usersRes.json(),
        rolesRes.json(),
        meRes.json(),
      ])

      setUsers(usersData)
      setSystemRoles(rolesData)
      setCurrentUser(meData)
    } catch (err) {
      setError('Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePassword = async (userId: string) => {
    if (!editPassword.trim()) return

    setSavingPassword(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: editPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update password')
      }

      setEditingPasswordUserId(null)
      setEditPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveEmail = async (userId: string) => {
    if (!editEmail.trim()) return

    setSavingEmail(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: editEmail }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update email')
      }

      setEditingEmailUserId(null)
      setEditEmail('')
      fetchData() // Refresh to show updated email
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setSavingEmail(false)
    }
  }

  // Group users by their system role
  const groupedUsers = users.reduce((acc, user) => {
    const roleName = user.systemRole?.name || 'No Role Assigned'
    if (!acc[roleName]) {
      acc[roleName] = []
    }
    acc[roleName].push(user)
    return acc
  }, {} as Record<string, User[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Roles & Users</h1>
          <p className="mt-1 text-slate-500">Manage system roles and user access</p>
        </div>
        {currentUser?.isSuperAdmin && (
          <div className="flex gap-3">
            <div className="relative group">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="btn-primary"
              >
                Add New User
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Create a user with a system role
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="btn"
              >
                Add New Role
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Define a custom role with permissions
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(groupedUsers).map(([roleName, roleUsers]) => (
          <div key={roleName}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-indigo-500" />
              {roleName}
              <span className="text-sm font-normal text-slate-500">({roleUsers.length} users)</span>
            </h2>
            <div className="card overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      BU / Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Email
                    </th>
                    {currentUser?.isSuperAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Password
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {roleUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="ml-3 font-medium text-slate-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                          {user.systemRole?.name || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {user.managedBusinessUnits.map((bu) => (
                            <span key={bu.id} className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                              BU: {bu.name}
                            </span>
                          ))}
                          {user.managedDepartments.map((dept) => (
                            <span key={dept.id} className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                              Dept: {dept.name}
                            </span>
                          ))}
                          {user.managedBusinessUnits.length === 0 && user.managedDepartments.length === 0 && (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {currentUser?.isSuperAdmin && editingEmailUserId === user.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email address"
                              className="input py-1 px-2 text-sm w-48"
                            />
                            <button
                              onClick={() => handleSaveEmail(user.id)}
                              disabled={savingEmail || !editEmail.trim()}
                              className="text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            >
                              {savingEmail ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingEmailUserId(null)
                                setEditEmail('')
                              }}
                              className="text-sm text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{user.email}</span>
                            {currentUser?.isSuperAdmin && (
                              <button
                                onClick={() => {
                                  setEditingEmailUserId(user.id)
                                  setEditEmail(user.email)
                                }}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {currentUser?.isSuperAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingPasswordUserId === user.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                placeholder="New password"
                                className="input py-1 px-2 text-sm w-32"
                              />
                              <button
                                onClick={() => handleSavePassword(user.id)}
                                disabled={savingPassword || !editPassword.trim()}
                                className="text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              >
                                {savingPassword ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPasswordUserId(null)
                                  setEditPassword('')
                                }}
                                className="text-sm text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-mono">••••••••</span>
                              <button
                                onClick={() => setEditingPasswordUserId(user.id)}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="card p-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No users found</h3>
            <p className="mt-2 text-slate-500">Add users to get started with role management.</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          systemRoles={systemRoles}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            setShowAddUserModal(false)
            fetchData()
          }}
        />
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <AddRoleModal
          onClose={() => setShowAddRoleModal(false)}
          onSuccess={() => {
            setShowAddRoleModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// Add User Modal Component
function AddUserModal({
  systemRoles,
  onClose,
  onSuccess,
}: {
  systemRoles: SystemRole[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    systemRoleId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Add New User</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              required
              className="input w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              required
              className="input w-full"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              required
              className="input w-full"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">System Role *</label>
            <select
              required
              className="input w-full"
              value={formData.systemRoleId}
              onChange={(e) => setFormData({ ...formData, systemRoleId: e.target.value })}
            >
              <option value="">Select a role</option>
              {systemRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Role Modal Component
function AddRoleModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  })
  const [permissions, setPermissions] = useState<Record<string, { actions: string[]; scope: string }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resources = Object.entries(RESOURCES).map(([key, value]) => ({
    key,
    value,
    label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
  }))

  const actions = ['view', 'create', 'edit', 'delete', 'approve']
  const scopes = [
    { value: 'own', label: 'Own' },
    { value: 'department', label: 'Department' },
    { value: 'cost_center', label: 'Cost Center' },
    { value: 'bu', label: 'Business Unit' },
    { value: 'all', label: 'All' },
  ]

  const toggleAction = (resource: string, action: string) => {
    setPermissions((prev) => {
      const current = prev[resource] || { actions: [], scope: 'own' }
      const hasAction = current.actions.includes(action)

      if (hasAction) {
        return {
          ...prev,
          [resource]: {
            ...current,
            actions: current.actions.filter((a) => a !== action),
          },
        }
      } else {
        return {
          ...prev,
          [resource]: {
            ...current,
            actions: [...current.actions, action],
          },
        }
      }
    })
  }

  const setScope = (resource: string, scope: string) => {
    setPermissions((prev) => ({
      ...prev,
      [resource]: {
        ...prev[resource] || { actions: [] },
        scope,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Convert permissions to array format
    const permissionsArray = Object.entries(permissions)
      .filter(([_, value]) => value.actions.length > 0)
      .map(([resource, value]) => ({
        resource,
        actions: value.actions,
        scope: value.scope,
      }))

    try {
      const res = await fetch('/api/system-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          permissions: permissionsArray,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create role')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 my-8 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Role</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role Name *</label>
              <input
                type="text"
                required
                className="input w-full"
                placeholder="e.g., Regional Manager"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role Code *</label>
              <input
                type="text"
                required
                className="input w-full"
                placeholder="e.g., REGIONAL_MANAGER"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Brief description of this role"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Permissions</label>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Resource</th>
                    {actions.map((action) => (
                      <th key={action} className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                        {action}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Scope</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {resources.map(({ key, value, label }) => (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-700">{label}</td>
                      {actions.map((action) => (
                        <td key={action} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={permissions[value]?.actions.includes(action) || false}
                            onChange={() => toggleAction(value, action)}
                            className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <select
                          value={permissions[value]?.scope || 'own'}
                          onChange={(e) => setScope(value, e.target.value)}
                          className="input py-1 px-2 text-sm"
                          disabled={!permissions[value]?.actions.length}
                        >
                          {scopes.map((scope) => (
                            <option key={scope.value} value={scope.value}>
                              {scope.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Role'}
            </button>
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}
