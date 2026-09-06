from datetime import date, datetime, time, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.attendance import Attendance, AttendanceStatus
from app.models.employee import Employee, EmployeeStatus
from app.models.schedule import WorkingScheduleDay
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceSessionResponse,
    AttendanceUpdate,
)
from app.services import schedule_service


def _attendance_query():
    """Query eagerly loading employee relationship."""
    return select(Attendance).options(
        selectinload(Attendance.employee).selectinload(Employee.department),
        selectinload(Attendance.employee).selectinload(Employee.job_position),
    )


async def get_attendance_by_id(db: AsyncSession, attendance_id: int) -> Attendance | None:
    """Retrieve an attendance record by ID."""
    result = await db.execute(_attendance_query().where(Attendance.id == attendance_id))
    return result.scalar_one_or_none()


async def get_attendance_by_employee_and_date(
    db: AsyncSession,
    employee_id: int,
    att_date: date,
) -> Attendance | None:
    """Retrieve attendance record for an employee on a specific calendar date."""
    result = await db.execute(
        _attendance_query().where(
            Attendance.employee_id == employee_id,
            Attendance.attendance_date == att_date,
        )
    )
    return result.scalar_one_or_none()


async def get_open_attendance(db: AsyncSession, employee_id: int) -> Attendance | None:
    """Find currently open attendance session (check_in present, check_out NULL)."""
    result = await db.execute(
        _attendance_query()
        .where(
            Attendance.employee_id == employee_id,
            Attendance.check_out.is_(None),
        )
        .order_by(Attendance.check_in.desc())
    )
    return result.scalars().first()


async def get_employee_schedule_line(
    db: AsyncSession,
    employee: Employee,
    att_date: date,
) -> WorkingScheduleDay | None:
    """
    Resolve the expected WorkingScheduleDay for the given employee on att_date.

    Lookup hierarchy:
    1. Employee's assigned working_schedule (if set).
    2. Default active system working_schedule (Standard 40h/week).
    """
    schedule = employee.working_schedule
    if schedule is None:
        schedule = await schedule_service.get_default_schedule(db)

    if schedule is None or not schedule.lines:
        return None

    weekday = att_date.weekday()  # 0 = Monday ... 6 = Sunday
    for line in schedule.lines:
        if line.day_of_week == weekday:
            return line
    return None


