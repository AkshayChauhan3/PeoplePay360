# PeoplePay360 — Automated Email Delivery Engine (Module 2)

## Overview
The **Automated Email Delivery Engine** automates the secure, reliable distribution of individual PDF salary statements to employees upon payrun approval (`VALIDATED` or `PAID`). It integrates ReportLab PDF rendering, responsive HTML email templates, threaded non-blocking SMTP transport, zero-credential Mock Delivery Mode, and comprehensive audit tracking with an HR **"Retry Failed"** workflow.

---

## Key Features

1. **Individual PDF Attachment**:
   - Uses `pdf_service.generate_payslip_pdf` to dynamically generate official ReportLab PDF payslips with masked bank account numbers, itemized allowances/deductions, and INR currency formatting.
   - Attached with standard MIME headers: `Payslip_{employee_code}_{period_start}_{period_end}.pdf`.

2. **Professional Responsive HTML Email**:
   - High-impact salary advice email designed for desktop and mobile mail clients.
   - Prominently highlights **Net Take-Home Pay (INR)** in a styled callout card.
   - Itemizes Gross Earnings, Total Deductions, Worked Days, and Pay Period.
   - Includes standard plain-text alternative fallback.

3. **Delivery Audit Tracking (`payslip_email_deliveries`)**:
   - Every delivery attempt is tracked in PostgreSQL with `status` (`PENDING`, `SENT`, `FAILED`), error messages, retry counts, and transmission timestamps.
   - Real-time audit metrics via `GET /api/v1/payruns/{id}/email-delivery-summary`.

4. **Anti-Spam & HR "Retry Failed" Action**:
   - `POST /api/v1/payruns/{id}/send-payslips`: Automatically skips employees who already have status `SENT` (prevents accidental double-spamming).
   - `POST /api/v1/payruns/{id}/retry-failed-emails`: Targets strictly failed recipients, increments retry counts, and updates status upon success.

5. **Zero-Configuration Mock Delivery Mode**:
   - Automatically active when `SMTP_HOST` is unconfigured or `SMTP_MOCK_DELIVERY=true`.
   - Simulates full email generation, PDF rendering, address validation, and database audit updates without requiring external SMTP credentials or internet access.
   - Automatically switches to real SMTP over TLS/STARTTLS when configured.

---

## Architecture & Data Flow

```mermaid
flowchart TD
    PR[Payrun: VALIDATED or PAID]
    PS[Payslips]
    PR --> PS

    subgraph API Actions
        S[POST /payruns/{id}/send-payslips]
        R[POST /payruns/{id}/retry-failed-emails]
        I[POST /payslips/{id}/send-email]
    end

    subgraph Service Layer
        Filter[Filter: Skip SENT unless forced]
        PDF[Generate ReportLab PDF]
        MIME[Compose MIME: HTML + Plain + PDF]
        SMTP[Transport: Mock Mode or Live TLS SMTP]
        DB[(PostgreSQL: payslip_email_deliveries)]
    end

    PR --> S
    PR --> R
    PS --> I

    S --> Filter
    R --> Filter
    Filter --> PDF
    PDF --> MIME
    MIME --> SMTP
    SMTP --> DB
```

---

## API Endpoints

| Method | Path | RBAC Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payruns/{id}/send-payslips` | `HR_PAYROLL_MANAGER`, `ADMIN` | Distribute PDF payslips via email to payrun batch |
| `POST` | `/api/v1/payruns/{id}/retry-failed-emails` | `HR_PAYROLL_MANAGER`, `ADMIN` | Re-attempt delivery strictly for failed recipients |
| `GET` | `/api/v1/payruns/{id}/email-delivery-summary` | `HR_PAYROLL_READ`, `ADMIN` | Real-time delivery metrics & itemized employee logs |
| `POST` | `/api/v1/payslips/{id}/send-email` | `HR_PAYROLL_MANAGER`, `ADMIN` | Email an individual employee's payslip |

---

## Database Schema (`payslip_email_deliveries`)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique audit record identifier |
| `payrun_id` | `INTEGER` | `FK(payruns.id ON DELETE CASCADE)` | Associated payrun |
| `payslip_id` | `INTEGER` | `FK(payslips.id ON DELETE CASCADE)` | Associated payslip |
| `employee_id` | `INTEGER` | `FK(employees.id ON DELETE CASCADE)` | Recipient employee |
| `recipient_email` | `VARCHAR(255)` | `NOT NULL` | Destination email address |
| `recipient_name` | `VARCHAR(200)` | `NOT NULL` | Employee full name |
| `subject` | `VARCHAR(255)` | `NOT NULL` | Email subject line |
| `status` | `ENUM` | `PENDING`, `SENT`, `FAILED` | Current delivery status |
| `error_message` | `TEXT` | `NULLABLE` | Error diagnostics if delivery failed |
| `retry_count` | `INTEGER` | `DEFAULT 0` | Number of delivery re-attempts |
| `sent_at` | `TIMESTAMP WITH TZ`| `NULLABLE` | Timestamp of successful transmission |
| `created_at` | `TIMESTAMP WITH TZ`| `DEFAULT now()` | Audit creation timestamp |
| `updated_at` | `TIMESTAMP WITH TZ`| `DEFAULT now()` | Audit last update timestamp |

**Constraint**: `UNIQUE (payrun_id, payslip_id)` ensures exactly one tracking record per payslip with updated attempt history.

---

## Test Verification

- **Suite**: `tests/test_email_delivery.py` (7 tests, 100% passing).
- **Regression**: Full suite passing with 0 regressions.
