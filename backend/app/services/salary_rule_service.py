"""
Salary Rule Service Layer.

Manages the lifecycle of individual salary rules within a salary structure:
- Configuration-time validation (computation type, fields, formula syntax, sequence)
- Scoped uniqueness for (salary_structure_id, code) and (salary_structure_id, sequence)
- Dependency ordering validation (dependencies must have strictly lower sequence)
- Circular dependency detection
- CRUD operations
"""

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.salary_rule import ComputationType, SalaryRule, SalaryRuleCategory
from app.models.salary_structure import SalaryStructure
from app.schemas.salary_rule import SalaryRuleCreate, SalaryRuleUpdate
from app.services.salary_rule_engine import (
    detect_circular_dependencies,
    extract_formula_identifiers,
)


async def get_rule_by_id(db: AsyncSession, rule_id: int) -> SalaryRule | None:
    """Return salary rule by ID with parent structure loaded, or None."""
    result = await db.execute(
        select(SalaryRule)
        .options(selectinload(SalaryRule.salary_structure))
        .where(SalaryRule.id == rule_id)
    )
    return result.scalar_one_or_none()


async def get_rule_by_structure_and_code(
    db: AsyncSession,
    structure_id: int,
    code: str,
) -> SalaryRule | None:
    """Return salary rule by scoped structure ID and code, or None."""
    result = await db.execute(
        select(SalaryRule).where(
            SalaryRule.salary_structure_id == structure_id,
            SalaryRule.code == code.strip().upper(),
        )
    )
    return result.scalar_one_or_none()


async def list_rules(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    salary_structure_id: int | None = None,
    category: SalaryRuleCategory | None = None,
    computation_type: ComputationType | None = None,
    is_active: bool | None = None,
) -> tuple[list[SalaryRule], int]:
    """
    List salary rules with filtering and pagination.
    Ordered by sequence ascending.
    """
    query = select(SalaryRule).options(selectinload(SalaryRule.salary_structure))
    count_query = select(func.count(SalaryRule.id))

    if salary_structure_id is not None:
        query = query.where(SalaryRule.salary_structure_id == salary_structure_id)
        count_query = count_query.where(SalaryRule.salary_structure_id == salary_structure_id)

    if category is not None:
        query = query.where(SalaryRule.category == category)
        count_query = count_query.where(SalaryRule.category == category)

    if computation_type is not None:
        query = query.where(SalaryRule.computation_type == computation_type)
        count_query = count_query.where(SalaryRule.computation_type == computation_type)

    if is_active is not None:
        query = query.where(SalaryRule.is_active == is_active)
        count_query = count_query.where(SalaryRule.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(SalaryRule.sequence.asc(), SalaryRule.id.asc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def validate_rule_dependencies_and_cycles(
    db: AsyncSession,
    structure_id: int,
    candidate_rule: SalaryRule,
    exclude_rule_id: int | None = None,
) -> None:
    """
    Validate that candidate_rule has valid dependencies and does not introduce cycles
    among active rules of the structure.
    """
    # Fetch all existing rules for this structure
    stmt = select(SalaryRule).where(SalaryRule.salary_structure_id == structure_id)
    if exclude_rule_id is not None:
        stmt = stmt.where(SalaryRule.id != exclude_rule_id)

    res = await db.execute(stmt)
    existing_rules = list(res.scalars().all())

    # Form hypothetical rule set
    simulated_rules = existing_rules + [candidate_rule]
    active_simulated = [r for r in simulated_rules if r.is_active]

    try:
        detect_circular_dependencies(active_simulated)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(e),
        ) from e


async def create_rule(db: AsyncSession, data: SalaryRuleCreate) -> SalaryRule:
    """
    Create a new salary rule with strict configuration-time validations:
    1. Parent structure must exist.
    2. (salary_structure_id, code) must be unique.
    3. (salary_structure_id, sequence) must be unique.
    4. ComputationType constraints.
    5. Dependency sequence ordering and cycle detection.
    """
    # 1. Structure existence
    struct_res = await db.execute(
        select(SalaryStructure).where(SalaryStructure.id == data.salary_structure_id)
    )
    structure = struct_res.scalar_one_or_none()
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary structure with ID {data.salary_structure_id} not found.",
        )

    norm_code = data.code.strip().upper()

    # 2. Check unique code within structure
    existing_code = await get_rule_by_structure_and_code(db, data.salary_structure_id, norm_code)
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Rule with code '{norm_code}' already exists in this salary structure.",
        )

    # 3. Check unique sequence within structure
    seq_res = await db.execute(
        select(SalaryRule).where(
            SalaryRule.salary_structure_id == data.salary_structure_id,
            SalaryRule.sequence == data.sequence,
        )
    )
    if seq_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Rule with sequence '{data.sequence}' already exists in this salary structure.",
        )

    # 4. Computation type specific validation
    if data.computation_type == ComputationType.FORMULA:
        if not data.formula:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Formula is required when computation_type is FORMULA.",
            )
        try:
            extract_formula_identifiers(data.formula)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(e),
            ) from e

    # 5. Create transient candidate rule for dependency & cycle check
    candidate = SalaryRule(
        salary_structure_id=data.salary_structure_id,
        name=data.name.strip(),
        code=norm_code,
        category=data.category,
        sequence=data.sequence,
        computation_type=data.computation_type,
        fixed_amount=data.fixed_amount,
        percentage=data.percentage,
        percentage_base=data.percentage_base.strip().upper() if data.percentage_base else None,
        formula=data.formula.strip() if data.formula else None,
        is_active=data.is_active,
    )

    await validate_rule_dependencies_and_cycles(db, data.salary_structure_id, candidate)

    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)

    return await get_rule_by_id(db, candidate.id)  # type: ignore[return-value]


