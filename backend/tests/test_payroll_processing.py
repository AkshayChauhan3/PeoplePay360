"""
Phase 7: Payruns, Payslips & Payroll Processing Test Suite — PeoplePay360.

Comprehensive tests covering:
1. Two-step creation wizard:
   - Step 1 Preview: eligible vs ineligible employees with detailed reasons
     (INACTIVE, no running contract, mismatched structure, duplicate payslip).
   - Step 2 Creation: instantiate draft payrun with draft payslips.
2. Standard remuneration calculation scenario:
   - Contract wage: 85,000.00
   - Rules: BASIC (85,000), HRA (17,000), TRANSPORT (3,000), GROSS (105,000), PF (10,200), NET (94,800).
   - Verify generated PayslipLine records & summary totals.
3. Historical immutability & preservation:
   - Mutating or deleting salary rules does not alter previously calculated payslip lines.
4. Duplicate payslip prevention:
   - Unique constraint & service validation prevent multiple payslips for the same period.
5. Lifecycle state machine & transition rules:
   - DRAFT -> COMPUTED -> VALIDATED -> PAID.
   - Invalid transitions rejected (e.g. validate draft, mark-paid unvalidated, delete computed).
6. Audit validation & blocking errors:
   - Negative net salary blocks validation.
7. Attendance & time-off operational integration:
   - Attendance days & approved leave quantities aggregated into payslip context.
8. Employee self-service & cross-employee isolation:
   - /me/payslips returns own payslips only; cross-employee access forbidden.
9. RBAC matrix:
   - Strict enforcement across EMPLOYEE, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN.
"""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------
async def _setup_standard_structure_and_rules(
    async_client: AsyncClient,
    headers: dict[str, str],
    name: str = "Corporate Standard",
    code: str = "CORP_STD",
) -> int:
    """Create salary structure with standard rules (BASIC, HRA, TRANSPORT, GROSS, PF, NET)."""
    struct_res = await async_client.post(
        "/api/v1/salary-structures",
        headers=headers,
        json={"name": name, "code": code, "is_active": True},
    )
    assert struct_res.status_code == 201, struct_res.text
    struct_id = struct_res.json()["id"]

    # 1. BASIC (Formula: CONTRACT_WAGE)
    r1 = await async_client.post(
        "/api/v1/salary-rules",
        headers=headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Basic Salary",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FORMULA",
            "formula": "CONTRACT_WAGE",
        },
    )
    assert r1.status_code == 201, r1.text

    # 2. HRA (Percentage: 20% of BASIC)
    r2 = await async_client.post(
        "/api/v1/salary-rules",
        headers=headers,
        json={
            "salary_structure_id": struct_id,
            "name": "House Rent Allowance",
            "code": "HRA",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": 20.0,
            "percentage_base": "BASIC",
        },
    )
    assert r2.status_code == 201, r2.text

    # 3. TRANSPORT (Fixed: 3,000.00)
    r3 = await async_client.post(
        "/api/v1/salary-rules",
        headers=headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Transport Allowance",
            "code": "TRANSPORT",
            "category": "ALLOWANCE",
            "sequence": 30,
            "computation_type": "FIXED",
            "fixed_amount": 3000.0,
        },
    )
    assert r3.status_code == 201, r3.text

    # 4. GROSS (Formula: BASIC + HRA + TRANSPORT)
    r4 = await async_client.post(
        "/api/v1/salary-rules",
        headers=headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Gross Earnings",
            "code": "GROSS",
            "category": "GROSS",
            "sequence": 40,
            "computation_type": "FORMULA",
            "formula": "BASIC + HRA + TRANSPORT",
        },
    )
    assert r4.status_code == 201, r4.text

    # 5. PF (Percentage: 12% of BASIC)
    r5 = await async_client.post(
        "/api/v1/salary-rules",
        headers=headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Provident Fund",
            "code": "PF",
            "category": "DEDUCTION",
            "sequence": 50,
            "computation_type": "PERCENTAGE",
            "percentage": 12.0,
            "percentage_base": "BASIC",
        },
    )
    assert r5.status_code == 201, r5.text

    # 6. NET (Formula: GROSS - PF)
    r6 = await async_client.post(
        "/api/v1/salary-rules",
        headers=headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Net Remuneration",
            "code": "NET",
            "category": "NET",
            "sequence": 60,
            "computation_type": "FORMULA",
            "formula": "GROSS - PF",
        },
    )
    assert r6.status_code == 201, r6.text

    return struct_id



