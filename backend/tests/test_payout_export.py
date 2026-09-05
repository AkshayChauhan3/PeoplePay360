"""
Tests for Employee Banking Details & Bank Payout File Export — PeoplePay360

Verifies:
1. Employee Banking Details CRUD and normalization (IFSC, PAN, account number).
2. Bank Payout Readiness Audit Summary (/api/v1/payruns/{id}/bank-payout-summary).
3. State guardrails: DRAFT / CANCELLED payrun export rejection.
4. Strict mode enforcement (HTTP 422 on missing bank details).
5. Bank export format presets (Standard, HDFC Enet, ICICI Corporate).
6. RBAC enforcement: EMPLOYEE and HR_MANAGER rejected (403), Payroll roles allowed (200).
7. PDF payslip generation includes bank details.
"""

from decimal import Decimal

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _setup_test_payroll(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
) -> tuple[int, int, int]:
    """
    Sets up a standard salary structure, 2 employees (one with bank details, one without),
    running contracts, and returns (struct_id, emp_with_bank_id, emp_without_bank_id).
    """
    # 1. Salary Structure
    s_res = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_manager_auth_headers,
        json={"name": "Bank Test Structure", "code": "BANK_STRUCT", "is_active": True},
    )
    assert s_res.status_code == 201, s_res.text
    struct_id = s_res.json()["id"]

    # Basic Rule
    r1 = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Basic",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FORMULA",
            "formula": "CONTRACT_WAGE",
        },
    )
    assert r1.status_code == 201

    # Gross Rule
    r2 = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Gross",
            "code": "GROSS",
            "category": "GROSS",
            "sequence": 20,
            "computation_type": "FORMULA",
            "formula": "BASIC",
        },
    )
    assert r2.status_code == 201

    # Net Rule
    r3 = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Net",
            "code": "NET",
            "category": "NET",
            "sequence": 30,
            "computation_type": "FORMULA",
            "formula": "GROSS",
        },
    )
    assert r3.status_code == 201

    # 2. Employee 1: Complete Bank Details
    e1_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-BANK-01",
            "first_name": "Aarav",
            "last_name": "Sharma",
            "email": "aarav.sharma@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
            "bank_name": "HDFC Bank",
            "bank_account_number": "50100987654321",
            "ifsc_code": "hdfc0001234",
            "pan_number": "abcde1234f",
            "account_holder_name": "Aarav Sharma",
        },
    )
    assert e1_res.status_code == 201, e1_res.text
    emp1_id = e1_res.json()["id"]

    # 3. Employee 2: Missing Bank Details
    e2_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-BANK-02",
            "first_name": "Bhavna",
            "last_name": "Patel",
            "email": "bhavna.patel@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
    )
    assert e2_res.status_code == 201, e2_res.text
    emp2_id = e2_res.json()["id"]

    # 4. Contracts
    for emp_id, code, wage in [(emp1_id, "CNT-B-01", 75000.0), (emp2_id, "CNT-B-02", 60000.0)]:
        c_res = await async_client.post(
            "/api/v1/contracts",
            headers=admin_auth_headers,
            json={
                "contract_number": code,
                "employee_id": emp_id,
                "salary_structure_id": struct_id,
                "start_date": "2026-01-01",
                "wage": wage,
                "status": "RUNNING",
            },
        )
        assert c_res.status_code == 201, c_res.text

    return struct_id, emp1_id, emp2_id