def calculate_attendance_metrics(
    check_in: datetime,
    check_out: datetime | None,
    schedule_line: WorkingScheduleDay | None,
) -> dict[str, Any]:
    """
    Calculate server-side worked time, late arrival, overtime, and final status.

    Rules:
    - check_out is None -> INCOMPLETE
    - Late arrival = check_in time past scheduled start_time
    - Worked minutes = (check_out - check_in) - break (break deducted if worked >= 4 hours)
    - Overtime = worked_minutes - expected_work_minutes (if > 0)
    - Non-working day (schedule_line is None) -> all worked minutes are overtime
    """
    # Normalize tzinfo so aware and naive are safely comparable
    if check_out is not None:
        if check_in.tzinfo is not None and check_out.tzinfo is None:
            check_out = check_out.replace(tzinfo=check_in.tzinfo)
        elif check_in.tzinfo is None and check_out.tzinfo is not None:
            check_in = check_in.replace(tzinfo=check_out.tzinfo)

    # 1. Open session (no check-out yet)
    if check_out is None:
        late_minutes = 0
        if schedule_line is not None:
            c_in_time = check_in.time()
            if c_in_time > schedule_line.start_time:
                diff = (c_in_time.hour * 60 + c_in_time.minute) - (
                    schedule_line.start_time.hour * 60 + schedule_line.start_time.minute
                )
                late_minutes = max(0, diff)

        return {
            "worked_minutes": 0,
            "late_minutes": late_minutes,
            "overtime_minutes": 0,
            "status": AttendanceStatus.INCOMPLETE,
        }

    # 2. Check-out validation
    if check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="check_out must be strictly after check_in.",
        )

    elapsed_minutes = int((check_out - check_in).total_seconds() // 60)

    # 3. Schedule comparison
    if schedule_line is not None:
        c_in_time = check_in.time()
        if c_in_time > schedule_line.start_time:
            diff = (c_in_time.hour * 60 + c_in_time.minute) - (
                schedule_line.start_time.hour * 60 + schedule_line.start_time.minute
            )
            late_minutes = max(0, diff)
        else:
            late_minutes = 0

        break_min = schedule_line.break_minutes
        expected_work_minutes = int(schedule_line.work_hours * 60)

        # Deduct break only if shift was at least 4 hours
        if elapsed_minutes >= 4 * 60:
            worked_minutes = max(0, elapsed_minutes - break_min)
        else:
            worked_minutes = elapsed_minutes

        if worked_minutes > expected_work_minutes:
            overtime_minutes = worked_minutes - expected_work_minutes
        else:
            overtime_minutes = 0

        # Status determination
        if late_minutes > 0:
            att_status = AttendanceStatus.LATE
        elif expected_work_minutes > 0 and worked_minutes < (expected_work_minutes // 2):
            att_status = AttendanceStatus.HALF_DAY
        else:
            att_status = AttendanceStatus.PRESENT

    else:
        # Non-working day (e.g. weekend or unscheduled shift)
        late_minutes = 0
        if elapsed_minutes >= 4 * 60:
            worked_minutes = max(0, elapsed_minutes - 60)
        else:
            worked_minutes = elapsed_minutes

        overtime_minutes = worked_minutes
        att_status = AttendanceStatus.PRESENT

    return {
        "worked_minutes": worked_minutes,
        "late_minutes": late_minutes,
        "overtime_minutes": overtime_minutes,
        "status": att_status,
    }


async def check_in(
    db: AsyncSession,
    employee_id: int,
    check_in_time: datetime | None = None,
) -> Attendance:
    """
    Execute employee check-in.

    Validations:
    - Employee must exist and be ACTIVE
    - One open attendance record per employee/day
    - Duplicate check-in on same day is rejected
    """
    employee = await db.get(Employee, employee_id, options=[selectinload(Employee.working_schedule)])
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} does not exist.",
        )

    if employee.status != EmployeeStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee {employee.full_name} is {employee.status.value} and cannot check in.",
        )

    now = check_in_time or datetime.now(timezone.utc)
    att_date = now.date()

    # Check for existing record on the same calendar date
    existing = await get_attendance_by_employee_and_date(db, employee_id, att_date)
    if existing is not None:
        if existing.check_out is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An open attendance session is already in progress for today.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance record already exists for employee {employee_id} on {att_date}.",
        )

    # Resolve applicable schedule line
    schedule_line = await get_employee_schedule_line(db, employee, att_date)
    metrics = calculate_attendance_metrics(now, None, schedule_line)

    attendance = Attendance(
        employee_id=employee_id,
        attendance_date=att_date,
        check_in=now,
        check_out=None,
        worked_minutes=metrics["worked_minutes"],
        late_minutes=metrics["late_minutes"],
        overtime_minutes=metrics["overtime_minutes"],
        status=metrics["status"],
        is_manual_edit=False,
    )
    db.add(attendance)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance record already exists for employee {employee_id} on {att_date}.",
        ) from exc

    return await get_attendance_by_id(db, attendance.id)  # type: ignore[return-value]


async def check_out(
    db: AsyncSession,
    employee_id: int,
    check_out_time: datetime | None = None,
) -> Attendance:
    """
    Execute employee check-out for the currently active open attendance.

    Validations:
    - Open session must exist
    - check_out must be strictly after check_in
    - Derived metrics are computed atomically
    """
    employee = await db.get(Employee, employee_id, options=[selectinload(Employee.working_schedule)])
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} does not exist.",
        )

    open_att = await get_open_attendance(db, employee_id)
    if open_att is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open attendance session found to check out from.",
        )

    now = check_out_time or datetime.now(timezone.utc)

    if now <= open_att.check_in:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Check-out time must be strictly after check-in time.",
        )

    schedule_line = await get_employee_schedule_line(db, employee, open_att.attendance_date)
    metrics = calculate_attendance_metrics(open_att.check_in, now, schedule_line)

    open_att.check_out = now
    open_att.worked_minutes = metrics["worked_minutes"]
    open_att.late_minutes = metrics["late_minutes"]
    open_att.overtime_minutes = metrics["overtime_minutes"]
    open_att.status = metrics["status"]

    await db.flush()
    return await get_attendance_by_id(db, open_att.id)  # type: ignore[return-value]