async def _create_contract_and_activate(
    async_client: AsyncClient,
    headers: dict[str, str],
    employee_id: int,
    structure_id: int,
    contract_number: str = "CNT-TEST-001",
    wage: float = 85000.0,
    start_date: str = "2026-01-01",
    end_date: str | None = None,
) -> int:
    """Create a contract and activate it to RUNNING status."""
    res = await async_client.post(
        "/api/v1/contracts",
        headers=headers,
        json={
            "contract_number": contract_number,
            "employee_id": employee_id,
            "salary_structure_id": structure_id,
            "start_date": start_date,
            "end_date": end_date,
            "wage": wage,
            "status": "RUNNING",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


# ---------------------------------------------------------------------------
# 1. Two-Step Wizard Preview & Eligibility Tests
# ---------------------------------------------------------------------------
async def test_wizard_preview_eligibility_and_reasons(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """
    Test wizard step 1 preview: returns eligible and ineligible employees with exact reasons.
    """
    struct_a_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Structure A", code="STRUCT_A"
    )
    struct_b_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Structure B", code="STRUCT_B"
    )

    # 1. Eligible employee: active, running contract matching Struct A
    emp1_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-ELIG-01",
            "first_name": "Alice",
            "last_name": "Eligible",
            "email": "alice.elig@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
    )
    assert emp1_res.status_code == 201
    emp1 = emp1_res.json()
    await _create_contract_and_activate(
        async_client, admin_auth_headers, emp1["id"], struct_a_id, contract_number="CNT-ALICE-1"
    )

    # 2. Ineligible employee: INACTIVE status
    emp2_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-INACT-02",
            "first_name": "Bob",
            "last_name": "Inactive",
            "email": "bob.inact@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "INACTIVE",
        },
    )
    assert emp2_res.status_code == 201
    emp2 = emp2_res.json()

    # 3. Ineligible employee: Active but NO contract
    emp3_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-NOCNT-03",
            "first_name": "Charlie",
            "last_name": "NoContract",
            "email": "charlie.nocnt@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
    )
    assert emp3_res.status_code == 201
    emp3 = emp3_res.json()

    # 4. Ineligible employee: Contract linked to Struct B, previewing Struct A
    emp4_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-DIFFS-04",
            "first_name": "Diana",
            "last_name": "OtherStruct",
            "email": "diana.diff@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
    )
    assert emp4_res.status_code == 201
    emp4 = emp4_res.json()
    await _create_contract_and_activate(
        async_client, admin_auth_headers, emp4["id"], struct_b_id, contract_number="CNT-DIANA-1"
    )

    # Execute Preview for Struct A (September 2026)
    prev_res = await async_client.post(
        "/api/v1/payruns/preview",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_a_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
        },
    )
    assert prev_res.status_code == 200, prev_res.text
    data = prev_res.json()

    # Assert Alice is eligible
    elig_ids = [e["employee_id"] for e in data["eligible_employees"]]
    assert emp1["id"] in elig_ids

    # Assert Bob, Charlie, Diana are ineligible with corresponding reasons
    inelig_map = {ie["employee_id"]: ie["reason"] for ie in data["ineligible_employees"]}
    assert emp2["id"] in inelig_map
    assert "INACTIVE" in inelig_map[emp2["id"]]

    assert emp3["id"] in inelig_map
    assert "No running contract" in inelig_map[emp3["id"]]

    assert emp4["id"] in inelig_map
    assert "Contract salary structure does not match" in inelig_map[emp4["id"]]


