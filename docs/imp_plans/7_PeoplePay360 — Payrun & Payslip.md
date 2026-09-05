# PeoplePay360 — Phase 7 Implementation Document
## Payruns, Payslips & Payroll Processing

### Version: 0.0.7
### Date: 2026-09-05

---

## 1. Overview & Architecture

Phase 7 implements the payroll execution and settlement layer for PeoplePay360:
- **Payrun Batch Management**: Central organizational payroll run entity for tracking lifecycle state across accounting windows.
- **Two-Step Creation Wizard**:
  - *Step 1 Preview*: Evaluates all employees against structure & date period, returning eligible and ineligible employees with machine-readable reasons and warnings.
  - *Step 2 Confirmation*: Instantiates draft payruns with draft payslips for selected or all eligible employees.
- **Eligibility Validation**: Enforces that employees must have `ACTIVE` status, a valid `RUNNING` contract covering the period, a matching salary structure, and no duplicate payslip in the accounting period.
- **Calculation Orchestration**: Aggregates real-time operational data (attendance worked days, worked minutes, overtime, approved time off days/hours) into a `CalculationContext` and executes the AST `SalaryRuleEngine`.
- **Itemized Historical Immutability**: Saves atomic `PayslipLine` snapshots (code, name, category, sequence, amount) that never alter even if master `SalaryRule` definitions are updated or deleted later.
- **Payrun State Machine**: Strict progression `DRAFT -> COMPUTED -> VALIDATED -> PAID` with audit validations (blocking errors on negative net pay or non-running contracts).
- **Duplicate Protection**: Composite unique constraint `(employee_id, period_start, period_end)` on `payslips` prevents overlapping payslips.
- **Self-Service & RBAC Isolation**: Self-service endpoint `/api/v1/employees/me/payslips` and individual `/api/v1/payslips/{id}` access control ensuring employees only see their own remuneration records.

---

## 2. Database Schema & Entities

### 2.1 `payrunstatus` & `payslipstatus` Enums
```sql
CREATE TYPE payrunstatus AS ENUM ('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED');
CREATE TYPE payslipstatus AS ENUM ('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED');
```

### 2.2 `payruns` Table
- `id`: `INTEGER` PK autoincrement
- `name`: `VARCHAR(100)` not null
- `salary_structure_id`: `INTEGER` FK -> `salary_structures.id` (`ON DELETE RESTRICT`), indexed
- `period_start`: `DATE` not null, indexed
- `period_end`: `DATE` not null, indexed
- `status`: `payrunstatus` not null, default `'DRAFT'`, indexed
- `created_by`: `INTEGER` FK -> `users.id` (`ON DELETE SET NULL`), indexed
- `created_at`: `TIMESTAMPTZ` not null, default `now()`
- `updated_at`: `TIMESTAMPTZ` not null, default `now()`

### 2.3 `payslips` Table
- `id`: `INTEGER` PK autoincrement
- `payrun_id`: `INTEGER` FK -> `payruns.id` (`ON DELETE CASCADE`), indexed
- `employee_id`: `INTEGER` FK -> `employees.id` (`ON DELETE RESTRICT`), indexed
- `contract_id`: `INTEGER` FK -> `contracts.id` (`ON DELETE RESTRICT`), indexed
- `salary_structure_id`: `INTEGER` FK -> `salary_structures.id` (`ON DELETE RESTRICT`), indexed
- `period_start`: `DATE` not null, indexed
- `period_end`: `DATE` not null, indexed
- `status`: `payslipstatus` not null, default `'DRAFT'`, indexed
- `worked_days`: `NUMERIC(5, 2)` not null, default `0.00`
- `gross_amount`: `NUMERIC(12, 2)` not null, default `0.00`
- `deduction_amount`: `NUMERIC(12, 2)` not null, default `0.00`
- `net_amount`: `NUMERIC(12, 2)` not null, default `0.00`
- `created_at`: `TIMESTAMPTZ` not null, default `now()`
- `updated_at`: `TIMESTAMPTZ` not null, default `now()`
- **Constraint**: `UNIQUE (employee_id, period_start, period_end)` named `uq_payslips_employee_period`

