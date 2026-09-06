"""
Comprehensive unit & integration tests for Phase 4: Attendance Management module.
Tests:
- Working Schedule creation, retrieval, and lines
- Self-service check-in, check-out, and active session widget
- Calculation engine: Scenarios A, B, C, D (On-time, Late, Overtime, Incomplete)
- Non-working day overtime calculation & half-day detection
- Manual attendance creation & correction with mandatory audit reason
- Self-service security (current user session derivation, prevention of cross-employee spoofing)
- RBAC permissions (Employee self-service vs HR Manager vs Payroll User vs Admin)
"""

from typing import Any

from httpx import AsyncClient


# ===========================================================================
# Helper Fixtures & Setup
# ===========================================================================


async def _create_linked_employee_and_user(
    async_client: AsyncClient,
    admin_headers: dict[str, str],
    dept_id: int,
    pos_id: int,
    email: str = "linked_worker@example.com",
    emp_code: str = "ATT_EMP_01",
) -> tuple[dict[str, Any], dict[str, str]]:
    """Helper creating an employee, a user, linking them, and returning (employee_dict, auth_headers)."""
    # 1. Create employee
    emp_res = await async_client.post(
        "/api/v1/employees",
        json={
            "employee_code": emp_code,
            "first_name": "Attendance",
            "last_name": "Tester",
            "email": email,
            "joining_date": "2026-01-01",
            "department_id": dept_id,
            "job_position_id": pos_id,
        },
        headers=admin_headers,
    )
    assert emp_res.status_code == 201
    employee = emp_res.json()

    # 2. Register user
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "TestPassword123", "role_id": 1},
    )
    assert reg_res.status_code == 201
    user = reg_res.json()

    # 3. Link user to employee
    link_res = await async_client.post(
        f"/api/v1/employees/{employee['id']}/user",
        json={"user_id": user["id"]},
        headers=admin_headers,
    )
    assert link_res.status_code == 200

    # 4. Login to get headers
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "TestPassword123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return employee, headers


# ===========================================================================
# 1. Working Schedule Management
# ===========================================================================


