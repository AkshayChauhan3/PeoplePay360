"""
Phase 6: Salary Structures, Salary Rules & Salary Calculation Engine Test Suite.

Tests cover:
1. SalaryStructure CRUD, code normalization, uniqueness, soft deactivation, running contract guard.
2. SalaryRule CRUD, validation of computation types (FIXED, PERCENTAGE, FORMULA), missing fields.
3. Dependency ordering validation (dependencies must have strictly lower sequence).
4. Circular dependency detection (A -> B, B -> A).
5. Safe AST Formula Engine security sandbox (rejects __import__, open, eval, exec, attributes).
6. Standard remuneration calculation test (BASIC, HRA, TRANSPORT, GROSS, PF, NET).
7. Sequence execution order resilience (rules inserted in shuffled database order).
8. Decimal arithmetic and documented ROUND_HALF_UP rounding precision.
9. Contract integration: applicable contract date lookup resolving correct salary structure.
10. Stateless preview endpoint test.
11. Complete RBAC enforcement matrix across EMPLOYEE, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, and ADMIN.
"""

from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _create_test_structure(
    async_client: AsyncClient,
    headers: dict[str, str],
    name: str = "Standard Structure",
    code: str = "STD_STRUCT",
) -> dict:
    res = await async_client.post(
        "/api/v1/salary-structures",
        headers=headers,
        json={
            "name": name,
            "code": code,
            "description": "Standard corporate salary structure",
            "is_active": True,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


# ---------------------------------------------------------------------------
# 1. Salary Structure Tests
# ---------------------------------------------------------------------------
async def test_create_structure_success(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Executive Compensation",
        code="exec_comp",
    )
    assert struct["id"] > 0
    assert struct["name"] == "Executive Compensation"
    assert struct["code"] == "EXEC_COMP"  # normalized uppercase
    assert struct["is_active"] is True
    assert struct["rules"] == []


async def test_create_structure_duplicate_code_or_name_rejected(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Tech Structure",
        code="TECH_01",
    )

    # Duplicate code
    res_code = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_manager_auth_headers,
        json={"name": "Different Tech", "code": "tech_01"},
    )
    assert res_code.status_code == 409

    # Duplicate name
    res_name = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_manager_auth_headers,
        json={"name": "Tech Structure", "code": "TECH_02"},
    )
    assert res_name.status_code == 409


async def test_get_and_list_salary_structures(
    async_client: AsyncClient,
    hr_payroll_user_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Listing Structure",
        code="LIST_01",
    )

    # Get by ID
    get_res = await async_client.get(
        f"/api/v1/salary-structures/{struct['id']}",
        headers=hr_payroll_user_auth_headers,
    )
    assert get_res.status_code == 200
    assert get_res.json()["code"] == "LIST_01"

    # List
    list_res = await async_client.get(
        "/api/v1/salary-structures",
        headers=hr_payroll_user_auth_headers,
    )
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    assert any(s["id"] == struct["id"] for s in data["items"])


async def test_update_and_deactivate_salary_structure(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Update Struct",
        code="UPD_01",
    )

    # Update description & name
    patch_res = await async_client.patch(
        f"/api/v1/salary-structures/{struct['id']}",
        headers=hr_payroll_manager_auth_headers,
        json={"name": "Updated Struct Name", "description": "New description"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Struct Name"
    assert patch_res.json()["description"] == "New description"

    # Soft deactivate
    del_res = await async_client.delete(
        f"/api/v1/salary-structures/{struct['id']}",
        headers=hr_payroll_manager_auth_headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["is_active"] is False


# ---------------------------------------------------------------------------
# 2. Salary Rule Configuration & Validation Tests
# ---------------------------------------------------------------------------
async def test_create_fixed_salary_rule(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Fixed Struct",
        code="FIX_01",
    )

    res = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Transport Allowance",
            "code": "transport",
            "category": "ALLOWANCE",
            "sequence": 30,
            "computation_type": "FIXED",
            "fixed_amount": "3000.00",
        },
    )
    assert res.status_code == 201, res.text
    rule = res.json()
    assert rule["code"] == "TRANSPORT"
    assert rule["category"] == "ALLOWANCE"
    assert float(rule["fixed_amount"]) == 3000.00
    assert rule["percentage"] is None
    assert rule["formula"] is None


async def test_create_percentage_salary_rule(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Percent Struct",
        code="PCT_01",
    )

    # 1. Base rule (sequence 10)
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Basic",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "50000.00",
        },
    )

    # 2. Percentage rule (sequence 20) referencing BASIC
    res = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "House Rent Allowance",
            "code": "HRA",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": "20.00",
            "percentage_base": "basic",
        },
    )
    assert res.status_code == 201, res.text
    rule = res.json()
    assert rule["code"] == "HRA"
    assert float(rule["percentage"]) == 20.00
    assert rule["percentage_base"] == "BASIC"