async def get_active_session(db: AsyncSession, employee_id: int) -> AttendanceSessionResponse:
    """Get active session details for header widget."""
    open_att = await get_open_attendance(db, employee_id)
    if open_att is None:
        return AttendanceSessionResponse(has_active_session=False)

    now = datetime.now(timezone.utc)
    elapsed_sec = int((now - open_att.check_in).total_seconds())

    return AttendanceSessionResponse(
        has_active_session=True,
        session_id=open_att.id,
        check_in_time=open_att.check_in,
        elapsed_seconds=max(0, elapsed_sec),
    )


async def create_manual_attendance(
    db: AsyncSession,
    data: AttendanceCreate,
) -> Attendance:
    """Create manual attendance record by authorized HR/Admin."""
    employee = await db.get(Employee, data.employee_id, options=[selectinload(Employee.working_schedule)])
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {data.employee_id} does not exist.",
        )

    existing = await get_attendance_by_employee_and_date(db, data.employee_id, data.attendance_date)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance record already exists for employee {data.employee_id} on {data.attendance_date}.",
        )

    schedule_line = await get_employee_schedule_line(db, employee, data.attendance_date)
    metrics = calculate_attendance_metrics(data.check_in, data.check_out, schedule_line)

    attendance = Attendance(
        employee_id=data.employee_id,
        attendance_date=data.attendance_date,
        check_in=data.check_in,
        check_out=data.check_out,
        worked_minutes=metrics["worked_minutes"],
        late_minutes=metrics["late_minutes"],
        overtime_minutes=metrics["overtime_minutes"],
        status=metrics["status"],
        is_manual_edit=True,
        correction_reason=data.correction_reason or "Manual creation",
    )
    db.add(attendance)
    await db.flush()

    return await get_attendance_by_id(db, attendance.id)  # type: ignore[return-value]


async def update_attendance(
    db: AsyncSession,
    attendance_id: int,
    data: AttendanceUpdate,
) -> Attendance:
    """Manually correct attendance, requiring audit rationale and recalculating metrics."""
    att = await get_attendance_by_id(db, attendance_id)
    if att is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {attendance_id} does not exist.",
        )

    if not data.correction_reason or len(data.correction_reason.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="A valid correction_reason (min 3 characters) is required.",
        )

    new_check_in = data.check_in if data.check_in is not None else att.check_in
    new_check_out = data.check_out if data.check_out is not None else att.check_out

    employee = await db.get(Employee, att.employee_id, options=[selectinload(Employee.working_schedule)])
    schedule_line = await get_employee_schedule_line(db, employee, att.attendance_date)  # type: ignore[arg-type]

    metrics = calculate_attendance_metrics(new_check_in, new_check_out, schedule_line)

    att.check_in = new_check_in
    att.check_out = new_check_out
    att.worked_minutes = metrics["worked_minutes"]
    att.late_minutes = metrics["late_minutes"]
    att.overtime_minutes = metrics["overtime_minutes"]
    att.status = metrics["status"]
    att.is_manual_edit = True
    att.correction_reason = data.correction_reason.strip()

    await db.flush()
    return await get_attendance_by_id(db, att.id)  # type: ignore[return-value]


async def delete_attendance(db: AsyncSession, attendance_id: int) -> None:
    """Delete an attendance record."""
    att = await get_attendance_by_id(db, attendance_id)
    if att is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {attendance_id} does not exist.",
        )
    await db.delete(att)
    await db.flush()


async def list_attendances(
    db: AsyncSession,
    employee_id: int | None = None,
    department_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status_filter: AttendanceStatus | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Attendance], int]:
    """List attendances with filters and pagination."""
    query = _attendance_query()
    count_query = select(func.count(Attendance.id))

    if department_id is not None:
        query = query.join(Attendance.employee).where(Employee.department_id == department_id)
        count_query = count_query.join(Attendance.employee).where(Employee.department_id == department_id)

    if employee_id is not None:
        query = query.where(Attendance.employee_id == employee_id)
        count_query = count_query.where(Attendance.employee_id == employee_id)

    if date_from is not None:
        query = query.where(Attendance.attendance_date >= date_from)
        count_query = count_query.where(Attendance.attendance_date >= date_from)

    if date_to is not None:
        query = query.where(Attendance.attendance_date <= date_to)
        count_query = count_query.where(Attendance.attendance_date <= date_to)

    if status_filter is not None:
        query = query.where(Attendance.status == status_filter)
        count_query = count_query.where(Attendance.status == status_filter)

    total = await db.scalar(count_query) or 0
    query = query.order_by(Attendance.attendance_date.desc(), Attendance.check_in.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total

