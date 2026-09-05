# Changelog

All notable changes to **PeoplePay360** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.8] — 2026-09-06

### Summary
Post-Phase 7 Module 1 — **Employee Banking Details & Bank Payout File Export Engine**.
Enables enterprise corporate salary disbursement by storing employee banking credentials and generating bank-compliant batch payout files for upload to corporate net banking portals (e.g. HDFC Enet, ICICI Corporate). Includes pre-disbursement readiness audits, strict validation modes, masked banking details on PDF payslips, and segregation of duties under RBAC.

### Added

#### Database Models & Migrations
- `alembic/versions/0008_add_employee_bank_details.py` — Adds `bank_name`, `bank_account_number`, `ifsc_code`, `pan_number`, and `account_holder_name` columns to `employees` table (all nullable with full downgrade support).
- `app/models/employee.py` — Mapped `bank_name`, `bank_account_number`, `ifsc_code`, `pan_number`, and `account_holder_name` fields on `Employee` model.

#### Schemas (`app/schemas/`)
- `schemas/employee.py` — Updated `EmployeeCreate`, `EmployeeUpdate`, and `EmployeeResponse` with banking fields, adding sanitizers and uppercase normalization validators for `ifsc_code` and `pan_number`.
- `schemas/payout.py` — Created `MissingBankInfoEmployee` and `BankPayoutSummaryResponse` schemas for audit reports.

#### Service Layer (`app/services/`)
- `services/payout_export_service.py`:
  - `get_bank_payout_summary()` — Audits a payrun's bank account readiness, calculates total disbursement amount, and reports employees with missing bank details.
  - `generate_bank_payout_csv()` — Generates formatted CSV files with corporate presets:
    - `standard`: Universal 10-column HRMS payout file.
    - `hdfc`: HDFC Bank Enet CMS format (NEFT/RTGS transaction routing).
    - `icici`: ICICI Corporate Bulk Payment format.
    - `strict`: Toggle that blocks export with HTTP 422 if any employee has missing bank details.
- `services/employee_service.py` — Updated `create_employee` and `update_employee` to persist banking details.
- `services/pdf_service.py` — Enhanced Employee Information Grid on PDF payslips to display Bank Name, masked account number (`•••• 1234`), IFSC, and PAN.

#### API Endpoints (`app/api/payruns.py`)
- `GET /api/v1/payruns/{id}/bank-payout-summary` — Pre-disbursement audit summary.
- `GET /api/v1/payruns/{id}/export-bank-file` — Streaming CSV download for bank portal upload.

#### Automated Test Suite
- `tests/test_payout_export.py` — 7 comprehensive tests covering banking CRUD, normalization, audit summaries, strict mode rejection, CSV format validation, RBAC segregation of duties, and PDF payslip bank detail inclusion.

---

## [0.0.7] — 2026-09-05

### Summary
Phase 7 release — **Payruns, Payslips & Payroll Processing Engine**.
Introduces end-to-end payroll lifecycle processing: Payrun batches (`Payrun`), Employee Payslips (`Payslip`), Itemized Evaluated Rule Snapshots (`PayslipLine`), two-step Payrun Creation Wizard (Pre-computation Eligibility Filter & Draft Batch Creation), multi-module Operational Context Integration (Attendance worked days / overtime and Approved Leave days / hours aggregation), Salary Calculation Engine execution with immutable line item recording, strict lifecycle state machines (`DRAFT` -> `COMPUTED` -> `VALIDATED` -> `PAID`), blocking audit validations (negative net salary and non-running contract detection), employee self-service payslip history, and comprehensive RBAC security.

### Added

#### Database Models (`app/models/`)
- `payrun.py` — `PayrunStatus` enum (`DRAFT`, `COMPUTED`, `VALIDATED`, `PAID`, `CANCELLED`) and `Payrun` model (`name`, `salary_structure_id`, `period_start`, `period_end`, `status`, `total_gross`, `total_deduction`, `total_net`, `created_by_user_id`, timestamps) with 1:N relationship to `Payslip`.
- `payslip.py` — `PayslipStatus` enum (`DRAFT`, `COMPUTED`, `VALIDATED`, `PAID`, `CANCELLED`) and `Payslip` model (`payrun_id`, `employee_id`, `contract_id`, `salary_structure_id`, `period_start`, `period_end`, `status`, `worked_days`, `gross_amount`, `deduction_amount`, `net_amount`, timestamps) with composite unique constraint `uq_payslips_employee_period (employee_id, period_start, period_end)` and 1:N relationship to `PayslipLine`.
- `payslip_line.py` — `PayslipLine` historical snapshot model (`payslip_id`, `salary_rule_id`, `code`, `name`, `category`, `sequence`, `amount`, `created_at`).
- `app/db/base.py` & `app/models/__init__.py` — Registered `payrun`, `payslip`, and `payslip_line`.

