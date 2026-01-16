'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface ReportData {
  departments: {
    name: string
    budget: number
    allocated: number
    remaining: number
    utilization: number
  }[]
  allocationsByType: {
    type: string
    amount: number
  }[]
  summary: {
    totalBudget: number
    totalAllocated: number
    totalEmployees: number
    avgAllocationPerEmployee: number
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const TYPE_LABELS: Record<string, string> = {
  BASE_SALARY: 'Base Salary',
  MERIT_INCREASE: 'Merit Increase',
  BONUS: 'Bonus',
  EQUITY: 'Equity',
  OTHER: 'Other',
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    const [plansRes, allocationsRes, employeesRes] = await Promise.all([
      fetch('/api/aop'),
      fetch('/api/budgets'),
      fetch('/api/employees'),
    ])

    const plans = await plansRes.json()
    const allocations = await allocationsRes.json()
    const employees = await employeesRes.json()

    // Process department data
    const departments = plans.map((plan: { department: { name: string }; totalBudget: number; allocations: { amount: number }[] }) => {
      const allocated = plan.allocations.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0)
      return {
        name: plan.department.name,
        budget: plan.totalBudget,
        allocated,
        remaining: plan.totalBudget - allocated,
        utilization: plan.totalBudget > 0 ? allocated / plan.totalBudget : 0,
      }
    })

    // Process allocations by type
    const typeMap = new Map<string, number>()
    allocations.forEach((a: { type: string; amount: number }) => {
      const current = typeMap.get(a.type) || 0
      typeMap.set(a.type, current + a.amount)
    })

    const allocationsByType = Array.from(typeMap.entries()).map(([type, amount]) => ({
      type: TYPE_LABELS[type] || type,
      amount,
    }))

    // Calculate summary
    const totalBudget = departments.reduce((sum: number, d: { budget: number }) => sum + d.budget, 0)
    const totalAllocated = departments.reduce((sum: number, d: { allocated: number }) => sum + d.allocated, 0)

    setData({
      departments,
      allocationsByType,
      summary: {
        totalBudget,
        totalAllocated,
        totalEmployees: employees.length,
        avgAllocationPerEmployee: employees.length > 0 ? totalAllocated / employees.length : 0,
      },
    })
    setLoading(false)
  }

  const handleExport = () => {
    if (!data) return

    const csvContent = [
      ['Department', 'Budget', 'Allocated', 'Remaining', 'Utilization'],
      ...data.departments.map((d) => [
        d.name,
        d.budget,
        d.allocated,
        d.remaining,
        `${(d.utilization * 100).toFixed(1)}%`,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  if (!data) {
    return <div className="flex justify-center py-12">No data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Budget utilization and analytics
          </p>
        </div>
        <button onClick={handleExport} className="btn-primary">
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-500">Total Budget</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(data.summary.totalBudget)}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-500">Total Allocated</p>
          <p className="mt-2 text-3xl font-semibold text-primary-600">
            {formatCurrency(data.summary.totalAllocated)}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-500">Total Employees</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {data.summary.totalEmployees}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-500">Avg. Per Employee</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(data.summary.avgAllocationPerEmployee)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Budget by Department
          </h3>
          {data.departments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#3b82f6" />
                <Bar dataKey="allocated" name="Allocated" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Allocations by Type
          </h3>
          {data.allocationsByType.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.allocationsByType}
                  dataKey="amount"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ type, percent }) =>
                    `${type} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {data.allocationsByType.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Department Utilization
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Allocated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Remaining
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Utilization
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.departments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No departments found
                </td>
              </tr>
            ) : (
              data.departments.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {dept.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatCurrency(dept.budget)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatCurrency(dept.allocated)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatCurrency(dept.remaining)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${Math.min(dept.utilization * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatPercent(dept.utilization)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