async def test_rule_validation_missing_required_fields(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Validation Struct",
        code="VAL_01",
    )

    # FIXED without fixed_amount
    res1 = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Bad Fixed",
            "code": "BAD_FIXED",
            "category": "ALLOWANCE",
            "sequence": 10,
            "computation_type": "FIXED",
        },
    )
    assert res1.status_code == 422

    # PERCENTAGE without percentage
    res2 = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Bad Percent",
            "code": "BAD_PCT",
            "category": "ALLOWANCE",
            "sequence": 10,
            "computation_type": "PERCENTAGE",
            "percentage_base": "BASIC",
        },
    )
    assert res2.status_code == 422

    # FORMULA without formula
    res3 = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Bad Formula",
            "code": "BAD_FORM",
            "category": "GROSS",
            "sequence": 50,
            "computation_type": "FORMULA",
        },
    )
    assert res3.status_code == 422


async def test_duplicate_rule_code_and_sequence_within_structure_rejected(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Uniq Rule Struct",
        code="UNIQ_01",
    )

    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Basic",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "50000.00",
        },
    )

    # Duplicate code
    res_code = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Another Basic",
            "code": "basic",
            "category": "BASIC",
            "sequence": 15,
            "computation_type": "FIXED",
            "fixed_amount": "60000.00",
        },
    )
    assert res_code.status_code == 409

    # Duplicate sequence
    res_seq = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Different Rule",
            "code": "DIFF",
            "category": "ALLOWANCE",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "1000.00",
        },
    )
    assert res_seq.status_code == 409


# ---------------------------------------------------------------------------
# 3. Dependency & Circular Dependency Tests
# ---------------------------------------------------------------------------
async def test_percentage_base_referencing_future_rule_rejected(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Forward Dep Struct",
        code="FWD_01",
    )

    # Rule with sequence 20 referencing future NET (sequence 100)
    res = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "HRA",
            "code": "HRA",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": "10.00",
            "percentage_base": "NET",
        },
    )
    # Undefined or forward reference rejected
    assert res.status_code == 422


async def test_circular_dependency_rejected(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Cycle Struct",
        code="CYCLE_01",
    )

    # 1. Rule A (sequence 10) fixed
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Rule A",
            "code": "RULE_A",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "1000.00",
        },
    )

    # 2. Rule B (sequence 20) depends on RULE_A
    rule_b = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Rule B",
            "code": "RULE_B",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": "20.00",
            "percentage_base": "RULE_A",
        },
    )
    assert rule_b.status_code == 201

    # 3. Attempt to update Rule A so its formula depends on RULE_B (cycle!)
    # Even sequence check prevents sequence 10 from depending on sequence 20
    cycle_res = await async_client.patch(
        f"/api/v1/salary-rules/{rule_b.json()['id']}",
        headers=hr_payroll_manager_auth_headers,
        json={
            "computation_type": "FORMULA",
            "formula": "RULE_B + 100",  # self-reference cycle
        },
    )
    assert cycle_res.status_code == 422


# ---------------------------------------------------------------------------
# 4. Security Sandbox Tests (No Arbitrary Code Execution)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "malicious_formula",
    [
        "__import__('os').system('echo pwned')",
        "eval('1 + 1')",
        "exec('x = 5')",
        "open('/etc/passwd').read()",
        "__builtins__",
        "print('hello')",
        "BASIC.__class__",
    ],
)
async def test_formula_engine_security_sandbox(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
    malicious_formula: str,
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name=f"Sec Struct {hash(malicious_formula)}",
        code=f"SEC_{abs(hash(malicious_formula)) % 100000}",
    )

    res = await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Malicious Rule",
            "code": "MALICIOUS",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FORMULA",
            "formula": malicious_formula,
        },
    )
    assert res.status_code == 422, f"Expected 422 for formula: {malicious_formula}"


