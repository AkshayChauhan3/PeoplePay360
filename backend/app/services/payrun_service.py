from datetime import date
from decimal import Decimal
from typing import Any

from app.services.salary_engine import compute_salary_line
from app.services.leave_service import calculate_working_days_in_period


class PayrunError(Exception):
    """Raised when payrun rules, dates, or state transitions are violated."""
    pass


class PayrunStatus:
    DRAFT = "DRAFT"
    COMPUTED = "COMPUTED"
    VALIDATED = "VALIDATED"  # Frozen / Immutable
    PAID = "PAID"


# ---------------------------------------------------------------------------
# Step 1 Wizard: Preview Eligible Employees (Zero database writes)
# ---------------------------------------------------------------------------

def preview_eligible_employees(
    employees: list[dict[str, Any]],
    start_date: date,
    end_date: date,
) -> list[dict[str, Any]]:
    """
    Step 1 of Payrun creation:
    Inspects which employees have active contracts covering the selected period.
    Pure read-only operation — creates ZERO database records.
    """
    if end_date < start_date:
        raise PayrunError("Payrun end date cannot precede start date.")

    scheduled_days = calculate_working_days_in_period(start_date, end_date)
    eligible_list = []

    for emp in employees:
        contract = emp.get("active_contract")
        if not contract:
            continue  # Exclude employees without an active contract

        contract_start = contract["start_date"]
        contract_end = contract.get("end_date")

        if contract_start <= start_date and (contract_end is None or contract_end >= end_date):
            eligible_list.append({
                "employee_id": emp["id"],
                "name": emp["name"],
                "employee_code": emp.get("code"),
                "department": emp.get("department_name"),
                "contract_wage": Decimal(str(contract["wage"])),
                "scheduled_days": scheduled_days,
            })

    return eligible_list


# ---------------------------------------------------------------------------
# Step 2 Wizard: Compute Single Employee Payslip
# ---------------------------------------------------------------------------

def compute_employee_payslip(
    employee_id: str,
    contract_wage: Decimal,
    start_date: date,
    end_date: date,
    salary_rules: list[dict[str, Any]],
    unpaid_leave_days: int = 0,
    working_days_set: set[str] | None = None,
) -> dict[str, Any]:
    """
    Computes all salary lines and net take-home pay for one employee.

    1. Calculates total scheduled working days in the month.
    2. Subtracts approved unpaid leave to get payable days.
    3. Feeds payable days into the AST formula engine for each rule.
    """
    scheduled_days = calculate_working_days_in_period(start_date, end_date, working_days_set)
    if scheduled_days <= 0:
        raise PayrunError("Payrun period contains zero scheduled working days.")

    payable_days = max(0, scheduled_days - unpaid_leave_days)

    # Context available for formula expressions
    context: dict[str, Decimal] = {
        "contract_wage": contract_wage,
        "scheduled_days": Decimal(str(scheduled_days)),
        "payable_days": Decimal(str(payable_days)),
        "unpaid_leave_days": Decimal(str(unpaid_leave_days)),
    }

    computed_lines: list[dict[str, Any]] = []

    # Process rules in ascending order (Sequence 10: BASIC, 20: HRA, etc.)
    sorted_rules = sorted(salary_rules, key=lambda r: r.get("sequence", 0))

    for rule in sorted_rules:
        code = rule["code"]
        method = rule["method"]  # 'FIXED', 'PERCENTAGE', 'FORMULA'

        amount = compute_salary_line(
            rule_code=code,
            method=method,
            amount=Decimal(str(rule["amount"])) if rule.get("amount") is not None else None,
            percentage_base=rule.get("percentage_base"),
            percentage_rate=Decimal(str(rule["percentage_rate"]))
            if rule.get("percentage_rate") is not None
            else None,
            formula_expression=rule.get("formula_expression"),
            context=context,
        )

        context[code] = amount

        computed_lines.append({
            "code": code,
            "name": rule["name"],
            "category": rule.get("category", "OTHER"),
            "sequence": rule.get("sequence", 0),
            "amount": amount,
        })

    gross_pay = context.get("GROSS", Decimal("0.00"))
    net_pay = context.get("NET", Decimal("0.00"))

    return {
        "employee_id": employee_id,
        "scheduled_days": scheduled_days,
        "payable_days": payable_days,
        "unpaid_leave_days": unpaid_leave_days,
        "gross_pay": gross_pay,
        "net_pay": net_pay,
        "lines": computed_lines,
    }


# ---------------------------------------------------------------------------
# State Transitions & Immutability Locks
# ---------------------------------------------------------------------------

def validate_payrun_transition(current_status: str, target_status: str) -> None:
    """
    Enforces the state lifecycle: DRAFT -> COMPUTED -> VALIDATED -> PAID.
    Locks the payrun so validated records can never be altered or recomputed.
    """
    valid_transitions = {
        PayrunStatus.DRAFT: {PayrunStatus.COMPUTED},
        PayrunStatus.COMPUTED: {PayrunStatus.VALIDATED, PayrunStatus.DRAFT},
        PayrunStatus.VALIDATED: {PayrunStatus.PAID},
        PayrunStatus.PAID: set(),  # Terminal state: permanently locked
    }

    allowed = valid_transitions.get(current_status, set())
    if target_status not in allowed:
        raise PayrunError(
            f"Illegal state transition from '{current_status}' to '{target_status}'. "
            f"Validated and Paid payruns are permanently locked."
        )
