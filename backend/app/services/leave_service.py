from datetime import date, timedelta
from decimal import Decimal


# Mapping Python date.weekday() (0=Monday, 6=Sunday) to Schedule DayOfWeek names
WEEKDAY_MAP = {
    0: "MONDAY",
    1: "TUESDAY",
    2: "WEDNESDAY",
    3: "THURSDAY",
    4: "FRIDAY",
    5: "SATURDAY",
    6: "SUNDAY",
}

DEFAULT_WORKING_DAYS = frozenset({"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"})


class LeaveCalculationError(Exception):
    """Raised when leave dates, ranges, or balances are invalid."""
    pass


def calculate_working_days_in_period(
    start_date: date,
    end_date: date,
    working_days_set: set[str] | frozenset[str] | None = None,
) -> int:
    """
    Calculates the number of actual working days between start_date and end_date (inclusive).
    Derives duration from the working days schedule, automatically excluding off-days/weekends.

    Example:
        Under standard Monday-Friday schedule:
        Friday (Sep 12, 2026) to Sunday (Sep 14, 2026) = 1 working day (Friday only).
        Monday (Sep 14, 2026) to Wednesday (Sep 16, 2026) = 3 working days.
    """
    if end_date < start_date:
        raise LeaveCalculationError(
            f"End date ({end_date}) cannot precede start date ({start_date})."
        )

    if working_days_set is None:
        working_days_set = DEFAULT_WORKING_DAYS

    working_days_count = 0
    current = start_date

    while current <= end_date:
        weekday_name = WEEKDAY_MAP[current.weekday()]
        if weekday_name in working_days_set:
            working_days_count += 1
        current += timedelta(days=1)

    return working_days_count


def calculate_scheduled_working_days(
    start_date: date,
    end_date: date,
    schedule_lines: list | None = None,
) -> int:
    """
    Convenience helper that extracts active working days from a schedule's lines.
    If no schedule lines are provided, falls back to standard Monday through Friday.
    """
    if schedule_lines:
        active_days = {
            line.day_of_week.value if hasattr(line.day_of_week, "value") else str(line.day_of_week)
            for line in schedule_lines
        }
    else:
        active_days = DEFAULT_WORKING_DAYS

    return calculate_working_days_in_period(start_date, end_date, active_days)


def check_leave_balance_available(
    allocated_days: Decimal,
    already_taken_days: Decimal,
    requested_days: Decimal,
) -> tuple[bool, Decimal]:
    """
    Checks whether the employee has sufficient leave quota remaining.

    Returns:
        (is_sufficient: bool, remaining_balance: Decimal)
    """
    if requested_days <= Decimal("0"):
        raise LeaveCalculationError("Requested leave days must be greater than zero.")

    remaining = allocated_days - already_taken_days
    if remaining < Decimal("0"):
        remaining = Decimal("0.00")

    is_sufficient = remaining >= requested_days
    return is_sufficient, remaining
