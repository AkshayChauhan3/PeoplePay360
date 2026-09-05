"""
Unit & integration tests for Employee module:
- Employee CRUD
- Foreign key & uniqueness validations
- Self-referencing manager hierarchy & self-manager rejection
- User ↔ Employee 1:1 relationship linking
- RBAC permissions (Employee vs HR vs Admin)
- Self-service /employees/me
"""

from typing import Any

from httpx import AsyncClient


def _sample_emp_payload(dept_id: int, pos_id: int, code: str = "EMP001", email: str = "akshay@company.com") -> dict:
    return {
        "employee_code": code,
        "first_name": "Akshay",
        "last_name": "Chauhan",
        "email": email,
        "phone": "+91-9876543210",
        "date_of_birth": "1995-05-15",
        "joining_date": "2024-01-01",
        "department_id": dept_id,
        "job_position_id": pos_id,
        "status": "ACTIVE",
    }


# ===========================================================================
# 1. Employee Creation & Retrieval
# ===========================================================================


async def test_create_employee_success(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"])
    res = await async_client.post(
        "/api/v1/employees",
        json=payload,
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["employee_code"] == "EMP001"
    assert data["first_name"] == "Akshay"
    assert data["last_name"] == "Chauhan"
    assert data["full_name"] == "Akshay Chauhan"
    assert data["email"] == "akshay@company.com"
    assert data["status"] == "ACTIVE"
    assert data["department"]["id"] == sample_department["id"]
    assert data["job_position"]["id"] == sample_job_position["id"]
    assert data["manager"] is None


async def test_get_employee_by_id(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="EMP002", email="emp2@company.com")
    create_res = await async_client.post("/api/v1/employees", json=payload, headers=hr_manager_auth_headers)
    emp_id = create_res.json()["id"]

    res = await async_client.get(f"/api/v1/employees/{emp_id}", headers=hr_manager_auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == emp_id
    assert res.json()["employee_code"] == "EMP002"


async def test_get_nonexistent_employee_returns_404(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
) -> None:
    res = await async_client.get("/api/v1/employees/99999", headers=hr_manager_auth_headers)
    assert res.status_code == 404


# ===========================================================================
# 2. Validation Tests
# ===========================================================================


async def test_create_employee_invalid_department_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(9999, sample_job_position["id"])
    res = await async_client.post("/api/v1/employees", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 400


async def test_create_employee_invalid_job_position_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(sample_department["id"], 9999)
    res = await async_client.post("/api/v1/employees", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 400


async def test_create_employee_duplicate_code_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload1 = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="EMP_DUP", email="dup1@company.com")
    await async_client.post("/api/v1/employees", json=payload1, headers=hr_manager_auth_headers)

    payload2 = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="EMP_DUP", email="dup2@company.com")
    res = await async_client.post("/api/v1/employees", json=payload2, headers=hr_manager_auth_headers)
    assert res.status_code == 409


async def test_create_employee_duplicate_email_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload1 = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="EMP_A", email="shared@company.com")
    await async_client.post("/api/v1/employees", json=payload1, headers=hr_manager_auth_headers)

    payload2 = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="EMP_B", email="shared@company.com")
    res = await async_client.post("/api/v1/employees", json=payload2, headers=hr_manager_auth_headers)
    assert res.status_code == 409


# ===========================================================================
# 3. Manager Hierarchy & Self-Manager Rejection
# ===========================================================================


async def test_employee_with_manager(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    mgr_payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="MGR01", email="mgr@company.com")
    mgr_res = await async_client.post("/api/v1/employees", json=mgr_payload, headers=hr_manager_auth_headers)
    mgr_id = mgr_res.json()["id"]

    sub_payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="SUB01", email="sub@company.com")
    sub_payload["manager_id"] = mgr_id
    sub_res = await async_client.post("/api/v1/employees", json=sub_payload, headers=hr_manager_auth_headers)
    assert sub_res.status_code == 201
    data = sub_res.json()
    assert data["manager_id"] == mgr_id
    assert data["manager"]["id"] == mgr_id
    assert data["manager"]["employee_code"] == "MGR01"


async def test_update_self_manager_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="SELFMGR", email="self@company.com")
    emp_res = await async_client.post("/api/v1/employees", json=payload, headers=hr_manager_auth_headers)
    emp_id = emp_res.json()["id"]

    patch_res = await async_client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"manager_id": emp_id},
        headers=hr_manager_auth_headers,
    )
    assert patch_res.status_code == 400