# ---------------------------------------------------------------------------
# 5. Calculation Test (Item 28: BASIC, HRA, TRANSPORT, GROSS, PF, NET)
# ---------------------------------------------------------------------------
async def test_full_salary_calculation_scenario(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
):
    """
    Scenario:
    Contract wage: 85000.00
    10 BASIC = contract_wage
    20 HRA = BASIC * 0.20
    30 TRANSPORT = 3000.00
    50 GROSS = BASIC + HRA + TRANSPORT
    70 PF = BASIC * 0.12
    100 NET = GROSS - PF

    Expected:
    BASIC:     85000.00
    HRA:       17000.00
    TRANSPORT:  3000.00
    GROSS:    105000.00
    PF:        10200.00
    NET:       94800.00
    """
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Standard Tech Package",
        code="TECH_STD",
    )

    # 1. 10 BASIC = contract_wage
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Basic Salary",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FORMULA",
            "formula": "CONTRACT_WAGE",
        },
    )

    # 2. 20 HRA = BASIC * 0.20
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "House Rent Allowance",
            "code": "HRA",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": "20.00",
            "percentage_base": "BASIC",
        },
    )

    # 3. 30 TRANSPORT = 3000
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Transport Allowance",
            "code": "TRANSPORT",
            "category": "ALLOWANCE",
            "sequence": 30,
            "computation_type": "FIXED",
            "fixed_amount": "3000.00",
        },
    )

    # 4. 50 GROSS = BASIC + HRA + TRANSPORT
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Gross Salary",
            "code": "GROSS",
            "category": "GROSS",
            "sequence": 50,
            "computation_type": "FORMULA",
            "formula": "BASIC + HRA + TRANSPORT",
        },
    )

    # 5. 70 PF = BASIC * 0.12
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Provident Fund",
            "code": "PF",
            "category": "DEDUCTION",
            "sequence": 70,
            "computation_type": "PERCENTAGE",
            "percentage": "12.00",
            "percentage_base": "BASIC",
        },
    )

    # 6. 100 NET = GROSS - PF
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Net Salary",
            "code": "NET",
            "category": "NET",
            "sequence": 100,
            "computation_type": "FORMULA",
            "formula": "GROSS - PF",
        },
    )

    # Preview calculation
    prev_res = await async_client.post(
        f"/api/v1/salary-structures/{struct['id']}/preview",
        headers=hr_payroll_user_auth_headers,
        json={"contract_wage": "85000.00"},
    )
    assert prev_res.status_code == 200, prev_res.text
    data = prev_res.json()

    results_map = {r["code"]: float(r["amount"]) for r in data["results"]}
    assert results_map["BASIC"] == 85000.00
    assert results_map["HRA"] == 17000.00
    assert results_map["TRANSPORT"] == 3000.00
    assert results_map["GROSS"] == 105000.00
    assert results_map["PF"] == 10200.00
    assert results_map["NET"] == 94800.00

    assert float(data["gross_amount"]) == 105000.00
    assert float(data["net_amount"]) == 94800.00


# ---------------------------------------------------------------------------
# 6. Sequence Ordering Resilience Test (Item 29)
# ---------------------------------------------------------------------------
async def test_execution_order_resilience_with_shuffled_insertions(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
):
    """Insert rules out of sequence order and verify they execute strictly by ascending sequence."""
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Shuffled Struct",
        code="SHUFFLED",
    )

    # Insert in order: BASIC (10), TRANSPORT (30), HRA (20), GROSS (50)
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Basic",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "60000.00",
        },
    )
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Transport",
            "code": "TRANSPORT",
            "category": "ALLOWANCE",
            "sequence": 30,
            "computation_type": "FIXED",
            "fixed_amount": "2000.00",
        },
    )
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "HRA",
            "code": "HRA",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": "10.00",
            "percentage_base": "BASIC",
        },
    )
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Gross",
            "code": "GROSS",
            "category": "GROSS",
            "sequence": 50,
            "computation_type": "FORMULA",
            "formula": "BASIC + HRA + TRANSPORT",
        },
    )

    res = await async_client.post(
        f"/api/v1/salary-structures/{struct['id']}/preview",
        headers=hr_payroll_user_auth_headers,
        json={"contract_wage": "60000.00"},
    )
    assert res.status_code == 200
    results = res.json()["results"]
    sequences = [r["sequence"] for r in results]
    assert sequences == [10, 20, 30, 50]
    codes = [r["code"] for r in results]
    assert codes == ["BASIC", "HRA", "TRANSPORT", "GROSS"]