async def update_rule(
    db: AsyncSession,
    rule_id: int,
    data: SalaryRuleUpdate,
) -> SalaryRule:
    """
    Update an existing salary rule with configuration validations.
    """
    rule = await get_rule_by_id(db, rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary rule with ID {rule_id} not found.",
        )

    struct_id = rule.salary_structure_id

    # Code uniqueness
    if data.code is not None:
        norm_code = data.code.strip().upper()
        if norm_code != rule.code:
            existing = await get_rule_by_structure_and_code(db, struct_id, norm_code)
            if existing and existing.id != rule.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Rule with code '{norm_code}' already exists in this salary structure.",
                )
            rule.code = norm_code

    # Sequence uniqueness
    if data.sequence is not None and data.sequence != rule.sequence:
        seq_res = await db.execute(
            select(SalaryRule).where(
                SalaryRule.salary_structure_id == struct_id,
                SalaryRule.sequence == data.sequence,
                SalaryRule.id != rule.id,
            )
        )
        if seq_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Rule with sequence '{data.sequence}' already exists in this salary structure.",
            )
        rule.sequence = data.sequence

    if data.name is not None:
        rule.name = data.name.strip()

    if data.category is not None:
        rule.category = data.category

    if data.computation_type is not None:
        rule.computation_type = data.computation_type

    if "fixed_amount" in data.model_fields_set:
        rule.fixed_amount = data.fixed_amount

    if "percentage" in data.model_fields_set:
        rule.percentage = data.percentage

    if "percentage_base" in data.model_fields_set:
        rule.percentage_base = data.percentage_base.strip().upper() if data.percentage_base else None

    if "formula" in data.model_fields_set:
        rule.formula = data.formula.strip() if data.formula else None

    if data.is_active is not None:
        rule.is_active = data.is_active

    # Validate computation_type field rules
    ctype = rule.computation_type
    if ctype == ComputationType.FIXED:
        if rule.fixed_amount is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="fixed_amount is required when computation_type is FIXED.",
            )
        rule.percentage = None
        rule.percentage_base = None
        rule.formula = None

    elif ctype == ComputationType.PERCENTAGE:
        if rule.percentage is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="percentage is required when computation_type is PERCENTAGE.",
            )
        if not rule.percentage_base:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="percentage_base is required when computation_type is PERCENTAGE.",
            )
        rule.fixed_amount = None
        rule.formula = None

    elif ctype == ComputationType.FORMULA:
        if not rule.formula:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="formula is required when computation_type is FORMULA.",
            )
        try:
            extract_formula_identifiers(rule.formula)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(e),
            ) from e
        rule.fixed_amount = None
        rule.percentage = None
        rule.percentage_base = None

    # Validate dependencies and cycle detection on updated state
    await validate_rule_dependencies_and_cycles(db, struct_id, rule, exclude_rule_id=rule.id)

    await db.commit()
    await db.refresh(rule)
    return await get_rule_by_id(db, rule.id)  # type: ignore[return-value]


async def delete_rule(db: AsyncSession, rule_id: int) -> None:
    """
    Delete a salary rule from a salary structure.
    Verifies that no other active rule in the structure depends on this rule.
    """
    rule = await get_rule_by_id(db, rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary rule with ID {rule_id} not found.",
        )

    # Check if other rules in the same structure reference this rule
    struct_id = rule.salary_structure_id
    code = rule.code

    other_rules_res = await db.execute(
        select(SalaryRule).where(
            SalaryRule.salary_structure_id == struct_id,
            SalaryRule.id != rule.id,
            SalaryRule.is_active == True,
        )
    )
    other_rules = list(other_rules_res.scalars().all())

    for other in other_rules:
        if other.computation_type == ComputationType.PERCENTAGE and other.percentage_base == code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete rule '{code}' because rule '{other.code}' depends on it.",
            )
        if other.computation_type == ComputationType.FORMULA and other.formula:
            try:
                idents = extract_formula_identifiers(other.formula)
                if code in idents:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot delete rule '{code}' because formula of rule '{other.code}' references it.",
                    )
            except ValueError:
                pass

    await db.delete(rule)
    await db.commit()