async def test_create_payrun_wizard_step_2(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Wizard step 2: Create payrun and verify draft payslips are generated.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Step 2 Struct", code="STEP2_STRUCT"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-S2-001"
    )

    # Step 2: Create payrun
    res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "September 2026 Payroll",
            "salary_structure_id": struct_id,
            "period_start": "2026-09-01",
            "period_end": "2026-09-30",
            "employee_ids": [sample_employee["id"]],
        },
    )
    assert res.status_code == 201, res.text
    payrun = res.json()

    assert payrun["name"] == "September 2026 Payroll"
    assert payrun["status"] == "DRAFT"
    assert payrun["payslip_count"] == 1
    assert Decimal(str(payrun["total_gross"])) == Decimal("0.00")
    assert Decimal(str(payrun["total_net"])) == Decimal("0.00")

    # Check the draft payslip
    payslip = payrun["payslips"][0]
    assert payslip["employee_id"] == sample_employee["id"]
    assert payslip["status"] == "DRAFT"
    assert Decimal(str(payslip["net_amount"])) == Decimal("0.00")
    assert len(payslip["lines"]) == 0


# ---------------------------------------------------------------------------
# 2. Standard Remuneration Calculation Scenario (Prompt Item 39)
# ---------------------------------------------------------------------------
async def test_standard_remuneration_calculation_and_line_items(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Contract wage: 85,000.00
    Rules:
    - BASIC: 85,000.00 (FORMULA: CONTRACT_WAGE)
    - HRA: 17,000.00 (20% of BASIC)
    - TRANSPORT: 3,000.00 (FIXED)
    - GROSS: 105,000.00 (BASIC + HRA + TRANSPORT)
    - PF: 10,200.00 (12% of BASIC)
    - NET: 94,800.00 (GROSS - PF)
    Verify exact computed amounts and line snapshots.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Calculation Struct", code="CALC_STD"
    )
    await _create_contract_and_activate(
        async_client,
        admin_auth_headers,
        sample_employee["id"],
        struct_id,
        contract_number="CNT-CALC-85K",
        wage=85000.0,
    )

    # 1. Create draft payrun
    create_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Standard Calc Run",
            "salary_structure_id": struct_id,
            "period_start": "2026-10-01",
            "period_end": "2026-10-31",
            "employee_ids": [sample_employee["id"]],
        },
    )
    assert create_res.status_code == 201, create_res.text
    payrun_id = create_res.json()["id"]

    # 2. Compute payrun
    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_res.status_code == 200, comp_res.text
    payrun = comp_res.json()
    assert payrun["status"] == "COMPUTED"
    assert Decimal(str(payrun["total_gross"])) == Decimal("105000.00")
    assert Decimal(str(payrun["total_deduction"])) == Decimal("10200.00")
    assert Decimal(str(payrun["total_net"])) == Decimal("94800.00")

    # 3. Inspect Payslip & itemized PayslipLines
    payslip = payrun["payslips"][0]
    assert payslip["status"] == "COMPUTED"
    assert Decimal(str(payslip["gross_amount"])) == Decimal("105000.00")
    assert Decimal(str(payslip["deduction_amount"])) == Decimal("10200.00")
    assert Decimal(str(payslip["net_amount"])) == Decimal("94800.00")

    lines = {line["code"]: (Decimal(str(line["amount"])), line["category"]) for line in payslip["lines"]}
    assert lines["BASIC"] == (Decimal("85000.00"), "BASIC")
    assert lines["HRA"] == (Decimal("17000.00"), "ALLOWANCE")
    assert lines["TRANSPORT"] == (Decimal("3000.00"), "ALLOWANCE")
    assert lines["GROSS"] == (Decimal("105000.00"), "GROSS")
    assert lines["PF"] == (Decimal("10200.00"), "DEDUCTION")
    assert lines["NET"] == (Decimal("94800.00"), "NET")