# ===========================================================================
# 4. List, Search, Filter & Deactivation
# ===========================================================================


async def test_list_and_search_employees(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    for i, name in enumerate(["Alice", "Bob", "Charlie"]):
        payload = _sample_emp_payload(
            sample_department["id"],
            sample_job_position["id"],
            code=f"LIST{i}",
            email=f"{name.lower()}@company.com",
        )
        payload["first_name"] = name
        await async_client.post("/api/v1/employees", json=payload, headers=hr_manager_auth_headers)

    # Search for Bob
    res = await async_client.get("/api/v1/employees?search=Bob", headers=hr_manager_auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["first_name"] == "Bob"


async def test_deactivate_employee(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="DEACT01", email="deact@company.com")
    emp_res = await async_client.post("/api/v1/employees", json=payload, headers=hr_manager_auth_headers)
    emp_id = emp_res.json()["id"]

    del_res = await async_client.delete(f"/api/v1/employees/{emp_id}", headers=hr_manager_auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "TERMINATED"


# ===========================================================================
# 5. User ↔ Employee 1:1 Linking & Self-Service
# ===========================================================================


async def test_link_user_to_employee_and_self_service(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    # 1. Create employee
    payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], code="LINK01", email="linked@company.com")
    emp_res = await async_client.post("/api/v1/employees", json=payload, headers=admin_auth_headers)
    emp_id = emp_res.json()["id"]

    # 2. Register user
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "linked_user@company.com", "password": "UserPass1", "role_id": 1},
    )
    user_id = reg_res.json()["id"]

    # 3. Link user to employee
    link_res = await async_client.post(
        f"/api/v1/employees/{emp_id}/user",
        json={"user_id": user_id},
        headers=admin_auth_headers,
    )
    assert link_res.status_code == 200

    # 4. User logs in and visits /employees/me
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "linked_user@company.com", "password": "UserPass1"},
    )
    user_token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    me_res = await async_client.get("/api/v1/employees/me", headers=user_headers)
    assert me_res.status_code == 200
    assert me_res.json()["id"] == emp_id
    assert me_res.json()["employee_code"] == "LINK01"


async def test_duplicate_user_linking_rejected(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    # Create two employees
    e1 = (await async_client.post("/api/v1/employees", json=_sample_emp_payload(sample_department["id"], sample_job_position["id"], "LNK1", "l1@co.com"), headers=admin_auth_headers)).json()
    e2 = (await async_client.post("/api/v1/employees", json=_sample_emp_payload(sample_department["id"], sample_job_position["id"], "LNK2", "l2@co.com"), headers=admin_auth_headers)).json()

    # Create one user
    user = (await async_client.post("/api/v1/auth/register", json={"email": "single_user@co.com", "password": "UserPass1", "role_id": 1})).json()

    # Link user to e1
    res1 = await async_client.post(f"/api/v1/employees/{e1['id']}/user", json={"user_id": user["id"]}, headers=admin_auth_headers)
    assert res1.status_code == 200

    # Try to link same user to e2 -> must fail
    res2 = await async_client.post(f"/api/v1/employees/{e2['id']}/user", json={"user_id": user["id"]}, headers=admin_auth_headers)
    assert res2.status_code == 400


# ===========================================================================
# 6. RBAC Permissions Tests
# ===========================================================================


async def test_employee_role_forbidden_from_managing_employees(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_emp_payload(sample_department["id"], sample_job_position["id"], "NOPE", "nope@co.com")

    # POST forbidden
    post_res = await async_client.post("/api/v1/employees", json=payload, headers=employee_auth_headers)
    assert post_res.status_code == 403

    # GET list forbidden
    get_res = await async_client.get("/api/v1/employees", headers=employee_auth_headers)
    assert get_res.status_code == 403


async def test_hr_payroll_user_and_manager_allowed(
    async_client: AsyncClient,
    hr_payroll_user_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    # HR_PAYROLL_USER can create employee
    p1 = _sample_emp_payload(sample_department["id"], sample_job_position["id"], "PU01", "pu01@co.com")
    res1 = await async_client.post("/api/v1/employees", json=p1, headers=hr_payroll_user_auth_headers)
    assert res1.status_code == 201

    # HR_PAYROLL_MANAGER can list employees
    res2 = await async_client.get("/api/v1/employees", headers=hr_payroll_manager_auth_headers)
    assert res2.status_code == 200

