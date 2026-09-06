"""
Comprehensive unit & integration tests for Phase 5: Time Off Management module.

Test Suites:
1. Time Off Types (CRUD, unique codes, default seeds, soft-deactivation protection)
2. Time Off Allocations (Grants, validity period, quantity validations, status lifecycle)
3. Time Off Requests (Submission, duration calculation, date validation)
4. Scenario 32: Exact Balance Deduction (20 -> 3 approved = 17 left -> 11 approved = 6 left -> 10 rejected)
5. Scenario 33: No-Allocation Unpaid Leave
6. Scenario 34: Overlap Prevention (PENDING/APPROVED blocks, REFUSED/CANCELLED allows)
7. Scenario 36: Concurrency & Atomic Balance Consumption
8. Refusal Workflow (Mandatory reason, self-refusal blocked, no balance deduction)
9. Cancellation Workflow (Pending cancel, approved cancel with balance restoration, permissions)
10. Self-Service & RBAC (Employee self-service endpoints, self-approval prevention, cross-employee protection)
11. Employee-Centric Endpoints (/employees/{id}/time-off/*)
"""

import asyncio
from typing import Any

import pytest
from httpx import AsyncClient


# ===========================================================================
# Helper Fixtures & Setup
# ===========================================================================

async def _create_linked_employee(
    async_client: AsyncClient,
    admin_headers: dict[str, str],
    dept_id: int,
    pos_id: int,
    email: str,
    emp_code: str,
    role_id: int = 1,  # Default EMPLOYEE
) -> tuple[dict[str, Any], dict[str, str]]:
    """Helper creating an employee, a user, linking them, and returning (employee_dict, auth_headers)."""
    emp_res = await async_client.post(
        "/api/v1/employees",
        json={
            "employee_code": emp_code,
            "first_name": "Leave",
            "last_name": f"Tester_{emp_code}",
            "email": email,
            "joining_date": "2026-01-01",
            "department_id": dept_id,
            "job_position_id": pos_id,
        },
        headers=admin_headers,
    )
    assert emp_res.status_code == 201
    employee = emp_res.json()

    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123", "role_id": role_id},
    )
    assert reg_res.status_code == 201
    user = reg_res.json()

    link_res = await async_client.post(
        f"/api/v1/employees/{employee['id']}/user",
        json={"user_id": user["id"]},
        headers=admin_headers,
    )
    assert link_res.status_code == 200

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return employee, {"Authorization": f"Bearer {token}"}


# ===========================================================================
# 1. TIME OFF TYPES TESTS
# ===========================================================================

@pytest.mark.asyncio
async def test_list_default_seeded_types(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
):
    """Verify default seeded leave types (PTO, SICK, UNPAID) exist and are accessible."""
    res = await async_client.get("/api/v1/time-off/types", headers=employee_auth_headers)
    assert res.status_code == 200
    types = res.json()
    assert len(types) >= 3
    codes = {t["code"] for t in types}
    assert "PTO" in codes
    assert "SICK" in codes
    assert "UNPAID" in codes