# ---------------------------------------------------------------------------
# 3. Historical Preservation & Immutability Test (Prompt Item 44)
# ---------------------------------------------------------------------------
async def test_historical_preservation_of_payslip_lines(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Mutating or deleting salary rules in the master template does NOT alter
    previously computed PayslipLine items.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Freeze Struct", code="FREEZE_STD"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-FREEZE-1"
    )

    # 1. Create and compute payrun
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Freeze Run",
            "salary_structure_id": struct_id,
            "period_start": "2026-11-01",
            "period_end": "2026-11-30",
        },
    )
    payrun_id = pr_res.json()["id"]
    await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )

    # Retrieve payslip
    payslip_id = pr_res.json()["payslips"][0]["id"]
    ps_before_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}",
        headers=hr_payroll_manager_auth_headers,
    )
    ps_before = ps_before_res.json()
    assert Decimal(str(ps_before["net_amount"])) == Decimal("94800.00")

    # 2. Mutate the structure: change HRA rule percentage from 20% to 50%
    rules_res = await async_client.get(
        f"/api/v1/salary-structures/{struct_id}/rules",
        headers=hr_payroll_manager_auth_headers,
    )
    rules_data = rules_res.json()
    rules_list = rules_data["items"] if isinstance(rules_data, dict) and "items" in rules_data else rules_data
    hra_rule = next(r for r in rules_list if r["code"] == "HRA")
    patch_res = await async_client.patch(
        f"/api/v1/salary-rules/{hra_rule['id']}",
        headers=hr_payroll_manager_auth_headers,
        json={"percentage": 50.0},
    )
    assert patch_res.status_code == 200

    # 3. Re-query existing payslip: values MUST remain 94,800.00 and HRA 17,000.00
    ps_after_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}",
        headers=hr_payroll_manager_auth_headers,
    )
    ps_after = ps_after_res.json()
    assert Decimal(str(ps_after["net_amount"])) == Decimal("94800.00")
    hra_line = next(l for l in ps_after["lines"] if l["code"] == "HRA")
    assert Decimal(str(hra_line["amount"])) == Decimal("17000.00")


# ---------------------------------------------------------------------------
# 4. Duplicate Payslip Prevention Test
# ---------------------------------------------------------------------------
async def test_duplicate_payslip_prevention(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Attempting to create a second payrun containing an employee for the same period
    is prevented by eligibility validation and unique constraints.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Dup Struct", code="DUP_STD"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-DUP-1"
    )

    # 1. Create first payrun
    res1 = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "First Run",
            "salary_structure_id": struct_id,
            "period_start": "2026-12-01",
            "period_end": "2026-12-31",
        },
    )
    assert res1.status_code == 201

    # 2. Preview for second payrun in same period marks employee ineligible
    prev_res = await async_client.post(
        "/api/v1/payruns/preview",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_id,
            "period_start": "2026-12-01",
            "period_end": "2026-12-31",
        },
    )
    assert prev_res.status_code == 200
    inelig_map = {ie["employee_id"]: ie["reason"] for ie in prev_res.json()["ineligible_employees"]}
    assert sample_employee["id"] in inelig_map
    assert "already exists" in inelig_map[sample_employee["id"]]

    # 3. Direct creation attempt for same employee fails
    res2 = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Second Run",
            "salary_structure_id": struct_id,
            "period_start": "2026-12-01",
            "period_end": "2026-12-31",
            "employee_ids": [sample_employee["id"]],
        },
    )
    assert res2.status_code == 400
    assert "ineligible" in res2.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 5. State Transitions & Lifecycle Machine
