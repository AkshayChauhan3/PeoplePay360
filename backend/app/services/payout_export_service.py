"""
Bank Payout File Export & Audit Service — PeoplePay360

Provides pre-disbursement audit summaries and generates compliant corporate
bank payout batch files (Standard, HDFC Enet, ICICI Corporate) from validated/paid payruns.
"""

import csv
import io
import re
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip
from app.schemas.payout import (
    BankPayoutSummaryResponse,
    MissingBankInfoEmployee,
)


def _payrun_with_payslips_query(payrun_id: int):
    """Eager loads payrun with all child payslips and linked employee records."""
    return (
        select(Payrun)
        .where(Payrun.id == payrun_id)
        .options(
            selectinload(Payrun.payslips).selectinload(Payslip.employee),
        )
    )


async def get_bank_payout_summary(
    db: AsyncSession,
    payrun_id: int,
) -> BankPayoutSummaryResponse:
    """
    Audits the bank account readiness of all employees in a payrun batch.
    Identifies employees missing bank account numbers or IFSC codes.
    """
    result = await db.execute(_payrun_with_payslips_query(payrun_id))
    payrun = result.scalar_one_or_none()

    if payrun is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    payslips: list[Payslip] = payrun.payslips
    total_employees = len(payslips)
    total_payout_amount = sum(
        (p.net_amount for p in payslips),
        Decimal("0.00"),
    )

    missing_employees: list[MissingBankInfoEmployee] = []

    for p in payslips:
        emp: Employee = p.employee
        missing_fields: list[str] = []
        if not emp.bank_account_number or not emp.bank_account_number.strip():
            missing_fields.append("bank_account_number")
        if not emp.ifsc_code or not emp.ifsc_code.strip():
            missing_fields.append("ifsc_code")
        if not emp.bank_name or not emp.bank_name.strip():
            missing_fields.append("bank_name")

        if missing_fields:
            missing_employees.append(
                MissingBankInfoEmployee(
                    employee_id=emp.id,
                    employee_code=emp.employee_code,
                    employee_name=emp.full_name,
                    missing_fields=missing_fields,
                )
            )

    can_export = (
        payrun.status in (PayrunStatus.COMPUTED, PayrunStatus.VALIDATED, PayrunStatus.PAID)
        and total_employees > 0
    )

    return BankPayoutSummaryResponse(
        payrun_id=payrun.id,
        payrun_name=payrun.name,
        period_start=payrun.period_start,
        period_end=payrun.period_end,
        status=payrun.status.value,
        total_employees=total_employees,
        total_payout_amount=total_payout_amount,
        ready_for_payout_count=total_employees - len(missing_employees),
        missing_bank_details_count=len(missing_employees),
        can_export=can_export,
        missing_employees=missing_employees,
    )


async def generate_bank_payout_csv(
    db: AsyncSession,
    payrun_id: int,
    bank_format: str = "standard",
    strict: bool = False,
) -> tuple[str, str]:
    """
    Generates a structured bank payout CSV file for a finalized payrun.

    :param db: AsyncSession
    :param payrun_id: ID of the Payrun
    :param bank_format: One of 'standard', 'hdfc', 'icici'
    :param strict: If True, raises 422 if any employee is missing bank account or IFSC
    :return: (csv_string_content, suggested_filename)
    """
    result = await db.execute(_payrun_with_payslips_query(payrun_id))
    payrun = result.scalar_one_or_none()

    if payrun is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    # 1. State Validation
    if payrun.status == PayrunStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export bank payout file for DRAFT payrun. Compute and validate payroll first.",
        )
    if payrun.status == PayrunStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot export bank payout file for CANCELLED payrun.",
        )

    payslips: list[Payslip] = payrun.payslips
    if not payslips:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payrun contains no payslips to export.",
        )

    # 2. Check missing bank details
    missing_codes: list[str] = []
    for p in payslips:
        emp: Employee = p.employee
        if not emp.bank_account_number or not emp.ifsc_code:
            missing_codes.append(emp.employee_code)

    if strict and missing_codes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "message": (
                    f"Strict bank export failed: {len(missing_codes)} employee(s) "
                    f"missing required banking details: {', '.join(missing_codes)}. "
                    "Update employee profiles or export with strict=false."
                ),
                "missing_employee_codes": missing_codes,
            },
        )

    # 3. Format CSV output
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\r\n", quoting=csv.QUOTE_MINIMAL)

    normalized_format = bank_format.strip().lower()

    if normalized_format == "hdfc":
        # HDFC Bank Enet CMS format
        writer.writerow([
            "Transaction Type",
            "Beneficiary Code",
            "Beneficiary Account Number",
            "Amount",
            "Beneficiary Name",
            "Remarks",
            "IFSC Code",
        ])
        for p in payslips:
            emp = p.employee
            trans_type = "NEFT" if p.net_amount < Decimal("200000") else "RTGS"
            bene_name = emp.account_holder_name or emp.full_name
            writer.writerow([
                trans_type,
                emp.employee_code,
                emp.bank_account_number or "MISSING_ACCOUNT",
                f"{p.net_amount:.2f}",
                bene_name,
                f"Salary {payrun.name} {emp.employee_code}",
                emp.ifsc_code or "MISSING_IFSC",
            ])

    elif normalized_format == "icici":
        # ICICI Bank Corporate Bulk Payment format
        writer.writerow([
            "Debit Account No",
            "Payee Name",
            "Payee Account No",
            "Amount",
            "Payee IFSC",
            "Remarks",
        ])
        for p in payslips:
            emp = p.employee
            bene_name = emp.account_holder_name or emp.full_name
            writer.writerow([
                "PRIMARY_SALARY_ACCOUNT",
                bene_name,
                emp.bank_account_number or "MISSING_ACCOUNT",
                f"{p.net_amount:.2f}",
                emp.ifsc_code or "MISSING_IFSC",
                f"Salary {payrun.name} {emp.employee_code}",
            ])

    else:
        # Standard Universal HRMS Payout CSV
        writer.writerow([
            "Sr No",
            "Employee Code",
            "Beneficiary Name",
            "Account Number",
            "IFSC Code",
            "Bank Name",
            "Net Amount (INR)",
            "Remarks",
            "PAN Number",
            "Email",
        ])
        for idx, p in enumerate(payslips, start=1):
            emp = p.employee
            bene_name = emp.account_holder_name or emp.full_name
            writer.writerow([
                idx,
                emp.employee_code,
                bene_name,
                emp.bank_account_number or "MISSING_ACCOUNT",
                emp.ifsc_code or "MISSING_IFSC",
                emp.bank_name or "",
                f"{p.net_amount:.2f}",
                f"Salary for {payrun.name}",
                emp.pan_number or "",
                emp.email,
            ])

    # Clean filename with safe characters
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", payrun.name.strip())
    filename = f"bank_payout_payrun_{payrun.id}_{safe_name}_{normalized_format}.csv"

    return output.getvalue(), filename