#### Database Migrations (`alembic/versions/`)
- `0007_create_payrun_and_payslip_tables.py` — Creates custom PostgreSQL enums `payrunstatus` and `payslipstatus`, creates tables `payruns`, `payslips`, and `payslip_lines`, adds foreign keys, composite unique constraint `uq_payslips_employee_period`, indexes, and full downgrade support.

#### Pydantic Schemas (`app/schemas/`)
- `payslip.py` — `PayslipLineResponse`, `PayslipResponse`, `PayslipListResponse`.
- `payrun.py` — `PayrunPreviewRequest`, `EligibleEmployeeItem`, `IneligibleEmployeeItem`, `PayrollWarningItem`, `PayrunPreviewResponse`, `PayrunCreate`, `PayrollValidationResponse`, `PayrunResponse`, `PayrunListResponse`.
- `app/schemas/__init__.py` — Exported all payrun and payslip schemas.

#### Service Layer (`app/services/`)
- `payroll_processing_service.py`:
  - `check_employee_payroll_eligibility()` — Evaluates employee status (`ACTIVE`), running contract covering accounting period, assigned salary structure match, and duplicate payslip protection.
  - `aggregate_employee_attendance()` — Computes exact `worked_days` (counting `PRESENT`, `LATE`, and 0.5 for `HALF_DAY`) and total `overtime_minutes` across the accounting date window.
  - `aggregate_employee_time_off()` — Aggregates approved leave days and hours partitioned by leave type code.
  - `preview_payroll_eligibility()` — Implements Wizard Step 1: gathers eligible/ineligible employees and computes preliminary warnings.
  - `calculate_and_generate_payslip()` — Builds operational `CalculationContext`, executes `SalaryRuleEngine.calculate()`, computes totals (`gross`, `deduction`, `net`), persists `Payslip` and immutable `PayslipLine` snapshots.
  - `audit_payrun_for_warnings()` — Implements validation auditing; blocks validation if negative net pay or non-running contracts exist.
- `payrun_service.py`:
  - `preview_payrun_wizard()` — Wizard Step 1 endpoint handler.
  - `create_payrun()` — Wizard Step 2 endpoint handler creating `Payrun` in `DRAFT` and child draft `Payslip` records.
  - `get_payrun_by_id()` & `list_payruns()` — Paginated list and nested detail retrieval with financial aggregates.
  - `compute_payrun()` — Orchestrates calculation across all payslips; transitions `DRAFT` -> `COMPUTED`.
  - `validate_payrun()` — Audits computed batch; transitions `COMPUTED` -> `VALIDATED`.
  - `mark_payrun_paid()` — Transitions `VALIDATED` -> `PAID` and sets child payslips to `PAID`.
  - `cancel_payrun()` — Cancels batch; transitions payrun and child payslips to `CANCELLED`.
  - `delete_payrun()` — Deletes batch and draft payslips (allowed strictly in `DRAFT` or `CANCELLED`).
- `payslip_service.py`:
  - `get_payslip_by_id()` & `list_payslips()` — Filtered queries by employee, payrun, and status.
  - `get_employee_payslips()` — Employee-specific payslip history retrieval.
- `pdf_service.py`:
  - `generate_payslip_pdf()` — ReportLab PDF generator rendering professional payslip statements with company header, employee details, earnings vs deductions table, net pay highlight, and INR currency formatting.

#### API Routers (`app/api/`)
- `payruns.py` — Mounted at `/api/v1/payruns`:
  - `POST /api/v1/payruns/preview` — Wizard Step 1: Preview payroll eligibility and warnings (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`).
  - `POST /api/v1/payruns` — Wizard Step 2: Create draft payrun batch (`HR_PAYROLL_MANAGER`, `ADMIN`).
  - `GET /api/v1/payruns` — List payruns with status filtering and pagination (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`).
  - `GET /api/v1/payruns/{id}` — Get payrun details with nested payslips (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`).
  - `POST /api/v1/payruns/{id}/compute` — Compute all payslips in payrun (`HR_PAYROLL_MANAGER`, `ADMIN`).
  - `POST /api/v1/payruns/{id}/validate` — Audit and validate payrun (`HR_PAYROLL_MANAGER`, `ADMIN`).
  - `POST /api/v1/payruns/{id}/mark-paid` — Finalize payrun as paid (`HR_PAYROLL_MANAGER`, `ADMIN`).
  - `POST /api/v1/payruns/{id}/cancel` — Cancel payrun (`HR_PAYROLL_MANAGER`, `ADMIN`).
  - `DELETE /api/v1/payruns/{id}` — Delete draft or cancelled payrun (`HR_PAYROLL_MANAGER`, `ADMIN`).
  - `GET /api/v1/payruns/{id}/payslips` — List payslips within a payrun (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`).
