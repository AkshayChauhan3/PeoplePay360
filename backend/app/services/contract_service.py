"""
Contract Service Layer.

Contains all core business logic for employment contract lifecycle management:
- Contract creation with foreign key validation, unique code checks, and employee fallback defaults
- Prevention of overlapping active (RUNNING) contracts for the same employee
- Contract lifecycle transitions (DRAFT -> RUNNING, CANCELLED)
- Contract retrieval with eager relationship loading (Employee, Department, JobPosition)
- Filtered pagination and employee-specific contract history
"""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contract import Contract, ContractStatus
from app.models.department import Department
from app.models.employee import Employee
from app.models.job_position import JobPosition
from app.models.salary_structure import SalaryStructure
from app.schemas.contract import ContractCreate, ContractUpdate


def _contract_query():
    """
    Base SELECT query with eager relationship loading.
    Eagerly fetches Employee, Department, JobPosition, and SalaryStructure to prevent N+1 queries.
    """
    return select(Contract).options(
        selectinload(Contract.employee),
        selectinload(Contract.department),
        selectinload(Contract.job_position),
        selectinload(Contract.salary_structure),
    )


async def get_contract_by_id(db: AsyncSession, contract_id: int) -> Contract | None:
    """Return contract by ID with eager relationships loaded, or None."""
    result = await db.execute(_contract_query().where(Contract.id == contract_id))
    return result.scalar_one_or_none()


async def get_contract_by_number(db: AsyncSession, contract_number: str) -> Contract | None:
    """Return contract by unique contract number (normalized uppercase), or None."""
    result = await db.execute(
        _contract_query().where(Contract.contract_number == contract_number.strip().upper())
    )
    return result.scalar_one_or_none()


async def check_running_contract_overlap(
    db: AsyncSession,
    employee_id: int,
    start_date: date,
    end_date: date | None,
    exclude_contract_id: int | None = None,
) -> None:
    """
    Verify that an employee does not have another RUNNING contract whose date
    window overlaps with [start_date, end_date].

    Overlapping rule:
    Two date ranges [S1, E1] and [S2, E2] intersect iff:
      S1 <= E2 (if E2 is not None) AND (E1 is None OR E1 >= S2)

    Raises HTTPException(409 Conflict) if an overlap is found.
    """
    query = select(Contract).where(
        Contract.employee_id == employee_id,
        Contract.status == ContractStatus.RUNNING,
    )

    if exclude_contract_id is not None:
        query = query.where(Contract.id != exclude_contract_id)

    # Condition 1: Existing contract starts before proposed contract ends
    if end_date is not None:
        query = query.where(Contract.start_date <= end_date)

    # Condition 2: Existing contract ends after proposed contract starts (or is open-ended)
    query = query.where(
        or_(
            Contract.end_date.is_(None),
            Contract.end_date >= start_date,
        )
    )

    result = await db.execute(query)
    conflicting = result.scalars().first()
    if conflicting:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Employee ID {employee_id} already has an active RUNNING contract "
                f"('{conflicting.contract_number}') overlapping with the specified date window "
                f"({start_date} to {end_date or 'open-ended'})."
            ),
        )


