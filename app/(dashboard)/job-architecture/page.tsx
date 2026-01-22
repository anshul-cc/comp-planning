import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getJobFamilies() {
  const jobFamilies = await prisma.jobFamily.findMany({
    include: {
      jobSubFamilies: {
        include: {
          _count: {
            select: { jobRoles: true },
          },
        },
      },
      _count: {
        select: { jobSubFamilies: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Get total counts
  const [totalRoles, totalLevels] = await Promise.all([
    prisma.jobRole.count(),
    prisma.jobLevel.count(),
  ])

  return { jobFamilies, totalRoles, totalLevels }
}

export default async function JobArchitecturePage() {
  const { jobFamilies, totalRoles, totalLevels } = await getJobFamilies()

  const totalSubFamilies = jobFamilies.reduce(
    (sum, f) => sum + f._count.jobSubFamilies,
    0
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Job Architecture</h1>
          <p className="mt-1 text-slate-500">
            Manage job families, sub-families, roles, and levels
          </p>
        </div>
        <Link href="/job-architecture/new" className="btn-primary">
          New Job Family
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Job Families"
          value={jobFamilies.length.toString()}
          subtitle="Top-level categories"
          color="indigo"
        />
        <SummaryCard
          title="Sub-Families"
          value={totalSubFamilies.toString()}
          subtitle="Functional groupings"
          color="purple"
        />
        <SummaryCard
          title="Job Roles"
          value={totalRoles.toString()}
          subtitle="Unique positions"
          color="emerald"
        />
        <SummaryCard
          title="Job Levels"
          value={totalLevels.toString()}
          subtitle="IC1-IC3, M1-M2"
          color="amber"
        />
      </div>

      {/* Job Families Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {jobFamilies.map((family) => (
          <div key={family.id} className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {family.name}
                  </h3>
                  <p className="text-sm text-slate-500">Code: {family.code}</p>
                </div>
                <Link
                  href={`/job-architecture/${family.id}`}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View Details
                </Link>
              </div>
              {family.description && (
                <p className="mt-2 text-sm text-slate-600">{family.description}</p>
              )}
            </div>

            <div className="p-4 bg-slate-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {family._count.jobSubFamilies} sub-families
                </span>
                <span className="text-slate-500">
                  {family.jobSubFamilies.reduce((sum, sf) => sum + sf._count.jobRoles, 0)} roles
                </span>
              </div>

              {family.jobSubFamilies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {family.jobSubFamilies.slice(0, 4).map((sf) => (
                    <span
                      key={sf.id}
                      className="px-2 py-1 bg-white rounded text-xs text-slate-600 border border-slate-200"
                    >
                      {sf.name}
                    </span>
                  ))}
                  {family.jobSubFamilies.length > 4 && (
                    <span className="px-2 py-1 text-xs text-slate-500">
                      +{family.jobSubFamilies.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {jobFamilies.length === 0 && (
        <div className="card p-12 text-center">
          <FolderTreeIcon className="h-12 w-12 mx-auto text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            No job families yet
          </h3>
          <p className="mt-2 text-slate-500">
            Create job families to organize your roles and levels.
          </p>
          <Link href="/job-architecture/new" className="btn-primary mt-4 inline-block">
            Create Job Family
          </Link>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string
  subtitle: string
  color: 'indigo' | 'purple' | 'emerald' | 'amber'
}) {
  const bgColors = {
    indigo: 'from-indigo-50 to-blue-50',
    purple: 'from-purple-50 to-fuchsia-50',
    emerald: 'from-emerald-50 to-teal-50',
    amber: 'from-amber-50 to-orange-50',
  }

  return (
    <div className={`card p-6 bg-gradient-to-br ${bgColors[color]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function FolderTreeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
      />
    </svg>
  )
}