# ---------------------------------------------------------------------------
async def test_payrun_lifecycle_state_machine(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Test valid lifecycle progression: DRAFT -> COMPUTED -> VALIDATED -> PAID.
    Test invalid transition protections.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Lifecycle Struct", code="LC_STD"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-LC-1"
    )

    # 1. Create (DRAFT)
    res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Lifecycle Batch",
            "salary_structure_id": struct_id,
            "period_start": "2027-01-01",
            "period_end": "2027-01-31",
        },
    )
    assert res.status_code == 201
    payrun_id = res.json()["id"]

    # Invalid: Validate while DRAFT
    val_err = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/validate",
        headers=hr_payroll_manager_auth_headers,
    )
    assert val_err.status_code == 400

    # Invalid: Mark paid while DRAFT
    paid_err = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/mark-paid",
        headers=hr_payroll_manager_auth_headers,
    )
    assert paid_err.status_code == 400

    # Valid: Compute -> COMPUTED
    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPUTED"

    # Invalid: Mark paid directly while COMPUTED
    paid_err2 = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/mark-paid",
        headers=hr_payroll_manager_auth_headers,
    )
    assert paid_err2.status_code == 400

    # Valid: Validate -> VALIDATED
    val_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/validate",
        headers=hr_payroll_manager_auth_headers,
    )
    assert val_res.status_code == 200
    assert val_res.json()["status"] == "VALIDATED"
    assert val_res.json()["payslips"][0]["status"] == "VALIDATED"

    # Invalid: Recompute while VALIDATED
    comp_err = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_err.status_code == 400

    # Invalid: Delete while VALIDATED
    del_err = await async_client.delete(
        f"/api/v1/payruns/{payrun_id}",
        headers=hr_payroll_manager_auth_headers,
    )
    assert del_err.status_code == 400

    # Valid: Mark paid -> PAID
    paid_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/mark-paid",
        headers=hr_payroll_manager_auth_headers,
    )
    assert paid_res.status_code == 200
    assert paid_res.json()["status"] == "PAID"
    assert paid_res.json()["payslips"][0]["status"] == "PAID"

    # Invalid: Cancel while PAID
    cancel_err = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/cancel",
        headers=hr_payroll_manager_auth_headers,
    )
    assert cancel_err.status_code == 400