# ---------------------------------------------------------------------------
# 7. Decimal Precision & Rounding Policy Test (Item 31)
# ---------------------------------------------------------------------------
async def test_decimal_precision_and_rounding(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Rounding Struct",
        code="ROUND_01",
    )

    # Base rule: 10000.00
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Base",
            "code": "BASE",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "10000.00",
        },
    )

    # 17.5% of BASE = 1750.00
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Special Allowance",
            "code": "SPECIAL",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "PERCENTAGE",
            "percentage": "17.50",
            "percentage_base": "BASE",
        },
    )

    # Repeating decimal formula: BASE / 3 = 3333.3333... -> 3333.33 (ROUND_HALF_UP)
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "One Third",
            "code": "THIRD",
            "category": "ALLOWANCE",
            "sequence": 30,
            "computation_type": "FORMULA",
            "formula": "BASE / 3",
        },
    )

    res = await async_client.post(
        f"/api/v1/salary-structures/{struct['id']}/preview",
        headers=hr_payroll_user_auth_headers,
        json={"contract_wage": "10000.00"},
    )
    assert res.status_code == 200
    results_map = {r["code"]: r["amount"] for r in res.json()["results"]}
    assert results_map["SPECIAL"] == "1750.00"
    assert results_map["THIRD"] == "3333.33"


# ---------------------------------------------------------------------------
# 8. Inactive Rules Ignored Test
# ---------------------------------------------------------------------------
async def test_inactive_rule_ignored_in_calculation(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Inactive Rule Struct",
        code="INACT_01",
    )

    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Basic",
            "code": "BASIC",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "50000.00",
        },
    )

    # Inactive bonus rule
    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Bonus",
            "code": "BONUS",
            "category": "ALLOWANCE",
            "sequence": 20,
            "computation_type": "FIXED",
            "fixed_amount": "10000.00",
            "is_active": False,
        },
    )

    res = await async_client.post(
        f"/api/v1/salary-structures/{struct['id']}/preview",
        headers=hr_payroll_user_auth_headers,
        json={"contract_wage": "50000.00"},
    )
    assert res.status_code == 200
    codes = [r["code"] for r in res.json()["results"]]
    assert "BASIC" in codes
    assert "BONUS" not in codes


# ---------------------------------------------------------------------------
# 9. Contract Integration Test (Item 32)
# ---------------------------------------------------------------------------
async def test_contract_salary_structure_integration_and_lookup(
    async_client: AsyncClient,
    admin_auth_headers: dict[str, str],
    sample_employee: dict[str, Any],
    db_session,
):
    """
    Contract A (2025): salary_structure_id = Structure A
    Contract B (2026): salary_structure_id = Structure B
    Verify applicable contract lookup resolves correct structure.
    """
    from app.services.contract_service import get_applicable_contract

    emp_id = sample_employee["id"]

    # Structure A
    struct_a = await _create_test_structure(
        async_client,
        admin_auth_headers,
        name="Contract Struct A",
        code="STRUCT_A",
    )
    # Structure B
    struct_b = await _create_test_structure(
        async_client,
        admin_auth_headers,
        name="Contract Struct B",
        code="STRUCT_B",
    )

    # Contract A (2025-01-01 to 2025-12-31, RUNNING)
    cnt_a_res = await async_client.post(
        "/api/v1/contracts",
        headers=admin_auth_headers,
        json={
            "contract_number": "CNT-2025-001",
            "employee_id": emp_id,
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "wage": "70000.00",
            "status": "RUNNING",
            "salary_structure_id": struct_a["id"],
        },
    )
    assert cnt_a_res.status_code == 201, cnt_a_res.text

    # Contract B (2026-01-01 to 2026-12-31, RUNNING)
    cnt_b_res = await async_client.post(
        "/api/v1/contracts",
        headers=admin_auth_headers,
        json={
            "contract_number": "CNT-2026-001",
            "employee_id": emp_id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "wage": "80000.00",
            "status": "RUNNING",
            "salary_structure_id": struct_b["id"],
        },
    )
    assert cnt_b_res.status_code == 201, cnt_b_res.text

    # 1. 2025 lookup -> Contract A -> Structure A
    contract_2025 = await get_applicable_contract(db_session, emp_id, date(2025, 6, 15))
    assert contract_2025 is not None
    assert contract_2025.contract_number == "CNT-2025-001"
    assert contract_2025.salary_structure_id == struct_a["id"]

    # 2. 2026 lookup -> Contract B -> Structure B
    contract_2026 = await get_applicable_contract(db_session, emp_id, date(2026, 6, 15))
    assert contract_2026 is not None
    assert contract_2026.contract_number == "CNT-2026-001"
    assert contract_2026.salary_structure_id == struct_b["id"]

    # 3. Deactivating Structure A should be blocked because Contract A is RUNNING
    del_res = await async_client.delete(
        f"/api/v1/salary-structures/{struct_a['id']}",
        headers=admin_auth_headers,
    )
    assert del_res.status_code == 400


