"""
Salary Structure Service Layer.

Manages the lifecycle of salary structures:
- CRUD operations with code normalization and uniqueness checks
- Rule retrieval and dependency validation
- Safe preview calculation without persisting payruns or payslips
- Protected soft deactivation (preventing deactivation when assigned to RUNNING contracts)
"""

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contract import Contract, ContractStatus
from app.models.salary_rule import SalaryRule, SalaryRuleCategory
from app.models.salary_structure import SalaryStructure
from app.schemas.salary_structure import (
    SalaryPreviewRequest,
    SalaryPreviewResponse,
    SalaryRuleResultResponse,
    SalaryStructureCreate,
    SalaryStructureUpdate,
)
from app.services.salary_rule_engine import (
    CalculationContext,
    SalaryRuleEngine,
    detect_circular_dependencies,
)


def _structure_query():
    """Base query eagerly loading rules sorted by sequence ascending."""
    return select(SalaryStructure).options(
        selectinload(SalaryStructure.rules).selectinload(SalaryRule.salary_structure)
    )


async def get_structure_by_id(db: AsyncSession, structure_id: int) -> SalaryStructure | None:
    """Return salary structure by ID with rules eagerly loaded, or None."""
    result = await db.execute(
        select(SalaryStructure)
        .options(selectinload(SalaryStructure.rules))
        .where(SalaryStructure.id == structure_id)
    )
    return result.scalar_one_or_none()


async def get_structure_by_code(db: AsyncSession, code: str) -> SalaryStructure | None:
    """Return salary structure by normalized uppercase code, or None."""
    result = await db.execute(
        select(SalaryStructure)
        .options(selectinload(SalaryStructure.rules))
        .where(SalaryStructure.code == code.strip().upper())
    )
    return result.scalar_one_or_none()


async def list_structures(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    is_active: bool | None = None,
) -> tuple[list[SalaryStructure], int]:
    """
    List salary structures with optional filtering and pagination.
    Returns (items, total_count).
    """
    query = select(SalaryStructure).options(selectinload(SalaryStructure.rules))
    count_query = select(func.count(SalaryStructure.id))

    if is_active is not None:
        query = query.where(SalaryStructure.is_active == is_active)
        count_query = count_query.where(SalaryStructure.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(SalaryStructure.id.asc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def create_structure(db: AsyncSession, data: SalaryStructureCreate) -> SalaryStructure:
    """
    Create a new salary structure with uniqueness and code normalization checks.
    """
    norm_code = data.code.strip().upper()
    norm_name = data.name.strip()

    # Check unique code
    existing_code = await get_structure_by_code(db, norm_code)
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Salary structure with code '{norm_code}' already exists.",
        )

    # Check unique name
    existing_name = await db.execute(
        select(SalaryStructure).where(SalaryStructure.name == norm_name)
    )
    if existing_name.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Salary structure with name '{norm_name}' already exists.",
        )

    structure = SalaryStructure(
        name=norm_name,
        code=norm_code,
        description=data.description.strip() if data.description else None,
        is_active=data.is_active,
    )
    db.add(structure)
    await db.commit()
    await db.refresh(structure)

    return await get_structure_by_id(db, structure.id)  # type: ignore[return-value]


async def update_structure(
    db: AsyncSession,
    structure_id: int,
    data: SalaryStructureUpdate,
) -> SalaryStructure:
    """
    Update an existing salary structure.
    """
    structure = await get_structure_by_id(db, structure_id)
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary structure with ID {structure_id} not found.",
        )

    if data.code is not None:
        norm_code = data.code.strip().upper()
        if norm_code != structure.code:
            existing_code = await get_structure_by_code(db, norm_code)
            if existing_code and existing_code.id != structure.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Salary structure with code '{norm_code}' already exists.",
                )
            structure.code = norm_code

    if data.name is not None:
        norm_name = data.name.strip()
        if norm_name != structure.name:
            existing_name = await db.execute(
                select(SalaryStructure).where(
                    SalaryStructure.name == norm_name,
                    SalaryStructure.id != structure.id,
                )
            )
            if existing_name.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Salary structure with name '{norm_name}' already exists.",
                )
            structure.name = norm_name

    if data.description is not None:
        structure.description = data.description.strip() if data.description else None

    if data.is_active is not None:
        if not data.is_active and structure.is_active:
            # Check for active running contracts
            cnt_result = await db.execute(
                select(func.count(Contract.id)).where(
                    Contract.salary_structure_id == structure_id,
                    Contract.status == ContractStatus.RUNNING,
                )
            )
            running_contracts = cnt_result.scalar_one()
            if running_contracts > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot deactivate salary structure '{structure.code}' because it is "
                        f"currently assigned to {running_contracts} active RUNNING contract(s)."
                    ),
                )
        structure.is_active = data.is_active

    await db.commit()
    await db.refresh(structure)
    return await get_structure_by_id(db, structure.id)  # type: ignore[return-value]


