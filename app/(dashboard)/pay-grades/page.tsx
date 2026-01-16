import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

async function getPayGrades() {
  return prisma.payGrade.findMany({
    orderBy: { level: 'asc' },
    include: {
      _count: {
        select: { employees: true, roles: true },
      },
      employees: {
        select: { currentSalary: true },
      },
    },
  })
}

export default async function PayGradesPage() {
  const payGrades = await getPayGrades()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pay Grades</h1>
          <p className="mt-1 text-slate-500">Define salary bands and compensation levels</p>
        </div>
        <Link href="/pay-grades/new" className="btn-primary">
          New Pay Grade
        </Link>
      </div>

      {/* Pay Grade Cards */}
      <div className="grid gap-6">
        {payGrades.map((grade) => {
          const avgSalary = grade.employees.length > 0
            ? grade.employees.reduce((sum, e) => sum + e.currentSalary, 0) / grade.employees.length
            : 0
          const belowMin = grade.employees.filter((e) => e.currentSalary < grade.minSalary).length
          const aboveMax = grade.employees.filter((e) => e.currentSalary > grade.maxSalary).length
          const inRange = grade.employees.length - belowMin - aboveMax

          return (
            <div key={grade.id} className="card overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">L{grade.level}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{grade.name}</h3>
                      <p className="text-sm text-slate-500">Level {grade.level}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {grade._count.roles} roles
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {grade._count.employees} employees
                    </span>
                  </div>
                </div>

                {/* Salary Range Visualization */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>Min: {formatCurrency(grade.minSalary)}</span>
                    <span>Mid: {formatCurrency(grade.midSalary)}</span>
                    <span>Max: {formatCurrency(grade.maxSalary)}</span>
                  </div>
                  <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                    {/* Range Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />
                    {/* Mid Point Marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-emerald-600"
                      style={{ left: '50%' }}
                    />
                    {/* Employee Dots */}
                    {grade.employees.map((emp, idx) => {
                      const position = ((emp.currentSalary - grade.minSalary) / (grade.maxSalary - grade.minSalary)) * 100
                      const clampedPosition = Math.max(0, Math.min(100, position))
                      const isOutOfRange = emp.currentSalary < grade.minSalary || emp.currentSalary > grade.maxSalary
                      return (
                        <div
                          key={idx}
                          className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white shadow ${
                            isOutOfRange ? 'bg-rose-500' : 'bg-emerald-600'
                          }`}
                          style={{ left: `${clampedPosition}%` }}
                          title={formatCurrency(emp.currentSalary)}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                  <StatBox
                    label="Salary Range"
                    value={`${formatCurrency(grade.maxSalary - grade.minSalary)}`}
                    subtext="spread"
                  />
                  <StatBox
                    label="Average Salary"
                    value={avgSalary > 0 ? formatCurrency(avgSalary) : 'N/A'}
                    subtext={avgSalary > 0 ? `${((avgSalary / grade.midSalary) * 100).toFixed(0)}% of mid` : ''}
                  />
                  <StatBox
                    label="In Range"
                    value={inRange.toString()}
                    subtext={`${grade.employees.length > 0 ? ((inRange / grade.employees.length) * 100).toFixed(0) : 0}% compliant`}
                    status="success"
                  />
                  <StatBox
                    label="Out of Range"
                    value={(belowMin + aboveMax).toString()}
                    subtext={`${belowMin} below, ${aboveMax} above`}
                    status={belowMin + aboveMax > 0 ? 'warning' : 'success'}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-slate-50 flex gap-4">
                <Link
                  href={`/pay-grades/${grade.id}`}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Edit Grade
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  href={`/employees?payGrade=${grade.id}`}
                  className="text-sm font-medium text-slate-600 hover:text-slate-700"
                >
                  View Employees
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  href={`/roles?payGrade=${grade.id}`}
                  className="text-sm font-medium text-slate-600 hover:text-slate-700"
                >
                  View Roles
                </Link>
              </div>
            </div>
          )
        })}

        {payGrades.length === 0 && (
          <div className="card p-12 text-center">
            <ScaleIcon className="h-12 w-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No pay grades defined</h3>
            <p className="mt-2 text-slate-500">Create pay grades to establish salary bands for your organization.</p>
            <Link href="/pay-grades/new" className="btn-primary mt-4 inline-block">
              Create Pay Grade
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  subtext,
  status,
}: {
  label: string
  value: string
  subtext: string
  status?: 'success' | 'warning'
}) {
  const statusColors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
  }

  return (
    <div className="bg-white p-3 rounded-lg border border-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${status ? statusColors[status] : 'text-slate-900'}`}>
        {value}
      </p>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  )
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  )
}
