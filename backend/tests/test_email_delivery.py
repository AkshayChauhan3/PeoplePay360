"""
Tests for Automated Email Delivery Engine — PeoplePay360

Verifies:
1. State Guardrails: DRAFT / COMPUTED payruns reject email delivery (HTTP 400).
2. Email Delivery on VALIDATED & PAID: Generates PDF payslips, composes MIME, records SENT in audit table.
3. Anti-Spam (Idempotency): Skips already delivered payslips on subsequent runs unless force_resend_all is set.
4. Audit Summary (/email-delivery-summary): Returns real-time metrics and itemized delivery logs.
5. Failure Handling & 'Retry Failed' Action: Captures failed deliveries and strictly retries failed recipients.
6. Single Payslip Re-send (/payslips/{id}/send-email): Sends individual payslip and updates audit status.
7. RBAC Enforcement: EMPLOYEE & HR_MANAGER rejected (403), Payroll Manager and Admin authorized (200).
"""

import pytest
from httpx import AsyncClient

from app.models.email_delivery import EmailDeliveryStatus

pytestmark = pytest.mark.asyncio


async def _setup_email_payroll(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
    fail_email_for_emp2: bool = False,
) -> tuple[int, int, int]:
    """
    Sets up a standard salary structure with 3 rules (BASIC, GROSS, NET),
    2 employees, running contracts, and returns (struct_id, emp1_id, emp2_id).
    """
    # 1. Salary Structure
    s_res = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_manager_auth_headers,
        json={"name": "Email Test Structure", "code": "EMAIL_STRUCT", "is_active": True},
    )
    assert s_res.status_code == 201, s_res.text
    struct_id = s_res.json()["id"]

    for code, seq, form, cat in [
        ("BASIC", 10, "CONTRACT_WAGE", "BASIC"),
        ("GROSS", 20, "BASIC", "GROSS"),
        ("NET", 30, "GROSS", "NET"),
    ]:
        r_res = await async_client.post(
            "/api/v1/salary-rules",
            headers=hr_payroll_manager_auth_headers,
            json={
                "salary_structure_id": struct_id,
                "name": code.capitalize(),
                "code": code,
                "category": cat,
                "sequence": seq,
                "computation_type": "FORMULA",
                "formula": form,
            },
        )
        assert r_res.status_code == 201

    # 2. Employees
    e1_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-EML-01",
            "first_name": "Kavita",
            "last_name": "Rao",
            "email": "kavita.rao@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
            "bank_name": "HDFC Bank",
            "bank_account_number": "50100987654321",
            "ifsc_code": "HDFC0001234",
        },
    )
    assert e1_res.status_code == 201, e1_res.text
    emp1_id = e1_res.json()["id"]

    emp2_email = "fail@example.com" if fail_email_for_emp2 else "manish.sharma@example.com"
    e2_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-EML-02",
            "first_name": "Manish",
            "last_name": "Sharma",
            "email": emp2_email,
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
            "bank_name": "ICICI Bank",
            "bank_account_number": "000401567890",
            "ifsc_code": "ICIC0002345",
        },
    )
    assert e2_res.status_code == 201, e2_res.text
    emp2_id = e2_res.json()["id"]

    # 3. Running Contracts
    for emp_id, cnt_num, wage in [(emp1_id, "CNT-E-01", 80000.0), (emp2_id, "CNT-E-02", 70000.0)]:
        c_res = await async_client.post(
            "/api/v1/contracts",
            headers=admin_auth_headers,
            json={
                "contract_number": cnt_num,
                "employee_id": emp_id,
                "salary_structure_id": struct_id,
                "start_date": "2026-01-01",
                "wage": wage,
                "status": "RUNNING",
            },
        )
        assert c_res.status_code == 201, c_res.text

    return struct_id, emp1_id, emp2_id


async def test_state_guardrails_reject_draft_and_computed_payruns(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify that email delivery is rejected for DRAFT and COMPUTED payruns."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    # 1. Create Payrun (DRAFT)
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "State Guardrail Test Payrun",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id, emp2_id],
        },
    )
    assert pr_res.status_code == 201
    payrun_id = pr_res.json()["id"]

    # Try sending emails on DRAFT -> HTTP 400
    send_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert send_res.status_code == 400
    assert "VALIDATED or PAID" in send_res.json()["detail"]

    # 2. Compute Payrun -> status COMPUTED
    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_res.status_code == 200

    # Try sending emails on COMPUTED -> HTTP 400
    send_comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert send_comp_res.status_code == 400
    assert "VALIDATED or PAID" in send_comp_res.json()["detail"]


async def test_email_delivery_and_audit_tracking_on_validated_payrun(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify email delivery creates audit records and returns accurate summary."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    # 1. Create, Compute & Validate Payrun
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "September 2026 Distribution",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id, emp2_id],
        },
    )
    assert pr_res.status_code == 201
    payrun_id = pr_res.json()["id"]

    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    val_res = await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)
    assert val_res.status_code == 200

    # Check initial summary before sending
    init_sum = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/email-delivery-summary",
        headers=hr_payroll_manager_auth_headers,
    )
    assert init_sum.status_code == 200
    assert init_sum.json()["total_payslips"] == 2
    assert init_sum.json()["sent_count"] == 0
    assert init_sum.json()["not_attempted_count"] == 2
    assert init_sum.json()["can_retry"] is True

    # 2. Trigger Send Payslips
    send_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert send_res.status_code == 200
    data = send_res.json()
    assert data["total_payslips"] == 2
    assert data["processed_count"] == 2
    assert data["sent_count"] == 2
    assert data["failed_count"] == 0
    assert data["skipped_count"] == 0

    # 3. Check Delivery Summary Audit
    sum_res = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/email-delivery-summary",
        headers=hr_payroll_manager_auth_headers,
    )
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["sent_count"] == 2
    assert summary["failed_count"] == 0
    assert summary["not_attempted_count"] == 0
    assert summary["can_retry"] is False
    assert len(summary["deliveries"]) == 2

    # Verify item contents
    item1 = summary["deliveries"][0]
    assert item1["status"] == EmailDeliveryStatus.SENT.value
    assert item1["recipient_email"] == "kavita.rao@example.com"
    assert item1["sent_at"] is not None
    assert item1["retry_count"] == 0
    assert "Payslip for" in item1["subject"]


