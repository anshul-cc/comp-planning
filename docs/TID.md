# Technical Implementation Document: Job Architecture Framework for Cost, Budget, and Compensation Planning  
## Document Metadata  
* **Document Title**: Enterprise Job Architecture Implementation – Position-Based, Temporal, Budget-Decoupled Model  
* **Version**: 4.0 – Final pre-implementation revision (incorporates all feedback: decoupling, positions, DATE temporal logic, dynamic FX, GiST optimization, ledger debt flag, matrix/acting support)  
* **Date**: January 22, 2026  
* **Author**: Grok 4 (xAI Assistant), iteratively refined with Jarvis (Hyderabad, Telangana, IN)  
* **Purpose**: Comprehensive blueprint for a scalable, audit-ready, payroll-capable job architecture system supporting 10,000+ employees, global operations (INR default, Hyderabad geo-adjustments), dynamic budgeting, temporal history, and matrix organizations. Ready for Claudecode to implement schema, constraints, APIs, event handlers, and migration path.  
* **Target Environment**: PostgreSQL 16+, Python/Django or Java/Spring backend, Kafka event bus, React frontend  
* **Key Design Principles**:  
    * Positions persist as funded "chairs" (Empty Chair solved)  
    * Business dates use DATE (timezone-safe)  
    * FX conversions are dynamic/query-time  
    * Temporal integrity & performance via GiST + exclusion constraints  
    * Budget integrity prepares for append-only ledger pattern  
    * Matrix support via assignment_type and allocation_pct  
## 1. Introduction  
## 1.1 Overview  
The architecture organizes **Job Families → Job Profiles → Positions → Assignments → Employees** with decoupled, cycle-based budgeting and temporal compensation snapshots.  
Core innovations in v4.0:  
* **Position** entity solves vacancy/headcount tracking  
* **DATE**-based validity periods avoid timezone conversion issues  
* **GiST + daterange exclusion** constraint ensures fast, correct temporal queries  
* **assignment_type** supports acting/secondary/matrix roles  
* **Budget ledger pattern** flagged as v2 technical debt to prevent counter drift  
## 1.2 High-Level Requirements  
* Persistent funded positions (budget survives termination)  
* No-overlap temporal assignments with high-performance queries  
* Multi-assignment support (primary + acting) with load percentage  
* Dynamic FX recasting for FP&A  
* Audit-safe budgeting (eventual immutable ledger)  
* Event-driven HRIS integration with idempotency  
## 2. Core Data Entities  
All tables include created_at TIMESTAMPTZ DEFAULT NOW() and updated_at TIMESTAMPTZ DEFAULT NOW().  
## 2.1 Job Family  
SQL  
  
```
CREATE TABLE job_families (
    family_id       UUID PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    sub_families    JSONB,
    benchmark_source 
```
```
VARCHAR(50)

```
```
);

```
  
  
## 2.2 Department  
SQL  
  
```
CREATE TABLE departments (
    dept_id         UUID 
```
```
PRIMARY KEY,

```
```
    name            VARCHAR(100) UNIQUE NOT NULL,
    parent_dept_id  UUID 
```
```
REFERENCES departments,

```
```
    budget_owner    UUID, 
```
```
-- FK to employees

```
```
    location        VARCHAR(50)             -- e.g. "Hyderabad, IN"
);

```
  
  
## 2.3 Job Profile  
SQL  
  
```
CREATE TABLE job_profiles (
    profile_id      UUID PRIMARY KEY,
    title           
```
```
VARCHAR(100) NOT NULL,

```
```
    family_id       UUID 
```
```
REFERENCES job_families,

```
```
    level           INTEGER
```
```
,

```
```
    jd_description  TEXT,
    kpis            JSONB,
    UNIQUE (family_id, title)
);

```
  
  
## 2.4 Compensation Band  
SQL  
  
```
CREATE TABLE compensation_bands (
    band_id         UUID 
```
```
PRIMARY KEY,

```
```
    profile_id      UUID REFERENCES job_profiles,
    geo_code        VARCHAR(10) DEFAULT 'IN-HYD',
    min_salary      
```
```
DECIMAL(19,4) NOT NULL,

```
```
    mid_salary      
```
```
DECIMAL(19,4) NOT NULL,

```
```
    max_salary      
```
```
DECIMAL(19,4) NOT NULL,

```
```
    currency        
```
```
CHAR(3) DEFAULT 'INR',

```
```
    effective_from  
```
```
DATE NOT NULL,

```
```
    effective_to    DATE,
    UNIQUE (profile_id, geo_code, effective_from)
);

```
  
  
## 2.5 Employee  
SQL  
  