async def test_create_and_get_working_schedule(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
) -> None:
    payload = {
        "name": "Custom 35 Hours/Week",
        "calendar_type": "FLEXIBLE",
        "lines": [
            {"day_of_week": 0, "start_time": "09:00:00", "end_time": "17:00:00", "break_minutes": 60},
            {"day_of_week": 1, "start_time": "09:00:00", "end_time": "17:00:00", "break_minutes": 60},
            {"day_of_week": 2, "start_time": "09:00:00", "end_time": "17:00:00", "break_minutes": 60},
            {"day_of_week": 3, "start_time": "09:00:00", "end_time": "17:00:00", "break_minutes": 60},
            {"day_of_week": 4, "start_time": "09:00:00", "end_time": "16:00:00", "break_minutes": 60},
        ],
    }
    res = await async_client.post("/api/v1/schedules", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Custom 35 Hours/Week"
    assert data["days_per_week"] == 5
    assert float(data["hours_per_week"]) == 34.0  # 4x7h + 1x6h = 34h
    assert len(data["lines"]) == 5

    # Retrieve by ID
    get_res = await async_client.get(f"/api/v1/schedules/{data['id']}", headers=admin_auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == data["id"]


async def test_update_and_delete_working_schedule(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
) -> None:
    # 1. Create schedule
    payload = {
        "name": "To Be Updated Schedule",
        "calendar_type": "STANDARD",
        "lines": [
            {"day_of_week": 0, "start_time": "09:00:00", "end_time": "18:00:00", "break_minutes": 60},
            {"day_of_week": 1, "start_time": "09:00:00", "end_time": "18:00:00", "break_minutes": 60},
        ],
    }
    create_res = await async_client.post("/api/v1/schedules", json=payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    sched_id = create_res.json()["id"]

    # 2. Update name and lines
    update_payload = {
        "name": "Updated Schedule Name",
        "lines": [
            {"day_of_week": 0, "start_time": "10:00:00", "end_time": "18:00:00", "break_minutes": 60},
        ],
    }
    patch_res = await async_client.patch(f"/api/v1/schedules/{sched_id}", json=update_payload, headers=admin_auth_headers)
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["name"] == "Updated Schedule Name"
    assert updated_data["days_per_week"] == 1
    assert float(updated_data["hours_per_week"]) == 7.0

    # 3. Delete schedule
    del_res = await async_client.delete(f"/api/v1/schedules/{sched_id}", headers=admin_auth_headers)
    assert del_res.status_code == 204

    # 4. Verify 404 after deletion
    get_res = await async_client.get(f"/api/v1/schedules/{sched_id}", headers=admin_auth_headers)
    assert get_res.status_code == 404


async def test_list_schedules(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
) -> None:
    res = await async_client.get("/api/v1/schedules", headers=admin_auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 1  # seeded default schedule exists


# ===========================================================================
# 2. Check-In & Check-Out Lifecycle
# ===========================================================================


async def test_self_service_check_in_and_check_out(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    emp, emp_headers = await _create_linked_employee_and_user(
        async_client, admin_headers=admin_auth_headers, dept_id=sample_department["id"], pos_id=sample_job_position["id"]
    )

    # 1. Check-in on Monday at 09:00:00 UTC (2026-09-07 is Monday)
    in_res = await async_client.post(
        "/api/v1/attendance/check-in",
        json={"timestamp": "2026-09-07T09:00:00Z"},
        headers=emp_headers,
    )
    assert in_res.status_code == 201
    in_data = in_res.json()
    assert in_data["employee_id"] == emp["id"]
    assert in_data["attendance_date"] == "2026-09-07"
    assert in_data["check_out"] is None
    assert in_data["status"] == "INCOMPLETE"

    # 2. Check active session widget
    session_res = await async_client.get("/api/v1/attendance/session", headers=emp_headers)
    assert session_res.status_code == 200
    session_data = session_res.json()
    assert session_data["has_active_session"] is True
    assert session_data["session_id"] == in_data["id"]

    # 3. Check-out on Monday at 18:00:00 UTC
    out_res = await async_client.post(
        "/api/v1/attendance/check-out",
        json={"timestamp": "2026-09-07T18:00:00Z"},
        headers=emp_headers,
    )
    assert out_res.status_code == 200
    out_data = out_res.json()
    assert out_data["check_out"] is not None
    assert out_data["worked_minutes"] == 480  # 9h elapsed - 1h break = 8h (480m)
    assert out_data["late_minutes"] == 0
    assert out_data["overtime_minutes"] == 0
    assert out_data["status"] == "PRESENT"

    # 4. Session widget now shows no active session
    session_after = await async_client.get("/api/v1/attendance/session", headers=emp_headers)
    assert session_after.status_code == 200
    assert session_after.json()["has_active_session"] is False


async def test_duplicate_check_in_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    _, emp_headers = await _create_linked_employee_and_user(
        async_client,
        admin_headers=admin_auth_headers,
        dept_id=sample_department["id"],
        pos_id=sample_job_position["id"],
        email="dup_checkin@example.com",
        emp_code="DUP01",
    )

    res1 = await async_client.post(
        "/api/v1/attendance/check-in",
        json={"timestamp": "2026-09-07T09:00:00Z"},
        headers=emp_headers,
    )
    assert res1.status_code == 201

    # Second check-in while first is still open -> 409
    res2 = await async_client.post(
        "/api/v1/attendance/check-in",
        json={"timestamp": "2026-09-07T10:00:00Z"},
        headers=emp_headers,
    )
    assert res2.status_code == 409


async def test_check_out_without_open_session_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    _, emp_headers = await _create_linked_employee_and_user(
        async_client,
        admin_headers=admin_auth_headers,
        dept_id=sample_department["id"],
        pos_id=sample_job_position["id"],
        email="no_open@example.com",
        emp_code="NOOP01",
    )

    res = await async_client.post(
        "/api/v1/attendance/check-out",
        json={"timestamp": "2026-09-07T18:00:00Z"},
        headers=emp_headers,
    )
    assert res.status_code == 404


async def test_check_out_before_check_in_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    _, emp_headers = await _create_linked_employee_and_user(
        async_client,
        admin_headers=admin_auth_headers,
        dept_id=sample_department["id"],
        pos_id=sample_job_position["id"],
        email="time_travel@example.com",
        emp_code="TT01",
    )

    await async_client.post(
        "/api/v1/attendance/check-in",
        json={"timestamp": "2026-09-07T09:00:00Z"},
        headers=emp_headers,
    )

    # Check out before check in
    res = await async_client.post(
        "/api/v1/attendance/check-out",
        json={"timestamp": "2026-09-07T08:00:00Z"},
        headers=emp_headers,
    )
    assert res.status_code == 422


# ===========================================================================
# 3. Calculation Engine Scenarios (Section 28)
# ===========================================================================


async def test_calculation_scenario_a_ontime(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """
    Scenario A:
    Schedule: 09:00 -> 18:00, Break: 60m
    Check-in: 09:00, Check-out: 18:00
    Expected: worked=480, late=0, overtime=0, status=PRESENT
    """
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-07",  # Monday
        "check_in": "2026-09-07T09:00:00Z",
        "check_out": "2026-09-07T18:00:00Z",
    }
    res = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["worked_minutes"] == 480
    assert data["late_minutes"] == 0
    assert data["overtime_minutes"] == 0
    assert data["status"] == "PRESENT"


async def test_calculation_scenario_b_late(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """
    Scenario B:
    Schedule: 09:00 -> 18:00, Break: 60m
    Check-in: 09:15, Check-out: 18:00
    Expected: worked=465, late=15, overtime=0, status=LATE
    """
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-08",  # Tuesday
        "check_in": "2026-09-08T09:15:00Z",
        "check_out": "2026-09-08T18:00:00Z",
    }
    res = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["worked_minutes"] == 465
    assert data["late_minutes"] == 15
    assert data["overtime_minutes"] == 0
    assert data["status"] == "LATE"


async def test_calculation_scenario_c_overtime(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """
    Scenario C:
    Schedule: 09:00 -> 18:00, Break: 60m
    Check-in: 09:00, Check-out: 19:00
    Expected: worked=540, late=0, overtime=60, status=PRESENT
    """
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-09",  # Wednesday
        "check_in": "2026-09-09T09:00:00Z",
        "check_out": "2026-09-09T19:00:00Z",
    }
    res = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["worked_minutes"] == 540
    assert data["late_minutes"] == 0
    assert data["overtime_minutes"] == 60
    assert data["status"] == "PRESENT"


async def test_calculation_scenario_d_incomplete(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """
    Scenario D:
    Check-in: 09:00, Check-out: NULL
    Expected: status = INCOMPLETE
    """
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-10",  # Thursday
        "check_in": "2026-09-10T09:00:00Z",
        "check_out": None,
    }
    res = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["check_out"] is None
    assert data["status"] == "INCOMPLETE"


async def test_calculation_half_day(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """Working less than half the expected day (< 4h) results in HALF_DAY."""
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-11",  # Friday
        "check_in": "2026-09-11T09:00:00Z",
        "check_out": "2026-09-11T12:00:00Z",  # 3 hours elapsed
    }
    res = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["worked_minutes"] == 180  # Under 4 hours, no 1-hour break deducted
    assert data["status"] == "HALF_DAY"


async def test_calculation_non_working_day_weekend(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """Working on a Saturday (non-working day) counts all worked time as overtime."""
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-12",  # Saturday
        "check_in": "2026-09-12T10:00:00Z",
        "check_out": "2026-09-12T16:00:00Z",  # 6h elapsed - 1h break = 5h (300m)
    }
    res = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["worked_minutes"] == 300
    assert data["late_minutes"] == 0
    assert data["overtime_minutes"] == 300  # Entire shift is overtime on weekend
    assert data["status"] == "PRESENT"


# ===========================================================================
# 4. Manual Corrections & Audit Rationale
# ===========================================================================


async def test_hr_can_correct_attendance_with_reason(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # 1. Create incomplete attendance
    create_res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2026-09-14",
            "check_in": "2026-09-14T09:05:00Z",
            "check_out": None,
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201
    att_id = create_res.json()["id"]

    # 2. Patch with checkout and reason
    patch_res = await async_client.patch(
        f"/api/v1/attendance/{att_id}",
        json={
            "check_out": "2026-09-14T18:10:00Z",
            "correction_reason": "Employee forgot to badge out at front door",
        },
        headers=admin_auth_headers,
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["is_manual_edit"] is True
    assert data["correction_reason"] == "Employee forgot to badge out at front door"
    assert data["worked_minutes"] > 0
    assert data["late_minutes"] == 5
    assert data["status"] == "LATE"


async def test_correction_without_reason_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    create_res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2026-09-15",
            "check_in": "2026-09-15T09:00:00Z",
        },
        headers=admin_auth_headers,
    )
    att_id = create_res.json()["id"]

    # Empty reason -> 422
    patch_res = await async_client.patch(
        f"/api/v1/attendance/{att_id}",
        json={"check_out": "2026-09-15T18:00:00Z", "correction_reason": ""},
        headers=admin_auth_headers,
    )
    assert patch_res.status_code == 422


async def test_delete_attendance(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    create_res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2026-09-16",
            "check_in": "2026-09-16T09:00:00Z",
        },
        headers=admin_auth_headers,
    )
    att_id = create_res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/attendance/{att_id}", headers=admin_auth_headers)
    assert del_res.status_code == 204

    # Getting deleted record returns 404
    get_res = await async_client.get(f"/api/v1/attendance/{att_id}", headers=admin_auth_headers)
    assert get_res.status_code == 404


# ===========================================================================
# 5. Queries, Filters & History
# ===========================================================================


async def test_list_attendance_filters_and_pagination(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Seed 3 attendance records
    for day in range(17, 20):
        await async_client.post(
            "/api/v1/attendance",
            json={
                "employee_id": sample_employee["id"],
                "attendance_date": f"2026-09-{day}",
                "check_in": f"2026-09-{day}T09:00:00Z",
                "check_out": f"2026-09-{day}T18:00:00Z",
            },
            headers=admin_auth_headers,
        )

    # Filter by employee
    res = await async_client.get(
        f"/api/v1/attendance?employee_id={sample_employee['id']}&date_from=2026-09-17&date_to=2026-09-18",
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 2
    assert len(body["items"]) >= 2


async def test_employee_attendance_history_endpoints(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    emp, emp_headers = await _create_linked_employee_and_user(
        async_client,
        admin_headers=admin_auth_headers,
        dept_id=sample_department["id"],
        pos_id=sample_job_position["id"],
        email="history_worker@example.com",
        emp_code="HIST01",
    )

    # Create an attendance record
    await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": emp["id"],
            "attendance_date": "2026-09-21",
            "check_in": "2026-09-21T09:00:00Z",
            "check_out": "2026-09-21T18:00:00Z",
        },
        headers=admin_auth_headers,
    )

    # 1. Employee self-service history (/employees/me/attendance)
    me_res = await async_client.get("/api/v1/employees/me/attendance", headers=emp_headers)
    assert me_res.status_code == 200
    assert me_res.json()["total"] == 1

    # 2. Specific employee history (/employees/{id}/attendance)
    spec_res = await async_client.get(f"/api/v1/employees/{emp['id']}/attendance", headers=emp_headers)
    assert spec_res.status_code == 200
    assert spec_res.json()["total"] == 1


# ===========================================================================
# 6. RBAC & Security Enforcement
# ===========================================================================


async def test_unauthenticated_requests_rejected(async_client: AsyncClient) -> None:
    assert (await async_client.get("/api/v1/attendance")).status_code == 401
    assert (await async_client.post("/api/v1/attendance/check-in")).status_code == 401
    assert (await async_client.post("/api/v1/attendance/check-out")).status_code == 401
    assert (await async_client.get("/api/v1/attendance/session")).status_code == 401


async def test_employee_cannot_create_manual_attendance(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    emp, emp_headers = await _create_linked_employee_and_user(
        async_client,
        admin_headers=admin_auth_headers,
        dept_id=sample_department["id"],
        pos_id=sample_job_position["id"],
        email="emp_manual_block@example.com",
        emp_code="BLK01",
    )

    # Normal employee cannot POST /attendance
    res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": emp["id"],
            "attendance_date": "2026-09-22",
            "check_in": "2026-09-22T09:00:00Z",
        },
        headers=emp_headers,
    )
    assert res.status_code == 403


async def test_employee_cannot_correct_attendance(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
    employee_auth_headers: dict[str, str],
) -> None:
    create_res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2026-09-23",
            "check_in": "2026-09-23T09:00:00Z",
        },
        headers=admin_auth_headers,
    )
    att_id = create_res.json()["id"]

    # Normal employee cannot PATCH /attendance/{id}
    res = await async_client.patch(
        f"/api/v1/attendance/{att_id}",
        json={"check_out": "2026-09-23T18:00:00Z", "correction_reason": "Employee edit"},
        headers=employee_auth_headers,
    )
    assert res.status_code == 403


async def test_employee_cannot_view_other_employee_attendance(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    e1, h1 = await _create_linked_employee_and_user(
        async_client, admin_headers=admin_auth_headers, dept_id=sample_department["id"], pos_id=sample_job_position["id"], email="u1@ex.com", emp_code="U1"
    )
    e2, _ = await _create_linked_employee_and_user(
        async_client, admin_headers=admin_auth_headers, dept_id=sample_department["id"], pos_id=sample_job_position["id"], email="u2@ex.com", emp_code="U2"
    )

    # e1 tries to view e2's attendance history
    res = await async_client.get(f"/api/v1/employees/{e2['id']}/attendance", headers=h1)
    assert res.status_code == 403


async def test_hr_payroll_user_and_manager_allowed(
    async_client: AsyncClient,
    hr_payroll_user_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # HR Payroll User can list attendance
    res1 = await async_client.get("/api/v1/attendance", headers=hr_payroll_user_auth_headers)
    assert res1.status_code == 200

    # HR Payroll Manager can list attendance
    res2 = await async_client.get("/api/v1/attendance", headers=hr_payroll_manager_auth_headers)
    assert res2.status_code == 200


async def test_unlinked_user_cannot_check_in(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
) -> None:
    """An authenticated user who has no linked employee profile cannot check in."""
    res = await async_client.post(
        "/api/v1/attendance/check-in",
        json={"timestamp": "2026-09-24T09:00:00Z"},
        headers=employee_auth_headers,
    )
    assert res.status_code == 400
    assert "not linked to an employee profile" in res.json()["detail"]


async def test_inactive_employee_cannot_check_in(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    """Deactivated employee cannot perform self-service check-in."""
    emp, emp_headers = await _create_linked_employee_and_user(
        async_client,
        admin_headers=admin_auth_headers,
        dept_id=sample_department["id"],
        pos_id=sample_job_position["id"],
        email="inactive_emp@example.com",
        emp_code="INACT01",
    )

    # Deactivate employee
    deact_res = await async_client.delete(f"/api/v1/employees/{emp['id']}", headers=admin_auth_headers)
    assert deact_res.status_code == 200

    # Attempt check in -> 400
    checkin_res = await async_client.post(
        "/api/v1/attendance/check-in",
        json={"timestamp": "2026-09-25T09:00:00Z"},
        headers=emp_headers,
    )
    assert checkin_res.status_code == 400
    assert "cannot check in" in checkin_res.json()["detail"]


async def test_employee_cannot_delete_attendance(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
    employee_auth_headers: dict[str, str],
) -> None:
    """Standard employee cannot delete attendance records."""
    create_res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2026-09-26",
            "check_in": "2026-09-26T09:00:00Z",
        },
        headers=admin_auth_headers,
    )
    att_id = create_res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/attendance/{att_id}", headers=employee_auth_headers)
    assert del_res.status_code == 403


async def test_duplicate_employee_date_manual_creation_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    """Cannot manually create two attendance records for same employee on same calendar date."""
    payload = {
        "employee_id": sample_employee["id"],
        "attendance_date": "2026-09-27",
        "check_in": "2026-09-27T09:00:00Z",
        "check_out": "2026-09-27T18:00:00Z",
    }
    res1 = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res1.status_code == 201

    res2 = await async_client.post("/api/v1/attendance", json=payload, headers=admin_auth_headers)
    assert res2.status_code == 409


async def test_get_nonexistent_attendance_returns_404(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
) -> None:
    res = await async_client.get("/api/v1/attendance/99999", headers=admin_auth_headers)
    assert res.status_code == 404


async def test_admin_has_full_attendance_access(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Admin can create, view, patch, and delete
    create_res = await async_client.post(
        "/api/v1/attendance",
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2026-09-28",
            "check_in": "2026-09-28T09:00:00Z",
        },
        headers=admin_auth_headers,
    )
    assert create_res.status_code == 201
    att_id = create_res.json()["id"]

    patch_res = await async_client.patch(
        f"/api/v1/attendance/{att_id}",
        json={"check_out": "2026-09-28T18:00:00Z", "correction_reason": "Admin review adjustment"},
        headers=admin_auth_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_manual_edit"] is True


