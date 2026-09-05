import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.services.payrun_service import (
    PayrunError,
    compute_employee_payslip,
    preview_eligible_employees,
)
from app.services.pdf_service import generate_payslip_pdf

router = APIRouter(prefix="/payruns", tags=["Payroll & Payslips"])

# Default standard salary rules matching our illustrated seed
DEFAULT_SALARY_RULES = [
    {
        "code": "BASIC",
        "name": "Basic Salary",
        "sequence": 10,
        "method": "FORMULA",
        "formula_expression": "contract_wage * payable_days / scheduled_days",
    },
    {
        "code": "HRA",
        "name": "House Rent Allowance",
        "sequence": 20,
        "method": "PERCENTAGE",
        "percentage_base": "BASIC",
        "percentage_rate": Decimal("40.00"),
    },
    {
        "code": "STD",
        "name": "Standard Allowance",
        "sequence": 30,
        "method": "FIXED",
        "amount": Decimal("10000.00"),
    },
    {
        "code": "GROSS",
        "name": "Gross Salary",
        "sequence": 40,
        "method": "FORMULA",
        "formula_expression": "BASIC + HRA + STD",
    },
    {
        "code": "PF",
        "name": "Provident Fund",
        "sequence": 50,
        "method": "FIXED",
        "category": "DEDUCTION",
        "amount": Decimal("3000.00"),
    },
    {
        "code": "PT",
        "name": "Professional Tax",
        "sequence": 60,
        "method": "FIXED",
        "category": "DEDUCTION",
        "amount": Decimal("2000.00"),
    },
    {
        "code": "NET",
        "name": "Net Take-Home Pay",
        "sequence": 70,
        "method": "FORMULA",
        "formula_expression": "GROSS - PF - PT",
    },
]


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class PayrunPreviewIn(BaseModel):
    start_date: date = Field(..., example="2026-09-01")
    end_date: date = Field(..., example="2026-09-30")


class EmployeePayrunIn(BaseModel):
    employee_id: str
    name: str
    employee_code: str = "EMP001"
    department: str = "Engineering"
    contract_wage: Decimal = Decimal("50000.00")
    unpaid_leave_days: int = 0


class PayrunComputeIn(BaseModel):
    start_date: date = Field(..., example="2026-09-01")
    end_date: date = Field(..., example="2026-09-30")
    employees: list[EmployeePayrunIn]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/preview",
    dependencies=[
        Depends(
            require_role(
                UserRole.ADMIN,
                UserRole.HR_PAYROLL_USER,
                UserRole.HR_PAYROLL_MANAGER,
            )
        )
    ],
)
async def preview_payrun(payload: PayrunPreviewIn):
    """
    Step 1 Wizard: Dry-run check for eligible employees in the selected period.
    Pure read operation — zero database writes.
    """
    mock_candidates = [
        {
            "id": "emp-101",
            "name": "Aarav Patel",
            "code": "EMP001",
            "department_name": "Engineering",
            "active_contract": {
                "start_date": date(2026, 1, 1),
                "end_date": None,
                "wage": Decimal("50000.00"),
            },
        },
        {
            "id": "emp-102",
            "name": "Priya Sharma",
            "code": "EMP002",
            "department_name": "Human Resources",
            "active_contract": {
                "start_date": date(2026, 3, 1),
                "end_date": None,
                "wage": Decimal("60000.00"),
            },
        },
    ]

    try:
        eligible = preview_eligible_employees(
            employees=mock_candidates,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
        return {
            "period": f"{payload.start_date} to {payload.end_date}",
            "eligible_count": len(eligible),
            "employees": eligible,
        }
    except PayrunError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/compute",
    dependencies=[
        Depends(
            require_role(
                UserRole.ADMIN,
                UserRole.HR_PAYROLL_USER,
                UserRole.HR_PAYROLL_MANAGER,
            )
        )
    ],
)
async def compute_payrun_batch(payload: PayrunComputeIn):
    """
    Step 2 Wizard: Computes payslip lines and net take-home salary for selected employees.
    """
    if not payload.employees:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one employee must be selected for payroll computation.",
        )

    computed_batch = []
    total_gross = Decimal("0.00")
    total_net = Decimal("0.00")

    try:
        for emp in payload.employees:
            payslip = compute_employee_payslip(
                employee_id=emp.employee_id,
                contract_wage=emp.contract_wage,
                start_date=payload.start_date,
                end_date=payload.end_date,
                salary_rules=DEFAULT_SALARY_RULES,
                unpaid_leave_days=emp.unpaid_leave_days,
            )
            payslip["employee_name"] = emp.name
            payslip["employee_code"] = emp.employee_code
            payslip["department"] = emp.department

            total_gross += payslip["gross_pay"]
            total_net += payslip["net_pay"]
            computed_batch.append(payslip)

        return {
            "period": f"{payload.start_date} to {payload.end_date}",
            "status": "COMPUTED",
            "employee_count": len(computed_batch),
            "total_gross_payout": total_gross,
            "total_net_payout": total_net,
            "payslips": computed_batch,
        }
    except PayrunError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/payslip/{employee_id}/pdf")
async def download_payslip_pdf(
    employee_id: str,
    period_label: str = "September 2026",
    current_user: User = Depends(get_current_user),
):
    """
    Generates and streams the official ReportLab PDF payslip for browser display or download.
    """
    emp_info = {
        "name": "Aarav Patel",
        "employee_code": "EMP001",
        "department": "Engineering",
        "job_title": "Senior Software Engineer",
    }

    payslip_info = compute_employee_payslip(
        employee_id=employee_id,
        contract_wage=Decimal("50000.00"),
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 30),
        salary_rules=DEFAULT_SALARY_RULES,
    )

    pdf_bytes = generate_payslip_pdf(
        company_name="PeoplePay360 Technologies Pvt Ltd",
        period_label=period_label,
        employee_data=emp_info,
        payslip_data=payslip_info,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="payslip_{employee_id}_{period_label.replace(" ", "_")}.pdf"'
        },
    )