- `payslips.py` — Mounted at `/api/v1/payslips`:
  - `GET /api/v1/payslips` — List all payslips across payruns (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`).
  - `GET /api/v1/payslips/{id}` — Get payslip details & line item snapshots (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`, or owner `EMPLOYEE`).
  - `GET /api/v1/payslips/{id}/pdf` — Stream/download ReportLab PDF salary statement (`HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`, or owner `EMPLOYEE`).
- `employees.py`:
  - `GET /api/v1/employees/me/payslips` — Employee self-service payslip history (authenticated linked user).
  - `GET /api/v1/employees/{employee_id}/payslips` — Employee payslips (payroll staff or owner employee).

#### Root Utilities
- `run.py` — Convenience application launcher to start the uvicorn development server from the repository root (`python run.py`).

#### Automated Tests (`tests/test_payroll_processing.py`)
- Comprehensive test suite covering:
  - Wizard Step 1 preview eligibility, reason diagnostics, and warnings.
  - Wizard Step 2 draft payrun batch creation.
  - Standard remuneration calculation, operational context aggregation, and `PayslipLine` persistence.
  - Historical immutability of `PayslipLine` snapshots upon upstream rule changes.
  - Duplicate payslip prevention and database unique constraint enforcement.
  - Lifecycle state machine transitions and invalid transition rejections.
  - Blocking audit errors on negative net salary.
  - Real-time attendance and approved leave data aggregation.
  - Self-service endpoints and cross-employee unauthorized access protection.
  - Complete RBAC security matrix verification.

---

## [0.0.6] — 2026-09-05

### Summary
Phase 6 release — **Salary Structures, Salary Rules & Calculation Engine**.
Introduces comprehensive remuneration modeling: Salary Structures (`SalaryStructure`), Salary Rules (`SalaryRule`), rule categories (`BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, `NET`), computation types (`FIXED`, `PERCENTAGE`, `FORMULA`), safe AST-based formula evaluator (no `eval`/`exec`), rule dependency ordering, circular dependency detection, single documented financial rounding policy (`ROUND_HALF_UP` to 2 decimal places), Contract-to-Structure foreign key integration, applicable contract date lookup, stateless preview calculation, and full RBAC matrix.

### Added

#### Database Models (`app/models/`)
- `salary_structure.py` — `SalaryStructure` model (`name`, `code`, `description`, `is_active`, timestamps) with 1:N relationship to `SalaryRule` and `Contract`.
- `salary_rule.py` — `SalaryRuleCategory` enum (`BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, `NET`), `ComputationType` enum (`FIXED`, `PERCENTAGE`, `FORMULA`), and `SalaryRule` model (`salary_structure_id`, `name`, `code`, `category`, `sequence`, `computation_type`, `fixed_amount`, `percentage`, `percentage_base`, `formula`, `is_active`, timestamps) with unique constraints `(salary_structure_id, code)` and `(salary_structure_id, sequence)`.
- `contract.py` — Converted `salary_structure_id` to foreign key referencing `salary_structures.id` with `ondelete="SET NULL"` and added `salary_structure` relationship.
- `app/db/base.py` & `app/models/__init__.py` — Registered `salary_structure` and `salary_rule`.

#### Database Migrations (`alembic/versions/`)
- `0006_create_salary_structure_and_rule_tables.py` — Creates enums `salaryrulecategory` and `computationtype`, tables `salary_structures` and `salary_rules`, adds `fk_contracts_salary_structure_id` to `contracts`, and creates indexes and constraints.

#### Pydantic Schemas (`app/schemas/`)
- `salary_structure.py` — `SalaryStructureCreate`, `SalaryStructureUpdate`, `SalaryStructureResponse`, `SalaryStructureListResponse`, `SalaryPreviewRequest`, `SalaryRuleResultResponse`, `SalaryPreviewResponse`.
- `salary_rule.py` — `SalaryRuleCreate`, `SalaryRuleUpdate`, `SalaryRuleResponse`, `SalaryRuleListResponse`.

#### Service Layer (`app/services/`)
- `salary_rule_engine.py`:
  - AST-based restricted mathematical parser & evaluator (permitting arithmetic `+`, `-`, `*`, `/`, constants, identifiers, and grouping; forbidding `__import__`, `open`, `eval`, `exec`, attribute access).
  - Financial precision: `Decimal` arithmetic with `ROUND_HALF_UP` to 2 decimal places (`Decimal("0.01")`).
  - `CalculationContext` data abstraction (`contract_wage`, `worked_days`, `worked_minutes`, `overtime_minutes`, `approved_time_off`, `rule_results`).
  - `SalaryRuleResult` output model.
  - Cycle detection using DFS graph traversal and dependency sequence validation.
  - `SalaryRuleEngine.calculate()` evaluating active rules in ascending sequence order.
