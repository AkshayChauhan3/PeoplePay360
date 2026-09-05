import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.attendance_service import (
    calculate_elapsed_hours,
    calculate_net_work_hours,
    calculate_widget_session,
    determine_attendance_status,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# In-memory store for active open sessions (session state for the live widget)
# Key: user_id (UUID), Value: check_in_time (datetime)
_ACTIVE_SESSIONS: dict[uuid.UUID, datetime] = {}


class CheckInResponse(BaseModel):
    message: str
    user_id: uuid.UUID
    check_in_time: datetime
    is_checked_in: bool = True


class CheckOutResponse(BaseModel):
    message: str
    user_id: uuid.UUID
    check_in_time: datetime
    check_out_time: datetime
    elapsed_hours: Decimal
    net_hours: Decimal
    status: str


class SessionStatusResponse(BaseModel):
    is_checked_in: bool
    check_in_time: datetime | None = None
    elapsed_seconds: int = 0
    elapsed_hours: Decimal = Decimal("0.00")


@router.get("/session", response_model=SessionStatusResponse)
async def get_current_session(current_user: User = Depends(get_current_user)):
    """
    Returns the live attendance session for the top navbar widget.
    If checked in, returns elapsed seconds and live hours for the timer.
    """
    check_in_time = _ACTIVE_SESSIONS.get(current_user.id)
    if not check_in_time:
        return SessionStatusResponse(is_checked_in=False)

    session_info = calculate_widget_session(check_in_time)
    return SessionStatusResponse(
        is_checked_in=True,
        check_in_time=session_info["check_in_time"],
        elapsed_seconds=session_info["elapsed_seconds"],
        elapsed_hours=session_info["elapsed_hours"],
    )


@router.post("/check-in", response_model=CheckInResponse)
async def check_in(current_user: User = Depends(get_current_user)):
    """
    Clocks in the current employee using authoritative server timestamp.
    Rejects duplicate check-ins if a session is already active.
    """
    if current_user.id in _ACTIVE_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active session already open. You must check out before checking in again.",
        )

    now = datetime.now(timezone.utc)
    _ACTIVE_SESSIONS[current_user.id] = now

    return CheckInResponse(
        message="Checked in successfully.",
        user_id=current_user.id,
        check_in_time=now,
    )


@router.post("/check-out", response_model=CheckOutResponse)
async def check_out(current_user: User = Depends(get_current_user)):
    """
    Clocks out the current employee and calculates net hours and attendance status.
    """
    check_in_time = _ACTIVE_SESSIONS.pop(current_user.id, None)
    if not check_in_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active check-in session found. You must check in first.",
        )

    check_out_time = datetime.now(timezone.utc)
    elapsed = calculate_elapsed_hours(check_in_time, check_out_time)
    net = calculate_net_work_hours(elapsed)
    attendance_status = determine_attendance_status(check_in_time.time(), net_hours=net)

    return CheckOutResponse(
        message="Checked out successfully.",
        user_id=current_user.id,
        check_in_time=check_in_time,
        check_out_time=check_out_time,
        elapsed_hours=elapsed,
        net_hours=net,
        status=attendance_status,
    )
