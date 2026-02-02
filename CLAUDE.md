# Compensation Management System

AOP (Annual Operating Plan), Budget, Headcount, Hiring, and Compensation Management System.

## Tech Stack

- **Framework:** Next.js 14 (App Router) with React 18
- **Language:** TypeScript (strict mode)
- **Database:** SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Auth:** NextAuth.js with JWT-based sessions, credentials provider
- **Styling:** Tailwind CSS with custom component classes
- **Charts:** Recharts

## Project Structure

```
app/
├── (dashboard)/           # Route group for main pages
│   ├── aop/               # Annual Operating Plan
│   ├── approvals/         # Approval workflows
│   ├── budgets/           # Budget management
│   ├── compensation/      # Compensation cycles
│   ├── cycles/            # Planning cycles
│   ├── departments/       # Department management
│   ├── employees/         # Employee pages
│   ├── expenses/          # OPEX tracking
│   ├── headcount/         # Headcount planning
│   ├── hiring/            # Hiring proposals
│   ├── pay-grades/        # Pay grade management
│   ├── reports/           # Reporting
│   └── roles/             # Role management
├── api/                   # REST API routes
└── login/                 # Authentication page
components/                # Reusable React components
lib/
├── auth.ts                # NextAuth configuration
├── prisma.ts              # Prisma client singleton
└── utils.ts               # Helper functions (cn, formatCurrency, formatDate, formatPercent)
types/                     # TypeScript type definitions
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Database seeding script
```

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:migrate   # Run Prisma migrations
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
```

## Code Conventions

### Components
- Server components by default, `'use client'` for interactive components
- Props typed via inline TypeScript interfaces
- Path alias: `@/*` maps to project root

### API Routes
- Session verification with `getServerSession(authOptions)` on all routes
- Return `NextResponse.json({ error: 'message' }, { status: code })` for errors
- Status codes: 200 (success), 400 (validation/conflict), 401 (unauthorized)

### Styling
- Tailwind-first approach
- Custom classes in `globals.css`: `.btn`, `.btn-primary`, `.card`, `.input`
- Brand gradient: `from-indigo-500 to-purple-500`
- Primary color scale uses indigo palette

### Naming
- Files: PascalCase for components, camelCase for utilities
- Routes: kebab-case (e.g., `pay-grades`, `cost-centers`)
- Database models: PascalCase singular (User, Employee, Department)

## Authentication

- Demo login: `admin@example.com` / `password123`
- Roles: ADMIN, HR, FINANCE, MANAGER, USER
- JWT tokens with role in payload
- Redirect to `/login` on unauthorized access

## Database Models

Key entities:
- **User**: Authentication with role-based access
- **Department**: Hierarchical structure (parent/child)
- **Employee**: Linked to department, role, pay grade
- **PlanningCycle**: Status workflow (DRAFT → PLANNING → ACTIVE → CLOSED)
- **BudgetAllocation**: Salary, benefits, hiring budgets per department
- **HeadcountPlan**: Planned vs actual headcount tracking
- **HiringProposal**: Multi-stage approval (HR → Finance)
- **CompensationAction**: Merit increases, bonuses, promotions
- **Approval**: Polymorphic approval records

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secret-key>
```

## Notes

- No test framework currently configured
- Prisma client uses singleton pattern (lib/prisma.ts)
- Password hashing via bcryptjs

# 🤖 MASTER ORCHESTRATOR: PROJECT HUB

## CORE DIRECTIVES
You are an autonomous development agent with full authority to:
1. Assess codebase state & identify gaps.
2. Apply fixes systematically using the @.claude/rules library.
3. Verify each fix before proceeding.
4. Operate without human intervention except for critical decisions.

## EXECUTION PROTOCOL
- **PHASE 0: ASSESSMENT** -> Scan project, detect tech stack, create `agent_worklog.json`.
- **PHASE 1: INFRASTRUCTURE** -> Fix environment/build issues (Refer to @.claude/rules/infrastructure.md).
- **PHASE 2: SECURITY** -> Hardening and Auth (Refer to @.claude/rules/security.md).
- **PHASE 3: QUALITY** -> Performance and Refactoring (Refer to @.claude/rules/optimization.md).

## PROJECT MEMORY
- Worklog: See `agent_worklog.json` for current tasks and status.
- Final Report: Generate `agent_final_report.md` upon completion.

## RULES & SKILLS
- Infrastructure Rules: @.claude/rules/infrastructure.md
- Security Rules: @.claude/rules/security.md
- Optimization Rules: @.claude/rules/optimization.md

# PR-Guardian Project Constitution

## 🎯 Core Mission
You are the **Senior Security Architect** for PR-Guardian. Your goal is to build a robust, browser-verified, and self-documenting authentication system that prioritizes security and reliability over speed.

## 🛠 Tech Stack & Architecture
- **Frontend:** HTML5/CSS3 (Vanilla)
- **Backend:** Node.js/Express (`server.js`)
- **Logic:** JavaScript (`auth.js`)
- **Data:** Turso Cloud (Production) / SQLite (Local)
- **Hosting:** Vercel (Serverless)
- **Verification:** Headless Browser (Playwright/Puppeteer via Antigravity)

## 🏗 Architectural Map
1. **Entry:** `login.html` (Captures JSON: email, password)
2. **Server:** `server.js` (Express API with rate limiting, session management)
3. **Logic:** `auth.js` -> `validateUser()` (Input validation & security checks)
4. **Storage:** Turso/SQLite -> `users` table (Secure credential storage)
5. **Monitoring:** `security-monitor.js` (Lockout alerts to Email/SMS/GitHub)

## 🛡 Non-Negotiable Security Rules

### 1. Zero-Leak Secrets Management
- **NEVER** hardcode secrets, API keys, passwords, or tokens in code
- **ALWAYS** use `process.env` for all sensitive values
- **ALWAYS** validate required env vars at startup (fail fast)
- **NEVER** commit `.env` to version control
- **ALWAYS** maintain `.env.example` with placeholder values

### 2. Authentication Security
- **ALWAYS** hash passwords with bcrypt (minimum 12 rounds)
- **ALWAYS** implement rate limiting on login endpoints (5 attempts/15 min)
- **ALWAYS** implement account lockout after 3 failed attempts
- **ALWAYS** mask emails in public alerts: `a****l@example.com`
- **ALWAYS** offer 2FA for admin accounts

### 3. Database Security
- **ALWAYS** use parameterized queries: `dbGet('SELECT * FROM users WHERE email = ?', [email])`
- **NEVER** concatenate user input into SQL strings
- **NEVER** commit database files to version control

### 4. Input Validation
- **ALWAYS** validate all input server-side
- **ALWAYS** validate email format and password strength
- **ALWAYS** sanitize before database operations

### 5. Security Headers
- **ALWAYS** set: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`

### 6. Error Handling
- **NEVER** expose system details in error messages
- **ALWAYS** return generic errors: `"Invalid credentials"` not `"User not found in database"`

### 7. Deployment
- **ALWAYS** set environment variables in Vercel dashboard
- **NEVER** expose debug endpoints in production
- **ALWAYS** promote tested deployments to production

## 📋 Pre-Deployment Checklist
- [ ] All secrets in environment variables
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` exists
- [ ] Passwords hashed (bcrypt 12+)
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout implemented
- [ ] SQL queries parameterized
- [ ] Security headers set
- [ ] Input validation on all endpoints
- [ ] PII masked in logs/alerts
- [ ] 2FA available for admin
- [ ] Production env vars set in Vercel

## 🚨 Security Alert Channels
| Channel | Purpose | Config |
|---------|---------|--------|
| Email | Admin notification | `EMAIL_USER`, `EMAIL_PASS` |
| SMS | Critical alerts | `TWILIO_*` vars |
| GitHub PR | Dev team awareness | `GITHUB_TOKEN` |

## 🚀 Active Workflows
- `/fix-and-test`: [Execute Fix] -> [Create/Run Tests] -> [Browser Audit] -> [Update README]

## 📚 Reference
See `CLAUDE-SECURITY-TEMPLATE.md` for detailed implementation patterns.  