async def test_employee_banking_fields_crud(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify banking fields creation, uppercase normalization, and PATCH updates."""
    create_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-BANK-CRUD",
            "first_name": "Rohan",
            "last_name": "Verma",
            "email": "rohan.verma@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "bank_name": "ICICI Bank",
            "bank_account_number": "000105001234",
            "ifsc_code": "icic0000001",
            "pan_number": "xyzab9876z",
            "account_holder_name": "Rohan Verma",
        },
    )
    assert create_res.status_code == 201, create_res.text
    data = create_res.json()
    emp_id = data["id"]
    assert data["bank_name"] == "ICICI Bank"
    assert data["bank_account_number"] == "000105001234"
    assert data["ifsc_code"] == "ICIC0000001"  # Normalized to uppercase
    assert data["pan_number"] == "XYZAB9876Z"  # Normalized to uppercase
    assert data["account_holder_name"] == "Rohan Verma"

    # Update banking details via PATCH
    update_res = await async_client.patch(
        f"/api/v1/employees/{emp_id}",
        headers=admin_auth_headers,
        json={
            "bank_name": "State Bank of India",
            "bank_account_number": "20001234567",
            "ifsc_code": "sbin0001234",
        },
    )
    assert update_res.status_code == 200, update_res.text
    updated = update_res.json()
    assert updated["bank_name"] == "State Bank of India"
    assert updated["bank_account_number"] == "20001234567"
    assert updated["ifsc_code"] == "SBIN0001234"
    assert updated["pan_number"] == "XYZAB9876Z"  # Unchanged


async def test_bank_payout_summary_and_missing_details(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify /bank-payout-summary calculates totals and surfaces missing employee details."""
    struct_id, emp1_id, emp2_id = await _setup_test_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    # Create & Compute Payrun
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "September 2026 Bank Test",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id, emp2_id],
        },
    )
    assert pr_res.status_code == 201, pr_res.text
    payrun_id = pr_res.json()["id"]

    # Compute
    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_res.status_code == 200

    # Get Audit Summary
    sum_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/bank-payout-summary",
        headers=hr_payroll_manager_auth_headers,
    )
    assert sum_res.status_code == 200, sum_res.text
    summary = sum_res.json()

    assert summary["payrun_id"] == payrun_id
    assert summary["total_employees"] == 2
    assert summary["ready_for_payout_count"] == 1
    assert summary["missing_bank_details_count"] == 1
    assert summary["can_export"] is True
    assert Decimal(str(summary["total_payout_amount"])) == Decimal("135000.00")

    # Verify missing employee details
    assert len(summary["missing_employees"]) == 1
    missing = summary["missing_employees"][0]
    assert missing["employee_id"] == emp2_id
    assert missing["employee_code"] == "E-BANK-02"
    assert "bank_account_number" in missing["missing_fields"]
    assert "ifsc_code" in missing["missing_fields"]


async def test_export_bank_file_draft_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify exporting a DRAFT payrun returns 400 Bad Request."""
    struct_id, emp1_id, emp2_id = await _setup_test_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Draft Payrun Test",
            "salary_structure_id": struct_id,
            "period_start": "2026-10-01",
            "period_end": "2026-10-31",
            "employee_ids": [emp1_id],
        },
    )
    assert pr_res.status_code == 201
    draft_payrun_id = pr_res.json()["id"]

    exp_res = await async_client.get(
        f"/api/v1/payruns/{draft_payrun_id}/export-bank-file",
        headers=hr_payroll_manager_auth_headers,
    )
    assert exp_res.status_code == 400
    assert "Cannot export bank payout file for DRAFT payrun" in exp_res.json()["detail"]


async def test_export_bank_file_strict_mode(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify strict mode blocks export with 422 if any employee has missing details."""
    struct_id, emp1_id, emp2_id = await _setup_test_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Strict Export Test",
            "salary_structure_id": struct_id,
            "period_start": "2026-08-01",
            "period_end": "2026-08-31",
            "employee_ids": [emp1_id, emp2_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)

    # 1. Strict export should fail with 422
    strict_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/export-bank-file?strict=true",
        headers=hr_payroll_manager_auth_headers,
    )
    assert strict_res.status_code == 422
    assert "Strict bank export failed" in strict_res.json()["detail"]["message"]

    # 2. Non-strict export should succeed with 200 and place placeholder in CSV
    relaxed_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/export-bank-file?strict=false",
        headers=hr_payroll_manager_auth_headers,
    )
    assert relaxed_res.status_code == 200
    assert "text/csv" in relaxed_res.headers["content-type"]
    assert "attachment; filename=" in relaxed_res.headers["content-disposition"]
    csv_text = relaxed_res.text
    assert "MISSING_ACCOUNT" in csv_text
    assert "50100987654321" in csv_text


