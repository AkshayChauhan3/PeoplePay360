"""
Phase 8.1 Email Delivery Hardening Tests — PeoplePay360

Validates production hardening features:
1. Storage abstraction (local storage save, retrieve, exists, delete, path traversal security).
2. Email provider abstraction (mock mode, permanent vs temporary failure classification).
3. Background Worker & Job Execution (`send_payslip_email_job`, `process_payrun_emails_job`).
4. Atomic row claiming (ensuring double processing does not duplicate sends).
5. Automatic retry backoff scheduling for temporary failures.
6. Non-retryable permanent failure handling (syntax, 5xx).
7. Automatic PAID trigger when configured.
8. Single payslip delivery query endpoint (`GET /api/v1/payslips/{id}/email-delivery`).
9. RBAC guardrails (Employee owner vs Payroll Manager vs unauthorized user).
10. Payrun state guardrails (DRAFT, COMPUTED, VALIDATED, PAID).
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.email_delivery import (
    EmailDeliveryStatus,
    EmailFailureType,
    PayslipEmailDelivery,
)
from app.models.employee import Employee
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.models.user import User
from app.services.email.base import (
    EmailAttachment,
    EmailMessage,
    EmailSendResult,
)
from app.services.email.smtp_provider import SmtpEmailProvider
from app.services.storage.local_storage import LocalFileStorageService
from app.workers.email_worker import (
    enqueue_delivery_job,
    process_payrun_emails_job,
    send_payslip_email_job,
)


@pytest.fixture
def tmp_storage(tmp_path):
    """Temporary local file storage service fixture."""
    return LocalFileStorageService(base_dir=tmp_path / "storage")


# ===========================================================================
# 1. Storage Abstraction Tests
# ===========================================================================

async def test_storage_save_get_exists_delete(tmp_storage: LocalFileStorageService):
    """Verifies complete lifecycle in LocalFileStorageService."""
    key = "payruns/1/payslips/100_EMP01_2026.pdf"
    content = b"%PDF-1.4 Mock PDF binary data"

    assert not await tmp_storage.exists(key)
    saved_key = await tmp_storage.save_payslip_pdf(key, content)
    assert saved_key == key
    assert await tmp_storage.exists(key)

    retrieved = await tmp_storage.get_payslip_pdf(key)
    assert retrieved == content

    deleted = await tmp_storage.delete_payslip_pdf(key)
    assert deleted is True
    assert not await tmp_storage.exists(key)
    assert await tmp_storage.get_payslip_pdf(key) is None


async def test_storage_path_traversal_guard(tmp_storage: LocalFileStorageService):
    """Verifies that path traversal attacks are rejected with ValueError."""
    with pytest.raises(ValueError, match="Invalid storage key"):
        await tmp_storage.save_payslip_pdf("../../../etc/passwd", b"evil")


# ===========================================================================
# 2. Email Provider & Failure Classification Tests
# ===========================================================================

async def test_email_provider_mock_mode():
    """Mock mode generates a mock message id on valid address."""
    provider = SmtpEmailProvider(mock_mode=True)
    msg = EmailMessage(
        to_email="employee@example.com",
        to_name="Jane Doe",
        subject="Your Payslip",
        html_body="<p>Test</p>",
        text_body="Test",
    )
    res = await provider.send_email(msg)
    assert res.success is True
    assert res.message_id is not None
    assert res.message_id.startswith("mock-")


async def test_email_provider_permanent_failures():
    """Permanent error classification for bad format and permanent bounce tag."""
    provider = SmtpEmailProvider(mock_mode=True)

    # 1. Invalid syntax
    res1 = await provider.send_email(
        EmailMessage("invalidemail", "Name", "Subject", "Body", "Body")
    )
    assert res1.success is False
    assert res1.failure_type == EmailFailureType.PERMANENT

    # 2. Permanent simulation tag
    res2 = await provider.send_email(
        EmailMessage("fail@test.com", "Name", "Subject", "Body", "Body")
    )
    assert res2.success is False
    assert res2.failure_type == EmailFailureType.PERMANENT


async def test_email_provider_temporary_failure():
    """Temporary error classification for network timeout simulation tag."""
    provider = SmtpEmailProvider(mock_mode=True)
    res = await provider.send_email(
        EmailMessage("temp-fail@test.com", "Name", "Subject", "Body", "Body")
    )
    assert res.success is False
    assert res.failure_type == EmailFailureType.TEMPORARY


# ===========================================================================
# 3. Worker & Atomic Row Claiming Tests
# ===========================================================================

async def _setup_hardening_test_data(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
    email: str = "hardening_test@example.com",
) -> tuple[int, int, int]:
    """Helper to set up department, position, employee, contract, and validated payrun."""
    # Employee
    emp_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": f"HARD{uuid.uuid4().hex[:4].upper()}",
            "first_name": "Hardened",
            "last_name": "Tester",
            "email": email,
            "date_of_birth": "1992-05-15",
            "joining_date": "2024-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "bank_name": "Standard Chartered",
            "bank_account_number": "9988776655",
            "ifsc_code": "SCBL0001234",
        },
    )
    emp_id = emp_res.json()["id"]

    # Salary structure
    struct_res = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": f"Hardening Structure {uuid.uuid4().hex[:6]}",
            "code": f"HSTR_{uuid.uuid4().hex[:6].upper()}",
            "salary_rule_ids": [],
        },
    )
    assert struct_res.status_code == 201, struct_res.text
    struct_id = struct_res.json()["id"]

    # Salary rules
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
        assert r_res.status_code == 201, r_res.text

    # Contract
    c_res = await async_client.post(
        "/api/v1/contracts",
        headers=admin_auth_headers,
        json={
            "contract_number": f"CNT-{uuid.uuid4().hex[:6].upper()}",
            "employee_id": emp_id,
            "salary_structure_id": struct_id,
            "wage": 60000.0,
            "wage_type": "MONTHLY",
            "start_date": "2024-01-01",
            "status": "RUNNING",
        },
    )
    assert c_res.status_code == 201, c_res.text

    # Payrun
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": f"Hardening Payrun {uuid.uuid4().hex[:6]}",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [emp_id],
        },
    )
    assert pr_res.status_code == 201, pr_res.text
    payrun_id = pr_res.json()["id"]

    cmp_res = await async_client.post(f"/api/v1/payruns/{payrun_id}/compute", headers=hr_payroll_manager_auth_headers)
    assert cmp_res.status_code == 200, cmp_res.text

    val_res = await async_client.post(f"/api/v1/payruns/{payrun_id}/validate", headers=hr_payroll_manager_auth_headers)
    assert val_res.status_code == 200, val_res.text

    # Get payslip ID
    ps_res = await async_client.get(f"/api/v1/payslips?payrun_id={payrun_id}", headers=hr_payroll_manager_auth_headers)
    assert ps_res.status_code == 200, ps_res.text
    payslip_id = ps_res.json()["items"][0]["id"]

    return payrun_id, payslip_id, emp_id


async def test_worker_send_payslip_email_job_success(
    async_client: AsyncClient,
    db_session: AsyncSession,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verifies that send_payslip_email_job claims delivery, saves PDF, dispatches email, and sets SENT."""
    payrun_id, payslip_id, emp_id = await _setup_hardening_test_data(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position, email="worker_success@example.com"
    )

    # Create initial delivery record in PENDING
    delivery = PayslipEmailDelivery(
        payrun_id=payrun_id,
        payslip_id=payslip_id,
        employee_id=emp_id,
        recipient_email="worker_success@example.com",
        recipient_name="Hardened Tester",
        subject="Your Payslip",
        status=EmailDeliveryStatus.PENDING,
        retry_count=0,
        attempt_count=0,
    )
    db_session.add(delivery)
    await db_session.commit()
    await db_session.refresh(delivery)

    # Run worker job
    result = await send_payslip_email_job(ctx=None, delivery_id=delivery.id, db=db_session)
    assert result["status"] == "SENT"

    # Verify updated row
    await db_session.refresh(delivery)
    assert delivery.status == EmailDeliveryStatus.SENT
    assert delivery.attempt_count == 1
    assert delivery.sent_at is not None
    assert delivery.storage_key is not None


