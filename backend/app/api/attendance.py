from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_hr_management
from app.models.attendance import AttendanceStatus
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceCreate,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceSessionResponse,
    AttendanceUpdate,
)
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])

_HR_ROLES = {
    UserRole.ADMIN.value,
    UserRole.HR_MANAGER.value,
    UserRole.HR_PAYROLL_USER.value,
    UserRole.HR_PAYROLL_MANAGER.value,
}


def _format_attendance_response(att) -> AttendanceResponse:
    """Helper converting ORM attendance model to AttendanceResponse."""
    emp_name = att.employee.full_name if att.employee else None
    return AttendanceResponse(
        id=att.id,
        employee_id=att.employee_id,
        employee_name=emp_name,
        attendance_date=att.attendance_date,
        check_in=att.check_in,
        check_out=att.check_out,
        worked_minutes=att.worked_minutes,
        late_minutes=att.late_minutes,
        overtime_minutes=att.overtime_minutes,
        status=att.status,
        is_manual_edit=att.is_manual_edit,
        correction_reason=att.correction_reason,
        elapsed_hours=att.elapsed_hours,
        net_hours=att.net_hours,
        late_hours=att.late_hours,
        overtime_hours=att.overtime_hours,
        created_at=att.created_at,
        updated_at=att.updated_at,
    )


# ---------------------------------------------------------------------------
# Self-Service Check-In & Check-Out
# ---------------------------------------------------------------------------


@router.post("/check-in", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def employee_check_in(
    payload: AttendanceCheckInRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceResponse:
    """
    Self-service check-in for currently authenticated employee.

    Derives employee from authenticated user session; does not accept client-provided employee_id.
    """
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile. Please contact HR to link your account.",
        )

    ts = payload.timestamp if payload else None
    att = await attendance_service.check_in(db, current_user.employee_id, ts)
    return _format_attendance_response(att)


@router.post("/check-out", response_model=AttendanceResponse)
async def employee_check_out(
    payload: AttendanceCheckOutRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceResponse:
    """
    Self-service check-out for currently authenticated employee.

    Finds and closes the active open attendance record.
    """
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile.",
        )

    ts = payload.timestamp if payload else None
    att = await attendance_service.check_out(db, current_user.employee_id, ts)
    return _format_attendance_response(att)


@router.post("/{id}/check-out", response_model=AttendanceResponse)
async def check_out_specific_attendance(
    id: int,
    payload: AttendanceCheckOutRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceResponse:
    """Check out a specific attendance record by ID (authorized self or HR)."""
    att = await attendance_service.get_attendance_by_id(db, id)
    if att is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {id} does not exist.",
        )

    is_hr = current_user.role_name in _HR_ROLES
    if not is_hr and current_user.employee_id != att.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this attendance record.",
        )

    ts = payload.timestamp if payload else None
    updated = await attendance_service.check_out(db, att.employee_id, ts)
    return _format_attendance_response(updated)


@router.get("/session", response_model=AttendanceSessionResponse)
async def get_current_attendance_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceSessionResponse:
    """
    Get current user's active attendance session state and elapsed time.
    Used by the UI header widget.
    """
    if current_user.employee_id is None:
        return AttendanceSessionResponse(has_active_session=False)

    return await attendance_service.get_active_session(db, current_user.employee_id)


# ---------------------------------------------------------------------------
# HR & Administrative Operations
# ---------------------------------------------------------------------------


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_attendance(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
) -> AttendanceResponse:
    """Manually create an attendance record for an employee (HR/Admin)."""
    att = await attendance_service.create_manual_attendance(db, data)
    return _format_attendance_response(att)


@router.get("", response_model=AttendanceListResponse)
async def list_attendances(
    employee_id: int | None = Query(None, description="Filter by employee ID"),
    department_id: int | None = Query(None, description="Filter by department ID"),
    date_from: date | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="End date filter (YYYY-MM-DD)"),
    status_filter: AttendanceStatus | None = Query(None, alias="status", description="Filter by attendance status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
) -> AttendanceListResponse:
    """List attendance records with filters and pagination (HR/Admin)."""
    items, total = await attendance_service.list_attendances(
        db,
        employee_id=employee_id,
        department_id=department_id,
        date_from=date_from,
        date_to=date_to,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return AttendanceListResponse(
        items=[_format_attendance_response(i) for i in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=AttendanceResponse)
async def get_attendance(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceResponse:
    """Retrieve attendance record detail (HR or linked employee)."""
    att = await attendance_service.get_attendance_by_id(db, id)
    if att is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {id} does not exist.",
        )

    is_hr = current_user.role_name in _HR_ROLES
    if not is_hr and current_user.employee_id != att.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this attendance record.",
        )

    return _format_attendance_response(att)


@router.patch("/{id}", response_model=AttendanceResponse)
async def update_attendance(
    id: int,
    data: AttendanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
) -> AttendanceResponse:
    """
    Manually correct an attendance record.
    Requires correction_reason and recalculates all metrics on the server.
    """
    att = await attendance_service.update_attendance(db, id, data)
    return _format_attendance_response(att)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
) -> None:
    """Delete an attendance record (HR/Admin only)."""
    await attendance_service.delete_attendance(db, id)