### 2.4 `payslip_lines` Table
- `id`: `INTEGER` PK autoincrement
- `payslip_id`: `INTEGER` FK -> `payslips.id` (`ON DELETE CASCADE`), indexed
- `salary_rule_id`: `INTEGER` FK -> `salary_rules.id` (`ON DELETE SET NULL`), nullable, indexed
- `code`: `VARCHAR(50)` not null (historical snapshot)
- `name`: `VARCHAR(100)` not null (historical snapshot)
- `category`: `salaryrulecategory` not null (`BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, `NET`)
- `sequence`: `INTEGER` not null, default `10`
- `amount`: `NUMERIC(12, 2)` not null, default `0.00`
- `created_at`: `TIMESTAMPTZ` not null, default `now()`

---

## 3. Payroll Calculation & Aggregation Flow

### 3.1 Attendance Metrics
- Queries `Attendance` for employee where `attendance_date >= period_start` and `attendance_date <= period_end`.
- `worked_days`: Each `PRESENT` or `LATE` adds `1.00`; each `HALF_DAY` adds `0.50`.
- `worked_minutes` & `overtime_minutes`: Integer sums of record metrics.

### 3.2 Time Off Metrics
- Queries `TimeOffRequest` where `status == APPROVED` and `start_date <= period_end` and `end_date >= period_start`.
- If unit is `DAYS`: adds to `approved_time_off_days`.
- If unit is `HOURS`: adds to `approved_time_off_hours`.

### 3.3 SalaryRuleEngine Execution
- Builds `CalculationContext` with `contract_wage`, `worked_days`, `worked_minutes`, `overtime_minutes`, `approved_time_off_days`, `approved_time_off_hours`.
- Rules executed sequentially by `sequence` ascending.
- Evaluates AST formulas using safe evaluation without `eval()` or `exec()`.
- Calculates itemized line items, `gross_amount`, `deduction_amount`, and `net_amount`.

---

## 4. API Endpoints

| Method | Path | Access Control | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/payruns/preview` | Payroll User, Manager, Admin | Wizard Step 1: Preview eligible / ineligible employees |
| `POST` | `/api/v1/payruns` | Payroll Manager, Admin | Wizard Step 2: Create draft payrun |
| `GET` | `/api/v1/payruns` | Payroll User, Manager, Admin | List payruns with pagination and status filter |
| `GET` | `/api/v1/payruns/{id}` | Payroll User, Manager, Admin | Get payrun detail and financial summaries |
| `POST` | `/api/v1/payruns/{id}/compute` | Payroll Manager, Admin | Compute all payslips in payrun |
| `POST` | `/api/v1/payruns/{id}/validate` | Payroll Manager, Admin | Validate computed payrun (audits warnings & blocks) |
| `POST` | `/api/v1/payruns/{id}/mark-paid` | Payroll Manager, Admin | Mark payrun and payslips as PAID |
| `POST` | `/api/v1/payruns/{id}/cancel` | Payroll Manager, Admin | Cancel active payrun |
| `DELETE` | `/api/v1/payruns/{id}` | Payroll Manager, Admin | Delete draft or cancelled payrun |
| `GET` | `/api/v1/payruns/{id}/payslips` | Payroll User, Manager, Admin | List payslips within a payrun |
| `GET` | `/api/v1/payslips` | Payroll User, Manager, Admin | List all payslips across payruns |
| `GET` | `/api/v1/payslips/{id}` | Payroll Staff / Owner Employee | Get payslip details & line items |
| `GET` | `/api/v1/employees/me/payslips` | Authenticated Employee | Self-service: view own payslips |
| `GET` | `/api/v1/employees/{id}/payslips` | Payroll Staff / Owner Employee | Get employee payslip history |

---

## 5. Security & RBAC Enforcement

- **`EMPLOYEE`**: Access limited strictly to own payslips via `/me/payslips` and `/payslips/{id}` (where `payslip.employee_id == current_user.employee_id`). Access to payruns or other employees' payslips returns `403 Forbidden`.
- **`HR_MANAGER`**: Explicitly forbidden from payroll execution and payslips (`403 Forbidden`).
- **`HR_PAYROLL_USER`**: Read-only access to wizard preview, payrun lists, and payslips. Forbidden from state transitions (create, compute, validate, mark-paid, cancel, delete).
- **`HR_PAYROLL_MANAGER` & `ADMIN`**: Full permissions across preview, creation, computation, validation, settlement, cancellation, and deletion.