- `salary_structure_service.py` — CRUD operations, uppercase code normalization, active contract deactivation guard, rule retrieval, and stateless preview computation.
- `salary_rule_service.py` — CRUD operations, configuration-time validation (computation type fields, unique code/sequence, dependency sequence ordering, cycle prevention), and dependency deletion guard.
- `contract_service.py` — Added `get_applicable_contract()` date lookup and `salary_structure_id` validation.

#### Dependencies & RBAC (`app/dependencies/auth.py`)
- Added `require_payroll_read()` (`ADMIN`, `HR_PAYROLL_MANAGER`, `HR_PAYROLL_USER`).
- Added `require_payroll_manager()` (`ADMIN`, `HR_PAYROLL_MANAGER`).
- `EMPLOYEE` and `HR_MANAGER` are forbidden from salary structure and rule configuration.

#### API Routers (`app/api/`)
- `salary_structures.py` — Mounted at `/api/v1/salary-structures`:
  - `POST /api/v1/salary-structures` — Create salary structure (HR_PAYROLL_MANAGER, ADMIN).
  - `GET /api/v1/salary-structures` — List salary structures (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN).
  - `GET /api/v1/salary-structures/{id}` — Get structure details.
  - `PATCH /api/v1/salary-structures/{id}` — Update structure (HR_PAYROLL_MANAGER, ADMIN).
  - `DELETE /api/v1/salary-structures/{id}` — Soft-deactivate structure (HR_PAYROLL_MANAGER, ADMIN).
  - `GET /api/v1/salary-structures/{id}/rules` — List structure rules ordered by sequence.
  - `POST /api/v1/salary-structures/{id}/preview` — Stateless calculation preview.
- `salary_rules.py` — Mounted at `/api/v1/salary-rules`:
  - `POST /api/v1/salary-rules` — Create salary rule (HR_PAYROLL_MANAGER, ADMIN).
  - `GET /api/v1/salary-rules` — List rules with filters.
  - `GET /api/v1/salary-rules/{id}` — Get rule details.
  - `PATCH /api/v1/salary-rules/{id}` — Update rule (HR_PAYROLL_MANAGER, ADMIN).
  - `DELETE /api/v1/salary-rules/{id}` — Delete rule (HR_PAYROLL_MANAGER, ADMIN).

#### Tests (`tests/`)
- `test_salary_structures.py` — 24 comprehensive unit and integration tests covering structure CRUD, rule validations (FIXED, PERCENTAGE, FORMULA), dependency ordering, circular dependency rejection, AST security sandbox, standard calculation scenario (BASIC, HRA, TRANSPORT, GROSS, PF, NET), sequence execution resilience, decimal rounding (`ROUND_HALF_UP`), contract date integration, preview safety, and RBAC matrix.
- Total test suite now stands at 155 tests passing across Phases 1 through 6.

---

## [0.0.5] — 2026-09-05

### Summary
Phase 5 release — **Time Off Management**.
Introduces comprehensive leave and time-off tracking: Leave Types (`TimeOffType`), Leave Allocations (`TimeOffAllocation`), Leave Requests (`TimeOffRequest`), atomic balance deduction, FIFO grant matching, overlap prevention for pending and approved requests, row-level concurrency locking (`with_for_update()`), cancellation with balance restoration, mandatory refusal reasons, self-service leave operations, and full RBAC enforcement.

### Added

#### Database Models (`app/models/`)
- `time_off.py`:
  - `TimeOffUnit` enum (`DAYS`, `HOURS`).
  - `AllocationStatus` enum (`DRAFT`, `APPROVED`, `ACTIVE`, `EXPIRED`, `CANCELLED`).
  - `TimeOffRequestStatus` enum (`PENDING`, `APPROVED`, `REFUSED`, `CANCELLED`).
  - `TimeOffType` model (`name`, `code`, `unit`, `requires_allocation`, `approval_required`, `payroll_integration`, `is_active`, timestamps).
  - `TimeOffAllocation` model (`employee_id`, `time_off_type_id`, `allocation_quantity`, `consumed_quantity`, `valid_from`, `valid_to`, `status`, `notes`, timestamps) with derived `remaining_quantity`.
  - `TimeOffRequest` model (`employee_id`, `time_off_type_id`, `allocation_id`, `start_date`, `end_date`, `requested_quantity`, `reason`, `status`, `approved_by`, `approved_at`, `refusal_reason`, timestamps).
- `employee.py` — Added `time_off_allocations` and `time_off_requests` relationships.
- `app/db/base.py` — Registered `time_off` in Base metadata.

