"""
Unit & integration tests for Contract module:
- Contract CRUD & smart defaulting of department/position from employee
- Monetary validation for wage (> 0, 2 decimal places)
- Date range validations (end_date >= start_date)
- Overlap prevention for RUNNING contracts
- Lifecycle state transitions (DRAFT -> RUNNING, CANCELLED)
- RBAC permissions (Employee self-service vs HR vs Admin)
"""

from typing import Any

from httpx import AsyncClient


def _sample_contract_payload(
    employee_id: int,
    contract_number: str = "CNT-2026-0001",
    start_date: str = "2026-01-01",
    end_date: str | None = "2026-12-31",
    wage: float = 60000.00,
    status: str = "DRAFT",
    department_id: int | None = None,
    job_position_id: int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "employee_id": employee_id,
        "contract_number": contract_number,
        "start_date": start_date,
        "wage": wage,
        "status": status,
    }
    if end_date is not None:
        payload["end_date"] = end_date
    if department_id is not None:
        payload["department_id"] = department_id
    if job_position_id is not None:
        payload["job_position_id"] = job_position_id
    return payload


# ===========================================================================
# 1. Contract Creation & Retrieval
# ===========================================================================


async def test_create_contract_full_fields(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(
        employee_id=sample_employee["id"],
        contract_number="cnt-2026-0001",
        start_date="2026-01-01",
        end_date="2026-12-31",
        wage=75000.50,
        status="DRAFT",
        department_id=sample_department["id"],
        job_position_id=sample_job_position["id"],
    )
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["contract_number"] == "CNT-2026-0001"  # Normalized uppercase
    assert data["employee_id"] == sample_employee["id"]
    assert float(data["wage"]) == 75000.50
    assert data["status"] == "DRAFT"
    assert data["start_date"] == "2026-01-01"
    assert data["end_date"] == "2026-12-31"
    assert data["department"]["id"] == sample_department["id"]
    assert data["job_position"]["id"] == sample_job_position["id"]
    assert data["employee"]["id"] == sample_employee["id"]


async def test_create_contract_smart_defaults(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Omit department_id and job_position_id
    payload = {
        "employee_id": sample_employee["id"],
        "contract_number": "CNT-DEF-001",
        "start_date": "2026-02-01",
        "wage": 50000.00,
    }
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 201
    data = res.json()
    # Should automatically inherit department and job position from sample_employee
    assert data["department_id"] == sample_employee["department"]["id"]
    assert data["job_position_id"] == sample_employee["job_position"]["id"]
    assert data["end_date"] is None
    assert data["status"] == "DRAFT"


async def test_get_contract_by_id(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(sample_employee["id"], contract_number="CNT-GET-001")
    create_res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    contract_id = create_res.json()["id"]

    res = await async_client.get(f"/api/v1/contracts/{contract_id}", headers=hr_manager_auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == contract_id
    assert res.json()["contract_number"] == "CNT-GET-001"


async def test_get_nonexistent_contract_returns_404(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
) -> None:
    res = await async_client.get("/api/v1/contracts/999999", headers=hr_manager_auth_headers)
    assert res.status_code == 404


async def test_list_contracts_pagination_and_filter(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Create two contracts
    await async_client.post(
        "/api/v1/contracts",
        json=_sample_contract_payload(sample_employee["id"], "CNT-LST-001", status="DRAFT"),
        headers=hr_manager_auth_headers,
    )
    await async_client.post(
        "/api/v1/contracts",
        json=_sample_contract_payload(sample_employee["id"], "CNT-LST-002", status="CANCELLED"),
        headers=hr_manager_auth_headers,
    )

    # Filter by status
    res = await async_client.get(
        f"/api/v1/contracts?employee_id={sample_employee['id']}&status=DRAFT",
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert all(item["status"] == "DRAFT" for item in body["items"])


# ===========================================================================
# 2. Validations
# ===========================================================================


async def test_contract_end_date_before_start_date_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-INV-DATE",
        start_date="2026-06-01",
        end_date="2026-01-01",
    )
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 422


async def test_contract_negative_wage_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-NEG-WAGE",
        wage=-500.0,
    )
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 422


async def test_contract_duplicate_number_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(sample_employee["id"], contract_number="CNT-DUP-001")
    res1 = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res1.status_code == 201

    res2 = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res2.status_code == 409


async def test_contract_invalid_employee_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
) -> None:
    payload = _sample_contract_payload(employee_id=999999, contract_number="CNT-INV-EMP")
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 400


# ===========================================================================
# 3. Running Contract Overlap Prevention
# ===========================================================================


async def test_create_overlapping_running_contracts_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Contract 1: 2026-01-01 to 2026-12-31 (RUNNING)
    payload1 = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-RUN-001",
        start_date="2026-01-01",
        end_date="2026-12-31",
        status="RUNNING",
    )
    res1 = await async_client.post("/api/v1/contracts", json=payload1, headers=hr_manager_auth_headers)
    assert res1.status_code == 201

    # Contract 2: 2026-06-01 to 2027-05-31 (Overlaps!)
    payload2 = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-RUN-002",
        start_date="2026-06-01",
        end_date="2027-05-31",
        status="RUNNING",
    )
    res2 = await async_client.post("/api/v1/contracts", json=payload2, headers=hr_manager_auth_headers)
    assert res2.status_code == 409
    assert "overlapping" in res2.json()["detail"].lower()


async def test_non_overlapping_running_contracts_allowed(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Contract 1: Year 2024
    payload1 = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-Y2024",
        start_date="2024-01-01",
        end_date="2024-12-31",
        status="RUNNING",
    )
    res1 = await async_client.post("/api/v1/contracts", json=payload1, headers=hr_manager_auth_headers)
    assert res1.status_code == 201

    # Contract 2: Year 2025 (Distinct date window)
    payload2 = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-Y2025",
        start_date="2025-01-01",
        end_date="2025-12-31",
        status="RUNNING",
    )
    res2 = await async_client.post("/api/v1/contracts", json=payload2, headers=hr_manager_auth_headers)
    assert res2.status_code == 201