```
CREATE TABLE employees (
    emp_id              UUID PRIMARY KEY,
    name                VARCHAR
```
```
(100) NOT NULL,

```
```
    hire_date           
```
```
DATE,

```
```
    tenure              
```
```
INTEGER GENERATED ALWAYS AS (DATE_PART('year', AGE(CURRENT_DATE, hire_date))) STORED,

```
```
    performance_rating  
```
```
VARCHAR(20),

```
```
    location            VARCHAR
```
```
(50)             -- e.g. "Hyderabad, Telangana, IN"

```
```
);

```
  
  
## 2.6 Position (The "Chair" – Funded Slot)  
SQL  
  
```
CREATE TABLE positions (
    position_id         UUID 
```
```
PRIMARY KEY,

```
```
    title_override      VARCHAR(100),
    profile_id          UUID 
```
```
REFERENCES job_profiles NOT NULL,

```
```
    dept_id             UUID 
```
```
REFERENCES departments NOT NULL,

```
```
    is_frozen           
```
```
BOOLEAN DEFAULT FALSE,

```
```
    target_hire_date    DATE,
    budget_allocation_id UUID 
```
```
REFERENCES budget_allocations,

```
```
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

```
  
  
## 2.7 Assignment (Person in Chair – Temporal)  
SQL  
  
```
CREATE TABLE assignments (
    assignment_id       UUID 
```
```
PRIMARY KEY,

```
```
    emp_id              UUID 
```
```
REFERENCES employees NOT NULL,

```
```
    position_id         UUID REFERENCES positions NOT NULL,
    assignment_type     
```
```
VARCHAR(20) NOT NULL DEFAULT 'PRIMARY' 

```
```
                        CHECK
```
```
 (assignment_type IN ('PRIMARY', 'SECONDARY', 'ACTING')),

```
```
    allocation_pct      DECIMAL(5,2) DEFAULT 100.00 CHECK (allocation_pct BETWEEN 0 AND 100),
    valid_from          DATE NOT NULL,
    valid_to            
```
```
DATE NOT NULL DEFAULT '9999-12-31',

```
```
    created_at          
```
```
TIMESTAMPTZ DEFAULT NOW(),

```
```
    UNIQUE
```
```
 (emp_id, position_id, valid_from) -- partial prevention

```
```
);

```
  
  
**Temporal Integrity Constraint (GiST + Exclusion – Critical)**  
SQL  
  
```
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE
```
```
 assignments

```
```
ADD CONSTRAINT no_overlapping_assignments_per_position
EXCLUDE 
```
```
USING gist (

```
```
    position_id 
```
```
WITH =,

```
```
    daterange(valid_from, valid_to, 
```
```
'[]') WITH &&

```
```
);

```
  
  
**Recommended Index for Fast Vacancy/Current-Occupant Queries**  
**Recommended Index for Fast Vacancy/Current-Occupant Queries**  
SQL  
  
```
CREATE INDEX idx_assignments_position_validity_gist
ON assignments USING gist (position_id, daterange(valid_from, valid_to));

```
  
  
## 2.8 Compensation Snapshot  
SQL  
  
```
CREATE TABLE compensation_snapshots (
    snapshot_id         UUID 
```
```
PRIMARY KEY,

```
```
    assignment_id       UUID REFERENCES assignments NOT NULL,
    component_type      
```
```
VARCHAR(20) NOT NULL 

```
```
                        CHECK (component_type IN ('Base','Bonus','Equity','Allowance')),
    amount_local        
```
```
DECIMAL(19,4) NOT NULL,

```
```
    currency_local      
```
```
CHAR(3) DEFAULT 'INR',

```
```
    effective_from      
```
```
DATE NOT NULL,

```
```
    effective_to        DATE DEFAULT '9999-12-31'
);

```
  
  
## 2.9 Budget Cycle  
SQL  
  
```
CREATE TABLE budget_cycles (
    cycle_id    UUID PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    start_date  DATE NOT NULL
```
```
,

```
```
    end_date    
```
```
DATE NOT NULL,

```
```
    status      VARCHAR
```
```
(20) DEFAULT 'Planning'

```
```
);

```
  
  
## 2.10 Department Budget  
SQL  
  
