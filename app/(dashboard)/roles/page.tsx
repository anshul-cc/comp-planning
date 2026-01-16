import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

async function getRoles() {
  return prisma.role.findMany({
    include: {
      department: true,
      payGrade: true,
      _count: {
        select: { employees: true },
      },
    },
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
  })
}

export default async function RolesPage() {
  const roles = await getRoles()

  // Group roles by department
  const groupedRoles = roles.reduce((acc, role) => {
    const deptName = role.department.name
    if (!acc[deptName]) {
      acc[deptName] = []
    }
    acc[deptName].push(role)
    return acc
  }, {} as Record<string, typeof roles>)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Roles</h1>
          <p className="mt-1 text-slate-500">Manage job roles and their associated pay grades</p>
        </div>
        <Link href="/roles/new" className="btn-primary">
          New Role
        </Link>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedRoles).map(([deptName, deptRoles]) => (
          <div key={deptName}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BuildingIcon className="h-5 w-5 text-slate-400" />
              {deptName}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deptRoles.map((role) => (
                <div key={role.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{role.name}</h3>
                      <p className="text-sm text-slate-500">{role.code}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                      {role._count.employees} employees
                    </span>
                  </div>

                  {role.payGrade && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Pay Grade</span>
                        <span className="text-xs font-semibold text-slate-700">{role.payGrade.name}</span>
                      </div>
                      <div className="space-y-1">
                        <SalaryRow label="Min" value={role.payGrade.minSalary} />
                        <SalaryRow label="Mid" value={role.payGrade.midSalary} highlight />
                        <SalaryRow label="Max" value={role.payGrade.maxSalary} />
                      </div>
                    </div>
                  )}

                  {!role.payGrade && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg text-center">
                      <p className="text-xs text-amber-700">No pay grade assigned</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <Link
                      href={`/roles/${role.id}`}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/employees?role=${role.id}`}
                      className="text-sm font-medium text-slate-600 hover:text-slate-700"
                    >
                      View Employees
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="card p-12 text-center">
            <BriefcaseIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No roles defined</h3>
            <p className="mt-2 text-slate-500">Create roles to organize your workforce structure.</p>
            <Link href="/roles/new" className="btn-primary mt-4 inline-block">
              Create Role
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function SalaryRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? 'font-semibold text-emerald-600' : 'text-slate-700'}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  )
}