@pytest.mark.asyncio
async def test_create_time_off_type_admin_success(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
):
    """Admin/HR can create a new leave type."""
    res = await async_client.post(
        "/api/v1/time-off/types",
        json={
            "name": "Maternity Leave",
            "code": "MATERNITY",
            "unit": "DAYS",
            "requires_allocation": True,
            "approval_required": True,
            "color": "#e91e63",
        },
        headers=admin_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Maternity Leave"
    assert data["code"] == "MATERNITY"
    assert data["unit"] == "DAYS"
    assert data["requires_allocation"] is True
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_create_time_off_type_employee_forbidden(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
):
    """Ordinary employee cannot create a leave type (HTTP 403)."""
    res = await async_client.post(
        "/api/v1/time-off/types",
        json={
            "name": "Hacker Leave",
            "code": "HACK",
            "unit": "DAYS",
        },
        headers=employee_auth_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_create_time_off_type_duplicate_code(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
):
    """Creating a leave type with existing code returns 409 Conflict."""
    res = await async_client.post(
        "/api/v1/time-off/types",
        json={"name": "Duplicate PTO", "code": "pto", "unit": "DAYS"},
        headers=admin_auth_headers,
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_get_and_update_time_off_type(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    employee_auth_headers: dict[str, str],
):
    """Test getting details and updating a leave type."""
    # 1. Create custom type
    create_res = await async_client.post(
        "/api/v1/time-off/types",
        json={"name": "Paternity Leave", "code": "PATERNITY", "unit": "DAYS"},
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201
    type_id = create_res.json()["id"]

    # 2. Get details
    get_res = await async_client.get(f"/api/v1/time-off/types/{type_id}", headers=employee_auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["code"] == "PATERNITY"

    # 3. Update description
    patch_res = await async_client.patch(
        f"/api/v1/time-off/types/{type_id}",
        json={"description": "Updated parental leave description"},
        headers=admin_auth_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["description"] == "Updated parental leave description"


@pytest.mark.asyncio
async def test_deactivate_time_off_type(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
):
    """Soft-deactivating a leave type sets is_active=False."""
    # Create type
    res = await async_client.post(
        "/api/v1/time-off/types",
        json={"name": "Temporary Sabbatical", "code": "SABBATICAL", "unit": "DAYS"},
        headers=admin_auth_headers,
    )
    type_id = res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/time-off/types/{type_id}", headers=admin_auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["is_active"] is False

    # Should not appear in default list unless include_inactive=True
    list_active = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    assert not any(t["id"] == type_id for t in list_active.json())

    list_all = await async_client.get("/api/v1/time-off/types?include_inactive=true", headers=admin_auth_headers)
    assert any(t["id"] == type_id for t in list_all.json())


# ===========================================================================
# 2. TIME OFF ALLOCATIONS TESTS
# ===========================================================================

@pytest.mark.asyncio
async def test_create_allocation_success(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """HR/Admin grants leave allocation to an employee."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "alloc_user@example.com", "ALC_01"
    )

    # Get PTO type
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    res = await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 20.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
            "notes": "Annual 2026 Grant",
        },
        headers=admin_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert float(data["allocation_quantity"]) == 20.0
    assert float(data["consumed_quantity"]) == 0.0
    assert float(data["remaining_quantity"]) == 20.0
    assert data["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_create_allocation_invalid_dates(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Allocation with valid_to earlier than valid_from fails (HTTP 422)."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "invalid_date_user@example.com", "ALC_02"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    res = await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-12-31",
            "valid_to": "2026-01-01",
        },
        headers=admin_auth_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_allocation_negative_or_zero_quantity(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Allocation with quantity <= 0 is rejected by schema validation."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "neg_qty_user@example.com", "ALC_03"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    res = await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 0.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_cancel_allocation_with_no_consumption(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Cancelling an unconsumed allocation sets status to CANCELLED."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "cancel_alloc@example.com", "ALC_04"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    create_res = await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 5.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )
    alloc_id = create_res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/time-off/allocations/{alloc_id}", headers=admin_auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "CANCELLED"


# ===========================================================================
# 3. SCENARIO 32: EXACT BALANCE DEDUCTION
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_32_exact_balance_deduction_and_overdraw_prevention(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Scenario 32:
    - Grant 20 days PTO
    - Request 3 days -> Approve -> 3 consumed, 17 remaining
    - Request 11 days -> Approve -> 14 consumed, 6 remaining
    - Request 10 days -> Attempt to Approve -> Fails with HTTP 400 (insufficient balance, 6 remaining)
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "scenario32_worker@example.com", "SC32_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # 1. Grant 20 days
    alloc_res = await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 20.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )
    assert alloc_res.status_code == 201

    # Check initial balance
    bal_res = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    assert bal_res.status_code == 200
    pto_bal = next(b for b in bal_res.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal["total_allocated"] == 20.0
    assert pto_bal["total_consumed"] == 0.0
    assert pto_bal["total_remaining"] == 20.0

    # 2. Request 1: 3 days (2026-02-02 to 2026-02-04)
    req1_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-02-02",
            "end_date": "2026-02-04",
            "reason": "Short winter trip",
        },
        headers=emp_headers,
    )
    assert req1_res.status_code == 201
    req1 = req1_res.json()
    assert float(req1["requested_quantity"]) == 3.0
    assert req1["status"] == "PENDING"

    # Approve Request 1
    app1_res = await async_client.post(
        f"/api/v1/time-off/requests/{req1['id']}/approve",
        headers=admin_auth_headers,
    )
    assert app1_res.status_code == 200
    assert app1_res.json()["status"] == "APPROVED"

    # Verify balance: 17 remaining
    bal_res = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    pto_bal = next(b for b in bal_res.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal["total_allocated"] == 20.0
    assert pto_bal["total_consumed"] == 3.0
    assert pto_bal["total_remaining"] == 17.0

    # 3. Request 2: 11 working days (2026-03-02 to 2026-03-16)
    req2_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-03-02",
            "end_date": "2026-03-16",
            "reason": "Spring vacation",
        },
        headers=emp_headers,
    )
    assert req2_res.status_code == 201
    req2 = req2_res.json()
    assert float(req2["requested_quantity"]) == 11.0

    # Approve Request 2
    app2_res = await async_client.post(
        f"/api/v1/time-off/requests/{req2['id']}/approve",
        headers=admin_auth_headers,
    )
    assert app2_res.status_code == 200

    # Verify balance: 6 remaining
    bal_res = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    pto_bal = next(b for b in bal_res.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal["total_allocated"] == 20.0
    assert pto_bal["total_consumed"] == 14.0
    assert pto_bal["total_remaining"] == 6.0

    # 4. Request 3: 10 working days (2026-04-01 to 2026-04-14)
    # Attempting to create request for 10 days when only 6 remain fails with 400 Bad Request
    req3_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-04-01",
            "end_date": "2026-04-14",
            "reason": "Overdrawn vacation attempt",
        },
        headers=emp_headers,
    )
    assert req3_res.status_code == 400
    assert "sufficient balance" in req3_res.json()["detail"].lower() or "insufficient" in req3_res.json()["detail"].lower()

    # Balance remains intact: 14 consumed, 6 remaining
    bal_res = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    pto_bal = next(b for b in bal_res.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal["total_consumed"] == 14.0
    assert pto_bal["total_remaining"] == 6.0


# ===========================================================================
# 4. SCENARIO 33: NO-ALLOCATION UNPAID LEAVE
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_33_no_allocation_unpaid_leave(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Scenario 33:
    Leave types with requires_allocation=False (e.g. UNPAID) can be requested
    and approved without needing any prior allocation grant.
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "unpaid_worker@example.com", "SC33_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    unpaid = next(t for t in types_res.json() if t["code"] == "UNPAID")
    assert unpaid["requires_allocation"] is False

    # Employee submits request for 5 working days unpaid leave without any allocation
    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": unpaid["id"],
            "start_date": "2026-05-11",
            "end_date": "2026-05-15",
            "reason": "Personal unpaid time off",
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    req = req_res.json()
    assert float(req["requested_quantity"]) == 5.0
    assert req["allocation_id"] is None

    # HR approves the request -> succeeds without allocation lookup
    app_res = await async_client.post(
        f"/api/v1/time-off/requests/{req['id']}/approve",
        headers=admin_auth_headers,
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"
    assert app_res.json()["allocation_id"] is None


# ===========================================================================
# 5. SCENARIO 34: OVERLAP PREVENTIONS
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_34_overlap_prevention_pending_and_approved(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Scenario 34:
    - Request A: June 10 - June 15 (PENDING)
    - Request B: June 12 - June 18 (Overlaps A) -> Rejected (409 Conflict)
    - Request C: June 10 - June 10 (Single day overlap) -> Rejected (409 Conflict)
    - Request D: June 15 - June 20 (Boundary overlap) -> Rejected (409 Conflict)
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "overlap_worker@example.com", "SC34_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant 25 days PTO
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 25.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # Initial Request A
    res_a = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-06-10",
            "end_date": "2026-06-15",
            "reason": "Request A",
        },
        headers=emp_headers,
    )
    assert res_a.status_code == 201

    # Overlapping Request B (middle overlap)
    res_b = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-06-12",
            "end_date": "2026-06-18",
            "reason": "Request B overlap",
        },
        headers=emp_headers,
    )
    assert res_b.status_code == 409
    assert "conflict" in res_b.json()["detail"].lower() or "overlap" in res_b.json()["detail"].lower()

    # Overlapping Request C (exact start day)
    res_c = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-06-10",
            "end_date": "2026-06-10",
            "reason": "Request C single day",
        },
        headers=emp_headers,
    )
    assert res_c.status_code == 409

    # Overlapping Request D (boundary end day)
    res_d = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-06-15",
            "end_date": "2026-06-20",
            "reason": "Request D boundary",
        },
        headers=emp_headers,
    )
    assert res_d.status_code == 409


@pytest.mark.asyncio
async def test_scenario_34_overlap_allowed_against_refused_or_cancelled(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Overlapping dates are completely ALLOWED if prior request was REFUSED or CANCELLED.
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "refused_overlap_worker@example.com", "SC34_02"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant 20 days PTO
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 20.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # 1. Submit Request 1
    req1_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-07-10",
            "end_date": "2026-07-15",
            "reason": "Request 1 to be refused",
        },
        headers=emp_headers,
    )
    assert req1_res.status_code == 201
    req1_id = req1_res.json()["id"]

    # 2. Refuse Request 1
    ref_res = await async_client.post(
        f"/api/v1/time-off/requests/{req1_id}/refuse",
        json={"refusal_reason": "Project launch blackout period"},
        headers=admin_auth_headers,
    )
    assert ref_res.status_code == 200
    assert ref_res.json()["status"] == "REFUSED"

    # 3. New request overlapping those exact dates MUST succeed now
    req2_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-07-10",
            "end_date": "2026-07-15",
            "reason": "Replacement request",
        },
        headers=emp_headers,
    )
    assert req2_res.status_code == 201


# ===========================================================================
# 6. SCENARIO 36: CONCURRENCY & ATOMIC CONSUMPTION
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_36_concurrency_locking_prevents_over_consumption(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Scenario 36:
    Employee has exactly 5 days allocated.
    Two separate requests each asking for 5 days are created.
    Concurrent approval attempts: exactly one must succeed (status 200)
    and the other must fail (status 400 Insufficient remaining balance).
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "race_condition_worker@example.com", "SC36_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Allocate 5 days
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 5.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # Request 1: 5 days in August
    req1_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-08-01",
            "end_date": "2026-08-05",
            "reason": "Concurrent Request 1",
        },
        headers=emp_headers,
    )
    assert req1_res.status_code == 201
    req1_id = req1_res.json()["id"]

    # Request 2: 5 days in September (different dates so no date overlap check triggers)
    req2_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-05",
            "reason": "Concurrent Request 2",
        },
        headers=emp_headers,
    )
    assert req2_res.status_code == 201
    req2_id = req2_res.json()["id"]

    # Concurrently attempt approval
    res1, res2 = await asyncio.gather(
        async_client.post(f"/api/v1/time-off/requests/{req1_id}/approve", headers=admin_auth_headers),
        async_client.post(f"/api/v1/time-off/requests/{req2_id}/approve", headers=admin_auth_headers),
        return_exceptions=False,
    )

    statuses = {res1.status_code, res2.status_code}
    assert 200 in statuses
    assert 400 in statuses

    # Verify final balance is exactly 0 remaining, never negative
    bal_res = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    pto_bal = next(b for b in bal_res.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal["total_consumed"] == 5.0
    assert pto_bal["total_remaining"] == 0.0


# ===========================================================================
# 7. REFUSAL WORKFLOW TESTS
# ===========================================================================

@pytest.mark.asyncio
async def test_refuse_request_mandatory_reason(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Refusing a request requires a non-empty refusal_reason."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "refuse_worker@example.com", "REF_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant PTO allocation
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-10-01",
            "end_date": "2026-10-02",
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Empty reason fails schema validation (422)
    empty_res = await async_client.post(
        f"/api/v1/time-off/requests/{req_id}/refuse",
        json={"refusal_reason": ""},
        headers=admin_auth_headers,
    )
    assert empty_res.status_code == 422

    # Valid reason succeeds (200)
    valid_res = await async_client.post(
        f"/api/v1/time-off/requests/{req_id}/refuse",
        json={"refusal_reason": "Quarter-end closing priority"},
        headers=admin_auth_headers,
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["status"] == "REFUSED"
    assert valid_res.json()["refusal_reason"] == "Quarter-end closing priority"


# ===========================================================================
# 8. CANCELLATION WORKFLOW & BALANCE RESTORATION
# ===========================================================================

@pytest.mark.asyncio
async def test_cancel_approved_request_restores_balance(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Cancelling an APPROVED leave request restores the consumed balance to the allocation.
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "restore_bal_worker@example.com", "RST_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant 10 days
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # Request 4 days
    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-11-01",
            "end_date": "2026-11-04",
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Approve -> balance becomes 6 remaining
    await async_client.post(f"/api/v1/time-off/requests/{req_id}/approve", headers=admin_auth_headers)
    bal1 = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    pto_bal1 = next(b for b in bal1.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal1["total_consumed"] == 4.0
    assert pto_bal1["total_remaining"] == 6.0

    # Employee cancels the approved request
    cancel_res = await async_client.post(f"/api/v1/time-off/requests/{req_id}/cancel", headers=emp_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Balance MUST be fully restored to 10 remaining
    bal2 = await async_client.get("/api/v1/employees/me/time-off/balances", headers=emp_headers)
    pto_bal2 = next(b for b in bal2.json()["balances"] if b["time_off_type_code"] == "PTO")
    assert pto_bal2["total_consumed"] == 0.0
    assert pto_bal2["total_remaining"] == 10.0


@pytest.mark.asyncio
async def test_cannot_cancel_refused_or_already_cancelled_request(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Attempting to cancel an already REFUSED or CANCELLED request fails (HTTP 400)."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "invalid_cancel_worker@example.com", "CNC_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant PTO allocation
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-11-10",
            "end_date": "2026-11-11",
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Cancel once
    res1 = await async_client.post(f"/api/v1/time-off/requests/{req_id}/cancel", headers=emp_headers)
    assert res1.status_code == 200

    # Cancel twice -> HTTP 400
    res2 = await async_client.post(f"/api/v1/time-off/requests/{req_id}/cancel", headers=emp_headers)
    assert res2.status_code == 400


# ===========================================================================
# 9. SELF-SERVICE & RBAC BOUNDARIES
# ===========================================================================

@pytest.mark.asyncio
async def test_employee_cannot_approve_own_leave_request(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Employee attempting to approve their own request returns 403 Forbidden."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "self_approve_worker@example.com", "SLF_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant PTO allocation
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-12-01",
            "end_date": "2026-12-02",
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Attempt self-approval with employee credentials
    app_res = await async_client.post(f"/api/v1/time-off/requests/{req_id}/approve", headers=emp_headers)
    assert app_res.status_code == 403


@pytest.mark.asyncio
async def test_cross_employee_access_protection(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Employee A cannot view or modify Employee B's leave requests, allocations, or balances.
    """
    emp_a, headers_a = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "worker_a@example.com", "EMP_A"
    )
    emp_b, headers_b = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "worker_b@example.com", "EMP_B"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant Employee B an allocation
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp_b["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # Employee B creates a request
    req_b = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={"time_off_type_id": pto["id"], "start_date": "2026-12-10", "end_date": "2026-12-11"},
        headers=headers_b,
    )
    assert req_b.status_code == 201
    req_b_id = req_b.json()["id"]

    # 1. Employee A cannot view Employee B's request by ID (403)
    get_res = await async_client.get(f"/api/v1/time-off/requests/{req_b_id}", headers=headers_a)
    assert get_res.status_code == 403

    # 2. Employee A cannot cancel Employee B's request (403)
    cancel_res = await async_client.post(f"/api/v1/time-off/requests/{req_b_id}/cancel", headers=headers_a)
    assert cancel_res.status_code == 403

    # 3. Employee A querying /employees/{emp_b_id}/time-off/balances is forbidden (403)
    bal_res = await async_client.get(f"/api/v1/employees/{emp_b['id']}/time-off/balances", headers=headers_a)
    assert bal_res.status_code == 403

    # 4. Employee A querying /employees/{emp_b_id}/time-off/allocations is forbidden (403)
    alloc_res = await async_client.get(f"/api/v1/employees/{emp_b['id']}/time-off/allocations", headers=headers_a)
    assert alloc_res.status_code == 403

    # 5. Employee A querying /employees/{emp_b_id}/time-off/requests is forbidden (403)
    reqs_res = await async_client.get(f"/api/v1/employees/{emp_b['id']}/time-off/requests", headers=headers_a)
    assert reqs_res.status_code == 403


# ===========================================================================
# 10. DURATION CALCULATIONS & DATE VALIDATION
# ===========================================================================

@pytest.mark.asyncio
async def test_date_validation_end_before_start(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Submitting end_date before start_date returns HTTP 422."""
    _, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "date_worker@example.com", "DUR_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-12-25",
            "end_date": "2026-12-20",
        },
        headers=emp_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_explicit_requested_quantity_half_day(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Submitting a half-day (requested_quantity=0.5) overrides the default day difference."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "half_day_worker@example.com", "DUR_02"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant PTO allocation
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 5.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-12-24",
            "end_date": "2026-12-24",
            "requested_quantity": 0.5,
            "reason": "Christmas Eve afternoon off",
        },
        headers=emp_headers,
    )
    assert res.status_code == 201
    assert float(res.json()["requested_quantity"]) == 0.5


# ===========================================================================
# 11. EMPLOYEE CENTRIC & ALIAS ENDPOINTS
# ===========================================================================

@pytest.mark.asyncio
async def test_alias_endpoint_and_hr_queries(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Test /api/v1/timeoff alias prefix and HR querying specific employee endpoints."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "alias_worker@example.com", "ALS_01"
    )

    # Alias /timeoff/types
    alias_res = await async_client.get("/api/v1/timeoff/types", headers=admin_auth_headers)
    assert alias_res.status_code == 200

    # HR gets employee balances via /employees/{id}/time-off/balances
    emp_bal = await async_client.get(f"/api/v1/employees/{emp['id']}/time-off/balances", headers=admin_auth_headers)
    assert emp_bal.status_code == 200
    assert emp_bal.json()["employee_id"] == emp["id"]

    # HR gets employee allocations via /employees/{id}/time-off/allocations
    emp_alloc = await async_client.get(f"/api/v1/employees/{emp['id']}/time-off/allocations", headers=admin_auth_headers)
    assert emp_alloc.status_code == 200

    # HR gets employee requests via /employees/{id}/time-off/requests
    emp_reqs = await async_client.get(f"/api/v1/employees/{emp['id']}/time-off/requests", headers=admin_auth_headers)
    assert emp_reqs.status_code == 200


# ===========================================================================
# 12. REQUEST UPDATES & MODIFICATIONS
# ===========================================================================

@pytest.mark.asyncio
async def test_update_pending_request_reason_and_dates(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Owner employee can update dates and reason on a PENDING request."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "update_req_worker@example.com", "UPD_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Allocate 10 days
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # Submit 2 days
    create_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-03-10",
            "end_date": "2026-03-11",
            "reason": "Original reason",
        },
        headers=emp_headers,
    )
    req_id = create_res.json()["id"]

    # Patch: extend to 3 days (March 10 - March 12)
    patch_res = await async_client.patch(
        f"/api/v1/time-off/requests/{req_id}",
        json={
            "end_date": "2026-03-12",
            "reason": "Updated reason",
        },
        headers=emp_headers,
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["reason"] == "Updated reason"
    assert data["end_date"] == "2026-03-12"
    assert float(data["requested_quantity"]) == 3.0


@pytest.mark.asyncio
async def test_cannot_update_approved_request(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Attempting to update an already APPROVED request fails (HTTP 400)."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "no_update_worker@example.com", "UPD_02"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    create_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-03-15",
            "end_date": "2026-03-16",
        },
        headers=emp_headers,
    )
    req_id = create_res.json()["id"]

    # Approve
    await async_client.post(f"/api/v1/time-off/requests/{req_id}/approve", headers=admin_auth_headers)

    # Patch approved request -> fails
    patch_res = await async_client.patch(
        f"/api/v1/time-off/requests/{req_id}",
        json={"reason": "Cannot change approved"},
        headers=emp_headers,
    )
    assert patch_res.status_code == 400


@pytest.mark.asyncio
async def test_update_request_invalid_dates_fails(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Updating request with end_date before start_date fails (HTTP 422)."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "inv_update_worker@example.com", "UPD_03"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    create_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-03-20",
            "end_date": "2026-03-22",
        },
        headers=emp_headers,
    )
    req_id = create_res.json()["id"]

    patch_res = await async_client.patch(
        f"/api/v1/time-off/requests/{req_id}",
        json={"end_date": "2026-03-10"},
        headers=emp_headers,
    )
    assert patch_res.status_code == 422


# ===========================================================================
# 13. ALLOCATION MODIFICATIONS & ADVANCED VALIDATION
# ===========================================================================

@pytest.mark.asyncio
async def test_update_allocation_cannot_reduce_below_consumed(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Updating allocation_quantity below currently consumed_quantity returns HTTP 400."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "reduce_alloc_worker@example.com", "ALC_RED_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Allocate 10 days
    alloc_res = await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )
    alloc_id = alloc_res.json()["id"]

    # Request 5 days and approve
    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={"time_off_type_id": pto["id"], "start_date": "2026-04-01", "end_date": "2026-04-05"},
        headers=emp_headers,
    )
    await async_client.post(f"/api/v1/time-off/requests/{req_res.json()['id']}/approve", headers=admin_auth_headers)

    # Attempt to reduce allocation to 4 days (less than 5 consumed) -> HTTP 400
    patch_res = await async_client.patch(
        f"/api/v1/time-off/allocations/{alloc_id}",
        json={"allocation_quantity": 4.0},
        headers=admin_auth_headers,
    )
    assert patch_res.status_code == 400


@pytest.mark.asyncio
async def test_list_allocations_filter_by_type_and_status(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """List allocations filtering by time_off_type_id and status."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "filter_alloc_worker@example.com", "ALC_FLT_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")
    sick = next(t for t in types_res.json() if t["code"] == "SICK")

    await async_client.post(
        "/api/v1/time-off/allocations",
        json={"employee_id": emp["id"], "time_off_type_id": pto["id"], "allocation_quantity": 10.0, "valid_from": "2026-01-01", "valid_to": "2026-12-31"},
        headers=admin_auth_headers,
    )
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={"employee_id": emp["id"], "time_off_type_id": sick["id"], "allocation_quantity": 5.0, "valid_from": "2026-01-01", "valid_to": "2026-12-31"},
        headers=admin_auth_headers,
    )

    # Filter by employee and PTO
    res = await async_client.get(f"/api/v1/time-off/allocations?employee_id={emp['id']}&time_off_type_id={pto['id']}", headers=admin_auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["time_off_type_id"] == pto["id"]


@pytest.mark.asyncio
async def test_request_outside_allocation_validity_dates_fails(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Leave request outside allocation validity dates is rejected (HTTP 400)."""
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "out_of_dates_worker@example.com", "VAL_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Grant allocation strictly for H1 2026
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={"employee_id": emp["id"], "time_off_type_id": pto["id"], "allocation_quantity": 10.0, "valid_from": "2026-01-01", "valid_to": "2026-06-30"},
        headers=admin_auth_headers,
    )

    # Request dates in H2 2026 (July) -> fails
    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={"time_off_type_id": pto["id"], "start_date": "2026-07-01", "end_date": "2026-07-03"},
        headers=emp_headers,
    )
    assert req_res.status_code == 400


# ===========================================================================
# 14. DEACTIVATION PROTECTION & TYPE RULES
# ===========================================================================

@pytest.mark.asyncio
async def test_cannot_deactivate_type_with_pending_requests(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Attempting to deactivate a leave type with active pending requests fails (HTTP 400)."""
    # Create custom type
    type_res = await async_client.post(
        "/api/v1/time-off/types",
        json={"name": "Special Project Leave", "code": "SPL_PRJ", "unit": "DAYS", "requires_allocation": False},
        headers=admin_auth_headers,
    )
    spl_type = type_res.json()

    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "spl_worker@example.com", "SPL_01"
    )

    # Submit request under SPL
    await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={"time_off_type_id": spl_type["id"], "start_date": "2026-08-10", "end_date": "2026-08-12"},
        headers=emp_headers,
    )

    # Admin attempts to deactivate type -> fails with HTTP 400
    del_res = await async_client.delete(f"/api/v1/time-off/types/{spl_type['id']}", headers=admin_auth_headers)
    assert del_res.status_code == 400
    assert "pending" in del_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_request_with_hours_unit(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Leave type configured with HOURS unit requires explicit duration or calculates default 8h/day."""
    # Create HOURS type
    type_res = await async_client.post(
        "/api/v1/time-off/types",
        json={"name": "Comp Time Off", "code": "COMP_HOURS", "unit": "HOURS", "requires_allocation": False},
        headers=admin_auth_headers,
    )
    hours_type = type_res.json()

    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "hours_worker@example.com", "HRS_01"
    )

    # Request 4 hours explicitly
    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": hours_type["id"],
            "start_date": "2026-09-10",
            "end_date": "2026-09-10",
            "requested_quantity": 4.0,
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    assert float(req_res.json()["requested_quantity"]) == 4.0


# ===========================================================================
# 15. 404 NOT FOUND HANDLING
# ===========================================================================

@pytest.mark.asyncio
async def test_all_not_found_endpoints(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
):
    """Verify standard 404 responses for non-existent IDs."""
    # Non-existent type
    res = await async_client.get("/api/v1/time-off/types/99999", headers=admin_auth_headers)
    assert res.status_code == 404

    # Non-existent allocation
    res = await async_client.get("/api/v1/time-off/allocations/99999", headers=admin_auth_headers)
    assert res.status_code == 404

    # Non-existent request
    res = await async_client.get("/api/v1/time-off/requests/99999", headers=admin_auth_headers)
    assert res.status_code == 404

    # Approve non-existent request
    res = await async_client.post("/api/v1/time-off/requests/99999/approve", headers=admin_auth_headers)
    assert res.status_code == 404

    # Refuse non-existent request
    res = await async_client.post("/api/v1/time-off/requests/99999/refuse", json={"refusal_reason": "test"}, headers=admin_auth_headers)
    assert res.status_code == 404

    # Cancel non-existent request
    res = await async_client.post("/api/v1/time-off/requests/99999/cancel", headers=admin_auth_headers)
    assert res.status_code == 404


# ===========================================================================
# 16. ADDITIONAL FILTERS & SELF-SERVICE EDGE CASES
# ===========================================================================

@pytest.mark.asyncio
async def test_list_requests_filter_by_status_and_dates(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """Test filtering requests by status, from_date, and to_date."""
    emp, _ = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "flt_req_worker@example.com", "REQ_FLT_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    unpaid = next(t for t in types_res.json() if t["code"] == "UNPAID")

    # Create request 1 (August)
    r1 = await async_client.post(
        "/api/v1/time-off/requests",
        json={"employee_id": emp["id"], "time_off_type_id": unpaid["id"], "start_date": "2026-08-01", "end_date": "2026-08-02"},
        headers=admin_auth_headers,
    )
    # Create request 2 (September)
    r2 = await async_client.post(
        "/api/v1/time-off/requests",
        json={"employee_id": emp["id"], "time_off_type_id": unpaid["id"], "start_date": "2026-09-01", "end_date": "2026-09-02"},
        headers=admin_auth_headers,
    )
    # Approve request 1
    await async_client.post(f"/api/v1/time-off/requests/{r1.json()['id']}/approve", headers=admin_auth_headers)

    # Filter status=APPROVED
    res_app = await async_client.get(f"/api/v1/time-off/requests?employee_id={emp['id']}&status=APPROVED", headers=admin_auth_headers)
    assert res_app.status_code == 200
    assert len(res_app.json()) == 1
    assert res_app.json()[0]["status"] == "APPROVED"

    # Filter status=PENDING
    res_pen = await async_client.get(f"/api/v1/time-off/requests?employee_id={emp['id']}&status=PENDING", headers=admin_auth_headers)
    assert res_pen.status_code == 200
    assert len(res_pen.json()) == 1
    assert res_pen.json()[0]["status"] == "PENDING"

    # Filter by date range (only August)
    res_date = await async_client.get(f"/api/v1/time-off/requests?employee_id={emp['id']}&from_date=2026-08-01&to_date=2026-08-15", headers=admin_auth_headers)
    assert res_date.status_code == 200
    assert len(res_date.json()) == 1


@pytest.mark.asyncio
async def test_admin_can_approve_own_request(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """ADMIN role is exempt from self-approval restriction."""
    # Create an employee linked to the ADMIN user
    emp, admin_emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "admin_leave_user@example.com", "ADM_EMP_01", role_id=5  # Role 5 is ADMIN
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_emp_headers)
    unpaid = next(t for t in types_res.json() if t["code"] == "UNPAID")

    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={"time_off_type_id": unpaid["id"], "start_date": "2026-10-10", "end_date": "2026-10-11"},
        headers=admin_emp_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Admin approves own request -> succeeds
    app_res = await async_client.post(f"/api/v1/time-off/requests/{req_id}/approve", headers=admin_emp_headers)
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_unlinked_user_self_service_rejected(
    async_client: AsyncClient,
):
    """User account not linked to an employee profile is rejected on /me/time-off/* (HTTP 400)."""
    # Register an unlinked user
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": "unlinked_timeoff@example.com", "password": "Password123", "role_id": 1},
    )
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "unlinked_timeoff@example.com", "password": "Password123"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # /me/time-off/allocations
    res = await async_client.get("/api/v1/employees/me/time-off/allocations", headers=headers)
    assert res.status_code == 400

    # /me/time-off/requests
    res = await async_client.get("/api/v1/employees/me/time-off/requests", headers=headers)
    assert res.status_code == 400

    # /me/time-off/balances
    res = await async_client.get("/api/v1/employees/me/time-off/balances", headers=headers)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_weekend_spanning_leave_calculates_working_days(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
):
    """
    Verify Friday-to-Monday leave request (4 calendar days) only deducts
    2 working days under standard Monday-Friday schedule.
    """
    emp, emp_headers = await _create_linked_employee(
        async_client, admin_auth_headers, sample_department["id"], sample_job_position["id"],
        "weekend_worker@example.com", "WKND_01"
    )
    types_res = await async_client.get("/api/v1/time-off/types", headers=admin_auth_headers)
    pto = next(t for t in types_res.json() if t["code"] == "PTO")

    # Allocate 10 days
    await async_client.post(
        "/api/v1/time-off/allocations",
        json={
            "employee_id": emp["id"],
            "time_off_type_id": pto["id"],
            "allocation_quantity": 10.0,
            "valid_from": "2026-01-01",
            "valid_to": "2026-12-31",
        },
        headers=admin_auth_headers,
    )

    # 2026-06-12 (Friday) to 2026-06-15 (Monday) = 4 calendar days, but exactly 2 working days
    req_res = await async_client.post(
        "/api/v1/employees/me/time-off/requests",
        json={
            "time_off_type_id": pto["id"],
            "start_date": "2026-06-12",
            "end_date": "2026-06-15",
            "reason": "Long weekend getaway",
        },
        headers=emp_headers,
    )
    assert req_res.status_code == 201
    data = req_res.json()
    assert float(data["requested_quantity"]) == 2.0  # NOT 4.0!


