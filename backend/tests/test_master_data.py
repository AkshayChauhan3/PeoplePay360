"""
Unit & integration tests for HR Master Data:
- Roles
- Departments
- Job Positions
"""

from typing import Any

from httpx import AsyncClient

# ===========================================================================
# Roles Tests
# ===========================================================================


async def test_list_roles_contains_five_standard_roles(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
) -> None:
    res = await async_client.get("/api/v1/roles", headers=employee_auth_headers)
    assert res.status_code == 200
    roles = res.json()
    assert len(roles) >= 5
    role_names = {r["name"] for r in roles}
    expected = {"EMPLOYEE", "HR_MANAGER", "HR_PAYROLL_USER", "HR_PAYROLL_MANAGER", "ADMIN"}
    assert expected.issubset(role_names)


async def test_get_role_by_id(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
) -> None:
    list_res = await async_client.get("/api/v1/roles", headers=employee_auth_headers)
    first_role = list_res.json()[0]

    res = await async_client.get(f"/api/v1/roles/{first_role['id']}", headers=employee_auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == first_role["id"]
    assert res.json()["name"] == first_role["name"]


async def test_get_role_not_found(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
) -> None:
    res = await async_client.get("/api/v1/roles/99999", headers=employee_auth_headers)
    assert res.status_code == 404


async def test_roles_public_without_auth(async_client: AsyncClient) -> None:
    res = await async_client.get("/api/v1/roles")
    assert res.status_code == 200
    roles = res.json()
    assert len(roles) >= 5


# ===========================================================================
# Departments Tests
# ===========================================================================


async def test_create_department_success(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
) -> None:
    res = await async_client.post(
        "/api/v1/departments",
        json={"name": "Finance", "code": "fin ", "description": "Finance & Accounting"},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Finance"
    assert data["code"] == "FIN"  # Normalized uppercase
    assert data["is_active"] is True
    assert "id" in data


async def test_create_department_duplicate_code_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
) -> None:
    res = await async_client.post(
        "/api/v1/departments",
        json={"name": "Another Dept", "code": sample_department["code"]},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 409


async def test_create_department_duplicate_name_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
) -> None:
    res = await async_client.post(
        "/api/v1/departments",
        json={"name": sample_department["name"], "code": "DIFF"},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 409


async def test_get_department_by_id(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
) -> None:
    res = await async_client.get(
        f"/api/v1/departments/{sample_department['id']}",
        headers=employee_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == sample_department["name"]


async def test_update_department(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
) -> None:
    res = await async_client.patch(
        f"/api/v1/departments/{sample_department['id']}",
        json={"name": "Engineering & Tech", "description": "Updated description"},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Engineering & Tech"
    assert res.json()["description"] == "Updated description"


async def test_deactivate_department(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
) -> None:
    res = await async_client.delete(
        f"/api/v1/departments/{sample_department['id']}",
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False


async def test_department_employee_role_forbidden(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
) -> None:
    res = await async_client.post(
        "/api/v1/departments",
        json={"name": "Hacking Dept", "code": "HACK"},
        headers=employee_auth_headers,
    )
    assert res.status_code == 403


# ===========================================================================
# Job Positions Tests
# ===========================================================================


async def test_create_job_position_success(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
) -> None:
    res = await async_client.post(
        "/api/v1/job-positions",
        json={"name": "Product Manager", "code": "pm ", "description": "Tech PM"},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Product Manager"
    assert data["code"] == "PM"  # Normalized uppercase
    assert data["is_active"] is True
    assert "id" in data


async def test_create_job_position_duplicate_code_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_job_position: dict[str, Any],
) -> None:
    res = await async_client.post(
        "/api/v1/job-positions",
        json={"name": "Other Title", "code": sample_job_position["code"]},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 409


async def test_create_job_position_duplicate_name_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_job_position: dict[str, Any],
) -> None:
    res = await async_client.post(
        "/api/v1/job-positions",
        json={"name": sample_job_position["name"], "code": "OTHER"},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 409


async def test_get_job_position_by_id(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
    sample_job_position: dict[str, Any],
) -> None:
    res = await async_client.get(
        f"/api/v1/job-positions/{sample_job_position['id']}",
        headers=employee_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["code"] == sample_job_position["code"]


async def test_update_job_position(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_job_position: dict[str, Any],
) -> None:
    res = await async_client.patch(
        f"/api/v1/job-positions/{sample_job_position['id']}",
        json={"name": "Lead Software Engineer"},
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Lead Software Engineer"


async def test_deactivate_job_position(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_job_position: dict[str, Any],
) -> None:
    res = await async_client.delete(
        f"/api/v1/job-positions/{sample_job_position['id']}",
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False


async def test_job_position_employee_role_forbidden(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
) -> None:
    res = await async_client.post(
        "/api/v1/job-positions",
        json={"name": "CTO", "code": "CTO"},
        headers=employee_auth_headers,
    )
    assert res.status_code == 403