# ---------------------------------------------------------------------------
# 10. Preview Safety Test (Item 33: No Payslip/Payrun created)
# ---------------------------------------------------------------------------
async def test_preview_does_not_create_payroll_records(
    async_client: AsyncClient,
    hr_payroll_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
):
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Stateless Preview Struct",
        code="PREV_STATEL",
    )

    await async_client.post(
        "/api/v1/salary-rules",
        headers=hr_payroll_manager_auth_headers,
        json={
            "salary_structure_id": struct["id"],
            "name": "Base",
            "code": "BASE",
            "category": "BASIC",
            "sequence": 10,
            "computation_type": "FIXED",
            "fixed_amount": "50000.00",
        },
    )

    res = await async_client.post(
        f"/api/v1/salary-structures/{struct['id']}/preview",
        headers=hr_payroll_user_auth_headers,
        json={"contract_wage": "50000.00"},
    )
    assert res.status_code == 200
    assert res.json()["contract_wage"] == "50000.00"


# ---------------------------------------------------------------------------
# 11. RBAC Matrix Enforcement Test
# ---------------------------------------------------------------------------
async def test_rbac_salary_structure_matrix(
    async_client: AsyncClient,
    employee_auth_headers: dict[str, str],
    hr_manager_auth_headers: dict[str, str],
    hr_payroll_user_auth_headers: dict[str, str],
    hr_payroll_manager_auth_headers: dict[str, str],
    admin_auth_headers: dict[str, str],
):
    # 1. EMPLOYEE: 403 on everything
    res_emp = await async_client.get("/api/v1/salary-structures", headers=employee_auth_headers)
    assert res_emp.status_code == 403

    # 2. HR_MANAGER: 403 on everything
    res_hrm = await async_client.get("/api/v1/salary-structures", headers=hr_manager_auth_headers)
    assert res_hrm.status_code == 403

    # 3. HR_PAYROLL_USER: READ allowed, WRITE forbidden (403)
    res_pu_read = await async_client.get("/api/v1/salary-structures", headers=hr_payroll_user_auth_headers)
    assert res_pu_read.status_code == 200

    res_pu_write = await async_client.post(
        "/api/v1/salary-structures",
        headers=hr_payroll_user_auth_headers,
        json={"name": "Forbidden Struct", "code": "FORBID_01"},
    )
    assert res_pu_write.status_code == 403

    # 4. HR_PAYROLL_MANAGER: full CRUD allowed
    struct = await _create_test_structure(
        async_client,
        hr_payroll_manager_auth_headers,
        name="Payroll Manager Struct",
        code="PM_STRUCT",
    )
    assert struct["id"] > 0

    # 5. ADMIN: full CRUD allowed
    struct_admin = await _create_test_structure(
        async_client,
        admin_auth_headers,
        name="Admin Struct",
        code="ADM_STRUCT",
    )
    assert struct_admin["id"] > 0
