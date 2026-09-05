from datetime import datetime, time, timezone
from decimal import Decimal, ROUND_HALF_UP


class AttendanceError(Exception):
    """Raised when attendance operations violate business rules."""
    pass


def calculate_elapsed_hours(check_in: datetime, check_out: datetime) -> Decimal:
    """
    Calculates total elapsed hours between check-in and check-out.

    Example from specification:
        Check-in: 09:05, Check-out: 18:10 -> 9.08 hours.
    """
    if check_out < check_in:
        raise AttendanceError("Check-out time cannot precede check-in time.")

    duration_seconds = (check_out - check_in).total_seconds()
    hours = Decimal(str(duration_seconds / 3600.0)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return hours


def calculate_net_work_hours(
    elapsed_hours: Decimal,
    break_minutes: int = 60,
    min_hours_for_break: Decimal = Decimal("5.0"),
) -> Decimal:
    """
    Calculates net work hours by deducting lunch break for shifts exceeding min_hours_for_break.
    Ensures net hours never drop below zero.
    """
    if elapsed_hours >= min_hours_for_break and break_minutes > 0:
        break_hours = Decimal(str(break_minutes / 60.0))
        net = max(Decimal("0.00"), elapsed_hours - break_hours)
    else:
        net = elapsed_hours

    return net.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def determine_attendance_status(
    check_in_time: time,
    expected_start: time = time(9, 0),
    grace_minutes: int = 15,
    net_hours: Decimal | None = None,
    half_day_threshold: Decimal = Decimal("4.0"),
    standard_day_hours: Decimal = Decimal("8.0"),
) -> str:
    """
    Determines daily attendance status:
    - PRESENT: On time (within grace period) and completed standard day shift.
    - LATE: Arrived after scheduled start + grace period.
    - HALF_DAY: Worked less than standard day but more than half-day threshold.
    - OVERTIME: Worked more than scheduled standard day hours.
    """
    grace_delta_seconds = grace_minutes * 60
    check_in_seconds = (
        check_in_time.hour * 3600 + check_in_time.minute * 60 + check_in_time.second
    )
    expected_seconds = (
        expected_start.hour * 3600 + expected_start.minute * 60 + expected_start.second
    )

    is_late = (check_in_seconds - expected_seconds) > grace_delta_seconds

    if net_hours is not None:
        if net_hours < half_day_threshold:
            return "HALF_DAY"
        if net_hours > standard_day_hours:
            return "OVERTIME"

    if is_late:
        return "LATE"

    return "PRESENT"


def calculate_widget_session(
    check_in_time: datetime,
    current_time: datetime | None = None,
) -> dict:
    """
    Calculates current open session state for the global header popup widget.
    
    Returns:
        {
            "is_checked_in": True,
            "check_in_time": datetime,
            "elapsed_seconds": int,
            "elapsed_hours": Decimal,
        }
    """
    if current_time is None:
        current_time = datetime.now(timezone.utc)

    if current_time < check_in_time:
        current_time = check_in_time

    elapsed_seconds = int((current_time - check_in_time).total_seconds())
    elapsed_hours = Decimal(str(elapsed_seconds / 3600.0)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    return {
        "is_checked_in": True,
        "check_in_time": check_in_time,
        "elapsed_seconds": elapsed_seconds,
        "elapsed_hours": elapsed_hours,
    }


def create_audit_correction_diff(
    original_check_in: datetime,
    original_check_out: datetime | None,
    new_check_in: datetime,
    new_check_out: datetime,
    actor_id: str,
    reason: str,
) -> dict:
    """
    Prepares an immutable audit log payload for authorized manager attendance corrections.
    """
    if not reason or not reason.strip():
        raise AttendanceError("Correction reason is required for attendance audit logs.")

    if new_check_out < new_check_in:
        raise AttendanceError("Corrected check-out time cannot precede check-in time.")

    original_hours = (
        calculate_elapsed_hours(original_check_in, original_check_out)
        if original_check_out
        else None
    )
    corrected_hours = calculate_elapsed_hours(new_check_in, new_check_out)

    return {
        "actor_id": actor_id,
        "reason": reason.strip(),
        "timestamp": datetime.now(timezone.utc),
        "before": {
            "check_in": original_check_in.isoformat(),
            "check_out": original_check_out.isoformat() if original_check_out else None,
            "elapsed_hours": str(original_hours) if original_hours else None,
        },
        "after": {
            "check_in": new_check_in.isoformat(),
            "check_out": new_check_out.isoformat(),
            "elapsed_hours": str(corrected_hours),
        },
    }