async def test_email_delivery_on_paid_payrun(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify email delivery succeeds on a PAID payrun."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Paid Payrun Email Test",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)
    paid_res = await async_client.post(f"/api/v1/payruns/{payrun_id}/mark-paid", headers=hr_payroll_manager_auth_headers)
    assert paid_res.status_code == 200

    # Deliver on PAID
    send_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert send_res.status_code == 200
    assert send_res.json()["sent_count"] == 1


async def test_anti_spam_idempotency(

    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify that triggering send-payslips again skips employees who already received theirs."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Anti Spam Payrun",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id, emp2_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)

    # First send: both sent
    res1 = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert res1.json()["sent_count"] == 2
    assert res1.json()["skipped_count"] == 0

    # Second send: both skipped (Anti-Spam)
    res2 = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert res2.json()["sent_count"] == 0
    assert res2.json()["skipped_count"] == 2
    assert res2.json()["processed_count"] == 0

    # Force resend all: overrides skipping
    res3 = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
        json={"force_resend_all": True},
    )
    assert res3.json()["sent_count"] == 2
    assert res3.json()["skipped_count"] == 0


async def test_failure_handling_and_retry_failed_action(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify delivery failure is captured and retry-failed-emails targets ONLY failed recipients."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position,
        fail_email_for_emp2=True,  # emp2 will have fail@example.com
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Retry Failed Test Payrun",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id, emp2_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)

    # Initial send: 1 sent, 1 failed
    send_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_payroll_manager_auth_headers,
    )
    assert send_res.status_code == 200
    res_data = send_res.json()
    assert res_data["sent_count"] == 1
    assert res_data["failed_count"] == 1
    assert res_data["skipped_count"] == 0

    # Summary shows can_retry = True
    sum1 = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/email-delivery-summary",
        headers=hr_payroll_manager_auth_headers,
    )
    assert sum1.json()["can_retry"] is True
    assert sum1.json()["failed_count"] == 1

    failed_item = [d for d in sum1.json()["deliveries"] if d["status"] == "FAILED"][0]
    assert failed_item["employee_id"] == emp2_id
    assert failed_item["error_message"] is not None

    # Fix employee 2's email to a valid address
    patch_res = await async_client.patch(
        f"/api/v1/employees/{emp2_id}",
        headers=admin_auth_headers,
        json={"email": "manish.fixed@example.com"},
    )
    assert patch_res.status_code == 200

    # Click 'Retry Failed': skips emp1 (already SENT), retries emp2
    retry_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/retry-failed-emails",
        headers=hr_payroll_manager_auth_headers,
    )
    assert retry_res.status_code == 200
    retry_data = retry_res.json()
    assert retry_data["processed_count"] == 1
    assert retry_data["sent_count"] == 1
    assert retry_data["failed_count"] == 0
    assert retry_data["skipped_count"] == 1  # emp1 was skipped!

    # Summary shows 100% delivered, retry_count incremented
    sum2 = await async_client.get(
        f"/api/v1/payruns/{payrun_id}/email-delivery-summary",
        headers=hr_payroll_manager_auth_headers,
    )
    assert sum2.json()["can_retry"] is False
    assert sum2.json()["sent_count"] == 2
    assert sum2.json()["failed_count"] == 0

    retried_item = [d for d in sum2.json()["deliveries"] if d["employee_id"] == emp2_id][0]
    assert retried_item["status"] == "SENT"
    assert retried_item["retry_count"] == 1


async def test_send_single_payslip_email_endpoint(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify POST /payslips/{id}/send-email delivers an individual employee payslip."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Single Send Payrun",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)

    # Get payslip ID
    ps_res = await async_client.get(f"/api/v1/payruns/{payrun_id}/payslips", headers=hr_payroll_manager_auth_headers)
    payslip_id = ps_res.json()["items"][0]["id"]

    # Send individual
    ind_res = await async_client.post(
        f"/api/v1/payslips/{payslip_id}/send-email",
        headers=hr_payroll_manager_auth_headers,
    )
    assert ind_res.status_code == 200
    res_data = ind_res.json()
    assert res_data["payslip_id"] == payslip_id
    assert res_data["status"] == "SENT"
    assert res_data["sent_at"] is not None


async def test_rbac_for_email_delivery_endpoints(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    employee_auth_headers: dict[str, str],
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verify non-payroll roles are rejected with 403 Forbidden."""
    struct_id, emp1_id, emp2_id = await _setup_email_payroll(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position
    )

    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "RBAC Test Payrun",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp1_id],
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)

    # EMPLOYEE role forbidden (403)
    emp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=employee_auth_headers,
    )
    assert emp_res.status_code == 403

    # HR_MANAGER role (without payroll role) forbidden (403)
    hrm_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=hr_manager_auth_headers,
    )
    assert hrm_res.status_code == 403

    # ADMIN permitted (200)
    adm_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/send-payslips",
        headers=admin_auth_headers,
    )
    assert adm_res.status_code == 200