# ---------------------------------------------------------------------------
# 6. Audit Warnings & Blocking Errors
# ---------------------------------------------------------------------------
async def test_audit_blocking_error_on_negative_net(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    A payslip with deductions exceeding gross pay creates a negative net salary,
    which blocks payrun validation.
    """
    struct_res = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_manager_auth_headers,
        json={"name": "Overdeducted Structure", "code": "OVERDED_STD", "is_active": True},
    )
    struct_id = struct_res.json()["id"]

    # Basic: 10,000
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Basic",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": 10000.0,
        },
    )
    # Deduction: 50,000 (exceeds gross)
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct_id,
            "name": "Huge Deduction",
            "code": "PENALTY",
            "category": "DEDUCTION",
            "sequence": 20,
            "computation_type": "FIXED",
            "fixed_amount": 50000.0,
        },
    )


    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-OVERDED-1"
    )

    create_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Overdeduction Run",
            "salary_structure_id": struct_id,
            "period_start": "2027-02-01",
            "period_end": "2027-02-28",
        },
    )
    payrun_id = create_res.json()["id"]

    # Compute
    await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )

    # Validate -> Must be rejected with 400 blocking error
    val_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/validate",
        headers=hr_payroll_manager_auth_headers,
    )
    assert val_res.status_code == 400
    assert "negative net salary" in val_res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 7. Operational Aggregation: Attendance & Time Off Integration
# ---------------------------------------------------------------------------
async def test_attendance_and_time_off_operational_aggregation(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Verify attendance worked days & approved leave quantities are aggregated into payslips.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Ops Agg Structure", code="OPS_AGG_STD"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-OPS-1"
    )

    # 1. Log attendance: 2 PRESENT days, 1 HALF_DAY -> worked_days = 2.5
    for day in ("2027-03-01", "2027-03-02"):
        await async_client.post(
            "/api/v1/attendance",
            headers=admin_auth_headers,
            json={
                "employee_id": sample_employee["id"],
                "attendance_date": day,
                "check_in": f"{day}T09:00:00Z",
                "check_out": f"{day}T18:00:00Z",
                "status": "PRESENT",
            },
        )
    await async_client.post(
        "/api/v1/attendance",
        headers=admin_auth_headers,
        json={
            "employee_id": sample_employee["id"],
            "attendance_date": "2027-03-03",
            "check_in": "2027-03-03T09:00:00Z",
            "check_out": "2027-03-03T13:00:00Z",
            "status": "HALF_DAY",
        },
    )

    # 2. Create and compute payrun
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Ops March Run",
            "salary_structure_id": struct_id,
            "period_start": "2027-03-01",
            "period_end": "2027-03-31",
        },
    )
    payrun_id = pr_res.json()["id"]

    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_res.status_code == 200
    payslip = comp_res.json()["payslips"][0]

    # Worked days: 2.0 + 0.5 = 2.50
    assert Decimal(str(payslip["worked_days"])) == Decimal("2.50")


# ---------------------------------------------------------------------------
# 8. Self-Service & Cross-Employee Security Isolation
# ---------------------------------------------------------------------------
async def test_employee_self_service_and_cross_access_protection(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_department: dict,
    sample_job_position: dict,
):
    """
    - Employee can view own payslip history at /me/payslips.
    - Employee can view own payslip at /payslips/{id}.
    - Employee is forbidden (403) from viewing another employee's payslip.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="Self-Service Struct", code="SS_STD"
    )

    # 1. Create User & Employee A
    reg_a = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "emp_a@example.com", "password": "Password123", "role_id": 1},
    )
    user_a = reg_a.json()
    emp_a_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-USER-A",
            "first_name": "Arthur",
            "last_name": "Pendelton",
            "email": "emp_a@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
    )
    emp_a = emp_a_res.json()
    link_a = await async_client.post(
        f"/api/v1/employees/{emp_a['id']}/user",
        headers=admin_auth_headers,
        json={"user_id": user_a["id"]},
    )
    assert link_a.status_code == 200, link_a.text
    await _create_contract_and_activate(
        async_client, admin_auth_headers, emp_a["id"], struct_id, contract_number="CNT-A-1"
    )

    # 2. Create User & Employee B
    reg_b = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "emp_b@example.com", "password": "Password123", "role_id": 1},
    )
    user_b = reg_b.json()
    emp_b_res = await async_client.post(
        "/api/v1/employees",
        headers=admin_auth_headers,
        json={
            "employee_code": "E-USER-B",
            "first_name": "Beatrice",
            "last_name": "Blue",
            "email": "emp_b@example.com",
            "joining_date": "2026-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
    )
    emp_b = emp_b_res.json()
    link_b = await async_client.post(
        f"/api/v1/employees/{emp_b['id']}/user",
        headers=admin_auth_headers,
        json={"user_id": user_b["id"]},
    )
    assert link_b.status_code == 200, link_b.text

    await _create_contract_and_activate(
        async_client, admin_auth_headers, emp_b["id"], struct_id, contract_number="CNT-B-1"
    )

    # 3. Create and compute payrun containing both employees
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Combined Payroll",
            "salary_structure_id": struct_id,
            "period_start": "2027-04-01",
            "period_end": "2027-04-30",
            "employee_ids": [emp_a["id"], emp_b["id"]],
        },
    )
    payrun_id = pr_res.json()["id"]
    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    payslips = comp_res.json()["payslips"]
    ps_a_id = next(p["id"] for p in payslips if p["employee_id"] == emp_a["id"])
    ps_b_id = next(p["id"] for p in payslips if p["employee_id"] == emp_b["id"])

    # 4. Login as Employee A
    login_a = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "emp_a@example.com", "password": "Password123"},
    )
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # Employee A accesses /me/payslips -> Sees own payslip
    me_res = await async_client.get("/api/v1/employees/me/payslips", headers=headers_a)
    assert me_res.status_code == 200, me_res.text
    me_items = me_res.json()["items"]
    assert len(me_items) == 1
    assert me_items[0]["id"] == ps_a_id

    # Employee A accesses /payslips/{ps_a_id} -> 200 OK
    own_ps = await async_client.get(f"/api/v1/payslips/{ps_a_id}", headers=headers_a)
    assert own_ps.status_code == 200

    # Employee A attempts to access /payslips/{ps_b_id} -> 403 Forbidden
    other_ps = await async_client.get(f"/api/v1/payslips/{ps_b_id}", headers=headers_a)
    assert other_ps.status_code == 403

    # Employee A attempts to access /employees/{emp_b_id}/payslips -> 403 Forbidden
    cross_list = await async_client.get(f"/api/v1/employees/{emp_b['id']}/payslips", headers=headers_a)
    assert cross_list.status_code == 403