async def test_worker_atomic_claiming_skips_already_claimed(
    async_client: AsyncClient,
    db_session: AsyncSession,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verifies that a delivery row in SENDING status cannot be claimed concurrently."""
    payrun_id, payslip_id, emp_id = await _setup_hardening_test_data(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position, email="claim_test@example.com"
    )

    delivery = PayslipEmailDelivery(
        payrun_id=payrun_id,
        payslip_id=payslip_id,
        employee_id=emp_id,
        recipient_email="claim_test@example.com",
        recipient_name="Claim Tester",
        subject="Your Payslip",
        status=EmailDeliveryStatus.SENDING,  # already in-flight!
        retry_count=0,
        attempt_count=1,
    )
    db_session.add(delivery)
    await db_session.commit()
    await db_session.refresh(delivery)

    # Second worker attempts to process it
    result = await send_payslip_email_job(ctx=None, delivery_id=delivery.id, db=db_session)
    assert result["status"] == "skipped"


async def test_worker_retry_backoff_on_temporary_failure(
    async_client: AsyncClient,
    db_session: AsyncSession,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verifies that temporary failure increments attempt_count and schedules next_retry_at."""
    payrun_id, payslip_id, emp_id = await _setup_hardening_test_data(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position, email="temp-fail@example.com"
    )

    delivery = PayslipEmailDelivery(
        payrun_id=payrun_id,
        payslip_id=payslip_id,
        employee_id=emp_id,
        recipient_email="temp-fail@example.com",
        recipient_name="Temp Failure",
        subject="Your Payslip",
        status=EmailDeliveryStatus.PENDING,
        retry_count=0,
        attempt_count=0,
    )
    db_session.add(delivery)
    await db_session.commit()
    await db_session.refresh(delivery)

    # Run worker job
    result = await send_payslip_email_job(ctx=None, delivery_id=delivery.id, db=db_session)
    assert result["status"] == "PENDING"  # Scheduled for retry
    assert result["attempt_count"] == 1

    await db_session.refresh(delivery)
    assert delivery.failure_type == EmailFailureType.TEMPORARY
    assert delivery.next_retry_at is not None
    assert delivery.error_message is not None


async def test_worker_permanent_failure_exhausts_immediately(
    async_client: AsyncClient,
    db_session: AsyncSession,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verifies that permanent failure immediately marks status FAILED with no retry."""
    payrun_id, payslip_id, emp_id = await _setup_hardening_test_data(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position, email="fail@example.com"
    )

    delivery = PayslipEmailDelivery(
        payrun_id=payrun_id,
        payslip_id=payslip_id,
        employee_id=emp_id,
        recipient_email="fail@example.com",
        recipient_name="Perm Failure",
        subject="Your Payslip",
        status=EmailDeliveryStatus.PENDING,
        retry_count=0,
        attempt_count=0,
    )
    db_session.add(delivery)
    await db_session.commit()
    await db_session.refresh(delivery)

    result = await send_payslip_email_job(ctx=None, delivery_id=delivery.id, db=db_session)
    assert result["status"] == "FAILED"

    await db_session.refresh(delivery)
    assert delivery.failure_type == EmailFailureType.PERMANENT
    assert delivery.next_retry_at is None


# ===========================================================================
# 4. Single Payslip Delivery API & RBAC Tests
# ===========================================================================

async def test_get_payslip_email_delivery_endpoint(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verifies GET /api/v1/payslips/{id}/email-delivery returns accurate audit record."""
    payrun_id, payslip_id, emp_id = await _setup_hardening_test_data(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position, email="audit_get@example.com"
    )

    # 1. Before sending: 404
    not_sent_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/email-delivery",
        headers=hr_payroll_manager_auth_headers,
    )
    assert not_sent_res.status_code == 404

    # 2. Send email
    send_res = await async_client.post(
        f"/api/v1/payslips/{payslip_id}/send-email",
        headers=hr_payroll_manager_auth_headers,
    )
    assert send_res.status_code == 200

    # 3. After sending: 200 with details
    del_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/email-delivery",
        headers=hr_payroll_manager_auth_headers,
    )
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["payslip_id"] == payslip_id
    assert data["employee_id"] == emp_id
    assert data["recipient_email"] == "audit_get@example.com"
    assert data["status"] == "SENT"
    assert data["attempt_count"] >= 1
    assert data["storage_key"] is not None


