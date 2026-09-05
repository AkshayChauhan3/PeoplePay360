"""
Payroll Processing Service — PeoplePay360

Orchestrates:
- Employee payroll eligibility checks and wizard preview discovery.
- Aggregation of operational metrics (worked days/minutes, overtime, approved leaves).
- Execution of the SalaryRuleEngine against CalculationContext.
- Creation of immutable PayslipLine historical snapshots.
- Payrun audit warnings and blocking error validations.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.attendance import Attendance, AttendanceStatus
from app.models.contract import Contract, ContractStatus
from app.models.employee import Employee, EmployeeStatus
from app.models.payrun import Payrun
from app.models.payslip import Payslip, PayslipStatus
from app.models.payslip_line import PayslipLine
from app.models.salary_rule import SalaryRuleCategory
from app.models.salary_structure import SalaryStructure
from app.models.time_off import TimeOffRequest, TimeOffRequestStatus, TimeOffUnit
from app.schemas.payrun import (
    EligibleEmployeeItem,
    IneligibleEmployeeItem,
    PayrollWarningItem,
    PayrunPreviewResponse,
)
from app.services.contract_service import get_applicable_contract
from app.services.salary_rule_engine import (
    CalculationContext,
    SalaryRuleEngine,
    round_currency,
)


async def check_employee_payroll_eligibility(
    db: AsyncSession,
    employee: Employee,
    period_start: date,
    period_end: date,
    expected_structure_id: int,
) -> tuple[bool, str | None, Contract | None]:
    """
    Evaluate eligibility of an individual employee for a specific payrun period & salary structure.

    Returns:
        (is_eligible, reason_if_ineligible, contract_if_found)
    """
    # 1. Employee must be active
    if employee.status != EmployeeStatus.ACTIVE:
        return False, "Employee is INACTIVE", None

    # 2. Must have a RUNNING contract covering the payroll period
    contract = await get_applicable_contract(db, employee.id, target_date=period_end)
    if not contract:
        return False, "No running contract covering period", None

    # 3. Contract must match the target Salary Structure
    if contract.salary_structure_id != expected_structure_id:
        return False, "Contract salary structure does not match payrun structure", contract

    # 4. Prevent duplicate payslip for the same period
    payslip_query = select(Payslip.id).where(
        Payslip.employee_id == employee.id,
        Payslip.period_start == period_start,
        Payslip.period_end == period_end,
        Payslip.status != PayslipStatus.CANCELLED,
    )
    result = await db.execute(payslip_query)
    if result.scalar_one_or_none() is not None:
        return False, "Payslip already exists for this period", contract

    return True, None, contract


async def aggregate_employee_attendance(
    db: AsyncSession,
    employee_id: int,
    period_start: date,
    period_end: date,
) -> tuple[Decimal, int, int]:
    """
    Aggregate attendance records for an employee within [period_start, period_end].

    Returns:
        (worked_days, worked_minutes, overtime_minutes)
    """
    query = select(Attendance).where(
        Attendance.employee_id == employee_id,
        Attendance.attendance_date >= period_start,
        Attendance.attendance_date <= period_end,
    )

    result = await db.execute(query)
    records = list(result.scalars().all())

    worked_days = Decimal("0.00")
    worked_minutes = 0
    overtime_minutes = 0

    for rec in records:
        if rec.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE):
            worked_days += Decimal("1.00")
        elif rec.status == AttendanceStatus.HALF_DAY:
            worked_days += Decimal("0.50")

        worked_minutes += rec.worked_minutes or 0
        overtime_minutes += rec.overtime_minutes or 0

    return worked_days, worked_minutes, overtime_minutes


async def aggregate_employee_time_off(
    db: AsyncSession,
    employee_id: int,
    period_start: date,
    period_end: date,
) -> tuple[Decimal, Decimal]:
    """
    Aggregate approved leave quantities within [period_start, period_end].

    Returns:
        (approved_time_off_days, approved_time_off_hours)
    """
    query = (
        select(TimeOffRequest)
        .options(selectinload(TimeOffRequest.time_off_type))
        .where(
            TimeOffRequest.employee_id == employee_id,
            TimeOffRequest.status == TimeOffRequestStatus.APPROVED,
            TimeOffRequest.start_date <= period_end,
            TimeOffRequest.end_date >= period_start,
        )
    )
    result = await db.execute(query)
    requests = list(result.scalars().all())

    approved_days = Decimal("0.00")
    approved_hours = Decimal("0.00")

    for req in requests:
        qty = Decimal(str(req.requested_quantity))
        if req.time_off_type and req.time_off_type.unit == TimeOffUnit.HOURS:
            approved_hours += qty
        else:
            approved_days += qty

    return approved_days, approved_hours


async def preview_payroll_eligibility(
    db: AsyncSession,
    salary_structure_id: int,
    period_start: date,
    period_end: date,
) -> PayrunPreviewResponse:
    """
    Step 1 Payroll Wizard: Evaluates all employees against structure & period.
    """
    # Fetch structure
    struct_res = await db.execute(
        select(SalaryStructure).where(SalaryStructure.id == salary_structure_id)
    )
    structure = struct_res.scalar_one_or_none()
    if not structure:
        raise ValueError(f"Salary structure with ID {salary_structure_id} not found.")

    # Fetch all employees
    emp_res = await db.execute(select(Employee).order_by(Employee.id.asc()))
    all_employees = list(emp_res.scalars().all())

    eligible: list[EligibleEmployeeItem] = []
    ineligible: list[IneligibleEmployeeItem] = []
    warnings: list[PayrollWarningItem] = []

    for emp in all_employees:
        is_elig, reason, contract = await check_employee_payroll_eligibility(
            db=db,
            employee=emp,
            period_start=period_start,
            period_end=period_end,
            expected_structure_id=salary_structure_id,
        )
        emp_name = f"{emp.first_name} {emp.last_name}"
        if is_elig and contract:
            eligible.append(
                EligibleEmployeeItem(
                    employee_id=emp.id,
                    employee_name=emp_name,
                    employee_code=emp.employee_code,
                    contract_id=contract.id,
                    wage=contract.wage,
                    salary_structure_id=salary_structure_id,
                    salary_structure_name=structure.name,
                )
            )
            # Check for non-blocking warning (e.g. 0 attendance records)
            w_days, _, _ = await aggregate_employee_attendance(
                db, emp.id, period_start, period_end
            )
            if w_days == Decimal("0.00"):
                warnings.append(
                    PayrollWarningItem(
                        type="WARNING",
                        code="NO_ATTENDANCE",
                        message=f"Employee {emp_name} ({emp.employee_code}) has 0 attendance records in this period.",
                        employee_id=emp.id,
                        employee_name=emp_name,
                    )
                )
        else:
            ineligible.append(
                IneligibleEmployeeItem(
                    employee_id=emp.id,
                    employee_name=emp_name,
                    employee_code=emp.employee_code,
                    reason=reason or "Ineligible",
                )
            )

    return PayrunPreviewResponse(
        period_start=period_start,
        period_end=period_end,
        salary_structure_id=salary_structure_id,
        salary_structure_name=structure.name,
        eligible_employees=eligible,
        ineligible_employees=ineligible,
        warnings=warnings,
        total_eligible=len(eligible),
        total_ineligible=len(ineligible),
    )


async def calculate_and_generate_payslip(
    db: AsyncSession,
    payslip: Payslip,
    structure: SalaryStructure,
) -> Payslip:
    """
    Calculates salary rules for an individual payslip and persists immutable PayslipLine items.
    """
    contract_res = await db.execute(
        select(Contract).where(Contract.id == payslip.contract_id)
    )
    contract = contract_res.scalar_one_or_none()
    if not contract:
        raise ValueError(f"Contract ID {payslip.contract_id} not found for payslip {payslip.id}.")

    # 1. Operational aggregates
    worked_days, worked_minutes, overtime_minutes = await aggregate_employee_attendance(
        db, payslip.employee_id, payslip.period_start, payslip.period_end
    )
    approved_days, approved_hours = await aggregate_employee_time_off(
        db, payslip.employee_id, payslip.period_start, payslip.period_end
    )

    # 2. Build CalculationContext
    context = CalculationContext(
        employee_id=payslip.employee_id,
        contract_id=payslip.contract_id,
        contract_wage=contract.wage,
        worked_days=int(worked_days),
        worked_minutes=worked_minutes,
        overtime_minutes=overtime_minutes,
        approved_time_off_days=approved_days,
        approved_time_off_hours=approved_hours,
    )

    # 3. Execute SalaryRuleEngine
    rule_results = SalaryRuleEngine.calculate(structure, context)

    # 4. Remove previous lines if re-computing
    await db.execute(
        delete(PayslipLine).where(PayslipLine.payslip_id == payslip.id)
    )

    # 5. Persist line items and aggregate totals
    gross_amount = Decimal("0.00")
    deduction_amount = Decimal("0.00")
    net_amount = Decimal("0.00")

    has_explicit_gross = False
    has_explicit_net = False
    new_lines: list[PayslipLine] = []

    for r in rule_results:
        line = PayslipLine(
            payslip_id=payslip.id,
            salary_rule_id=r.rule_id,
            code=r.code,
            name=r.name,
            category=r.category,
            sequence=r.sequence,
            amount=round_currency(r.amount),
        )
        new_lines.append(line)

        if r.category == SalaryRuleCategory.GROSS:
            has_explicit_gross = True
            gross_amount = r.amount
        elif r.category in (SalaryRuleCategory.BASIC, SalaryRuleCategory.ALLOWANCE):
            if not has_explicit_gross:
                gross_amount += r.amount

        if r.category == SalaryRuleCategory.DEDUCTION:
            deduction_amount += r.amount

        if r.category == SalaryRuleCategory.NET:
            has_explicit_net = True
            net_amount = r.amount

    if not has_explicit_net:
        net_amount = gross_amount - deduction_amount

    db.add_all(new_lines)

    # 6. Update Payslip summary
    payslip.worked_days = worked_days
    payslip.gross_amount = round_currency(gross_amount)
    payslip.deduction_amount = round_currency(deduction_amount)
    payslip.net_amount = round_currency(net_amount)
    payslip.status = PayslipStatus.COMPUTED

    await db.commit()
    await db.refresh(payslip)
    return payslip


async def audit_payrun_for_warnings(
    db: AsyncSession,
    payrun: Payrun,
) -> tuple[list[PayrollWarningItem], list[PayrollWarningItem]]:
    """
    Audit all payslips in a payrun.
    Returns:
        (blocking_errors, non_blocking_warnings)
    """
    errors: list[PayrollWarningItem] = []
    warnings: list[PayrollWarningItem] = []

    # Eager load payslips and their employees & contracts
    payslip_res = await db.execute(
        select(Payslip)
        .options(
            selectinload(Payslip.employee),
            selectinload(Payslip.contract),
        )
        .where(Payslip.payrun_id == payrun.id)
    )
    payslips = list(payslip_res.scalars().all())

    for ps in payslips:
        emp_name = (
            f"{ps.employee.first_name} {ps.employee.last_name}"
            if ps.employee
            else f"Employee #{ps.employee_id}"
        )

        # Blocking check: Negative net amount
        if ps.net_amount < Decimal("0.00"):
            errors.append(
                PayrollWarningItem(
                    type="BLOCKING",
                    code="NEGATIVE_NET_AMOUNT",
                    message=f"Payslip for {emp_name} has a negative net salary ({ps.net_amount}).",
                    employee_id=ps.employee_id,
                    employee_name=emp_name,
                )
            )

        # Blocking check: Contract must be active & running
        if not ps.contract or ps.contract.status != ContractStatus.RUNNING:
            errors.append(
                PayrollWarningItem(
                    type="BLOCKING",
                    code="CONTRACT_NOT_RUNNING",
                    message=f"Contract for {emp_name} is not in RUNNING status.",
                    employee_id=ps.employee_id,
                    employee_name=emp_name,
                )
            )

        # Non-blocking check: Zero or negative gross
        if ps.gross_amount <= Decimal("0.00"):
            warnings.append(
                PayrollWarningItem(
                    type="WARNING",
                    code="ZERO_GROSS_AMOUNT",
                    message=f"Payslip for {emp_name} has zero or non-positive gross amount ({ps.gross_amount}).",
                    employee_id=ps.employee_id,
                    employee_name=emp_name,
                )
            )

        # Non-blocking check: Zero worked days
        if ps.worked_days == Decimal("0.00"):
            warnings.append(
                PayrollWarningItem(
                    type="WARNING",
                    code="NO_ATTENDANCE",
                    message=f"Employee {emp_name} has 0 logged attendance days in this period.",
                    employee_id=ps.employee_id,
                    employee_name=emp_name,
                )
            )

    return errors, warnings