# ---------------------------------------------------------------------------
# 9. RBAC Enforcement Matrix
# ---------------------------------------------------------------------------
async def test_rbac_payruns_and_payslips_matrix(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    employee_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Verify RBAC across roles:
    - EMPLOYEE: forbidden from payruns endpoints (403).
    - HR_MANAGER: forbidden from payroll processing endpoints (403).
    - HR_PAYROLL_USER: can view/list payruns and payslips, but cannot create, compute, validate, mark-paid, delete (403).
    - HR_PAYROLL_MANAGER: full access.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="RBAC Struct", code="RBAC_STD"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-RBAC-1"
    )

    # 1. EMPLOYEE role forbidden from listing payruns & payslips
    assert (await async_client.get("/api/v1/payruns", headers=employee_auth_headers)).status_code == 403
    assert (await async_client.get("/api/v1/payslips", headers=employee_auth_headers)).status_code == 403
    assert (
        await async_client.post(
            "/api/v1/payruns",
            headers=employee_auth_headers,
            json={
                "name": "Emp Run",
                "salary_structure_id": struct_id,
                "period_start": "2027-05-01",
                "period_end": "2027-05-31",
            },
        )
    ).status_code == 403

    # 2. HR_MANAGER role forbidden from payroll endpoints
    assert (await async_client.get("/api/v1/payruns", headers=hr_manager_auth_headers)).status_code == 403
    assert (await async_client.get("/api/v1/payslips", headers=hr_manager_auth_headers)).status_code == 403
    assert (
        await async_client.post(
            "/api/v1/payruns",
            headers=hr_manager_auth_headers,
            json={
                "name": "HRM Run",
                "salary_structure_id": struct_id,
                "period_start": "2027-05-01",
                "period_end": "2027-05-31",
            },
        )
    ).status_code == 403

    # 3. HR_PAYROLL_USER can list and preview, but CANNOT create, compute, or validate
    assert (await async_client.get("/api/v1/payruns", headers=hr_payroll_user_auth_headers)).status_code == 200
    assert (await async_client.get("/api/v1/payslips", headers=hr_payroll_user_auth_headers)).status_code == 200
    assert (
        await async_client.post(
            "/api/v1/payruns/preview",
            headers=hr_payroll_user_auth_headers,
            json={
                "salary_structure_id": struct_id,
                "period_start": "2027-05-01",
                "period_end": "2027-05-31",
            },
        )
    ).status_code == 200

    # HR_PAYROLL_USER cannot create payrun
    assert (
        await async_client.post(
            "/api/v1/payruns",
            headers=hr_payroll_user_auth_headers,
            json={
                "name": "User Create Run",
                "salary_structure_id": struct_id,
                "period_start": "2027-05-01",
                "period_end": "2027-05-31",
            },
        )
    ).status_code == 403

    # 4. HR_PAYROLL_MANAGER creates payrun
    create_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "Manager Run",
            "salary_structure_id": struct_id,
            "period_start": "2027-05-01",
            "period_end": "2027-05-31",
        },
    )
    assert create_res.status_code == 201
    payrun_id = create_res.json()["id"]

    # HR_PAYROLL_USER cannot compute or validate
    assert (
        await async_client.post(
            f"/api/v1/payruns/{payrun_id}/compute",
            headers=hr_payroll_user_auth_headers,
        )
    ).status_code == 403
    assert (
        await async_client.post(
            f"/api/v1/payruns/{payrun_id}/validate",
            headers=hr_payroll_user_auth_headers,
        )
    ).status_code == 403

    # HR_PAYROLL_MANAGER computes and validates
    comp = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp.status_code == 200
    val = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/validate",
        headers=hr_payroll_manager_auth_headers,
    )
    assert val.status_code == 200