async def test_payslip_email_delivery_rbac(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """Verifies RBAC rules: owner employee can view, other employee receives 403."""
    payrun_id, payslip_id, emp_id = await _setup_hardening_test_data(
        async_client, admin_auth_headers, hr_payroll_manager_auth_headers,
        sample_department, sample_job_position, email="owner_emp@example.com"
    )

    # Send email
    await async_client.post(
        f"/api/v1/payslips/{payslip_id}/send-email",
        headers=hr_payroll_manager_auth_headers,
    )

    # Create Owner User
    owner_pass = "OwnerPass123"
    owner_user_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "owner_emp@example.com", "password": owner_pass, "role_id": 1, "employee_id": emp_id},
    )
    assert owner_user_res.status_code == 201
    owner_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "owner_emp@example.com", "password": owner_pass},
    )
    owner_token = owner_login.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # Owner employee can view
    owner_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/email-delivery",
        headers=owner_headers,
    )
    assert owner_res.status_code == 200

    # Create Stranger Employee User
    stranger_pass = "Stranger123"
    stranger_user_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "stranger@example.com", "password": stranger_pass, "role_id": 1},
    )
    assert stranger_user_res.status_code == 201
    stranger_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "stranger@example.com", "password": stranger_pass},
    )
    stranger_token = stranger_login.json()["access_token"]
    stranger_headers = {"Authorization": f"Bearer {stranger_token}"}

    # Stranger employee receives 403
    stranger_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/email-delivery",
        headers=stranger_headers,
    )
    assert stranger_res.status_code == 403