```
CREATE TABLE department_budgets (
    budget_id       UUID 
```
```
PRIMARY KEY,

```
```
    cycle_id        UUID REFERENCES budget_cycles,
    dept_id         UUID 
```
```
REFERENCES departments,

```
```
    currency        CHAR(3) DEFAULT 'INR',
    total_budget    
```
```
DECIMAL(19,4) NOT NULL,

```
```
    UNIQUE (cycle_id, dept_id)
);

```
  
  
## 2.11 Budget Allocation (Links to Positions)  
SQL  
  
```
CREATE TABLE budget_allocations (
    allocation_id       UUID 
```
```
PRIMARY KEY,

```
```
    budget_id           UUID REFERENCES department_budgets,
    allocated_amount    DECIMAL(19,4) NOT NULL,
    consumed_amount     DECIMAL(19,4) DEFAULT 0,    -- TECHNICAL DEBT – see ledger pattern below
    -- consumed_amount will be replaced in v2 with SUM(budget_transactions.amount)
```
```


```
```
);

```
  
  
**Future Ledger Pattern (v2 Technical Debt Item)**  
SQL  
  
```
CREATE TABLE budget_transactions (
    tx_id           UUID 
```
```
PRIMARY KEY,

```
```
    allocation_id   UUID 
```
```
REFERENCES budget_allocations,

```
```
    amount          
```
```
DECIMAL(19,4) NOT NULL,     -- negative = encumbrance, positive = release

```
```
    tx_type         
```
```
VARCHAR(20) NOT NULL,

```
```
    tx_date         
```
```
DATE NOT NULL,

```
```
    reference_id    UUID,                       
```
```
-- e.g. assignment_id

```
```
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

```
  
  
## 3. Architecture Diagram (Text UML)  
text  
  
```
Job Family ─1:N─► Job Profile ─1:N─► Position ◄─1:N─ Budget Allocation
                                             │
                                             └─1:N─ Assignment ─1:N─ Compensation Snapshot
                                                   │
                                                   └─N:1─ Employee
                                             │
Department ─1:N─► Budget Cycle ─1:N─ Department Budget ─1:N─ Budget Allocation

```
  
  
## 4. Key Best Practices & Optimizations  
1. **Temporal Range Queries** – Use GiST + daterange exclusion (already in schema)  
2. **Budget Integrity** – Mark consumed_amount as technical debt; migrate to append-only budget_transactions in v2  
3. **Matrix Organizations** – Use assignment_type + allocation_pct; enforce total ≤100% via trigger or app logic  
4. **FX Strategy** – Keep amount_local as source of truth; compute reporting currency at query/view time  
5. **Partitioning** – Consider range partitioning on valid_from for assignments & snapshots at >1M rows  
6. **Audit & Idempotency** – Log all budget/assignment mutations; use external_event_id for Kafka consumers  
## 5. Example Queries  
**Current Open Headcount + Remaining Budget**  
SQL  
  
```
SELECT 
    p.position_id, p.title_override, db.total_budget, ba.allocated_amount - ba.consumed_amount AS remaining
FROM
```
```
 positions p

```
```
JOIN
```
```
 budget_allocations ba ON p.budget_allocation_id = ba.allocation_id

```
```
JOIN
```
```
 department_budgets db ON ba.budget_id = db.budget_id

```
```
LEFT JOIN assignments a 
  ON p.position_id = a.position_id 
  AND a.valid_from <= CURRENT_DATE 
  AND
```
```
 a.valid_to   >  CURRENT_DATE

```
```
WHERE
```
```
 a.assignment_id IS NULL;

```
  
  
**Employee Total Allocation Load**  
SQL  
  
```
SELECT emp_id, SUM(allocation_pct) AS total_pct
FROM
```
```
 assignments

```
```
WHERE
```
```
 valid_from <= CURRENT_DATE AND valid_to > CURRENT_DATE

```
```
GROUP BY
```
```
 emp_id

```
```
HAVING
```
```
 SUM(allocation_pct) > 100;

```
  
  
**Recast Last Year Spend at Current FX Rates**  
**Recast Last Year Spend at Current FX Rates**  
SQL  
  
```
SELECT 
    SUM
```
```
(cs.amount_local * get_fx_rate(cs.currency_local, 'USD', '2026-01-01')) AS recast_usd

```
```
FROM
```
```
 compensation_snapshots cs

```
```
JOIN assignments a ON cs.assignment_id = a.assignment_id
WHERE
```
```
 cs.effective_from >= '2025-01-01' AND cs.effective_from < '2026-01-01';

```
  
  
This document is now complete and ready for implementation.  
