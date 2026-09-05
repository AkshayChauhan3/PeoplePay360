from datetime import datetime, time
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.schedule import WorkingSchedule, WorkingScheduleDay
from app.schemas.schedule import ScheduleIn


def _schedule_query():
    return select(WorkingSchedule).options(selectinload(WorkingSchedule.lines))


async def get_schedule_by_id(db: AsyncSession, schedule_id: int) -> WorkingSchedule | None:
    """Retrieve working schedule by ID with day lines eagerly loaded."""
    result = await db.execute(_schedule_query().where(WorkingSchedule.id == schedule_id))
    return result.scalar_one_or_none()


async def get_schedule_by_name(db: AsyncSession, name: str) -> WorkingSchedule | None:
    """Retrieve working schedule by unique name."""
    result = await db.execute(_schedule_query().where(WorkingSchedule.name == name))
    return result.scalar_one_or_none()


async def get_default_schedule(db: AsyncSession) -> WorkingSchedule | None:
    """Retrieve the primary active default working schedule."""
    # Look for Standard 40 Hours/Week first, otherwise the first active schedule
    result = await db.execute(
        _schedule_query()
        .where(WorkingSchedule.name == "Standard 40 Hours/Week")
    )
    sched = result.scalar_one_or_none()
    if sched is not None:
        return sched

    result = await db.execute(
        _schedule_query()
        .where(WorkingSchedule.is_active.is_(True))
        .order_by(WorkingSchedule.id.asc())
    )
    return result.scalars().first()


async def list_schedules(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> list[WorkingSchedule]:
    """List working schedules with pagination."""
    result = await db.execute(
        _schedule_query()
        .order_by(WorkingSchedule.id.asc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


def _compute_line_work_hours(start: time, end: time, break_minutes: int) -> Decimal:
    """Calculate daily work hours: (end - start) - break."""
    # Build dummy datetime for difference calculation
    dt_today = datetime(2000, 1, 1)
    dt_start = datetime.combine(dt_today, start)
    dt_end = datetime.combine(dt_today, end)
    if dt_end <= dt_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Shift end_time must be strictly after start_time.",
        )
    total_minutes = int((dt_end - dt_start).total_seconds() // 60)
    net_minutes = max(0, total_minutes - break_minutes)
    return Decimal(str(round(net_minutes / 60.0, 2)))


async def create_schedule(db: AsyncSession, data: ScheduleIn) -> WorkingSchedule:
    """Create a new WorkingSchedule with line items."""
    existing = await get_schedule_by_name(db, data.name.strip())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Working schedule '{data.name}' already exists.",
        )

    # Validate day uniqueness within payload
    days_seen = set()
    total_hours = Decimal("0.00")
    line_objects = []

    for line_in in data.lines:
        if line_in.day_of_week in days_seen:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Duplicate day_of_week {line_in.day_of_week} in schedule lines.",
            )
        days_seen.add(line_in.day_of_week)

        wh = _compute_line_work_hours(line_in.start_time, line_in.end_time, line_in.break_minutes)
        total_hours += wh
        line_objects.append(
            WorkingScheduleDay(
                day_of_week=line_in.day_of_week,
                start_time=line_in.start_time,
                end_time=line_in.end_time,
                break_minutes=line_in.break_minutes,
                work_hours=wh,
            )
        )

    schedule = WorkingSchedule(
        name=data.name.strip(),
        calendar_type=data.calendar_type.strip(),
        hours_per_week=total_hours,
        days_per_week=len(line_objects),
        is_active=True,
        lines=line_objects,
    )
    db.add(schedule)
    await db.flush()

    return await get_schedule_by_id(db, schedule.id)  # type: ignore[return-value]


async def seed_default_schedule(db: AsyncSession) -> WorkingSchedule:
    """Seed the default Standard 40 Hours/Week schedule if missing."""
    sched = await get_schedule_by_name(db, "Standard 40 Hours/Week")
    if sched is not None:
        return sched

    lines = []
    for d in range(5):  # 0 to 4: Monday to Friday
        lines.append(
            WorkingScheduleDay(
                day_of_week=d,
                start_time=time(9, 0, 0),
                end_time=time(18, 0, 0),
                break_minutes=60,
                work_hours=Decimal("8.00"),
            )
        )

    sched = WorkingSchedule(
        name="Standard 40 Hours/Week",
        calendar_type="STANDARD",
        hours_per_week=Decimal("40.00"),
        days_per_week=5,
        is_active=True,
        lines=lines,
    )
    db.add(sched)
    await db.flush()
    return sched