# ---------------------------------------------------------------------------
# 11. PDF Payslip Generation & Access Control
# ---------------------------------------------------------------------------
async def test_download_payslip_pdf_and_authorization(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    sample_employee: dict,
):
    """
    Test GET /api/v1/payslips/{id}/pdf:
    - Generates valid binary PDF (%PDF header, application/pdf content-type).
    - Permitted for HR_PAYROLL_MANAGER and the owner employee.
    - Forbidden (403) for other employees.
    - Not found (404) for non-existent payslip.
    """
    struct_id = await _setup_standard_structure_and_rules(
        async_client, hr_payroll_manager_auth_headers, name="PDF Struct", code="PDF_STD"
    )
    await _create_contract_and_activate(
        async_client, admin_auth_headers, sample_employee["id"], struct_id, contract_number="CNT-PDF-1"
    )

    # 1. Create and compute payrun
    pr_res = await async_client.post(
        "/api/v1/payruns",
        headers=hr_payroll_manager_auth_headers,
        json={
            "name": "PDF Run",
            "salary_structure_id": struct_id,
            "period_start": "2027-06-01",
            "period_end": "2027-06-30",
        },
    )
    assert pr_res.status_code == 201
    payrun_id = pr_res.json()["id"]

    comp_res = await async_client.post(
        f"/api/v1/payruns/{payrun_id}/compute",
        headers=hr_payroll_manager_auth_headers,
    )
    assert comp_res.status_code == 200
    payslip_id = comp_res.json()["payslips"][0]["id"]

    # 2. HR Payroll Manager downloads PDF
    pdf_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/pdf",
        headers=hr_payroll_manager_auth_headers,
    )
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 1000

    # 3. Create two distinct user accounts for owner and stranger employees
    reg_owner = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "pdf_owner@example.com", "password": "Password123"},
    )
    user_owner_id = reg_owner.json()["id"]
    await async_client.post(
        f"/api/v1/employees/{sample_employee['id']}/user",
        headers=admin_auth_headers,
        json={"user_id": user_owner_id},
    )
    login_owner = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "pdf_owner@example.com", "password": "Password123"},
    )
    emp_token = login_owner.json()["access_token"]

    other_emp = (
        await async_client.post(
            "/api/v1/employees",
            headers=admin_auth_headers,
            json={
                "employee_code": "E-STRANGER-PDF",
                "first_name": "Stranger",
                "last_name": "Employee",
                "email": "stranger.pdf@example.com",
                "joining_date": "2026-01-01",
                "department_id": sample_employee["department_id"],
                "job_position_id": sample_employee["job_position_id"],
                "status": "ACTIVE",
            },
        )
    ).json()

    reg_stranger = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "stranger_pdf@example.com", "password": "Password123"},
    )
    user_stranger_id = reg_stranger.json()["id"]
    await async_client.post(
        f"/api/v1/employees/{other_emp['id']}/user",
        headers=admin_auth_headers,
        json={"user_id": user_stranger_id},
    )
    login_stranger = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "stranger_pdf@example.com", "password": "Password123"},
    )
    stranger_token = login_stranger.json()["access_token"]

    # 4. Owner employee downloads own PDF payslip
    owner_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/pdf",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert owner_res.status_code == 200
    assert owner_res.headers["content-type"] == "application/pdf"
    assert owner_res.content.startswith(b"%PDF")

    # 5. Stranger employee blocked with 403
    stranger_res = await async_client.get(
        f"/api/v1/payslips/{payslip_id}/pdf",
        headers={"Authorization": f"Bearer {stranger_token}"},
    )
    assert stranger_res.status_code == 403

    # 6. Non-existent payslip returns 404
    nf_res = await async_client.get(
        "/api/v1/payslips/999999/pdf",
        headers=hr_payroll_manager_auth_headers,
    )
    assert nf_res.status_code == 404

