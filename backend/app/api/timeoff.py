import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.services.leave_service import (
    LeaveCalculationError,
    calculate_working_days_in_period,
    check_leave_balance_available,
)

router = APIRouter(prefix="/timeoff", tags=["Time Off & Leaves"])

# In-memory store for demo leave requests
_LEAVE_REQUESTS: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class CalculateDaysIn(BaseModel):
    start_date: date = Field(..., example="2026-09-11")
    end_date: date = Field(..., example="2026-09-13")


class CalculateDaysOut(BaseModel):
    start_date: date
    end_date: date
    working_days: int
    note: str = "Derived from official working schedule (excludes weekends and off-days)"


class LeaveRequestIn(BaseModel):
    leave_type: str = Field(default="PAID", example="PAID")
    start_date: date = Field(..., example="2026-09-14")
    end_date: date = Field(..., example="2026-09-16")
    reason: str = Field(..., min_length=3, example="Family function")


class LeaveRequestOut(BaseModel):
    request_id: str
    user_id: uuid.UUID
    leave_type: str
    start_date: date
    end_date: date
    duration_days: int
    reason: str
    status: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/calculate-working-days", response_model=CalculateDaysOut)
async def calculate_working_days(
    payload: CalculateDaysIn,
    current_user: User = Depends(get_current_user),
):
    """
    Calculates actual working days between two dates based on shift schedules.
    Automatically excludes weekends.
    """
    try:
        working_days = calculate_working_days_in_period(
            payload.start_date, payload.end_date
        )
        return CalculateDaysOut(
            start_date=payload.start_date,
            end_date=payload.end_date,
            working_days=working_days,
        )
    except LeaveCalculationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/requests", response_model=LeaveRequestOut)
async def submit_leave_request(
    payload: LeaveRequestIn,
    current_user: User = Depends(get_current_user),
):
    """
    Submits a leave request, validates dates, and checks remaining quota.
    """
    try:
        duration = calculate_working_days_in_period(
            payload.start_date, payload.end_date
        )
        if duration <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected date range contains zero working days.",
            )

        # Quota balance check (Sample: Allocated 12 days, Taken 2 days -> Remaining 10 days)
        allocated = Decimal("12.00")
        taken = Decimal("2.00")
        is_sufficient, remaining = check_leave_balance_available(
            allocated_days=allocated,
            already_taken_days=taken,
            requested_days=Decimal(str(duration)),
        )

        if not is_sufficient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient leave balance. Requested: {duration} days, Available: {remaining} days.",
            )

        request_id = str(uuid.uuid4())
        record = {
            "request_id": request_id,
            "user_id": current_user.id,
            "leave_type": payload.leave_type,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "duration_days": duration,
            "reason": payload.reason,
            "status": "PENDING",
            "created_at": datetime.now(timezone.utc),
        }
        _LEAVE_REQUESTS[request_id] = record
        return LeaveRequestOut(**record)

    except LeaveCalculationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/requests", response_model=list[LeaveRequestOut])
async def list_leave_requests(current_user: User = Depends(get_current_user)):
    """
    Returns all submitted leave requests.
    """
    return [LeaveRequestOut(**r) for r in _LEAVE_REQUESTS.values()]


@router.post(
    "/requests/{request_id}/approve",
    response_model=LeaveRequestOut,
    dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.HR_MANAGER))],
)
async def approve_leave_request(request_id: str):
    """
    Approves a pending leave request. Restricted to HR_MANAGER and ADMIN.
    """
    record = _LEAVE_REQUESTS.get(request_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found."
        )

    record["status"] = "APPROVED"
    return LeaveRequestOut(**record)


@router.post(
    "/requests/{request_id}/refuse",
    response_model=LeaveRequestOut,
    dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.HR_MANAGER))],
)
async def refuse_leave_request(request_id: str):
    """
    Refuses a pending leave request. Restricted to HR_MANAGER and ADMIN.
    """
    record = _LEAVE_REQUESTS.get(request_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found."
        )

    record["status"] = "REFUSED"
    return LeaveRequestOut(**record)
