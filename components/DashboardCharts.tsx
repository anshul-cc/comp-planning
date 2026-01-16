'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DepartmentData {
  name: string
  budget: number
  allocated: number
}

export function DashboardCharts({
  departmentData,
}: {
  departmentData: DepartmentData[]
}) {
  if (departmentData.length === 0) {
    return (
      <div className="card p-6 h-full">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Budget by Department
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <p className="font-medium">No budget data available</p>
            <p className="text-sm mt-1">Create an AOP to see the chart</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Budget by Department
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <span className="text-slate-600">Budget</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <span className="text-slate-600">Allocated</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={departmentData} barGap={8}>
          <defs>
            <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="allocatedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              padding: '12px 16px',
            }}
            labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
          />
          <Bar
            dataKey="budget"
            name="Budget"
            fill="url(#budgetGradient)"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="allocated"
            name="Allocated"
            fill="url(#allocatedGradient)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
