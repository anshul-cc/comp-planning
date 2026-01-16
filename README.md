# Compensation Management System

A comprehensive Annual Operating Plan (AOP), Budget, Headcount, and Compensation Management System built with Next.js 14.

## Features

### Budget Management
- Create and manage budget allocations by department and cost center
- Track salary, benefits, and hiring budgets separately
- Real-time budget utilization tracking
- Multi-level approval workflows

### Headcount Planning
- Plan and track headcount by department
- Compare planned vs actual headcount
- Monitor wage budget allocation
- Approve/reject headcount requests

### Hiring Proposals
- Submit hiring requests with justification
- Multi-stage approval process (HR → Finance)
- Link proposals to roles and pay grades
- Track proposal status through workflow

### Compensation Management
- Manage compensation cycles (merit increases, bonuses, promotions)
- Track salary revisions and adjustments
- Compare current vs proposed salaries
- Percentage-based increase calculations

### Expense Tracking
- Track OPEX expenses by category
- Monthly expense recording
- Forecast vs actual comparison
- Cost center-based reporting

### Planning Cycles
- Flexible cycle types (Annual, Half-Yearly, Quarterly)
- Status workflow (Draft → Planning → Active → Closed)
- All budgets and plans linked to cycles

### Organization Structure
- Hierarchical department management
- Role and pay grade configuration
- Cost center assignments
- Employee management with full profiles

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **ORM:** Prisma
- **Authentication:** NextAuth.js with JWT
- **Styling:** Tailwind CSS
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone git@github.com:anshul-cc/experiment.git
cd experiment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Initialize the database:
```bash
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
DATABASE_URL=file:./dev.db          # SQLite for development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

For production with PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Demo Credentials

| Role    | Email              | Password      |
|---------|-------------------|---------------|
| Admin   | admin@example.com | password123   |

Available roles: `ADMIN`, `HR`, `FINANCE`, `MANAGER`, `USER`

## Project Structure

```
├── app/
│   ├── (dashboard)/        # Main application pages
│   │   ├── aop/            # Annual Operating Plan
│   │   ├── approvals/      # Approval workflows
│   │   ├── budgets/        # Budget management
│   │   ├── compensation/   # Compensation cycles
│   │   ├── cycles/         # Planning cycles
│   │   ├── departments/    # Department management
│   │   ├── employees/      # Employee directory
│   │   ├── expenses/       # OPEX tracking
│   │   ├── headcount/      # Headcount planning
│   │   ├── hiring/         # Hiring proposals
│   │   ├── pay-grades/     # Pay grade configuration
│   │   ├── reports/        # Reporting dashboard
│   │   └── roles/          # Role management
│   ├── api/                # REST API routes
│   └── login/              # Authentication
├── components/             # Reusable React components
├── lib/                    # Utilities and configurations
├── prisma/                 # Database schema and migrations
└── types/                  # TypeScript type definitions
```

## Available Scripts

| Command            | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start development server       |
| `npm run build`   | Create production build        |
| `npm run start`   | Start production server        |
| `npm run lint`    | Run ESLint                     |
| `npm run db:migrate` | Run database migrations     |
| `npm run db:push` | Push schema to database        |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio           |

## Database Schema

Key entities and their relationships:

- **User** - Authentication and role-based access control
- **Department** - Hierarchical org structure with parent/child relationships
- **Employee** - Staff records linked to departments, roles, and pay grades
- **PlanningCycle** - Time-bound planning periods with status workflow
- **BudgetAllocation** - Budget assignments per department/cost center
- **HeadcountPlan** - Staffing plans with planned vs actual tracking
- **HiringProposal** - New hire requests with multi-stage approval
- **CompensationAction** - Salary changes, bonuses, and promotions
- **Expense** - OPEX expense records by category and month
- **Approval** - Polymorphic approval records for workflows

## License

MIT
