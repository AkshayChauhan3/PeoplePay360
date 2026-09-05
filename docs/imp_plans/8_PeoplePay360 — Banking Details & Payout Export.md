# Implementation Plan — Phase 8: Employee Banking Details & Bank Payout File Export

This document details the completed implementation for **Employee Banking Details** and the **Bank Payout File Export Engine** for PeoplePay360.

---

## 1. Overview & Architecture

Enables direct disbursement of net salaries by recording employee banking credentials and exporting standardized, bank-compliant batch payout files for upload to corporate banking portals (e.g. HDFC Enet, ICICI Corporate Banking, SBI CMS).

```mermaid
flowchart TD
    subgraph Employee Management
        EMP[Employee Profile]
        EMP -->|Stores| BANK[bank_name, bank_account_number, ifsc_code, pan_number, account_holder_name]
    end

    subgraph Payroll Lifecycle
        PR[Payrun COMPUTED / VALIDATED / PAID]
        PS[Employee Payslips with Net Pay]
        PR --> PS
    end

    subgraph Payout Export Engine
        PR --> SUMM[GET /payruns/{id}/bank-payout-summary]
        SUMM -->|Audits Readiness| STATS[Ready vs Missing Bank Accounts]

        PR --> EXP[GET /payruns/{id}/export-bank-file]
        EXP -->|bank_format: standard| CSV1[10-Column Universal CSV]
        EXP -->|bank_format: hdfc| CSV2[HDFC Bank Enet CMS CSV]
        EXP -->|bank_format: icici| CSV3[ICICI Corporate Bulk CSV]
        EXP -->|strict: true| CHK{All Details Complete?}
        CHK -->|No| ERR[HTTP 422 Unprocessable Content]
        CHK -->|Yes| OK[Stream CSV Download]
    end
```

---

## 2. Implemented Components

### 2.1 Database & Migrations
- **Alembic Migration `0008_add_employee_bank_details.py`**:
  - Adds `bank_name` (`VARCHAR(100)`, nullable)
  - Adds `bank_account_number` (`VARCHAR(50)`, nullable)
  - Adds `ifsc_code` (`VARCHAR(20)`, nullable)
  - Adds `pan_number` (`VARCHAR(20)`, nullable)
  - Adds `account_holder_name` (`VARCHAR(100)`, nullable)
- **Model `Employee` (`app/models/employee.py`)**:
  - Registered mapped attributes for all banking fields.

### 2.2 Schemas (`app/schemas/`)
- `schemas/employee.py`:
  - `EmployeeCreate`, `EmployeeUpdate`, `EmployeeResponse` updated with banking fields.
  - Normalization validators for `ifsc_code` (uppercase), `pan_number` (uppercase), and whitespace trimming.
- `schemas/payout.py`:
  - `MissingBankInfoEmployee`: identifies missing bank fields for an employee.
  - `BankPayoutSummaryResponse`: pre-disbursement audit reporting total amount, ready count, missing count, and export readiness.

### 2.3 Service Layer (`app/services/`)
- `services/payout_export_service.py`:
  - `get_bank_payout_summary(db, payrun_id)`: Audits readiness and aggregates payout amounts.
  - `generate_bank_payout_csv(db, payrun_id, bank_format, strict)`: Generates compliant CSV stream with format presets and strict validation.
- `services/employee_service.py`:
  - Passes through banking fields on creation and PATCH updates.
- `services/pdf_service.py`:
  - Formats employee bank details on ReportLab PDF payslip with masked account (`•••• 1234`), IFSC, and PAN.

### 2.4 API Routers (`app/api/payruns.py`)
- `GET /api/v1/payruns/{id}/bank-payout-summary`: Returns audit summary before export.
- `GET /api/v1/payruns/{id}/export-bank-file`: Streams CSV file download with `Content-Disposition`.
- RBAC: Allowed for `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`; forbidden for general `HR_MANAGER` and `EMPLOYEE`.

---

## 3. Automated Verification

- Suite: `tests/test_payout_export.py` (7 tests, 100% passing).
- Full regression: 173 tests passing across all 8 modules in 152s.