async def create_contract(db: AsyncSession, data: ContractCreate) -> Contract:
    """
    Create a new employment contract with validations and fallback defaults.

    Business Rules:
    1. Contract number must be unique across the organization.
    2. employee_id must reference a valid existing employee.
    3. department_id and job_position_id default to the employee's current
       department and position if omitted in request.
    4. Referenced department and job position must be active.
    5. If initial status is RUNNING, ensure no date overlap with other running contracts.
    """
    # 1. Uniqueness check for contract_number
    normalized_number = data.contract_number.strip().upper()
    existing = await get_contract_by_number(db, normalized_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Contract with number '{normalized_number}' already exists.",
        )

    # 2. Validate employee existence
    emp_result = await db.execute(select(Employee).where(Employee.id == data.employee_id))
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with ID {data.employee_id} does not exist.",
        )

    # 3. Smart defaulting for department and job position
    department_id = data.department_id if data.department_id is not None else employee.department_id
    job_position_id = data.job_position_id if data.job_position_id is not None else employee.job_position_id

    # 4. Validate department exists and is active
    dept_result = await db.execute(select(Department).where(Department.id == department_id))
    dept = dept_result.scalar_one_or_none()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with ID {department_id} does not exist.",
        )
    if not dept.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign contract to inactive department '{dept.name}'.",
        )

    # 5. Validate job position exists and is active
    pos_result = await db.execute(select(JobPosition).where(JobPosition.id == job_position_id))
    pos = pos_result.scalar_one_or_none()
    if not pos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job position with ID {job_position_id} does not exist.",
        )
    if not pos.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign contract to inactive job position '{pos.name}'.",
        )

    # 5b. Validate salary structure if specified
    if data.salary_structure_id is not None:
        struct_result = await db.execute(
            select(SalaryStructure).where(SalaryStructure.id == data.salary_structure_id)
        )
        struct = struct_result.scalar_one_or_none()
        if not struct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Salary structure with ID {data.salary_structure_id} does not exist.",
            )
        if not struct.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign contract to inactive salary structure '{struct.code}'.",
            )

    # 6. Check running contract date overlap if initial status is RUNNING
    if data.status == ContractStatus.RUNNING:
        await check_running_contract_overlap(
            db=db,
            employee_id=data.employee_id,
            start_date=data.start_date,
            end_date=data.end_date,
        )

    # 7. Persist contract
    contract = Contract(
        contract_number=normalized_number,
        employee_id=data.employee_id,
        department_id=department_id,
        job_position_id=job_position_id,
        salary_structure_id=data.salary_structure_id,
        start_date=data.start_date,
        end_date=data.end_date,
        wage=data.wage,
        status=data.status,
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)

    # Return with eager relations loaded
    loaded = await get_contract_by_id(db, contract.id)
    return loaded  # type: ignore[return-value]


async def list_contracts(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    employee_id: int | None = None,
    status_filter: ContractStatus | None = None,
    department_id: int | None = None,
) -> tuple[list[Contract], int]:
    """
    List contracts with optional filtering and pagination.
    Returns (items, total_count).
    """
    query = _contract_query()
    count_query = select(func.count(Contract.id))

    if employee_id is not None:
        query = query.where(Contract.employee_id == employee_id)
        count_query = count_query.where(Contract.employee_id == employee_id)

    if status_filter is not None:
        query = query.where(Contract.status == status_filter)
        count_query = count_query.where(Contract.status == status_filter)

    if department_id is not None:
        query = query.where(Contract.department_id == department_id)
        count_query = count_query.where(Contract.department_id == department_id)

    # Total count
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginated results ordered by creation time desc
    query = query.order_by(Contract.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def update_contract(
    db: AsyncSession,
    contract_id: int,
    data: ContractUpdate,
) -> Contract:
    """
    Partially update an existing contract with integrity validations.
    """
    contract = await get_contract_by_id(db, contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID {contract_id} not found.",
        )

    # Contract number update & uniqueness
    if data.contract_number is not None:
        new_number = data.contract_number.strip().upper()
        if new_number != contract.contract_number:
            existing = await get_contract_by_number(db, new_number)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Contract with number '{new_number}' already exists.",
                )
            contract.contract_number = new_number

    # Department validation
    if data.department_id is not None:
        dept = await db.get(Department, data.department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with ID {data.department_id} not found.",
            )
        if not dept.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign contract to inactive department '{dept.name}'.",
            )
        contract.department_id = data.department_id

    # Job position validation
    if data.job_position_id is not None:
        pos = await db.get(JobPosition, data.job_position_id)
        if not pos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job position with ID {data.job_position_id} not found.",
            )
        if not pos.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign contract to inactive job position '{pos.name}'.",
            )
        contract.job_position_id = data.job_position_id

    if data.salary_structure_id is not None:
        struct_result = await db.execute(
            select(SalaryStructure).where(SalaryStructure.id == data.salary_structure_id)
        )
        struct = struct_result.scalar_one_or_none()
        if not struct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Salary structure with ID {data.salary_structure_id} does not exist.",
            )
        if not struct.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign contract to inactive salary structure '{struct.code}'.",
            )
        contract.salary_structure_id = data.salary_structure_id
    elif "salary_structure_id" in data.model_fields_set and data.salary_structure_id is None:
        contract.salary_structure_id = None

    if data.wage is not None:
        contract.wage = data.wage

    # Date range updates
    effective_start = data.start_date if data.start_date is not None else contract.start_date
    effective_end = data.end_date if "end_date" in data.model_fields_set else contract.end_date
    effective_status = data.status if data.status is not None else contract.status

    if effective_end is not None and effective_end < effective_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="end_date cannot be earlier than start_date.",
        )

    # Check overlap if status is RUNNING or being changed to RUNNING, or if dates changed on a RUNNING contract
    if effective_status == ContractStatus.RUNNING:
        await check_running_contract_overlap(
            db=db,
            employee_id=contract.employee_id,
            start_date=effective_start,
            end_date=effective_end,
            exclude_contract_id=contract.id,
        )

    if data.start_date is not None:
        contract.start_date = data.start_date
    if "end_date" in data.model_fields_set:
        contract.end_date = data.end_date
    if data.status is not None:
        contract.status = data.status

    await db.commit()
    await db.refresh(contract)
    return await get_contract_by_id(db, contract.id)  # type: ignore[return-value]


