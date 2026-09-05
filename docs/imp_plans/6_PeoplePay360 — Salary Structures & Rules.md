# PeoplePay360 — Phase 6 Implementation Document
## Salary Structures, Salary Rules & Salary Calculation Engine

### Version: 0.0.6
### Date: 2026-09-05

---

## 1. Overview & Architecture

Phase 6 implements the core remuneration modeling layer for PeoplePay360:
- **Salary Structures**: Grouped configuration templates defining the rules and policies for employee remuneration.
- **Salary Rules**: Ordered calculation line items representing earnings, allowances, gross totals, deductions, and net pay.
- **Contract Integration**: Linking employment contracts directly to applicable salary structures with historical date lookup.
- **Safe Calculation Engine**: Restricted mathematical expression evaluator powered by Python `ast` (zero arbitrary Python execution, no `eval` or `exec`).
- **Dependency & Cycle Validation**: Configuration-time validation ensuring dependencies reference earlier sequence rules and preventing circular dependency graphs.
- **Documented Precision**: Strictly `Decimal` arithmetic with `ROUND_HALF_UP` to 2 decimal places.
- **Stateless Preview**: API endpoint allowing immediate simulation of remuneration rules against contract wage and operational metrics without creating payslips or payruns.

---

## 2. Entities & Schema Design

### 2.1 `salary_structures` Table
- `id`: `INTEGER` PK autoincrement
- `name`: `VARCHAR(100)` unique, indexed
- `code`: `VARCHAR(50)` unique, indexed, uppercase normalized
- `description`: `VARCHAR(255)` nullable
- `is_active`: `BOOLEAN` default true
- `created_at`: `TIMESTAMPTZ`
- `updated_at`: `TIMESTAMPTZ`

### 2.2 `salary_rules` Table
- `id`: `INTEGER` PK autoincrement
- `salary_structure_id`: `INTEGER` FK -> `salary_structures.id` (CASCADE on delete)
- `name`: `VARCHAR(100)`
- `code`: `VARCHAR(50)` uppercase normalized (e.g. `BASIC`, `HRA`, `GROSS`, `PF`, `NET`)
- `category`: `salaryrulecategory` enum (`BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, `NET`)
- `sequence`: `INTEGER` (execution order: 10, 20, 30, ...)
- `computation_type`: `computationtype` enum (`FIXED`, `PERCENTAGE`, `FORMULA`)
- `fixed_amount`: `NUMERIC(12, 2)` nullable
- `percentage`: `NUMERIC(5, 2)` nullable (0.00 to 100.00)
- `percentage_base`: `VARCHAR(50)` nullable (references earlier rule code)
- `formula`: `VARCHAR(255)` nullable (restricted arithmetic expression)
- `is_active`: `BOOLEAN` default true
- `created_at`: `TIMESTAMPTZ`
- `updated_at`: `TIMESTAMPTZ`

**Composite Constraints**:
- `UNIQUE (salary_structure_id, code)`: Rule codes must be unique within each structure.
- `UNIQUE (salary_structure_id, sequence)`: Rule sequence numbers must be unique within each structure.

### 2.3 `contracts` Table Update
- `contracts.salary_structure_id` converted to `FOREIGN KEY ("salary_structures.id", ondelete="SET NULL")` with index.
- Deactivating a structure is prohibited if active `RUNNING` contracts are currently assigned to it.

---

## 3. Computation Engine & Formula Language

### 3.1 Security Sandbox
Arbitrary Python execution via `eval()` or `exec()` is strictly forbidden. The system implements an AST-based parser that permits ONLY:
- Arithmetic operators: `+`, `-`, `*`, `/`, unary `+`, unary `-`
- Numeric constants: integers and decimals
- Identifiers: rule codes (e.g., `BASIC`, `HRA`, `GROSS`) and context parameters (`CONTRACT_WAGE`, `WAGE`, `WORKED_DAYS`, `WORKED_MINUTES`, `OVERTIME_MINUTES`, `TIME_OFF_DAYS`, `TIME_OFF_HOURS`)
- Parenthesized groupings

Any attribute access (e.g. `obj.attr`), calls, imports (`__import__`), or builtins (`open`, `eval`, `exec`) are rejected at configuration time with `422 Unprocessable Content`.

### 3.2 Sequence Execution & Dependency Ordering
- Rules are evaluated strictly in ascending order of their `sequence` number.
- For `PERCENTAGE`: `percentage_base` must refer to a rule with a strictly lower sequence number.
- For `FORMULA`: All extracted rule identifiers must refer to rules with strictly lower sequence numbers.
- Circular dependencies ($A \to B \to A$) are detected and rejected via DFS graph traversal.

### 3.3 Rounding & Financial Accuracy
- Precision: All monetary calculations use `Decimal`.
- Rounding Strategy: `ROUND_HALF_UP` to 2 decimal places (`0.01`).
- Every rule result is quantized consistently before being recorded in the calculation symbol table.

---

## 4. API Endpoints & RBAC Matrix

| Endpoint | Method | Purpose | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| `/api/v1/salary-structures` | `GET` | List structures | ❌ `403` | ❌ `403` | ✅ | ✅ | ✅ |
| `/api/v1/salary-structures` | `POST` | Create structure | ❌ `403` | ❌ `403` | ❌ `403` | ✅ | ✅ |
| `/api/v1/salary-structures/{id}` | `GET` | Get structure | ❌ `403` | ❌ `403` | ✅ | ✅ | ✅ |
| `/api/v1/salary-structures/{id}` | `PATCH` | Update structure | ❌ `403` | ❌ `403` | ❌ `403` | ✅ | ✅ |
| `/api/v1/salary-structures/{id}` | `DELETE` | Soft-deactivate structure | ❌ `403` | ❌ `403` | ❌ `403` | ✅ | ✅ |
| `/api/v1/salary-structures/{id}/rules` | `GET` | List structure rules | ❌ `403` | ❌ `403` | ✅ | ✅ | ✅ |
| `/api/v1/salary-structures/{id}/preview` | `POST` | Preview calculation | ❌ `403` | ❌ `403` | ✅ | ✅ | ✅ |
| `/api/v1/salary-rules` | `GET` | List rules (filtered) | ❌ `403` | ❌ `403` | ✅ | ✅ | ✅ |
| `/api/v1/salary-rules` | `POST` | Create rule | ❌ `403` | ❌ `403` | ❌ `403` | ✅ | ✅ |
| `/api/v1/salary-rules/{id}` | `GET` | Get rule | ❌ `403` | ❌ `403` | ✅ | ✅ | ✅ |
| `/api/v1/salary-rules/{id}` | `PATCH` | Update rule | ❌ `403` | ❌ `403` | ❌ `403` | ✅ | ✅ |
| `/api/v1/salary-rules/{id}` | `DELETE` | Delete rule | ❌ `403` | ❌ `403` | ❌ `403` | ✅ | ✅ |

---

## 5. Migration History
- `0006_create_salary_structure_and_rule_tables.py`:
  - Created enums: `salaryrulecategory`, `computationtype`
  - Created tables: `salary_structures`, `salary_rules`
  - Added foreign key: `fk_contracts_salary_structure_id` referencing `salary_structures.id`
  - Added indexes and unique constraints