async def test_activate_contract_overlap_rejected(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # 1. Existing RUNNING contract: 2026-01-01 to 2026-12-31
    c1 = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-ACT-001",
        start_date="2026-01-01",
        end_date="2026-12-31",
        status="RUNNING",
    )
    res1 = await async_client.post("/api/v1/contracts", json=c1, headers=hr_manager_auth_headers)
    assert res1.status_code == 201

    # 2. New DRAFT contract: 2026-08-01 to 2027-08-01 (Created as DRAFT)
    c2 = _sample_contract_payload(
        sample_employee["id"],
        contract_number="CNT-ACT-002",
        start_date="2026-08-01",
        end_date="2027-08-01",
        status="DRAFT",
    )
    res2 = await async_client.post("/api/v1/contracts", json=c2, headers=hr_manager_auth_headers)
    assert res2.status_code == 201
    c2_id = res2.json()["id"]

    # 3. Attempt to activate c2 -> Should fail with 409 Conflict because c1 is RUNNING
    act_res = await async_client.post(f"/api/v1/contracts/{c2_id}/activate", headers=hr_manager_auth_headers)
    assert act_res.status_code == 409


# ===========================================================================
# 4. Lifecycle Transitions & Updates
# ===========================================================================


async def test_activate_and_cancel_contract(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    # Create DRAFT
    payload = _sample_contract_payload(sample_employee["id"], contract_number="CNT-CYCLE-001", status="DRAFT")
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    assert res.status_code == 201
    contract_id = res.json()["id"]
    assert res.json()["status"] == "DRAFT"

    # Activate -> RUNNING
    act_res = await async_client.post(f"/api/v1/contracts/{contract_id}/activate", headers=hr_manager_auth_headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "RUNNING"

    # Cancel -> CANCELLED
    cancel_res = await async_client.post(f"/api/v1/contracts/{contract_id}/cancel", headers=hr_manager_auth_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


async def test_update_contract(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(sample_employee["id"], contract_number="CNT-UPD-001", wage=45000.0)
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    contract_id = res.json()["id"]

    patch_res = await async_client.patch(
        f"/api/v1/contracts/{contract_id}",
        json={"wage": 55000.00, "contract_number": "CNT-UPD-RENAMED"},
        headers=hr_manager_auth_headers,
    )
    assert patch_res.status_code == 200
    assert float(patch_res.json()["wage"]) == 55000.00
    assert patch_res.json()["contract_number"] == "CNT-UPD-RENAMED"


async def test_get_employee_contracts_history(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    await async_client.post(
        "/api/v1/contracts",
        json=_sample_contract_payload(sample_employee["id"], "CNT-HIST-001"),
        headers=hr_manager_auth_headers,
    )
    res = await async_client.get(
        f"/api/v1/employees/{sample_employee['id']}/contracts",
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["employee_id"] == sample_employee["id"]


# ===========================================================================
# 5. RBAC Permissions
# ===========================================================================


async def test_unauthenticated_contract_access_rejected(async_client: AsyncClient) -> None:
    res = await async_client.get("/api/v1/contracts")
    assert res.status_code == 401


async def test_employee_role_cannot_create_contract(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(sample_employee["id"], contract_number="CNT-NO-PERM")
    res = await async_client.post("/api/v1/contracts", json=payload, headers=employee_auth_headers)
    assert res.status_code == 403


async def test_employee_cannot_view_other_employees_contract(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    employee_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
) -> None:
    payload = _sample_contract_payload(sample_employee["id"], contract_number="CNT-RESTRICTED")
    res = await async_client.post("/api/v1/contracts", json=payload, headers=hr_manager_auth_headers)
    contract_id = res.json()["id"]

    # Regular employee user (not linked to sample_employee) tries to view it
    view_res = await async_client.get(f"/api/v1/contracts/{contract_id}", headers=employee_auth_headers)
    assert view_res.status_code == 403