async def deactivate_structure(db: AsyncSession, structure_id: int) -> SalaryStructure:
    """
    Soft-deactivate a salary structure with safety checks.
    """
    return await update_structure(db, structure_id, SalaryStructureUpdate(is_active=False))


async def get_structure_rules(db: AsyncSession, structure_id: int) -> list[SalaryRule]:
    """
    Return all rules associated with a salary structure, sorted by sequence ascending.
    """
    structure = await get_structure_by_id(db, structure_id)
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary structure with ID {structure_id} not found.",
        )
    return sorted(structure.rules, key=lambda r: r.sequence)


async def validate_structure(db: AsyncSession, structure_id: int) -> None:
    """
    Validate all rules within a salary structure for circular dependencies and sequence validity.
    """
    rules = await get_structure_rules(db, structure_id)
    active_rules = [r for r in rules if r.is_active]
    try:
        detect_circular_dependencies(active_rules)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(e),
        ) from e


async def preview_structure(
    db: AsyncSession,
    structure_id: int,
    req: SalaryPreviewRequest,
) -> SalaryPreviewResponse:
    """
    Preview the salary computation against a salary structure.
    Does NOT persist any Payrun, Payslip, or historical payroll records.
    """
    structure = await get_structure_by_id(db, structure_id)
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary structure with ID {structure_id} not found.",
        )
    if not structure.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot preview inactive salary structure '{structure.code}'.",
        )

    context = CalculationContext(
        employee_id=req.employee_id,
        contract_id=req.contract_id,
        contract_wage=req.contract_wage,
        worked_days=req.worked_days or 0,
        worked_minutes=req.worked_minutes or 0,
        overtime_minutes=req.overtime_minutes or 0,
        approved_time_off_days=req.approved_time_off_days or Decimal("0.00"),
        approved_time_off_hours=req.approved_time_off_hours or Decimal("0.00"),
    )

    try:
        results = SalaryRuleEngine.calculate(structure, context)
    except (ValueError, ZeroDivisionError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Salary calculation failed: {e}",
        ) from e

    # Aggregate by category
    totals_by_category: dict[str, Decimal] = {
        cat.value: Decimal("0.00") for cat in SalaryRuleCategory
    }
    gross_amount = Decimal("0.00")
    net_amount = Decimal("0.00")

    result_responses: list[SalaryRuleResultResponse] = []
    for r in results:
        totals_by_category[r.category.value] = totals_by_category.get(r.category.value, Decimal("0.00")) + r.amount
        if r.category == SalaryRuleCategory.GROSS:
            gross_amount = r.amount
        elif r.category == SalaryRuleCategory.NET:
            net_amount = r.amount

        result_responses.append(
            SalaryRuleResultResponse(
                rule_id=r.rule_id,
                code=r.code,
                name=r.name,
                category=r.category,
                sequence=r.sequence,
                amount=r.amount,
                computation_type=r.computation_type,
                formula_detail=r.formula_detail,
            )
        )

    # Fallbacks if GROSS/NET were not explicit rule categories in structure
    if gross_amount == Decimal("0.00"):
        gross_amount = totals_by_category.get("BASIC", Decimal("0.00")) + totals_by_category.get("ALLOWANCE", Decimal("0.00"))
    if net_amount == Decimal("0.00"):
        net_amount = gross_amount - totals_by_category.get("DEDUCTION", Decimal("0.00"))

    return SalaryPreviewResponse(
        structure_id=structure.id,
        structure_name=structure.name,
        structure_code=structure.code,
        contract_wage=req.contract_wage,
        results=result_responses,
        totals_by_category=totals_by_category,
        gross_amount=gross_amount,
        net_amount=net_amount,
    )