#### Database Migrations (`alembic/versions/`)
- `0005_create_time_off_tables.py` — Migration creating PostgreSQL enums (`timeoffunit`, `allocationstatus`, `timeoffrequeststatus`), tables `time_off_types`, `time_off_allocations`, `time_off_requests` with foreign keys and indexes, and seeded default leave types (`PTO`, `SICK`, `UNPAID`).

#### Pydantic Schemas (`app/schemas/`)
- `time_off.py`:
  - `TimeOffTypeCreate`, `TimeOffTypeUpdate`, `TimeOffTypeResponse`, `TimeOffTypeListResponse`.
  - `TimeOffAllocationCreate`, `TimeOffAllocationUpdate`, `TimeOffAllocationResponse`, `TimeOffAllocationListResponse`.
  - `TimeOffRequestCreate`, `TimeOffRequestUpdate`, `TimeOffRequestRefuse`, `TimeOffRequestResponse`, `TimeOffRequestListResponse`.
  - `TimeOffBalanceItem`, `TimeOffBalanceResponse`.

#### Service Layer (`app/services/`)
- `time_off_type_service.py` — CRUD operations, uppercase code normalization, soft deactivation with pending request protection.
- `time_off_allocation_service.py` — Allocation grant creation, date validation (`valid_to >= valid_from`), update protection against reducing below consumed amount, cancellation with non-zero consumption protection, FIFO eligible grant lookup (`find_eligible_allocations`), and aggregated leave balances per type (`get_employee_balances`).
- `time_off_request_service.py` — Leave duration computation (`DAYS` inclusive counting vs `HOURS` standard workday), overlap validation blocking overlapping `PENDING` or `APPROVED` requests (`check_overlapping_requests`), atomic approval with row-level locking (`with_for_update()`), refusal with mandatory explanation, and cancellation with atomic balance restoration.

#### API Routers (`app/api/`)
- `time_off.py` — Mounted at `/api/v1/time-off` and alias `/api/v1/timeoff`:
  - `GET /api/v1/time-off/types` — List active leave types.
  - `POST /api/v1/time-off/types` — Create leave type (HR/Admin).
  - `GET /api/v1/time-off/types/{id}` — Get leave type details.
  - `PATCH /api/v1/time-off/types/{id}` — Update leave type (HR/Admin).
  - `DELETE /api/v1/time-off/types/{id}` — Soft-deactivate leave type (HR/Admin).
  - `GET /api/v1/time-off/allocations` — List allocations (HR sees all, employee sees own).
  - `POST /api/v1/time-off/allocations` — Grant leave allocation (HR/Admin).
  - `GET /api/v1/time-off/allocations/{id}` — Get allocation details.
  - `PATCH /api/v1/time-off/allocations/{id}` — Update allocation (HR/Admin).
  - `DELETE /api/v1/time-off/allocations/{id}` — Cancel allocation (HR/Admin).
  - `GET /api/v1/time-off/requests` — List leave requests with filters (HR sees all, employee sees own).
  - `POST /api/v1/time-off/requests` — Submit leave request.
  - `GET /api/v1/time-off/requests/{id}` — Get request details.
  - `PATCH /api/v1/time-off/requests/{id}` — Update pending request (own only).
  - `POST /api/v1/time-off/requests/{id}/approve` — Approve request with atomic lock (HR/Admin, non-self).
  - `POST /api/v1/time-off/requests/{id}/refuse` — Refuse request with mandatory reason (HR/Admin, non-self).
  - `POST /api/v1/time-off/requests/{id}/cancel` — Cancel request and restore balance.
  - `GET /api/v1/time-off/balances` — Query leave balances.
- `employees.py`:
  - `GET /api/v1/employees/me/time-off/allocations` — Self-service leave allocations.
  - `GET /api/v1/employees/me/time-off/requests` — Self-service leave requests.
  - `POST /api/v1/employees/me/time-off/requests` — Self-service leave request submission.
  - `GET /api/v1/employees/me/time-off/balances` — Self-service leave balances.
  - `GET /api/v1/employees/{id}/time-off/allocations` — Employee allocations (HR/Admin or own).
  - `GET /api/v1/employees/{id}/time-off/requests` — Employee requests (HR/Admin or own).
  - `GET /api/v1/employees/{id}/time-off/balances` — Employee balances (HR/Admin or own).

#### Tests (`tests/`)
- `test_time_off.py` — 35 comprehensive unit and integration tests covering leave types, allocations, requests, Scenario 32 (exact balance deduction), Scenario 33 (unpaid leave no allocation), Scenario 34 (request overlap prevention), Scenario 36 (concurrency row-level locking), balance restoration upon cancellation, mandatory refusal reason, self-approval prevention, cross-employee security, and full RBAC matrix.
- Total test suite now stands at 131 tests passing across Phases 1 through 5.