async def activate_contract(db: AsyncSession, contract_id: int) -> Contract:
    """
    Transition a contract to RUNNING status.
    Verifies that no other RUNNING contract for this employee overlaps.
    """
    contract = await get_contract_by_id(db, contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID {contract_id} not found.",
        )

    if contract.status == ContractStatus.RUNNING:
        return contract

    # Check for date overlap with any other RUNNING contract
    await check_running_contract_overlap(
        db=db,
        employee_id=contract.employee_id,
        start_date=contract.start_date,
        end_date=contract.end_date,
        exclude_contract_id=contract.id,
    )

    contract.status = ContractStatus.RUNNING
    await db.commit()
    await db.refresh(contract)
    return await get_contract_by_id(db, contract.id)  # type: ignore[return-value]


async def cancel_contract(db: AsyncSession, contract_id: int) -> Contract:
    """
    Transition a contract to CANCELLED status.
    """
    contract = await get_contract_by_id(db, contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID {contract_id} not found.",
        )

    contract.status = ContractStatus.CANCELLED
    await db.commit()
    await db.refresh(contract)
    return await get_contract_by_id(db, contract.id)  # type: ignore[return-value]


async def get_employee_contracts(db: AsyncSession, employee_id: int) -> list[Contract]:
    """
    Return all contracts for a specific employee ordered by start_date descending.
    """
    emp_result = await db.execute(select(Employee).where(Employee.id == employee_id))
    if not emp_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )

    result = await db.execute(
        _contract_query()
        .where(Contract.employee_id == employee_id)
        .order_by(Contract.start_date.desc())
    )
    return list(result.scalars().all())


async def get_applicable_contract(
    db: AsyncSession,
    employee_id: int,
    target_date: date,
) -> Contract | None:
    """
    Look up the active RUNNING contract for an employee on a given calendar date.
    Returns the contract with eager relationships loaded, or None if no running contract applies.
    """
    query = (
        _contract_query()
        .where(
            Contract.employee_id == employee_id,
            Contract.status == ContractStatus.RUNNING,
            Contract.start_date <= target_date,
            or_(
                Contract.end_date.is_(None),
                Contract.end_date >= target_date,
            ),
        )
        .order_by(Contract.start_date.desc())
    )
    result = await db.execute(query)
    return result.scalars().first()