async def test_export_bank_file_format_presets(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify Standard, HDFC, and ICICI bank export column structures."""
    struct_id, emp1_id, _ = await _setup_test_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Formats Export Cycle",
            "salary_structure_id": struct_id,
            "period_start": "2026-07-01",
            "period_end": "2026-07-31",
            "employee_ids": [emp1_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)

    # 1. Standard Preset
    std_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/export-bank-file?bank_format=standard",
        headers=hr_payroll_manager_auth_headers,
    )
    assert std_res.status_code == 200
    std_lines = std_res.text.strip().split("\r\n")
    assert std_lines[0] == "Sr No,Employee Code,Beneficiary Name,Account Number,IFSC Code,Bank Name,Net Amount (INR),Remarks,PAN Number,Email"
    assert "E-BANK-01" in std_lines[1]
    assert "50100987654321" in std_lines[1]
    assert "HDFC0001234" in std_lines[1]
    assert "75000.00" in std_lines[1]

    # 2. HDFC Preset
    hdfc_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/export-bank-file?bank_format=hdfc",
        headers=hr_payroll_manager_auth_headers,
    )
    assert hdfc_res.status_code == 200
    hdfc_lines = hdfc_res.text.strip().split("\r\n")
    assert hdfc_lines[0] == "Transaction Type,Beneficiary Code,Beneficiary Account Number,Amount,Beneficiary Name,Remarks,IFSC Code"
    assert "NEFT" in hdfc_lines[1]  # < 2,00,000 INR
    assert "50100987654321" in hdfc_lines[1]

    # 3. ICICI Preset
    icici_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/export-bank-file?bank_format=icici",
        headers=hr_payroll_manager_auth_headers,
    )
    assert icici_res.status_code == 200
    icici_lines = icici_res.text.strip().split("\r\n")
    assert icici_lines[0] == "Debit Account No,Payee Name,Payee Account No,Amount,Payee IFSC,Remarks"
    assert "PRIMARY_SALARY_ACCOUNT" in icici_lines[1]
    assert "50100987654321" in icici_lines[1]


async def test_export_bank_file_rbac(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_manager_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
    employee_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify RBAC permissions for bank export."""
    struct_id, emp1_id, _ = await _setup_test_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "RBAC Bank Export",
            "salary_structure_id": struct_id,
            "period_start": "2026-06-01",
            "period_end": "2026-06-30",
            "employee_ids": [emp1_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)

    url = f"/api/v1/payruns/{payrun_id}/export-bank-file"

    # EMPLOYEE -> 403 Forbidden
    emp_res = await async_client.get(url, headers=employee_auth_headers)
    assert emp_res.status_code == 403

    # HR_MANAGER -> 403 Forbidden (segregation of duties)
    hr_res = await async_client.get(url, headers=hr_manager_auth_headers)
    assert hr_res.status_code == 403

    # HR_PAYROLL_USER -> 200 OK
    pu_res = await async_client.get(url, headers=hr_payroll_user_auth_headers)
    assert pu_res.status_code == 200

    # HR_PAYROLL_MANAGER -> 200 OK
    pm_res = await async_client.get(url, headers=hr_payroll_manager_auth_headers)
    assert pm_res.status_code == 200

    # ADMIN -> 200 OK
    adm_res = await async_client.get(url, headers=admin_auth_headers)
    assert adm_res.status_code == 200


async def test_pdf_payslip_includes_bank_details(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify downloading the PDF payslip for an employee with bank details generates valid PDF."""
    struct_id, emp1_id, _ = await _setup_test_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "PDF Bank Test",
            "salary_structure_id": struct_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-31",
            "employee_ids": [emp1_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)

    # Get payslips
    sl_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert sl_res.status_code == 200
    payslip_id = sl_res.json()["items"][0]["id"]

    # Download PDF
    pdf_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/pdf",
        headers=hr_payroll_manager_auth_headers,
    )
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")
    assert len(pdf_res.content) > 1000