---

## [0.0.4] — 2026-09-05

### Summary
Phase 4 release — **Attendance Management & Working Schedules**.
Introduces the daily attendance management lifecycle, Working Schedule engine (`WorkingSchedule`, `WorkingScheduleDay`), server-side worked time, late arrival detection, overtime calculation, missing check-out handling, manual correction audit logs, self-service security, and full RBAC.

### Added

#### Database Models (`app/models/`)
- `schedule.py` — `WorkingSchedule` and `WorkingScheduleDay` ORM models mapping weekly schedules, working hours, and shift breaks.
- `attendance.py` — `AttendanceStatus` enum (`PRESENT`, `LATE`, `ABSENT`, `INCOMPLETE`, `HALF_DAY`) and `Attendance` model (`id`, `employee_id`, `attendance_date`, `check_in`, `check_out`, `worked_minutes`, `late_minutes`, `overtime_minutes`, `status`, `is_manual_edit`, `correction_reason`, timestamps) with unique `(employee_id, attendance_date)` constraint.
- `employee.py` — Added `working_schedule_id` foreign key, `working_schedule` relationship, and `attendances` collection.
- `app/db/base.py` — Registered `attendance` and `schedule` in Base metadata.

#### Database Migrations (`alembic/versions/`)
- `0004_create_schedule_and_attendance_tables.py` — Migration creating `working_schedules`, `working_schedule_days`, `attendancestatus` enum, `attendances` table with indexes, constraints, and default "Standard 40 Hours/Week" schedule seeder.

#### Pydantic Schemas (`app/schemas/`)
- `schedule.py` — `ScheduleIn`, `ScheduleOut`, `ScheduleLineIn`, `ScheduleLineOut`.
- `attendance.py` — `AttendanceCheckInRequest`, `AttendanceCheckOutRequest`, `AttendanceCreate`, `AttendanceUpdate`, `AttendanceResponse` (with derived hour properties), `AttendanceSessionResponse` (for UI header widget), `AttendanceListResponse`.

#### Service Layer (`app/services/`)
- `schedule_service.py` — Schedule CRUD, line validation, hours per week calculation, and default schedule seeding.
- `attendance_service.py` — Self-service check-in, check-out, calculation engine (Scenarios A, B, C, D, half-day, non-working days), manual adjustments with mandatory audit reason, and query filtering.

#### API Routers (`app/api/`)
- `schedules.py` — Mounted at `/api/v1/schedules`:
  - `GET /api/v1/schedules` — List schedules.
  - `POST /api/v1/schedules` — Create schedule (HR/Admin).
  - `GET /api/v1/schedules/{id}` — Get schedule details.
- `attendance.py` — Mounted at `/api/v1/attendance`:
  - `POST /api/v1/attendance/check-in` — Self-service check-in for authenticated employee.
  - `POST /api/v1/attendance/check-out` — Self-service check-out.
  - `POST /api/v1/attendance/{id}/check-out` — Check out specific session.
  - `GET /api/v1/attendance/session` — Header widget active session status.
  - `POST /api/v1/attendance` — Manual attendance creation (HR/Admin).
  - `GET /api/v1/attendance` — Filtered attendance list.
  - `GET /api/v1/attendance/{id}` — Attendance detail.
  - `PATCH /api/v1/attendance/{id}` — Manual correction with mandatory reason.
  - `DELETE /api/v1/attendance/{id}` — Delete attendance.
- `employees.py`:
  - `GET /api/v1/employees/me/attendance` — Current employee self-service attendance history.
  - `GET /api/v1/employees/{id}/attendance` — Specific employee attendance history.

#### Tests (`tests/`)
- `test_attendance.py` — 28 comprehensive unit & integration tests covering all calculation scenarios, schedule operations, manual adjustments, self-service security, and RBAC policies.

---

## [0.0.3] — 2026-09-05

### Summary
Phase 3 release — **Employment Contracts**.
Establishes the contract lifecycle engine (`ContractStatus`), remuneration management (`wage` with numeric precision), overlap prevention for active contracts, smart organizational fallbacks, and employee contract history.

### Added

#### Database Models (`app/models/`)
- `contract.py` — `ContractStatus` enum (`DRAFT`, `RUNNING`, `EXPIRED`, `CANCELLED`) and `Contract` ORM model (`id`, `contract_number`, `employee_id`, `department_id`, `job_position_id`, `salary_structure_id`, `start_date`, `end_date`, `wage`, `status`, audit timestamps).
- `employee.py` — Added `contracts` 1:N relationship back-populated from `Contract`.
- `app/db/base.py` — Registered `contract` model in Base declarative metadata.

#### Pydantic Schemas (`app/schemas/`)
- `contract.py` — `ContractCreate` (with date range & wage validation and code normalization), `ContractUpdate` (PATCH semantics), `ContractResponse` (with nested employee, department, and position snapshots), and `ContractListResponse`.

#### Service Layer (`app/services/`)
- `contract_service.py` — Contract CRUD, unique number validation, smart organizational fallback defaults, non-overlapping running contract validation, and lifecycle transitions (`activate_contract`, `cancel_contract`, `get_employee_contracts`).

#### API Routers (`app/api/`)
- `contracts.py` — Mounted at `/api/v1/contracts`:
  - `POST /api/v1/contracts` — Create contract (HR/Admin).
  - `GET /api/v1/contracts` — List contracts with filtering and pagination.
  - `GET /api/v1/contracts/{id}` — Get contract details (HR/Admin or linked Employee).
  - `PATCH /api/v1/contracts/{id}` — Partial contract update (HR/Admin).
  - `POST /api/v1/contracts/{id}/activate` — Transition to `RUNNING` with overlap prevention.
  - `POST /api/v1/contracts/{id}/cancel` — Transition to `CANCELLED`.
- `employees.py` — Added `GET /api/v1/employees/{id}/contracts` for employee contract history.

#### Security & Test Stability
- `security.py` — Switched password hashing to direct `bcrypt` implementation, resolving Python 3.14 / bcrypt 5.0 passlib 72-byte probing bug.
- `pyproject.toml` & `conftest.py` — Configured session-scoped event loop and `NullPool` to ensure asyncpg connections remain cleanly isolated during test execution.

#### Database Migrations (`alembic/versions/`)
- `0003_create_contracts_table.py` — Migration creating `contractstatus` PostgreSQL enum and `contracts` table with indexes, foreign keys, and complete rollback support.

#### Tests (`tests/`)
- `test_contracts.py` — 18 comprehensive tests covering contract creation, smart defaults, wage & date validations, running contract overlap prevention, lifecycle transitions, employee history, and RBAC policies.

---

## [0.0.2] — 2026-09-05

### Summary
Phase 2 release — **Employee Master & HR Master Data**.
Establishes the core organizational master entities (`Role`, `Department`, `JobPosition`), the primary HR business entity (`Employee`), the 1:1 `User ↔ Employee` relationship, and role-based access control.

### Added

#### Database Models (`app/models/`)
- `role.py` — `Role` ORM model with `id`, `name` (unique), `description`, `is_active`, and timestamps.
- `department.py` — `Department` ORM model with `id`, `name` (unique), `code` (unique normalized), `description`, `is_active`, and timestamps.
- `job_position.py` — `JobPosition` ORM model with `id`, `name` (unique), `code` (unique normalized), `description`, `is_active`, and timestamps.
- `employee.py` — `EmployeeStatus` enum (`ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`) and `Employee` ORM model with `employee_code`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `joining_date`, `department_id`, `job_position_id`, `manager_id` (self-referencing), `status`, and relationships.
- `user.py` — Modified `User` ORM model: replaced `role` enum with `role_id` foreign key referencing `roles.id`, replaced `emp_id` with `employee_id` unique foreign key referencing `employees.id`, added `Role` and `Employee` relationships.

#### Pydantic Schemas (`app/schemas/`)
- `role.py` — `RoleCreate`, `RoleUpdate`, `RoleResponse`.
- `department.py` — `DepartmentCreate`, `DepartmentUpdate`, `DepartmentResponse` with uppercase code normalization.
- `job_position.py` — `JobPositionCreate`, `JobPositionUpdate`, `JobPositionResponse` with uppercase code normalization.
- `employee.py` — `EmployeeCreate`, `EmployeeUpdate`, `EmployeeResponse` (with nested department, job position, and summary manager), `EmployeeListResponse`, `LinkUserRequest`.
- `user.py` — Updated `UserCreate` and `UserResponse` with `role_id`, `employee_id`, and backwards-compatible role name extraction.

#### Service Layer (`app/services/`)
- `role_service.py` — Role listing, retrieval, creation, updating, and idempotent seeding of the 5 standard system roles.
- `department_service.py` — Department CRUD with unique validation and safe deactivation guarding against active employee assignments.
- `job_position_service.py` — Job Position CRUD with unique validation and safe deactivation guarding against active employee assignments.
- `employee_service.py` — Employee CRUD, search, filter, pagination, self-manager prevention, and 1:1 user linking.
- `user_service.py` — Updated user creation with role resolution and employee link validation.

#### API Routers (`app/api/`)
- `roles.py` — `GET /api/v1/roles`, `GET /api/v1/roles/{role_id}`.
- `departments.py` — `GET /api/v1/departments`, `POST /api/v1/departments`, `GET /api/v1/departments/{id}`, `PATCH /api/v1/departments/{id}`, `DELETE /api/v1/departments/{id}`.
- `job_positions.py` — `GET /api/v1/job-positions`, `POST /api/v1/job-positions`, `GET /api/v1/job-positions/{id}`, `PATCH /api/v1/job-positions/{id}`, `DELETE /api/v1/job-positions/{id}`.
- `employees.py` — `POST /api/v1/employees`, `GET /api/v1/employees`, `GET /api/v1/employees/me`, `GET /api/v1/employees/{id}`, `PATCH /api/v1/employees/{id}`, `DELETE /api/v1/employees/{id}`, `POST /api/v1/employees/{id}/user`.

#### Reusable RBAC (`app/dependencies/auth.py`)
- Updated `require_role` to check against `current_user.role_name`.
- Added standard permission bundles: `require_hr_management()`, `require_master_data_admin()`, `require_admin()`.

#### Database Migrations (`alembic/versions/`)
- `0002_create_hr_master_and_employee_tables.py` — Complete migration creating roles, seeding standard roles, creating departments, job positions, employees, and migrating users table.

#### Tests (`tests/`)
- `test_master_data.py` — 18 tests for roles, departments, and job positions (CRUD, uniqueness, RBAC, deactivation).
- `test_employees.py` — 14 tests for employee CRUD, validations, manager hierarchy, user linking, self-service profile, and RBAC.

---

## [0.0.1] — 2026-09-05

### Summary
Initial release — **User & Authentication Foundation**.
Establishes the production-grade auth backbone that all future HR & Payroll modules will build upon.

### Added

#### Project Scaffolding
- `pyproject.toml` with project metadata (`name`, `version = "0.0.1"`, Python ≥ 3.12)
- `.env.example` documenting all required environment variables
- `.gitignore` covering Python, virtual environments, secrets, IDE, and OS artefacts

#### Core Configuration (`app/core/`)
- `config.py` — `Settings` class via `pydantic-settings`; reads `DATABASE_URL`, `SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS` from environment
- `security.py` — password hashing (`hash_password`, `verify_password` via `passlib[bcrypt]`) and JWT utilities (`create_access_token`, `create_refresh_token`, `decode_access_token`, `decode_refresh_token` via `python-jose[cryptography]`)

#### Database Layer (`app/db/`)
- `base.py` — SQLAlchemy 2.x `DeclarativeBase`; imports all models for Alembic `autogenerate`
- `database.py` — async engine, `AsyncSessionLocal` session factory, request-scoped `get_db()` dependency with auto-close and rollback on failure

#### User Model (`app/models/`)
- `user.py` — `UserRole` `StrEnum` (`EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`) and `User` ORM model with auto-incrementing Integer PK, nullable `emp_id` (FK-ready), unique indexed `email`, bcrypt `password_hash`, native PG ENUM role, `is_active`, timezone-aware `created_at`/`updated_at`

#### Pydantic Schemas (`app/schemas/`)
- `user.py` — `UserCreate` (with password strength validation), `UserResponse` (no password fields)
- `auth.py` — `LoginRequest`, `RefreshRequest`, `TokenResponse` (access + refresh tokens), `TokenPayload`

#### Services (`app/services/`)
- `user_service.py` — `get_user_by_email`, `get_user_by_id`, `create_user` (duplicate-email 409, hashes password)
- `auth_service.py` — `authenticate_user` (opaque 401 — never reveals email existence), `refresh_tokens`

#### Dependency Injection (`app/dependencies/`)
- `auth.py` — `get_current_user` dependency (decodes JWT, verifies DB existence and active status); `require_role(*roles)` dependency factory for endpoint RBAC

#### API Endpoints (`app/api/`)
- `POST /api/v1/auth/register` — user registration (201 Created)
- `POST /api/v1/auth/login` — authenticate and issue tokens (200 OK)
- `POST /api/v1/auth/refresh` — token refresh (200 OK)
- `GET /api/v1/auth/me` — retrieve authenticated user profile (200 OK)
- `GET /api/v1/health` — health check returning status and version (200 OK)

#### Entry Point (`app/main.py`)
- FastAPI application factory
- CORS middleware with origin whitelist from environment
- API routers mounted under `/api/v1`
- Global unhandled exception handler returning generic 500

#### Database Migrations (`alembic/`)
- Initialized async Alembic environment (`alembic/env.py`) reading `DATABASE_URL` dynamically from `Settings`
- First migration `0001_create_users_table.py` with `users` table, `userrole` ENUM, and email/emp_id indexes

#### Test Suite (`tests/`)
- `conftest.py` with session-scoped table creation, per-test transactional rollback isolation, and authenticated HTTP client fixtures
- `test_auth.py` with 15 test cases covering all registration, login, token refresh, and authorization flows

