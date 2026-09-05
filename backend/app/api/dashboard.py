from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.contract import Contract, ContractStatus
from app.models.department import Department
from app.models.employee import Employee, EmployeeStatus
from app.models.job_position import JobPosition
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.models.time_off import TimeOffRequest, TimeOffRequestStatus, TimeOffType

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DEPARTMENT_COLORS = [
    "var(--primary)",
    "#623067",
    "var(--secondary)",
    "#007694",
    "#27a4c4",
    "#e07a5f",
]


@router.get("/summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """
    Return comprehensive, live executive KPIs and telemetry for HRMS & Payroll Dashboard:
    - Active headcount and department rosters
    - Running contracts, wage commitments, expiring & draft contracts
    - Attendance check-ins, late arrivals, and rate for today
    - Approved on-leave counts and pending leave requests
    - Real department salary breakdown and headcount distribution
    - Monthly payroll liabilities & recent payruns
    - Action items dynamically triggered by database state
    """
    today = date.today()

    # 1. Total active employees count
    total_emp_res = await db.execute(
        select(func.count(Employee.id)).where(Employee.status != EmployeeStatus.TERMINATED)
    )
    total_employees = total_emp_res.scalar() or 0

    # 2. Contracts telemetry
    contracts_res = await db.execute(
        select(
            Contract.status,
            Contract.end_date,
            Contract.wage,
        )
    )
    all_contracts = contracts_res.all()

    active_contracts = 0
    draft_contracts = 0
    expiring_contracts = 0
    monthly_payroll = Decimal("0.00")

    thirty_days_later = today + timedelta(days=30)
    for c_status, end_d, wage in all_contracts:
        if c_status == ContractStatus.RUNNING:
            active_contracts += 1
            monthly_payroll += wage or Decimal("0.00")
            if end_d and today <= end_d <= thirty_days_later:
                expiring_contracts += 1
        elif c_status == ContractStatus.DRAFT:
            draft_contracts += 1

    # 3. Pending leave requests count & recent requests
    pending_leaves_res = await db.execute(
        select(func.count(TimeOffRequest.id)).where(
            TimeOffRequest.status == TimeOffRequestStatus.PENDING
        )
    )
    pending_leaves = pending_leaves_res.scalar() or 0

    # Approved leaves covering today
    on_leave_today_res = await db.execute(
        select(func.count(TimeOffRequest.id)).where(
            TimeOffRequest.status == TimeOffRequestStatus.APPROVED,
            TimeOffRequest.start_date <= today,
            TimeOffRequest.end_date >= today,
        )
    )
    on_leave_today = on_leave_today_res.scalar() or 0

    # 4. Today's attendance
    att_res = await db.execute(
        select(
            Attendance.status,
            func.count(Attendance.id),
        )
        .where(Attendance.attendance_date == today)
        .group_by(Attendance.status)
    )
    att_counts = dict(att_res.all())
    present_today = att_counts.get(AttendanceStatus.PRESENT, 0)
    late_today = att_counts.get(AttendanceStatus.LATE, 0)
    total_present_and_late = present_today + late_today
    att_rate = (
        round((total_present_and_late / total_employees * 100), 1)
        if total_employees > 0
        else 0.0
    )

    # 5. Open job positions & active departments
    open_jobs_res = await db.execute(
        select(func.count(JobPosition.id)).where(JobPosition.is_active == True)
    )
    open_jobs = open_jobs_res.scalar() or 0

    active_depts_res = await db.execute(
        select(func.count(Department.id)).where(Department.is_active == True)
    )
    active_depts_count = active_depts_res.scalar() or 0

    # 6. Salary and Headcount breakdown by Department
    dept_stats_res = await db.execute(
        select(
            Department.name,
            func.count(Employee.id).label("emp_count"),
            func.coalesce(func.sum(Contract.wage), 0).label("total_wage"),
        )
        .join(Employee, Employee.department_id == Department.id, isouter=True)
        .join(
            Contract,
            (Contract.employee_id == Employee.id) & (Contract.status == ContractStatus.RUNNING),
            isouter=True,
        )
        .where(Department.is_active == True)
        .group_by(Department.id, Department.name)
        .order_by(func.coalesce(func.sum(Contract.wage), 0).desc())
    )
    dept_rows = dept_stats_res.all()

    salary_by_department = []
    headcount_by_department = []
    total_wage_all = float(monthly_payroll) if monthly_payroll > 0 else 1.0

    for idx, (dept_name, emp_count, dept_wage) in enumerate(dept_rows):
        w_float = float(dept_wage)
        color = DEPARTMENT_COLORS[idx % len(DEPARTMENT_COLORS)]
        pct_sal = round((w_float / total_wage_all) * 100, 1) if total_wage_all > 0 else 0.0
        pct_head = round((emp_count / total_employees) * 100, 1) if total_employees > 0 else 0.0

        salary_by_department.append({
            "department": dept_name,
            "amount": w_float,
            "formatted": f"₹{(w_float / 100000):.1f}L",
            "percentage": pct_sal,
            "color": color,
            "employee_count": emp_count,
        })
        headcount_by_department.append({
            "department": dept_name,
            "count": emp_count,
            "percentage": pct_head,
            "color": color,
        })

    # 7. Monthly Net Salary Trend from Payruns
    payruns_res = await db.execute(
        select(
            Payrun.id,
            Payrun.name,
            Payrun.period_start,
            Payrun.period_end,
            Payrun.status,
            func.coalesce(func.sum(Payslip.gross_amount), 0).label("gross"),
            func.coalesce(func.sum(Payslip.deduction_amount), 0).label("deductions"),
            func.coalesce(func.sum(Payslip.net_amount), 0).label("net"),
        )
        .join(Payslip, Payslip.payrun_id == Payrun.id, isouter=True)
        .group_by(Payrun.id, Payrun.name, Payrun.period_start, Payrun.period_end, Payrun.status)
        .order_by(Payrun.period_start.asc())
    )
    payrun_rows = payruns_res.all()

    monthly_trend = []
    max_net = max([float(r.net) for r in payrun_rows], default=1.0)
    if max_net <= 0:
        max_net = 1.0

    for pr in payrun_rows:
        net_val = float(pr.net)
        month_label = pr.period_start.strftime("%b")
        height_pct = max(15, min(100, int((net_val / max_net) * 100)))
        monthly_trend.append({
            "id": pr.id,
            "name": pr.name,
            "month": month_label,
            "status": pr.status.value,
            "gross": float(pr.gross),
            "deductions": float(pr.deductions),
            "net": net_val,
            "amount": net_val,
            "formatted": f"₹{(net_val / 100000):.1f}L",
            "height": f"{height_pct}%",
        })

    # 8. Recent Leave Requests
    leaves_res = await db.execute(
        select(TimeOffRequest)
        .options(
            selectinload(TimeOffRequest.employee).selectinload(Employee.department),
            selectinload(TimeOffRequest.time_off_type),
        )
        .order_by(TimeOffRequest.created_at.desc())
        .limit(8)
    )
    recent_leaves_objs = leaves_res.scalars().all()
    recent_leaves = []
    for req in recent_leaves_objs:
        emp = req.employee
        emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Employee"
        dept_name = emp.department.name if emp and emp.department else "General"
        type_name = req.time_off_type.name if req.time_off_type else "Leave"
        recent_leaves.append({
            "id": req.id,
            "name": emp_name,
            "dept": dept_name,
            "type": type_name,
            "days": float(req.requested_quantity),
            "date": f"{req.start_date.strftime('%b %d')} - {req.end_date.strftime('%b %d')}",
            "status": req.status.value,
            "avatar": f"https://ui-avatars.com/api/?name={emp_name.replace(' ', '+')}&background=0f4c81&color=fff",
        })

    # 9. Dynamic Executive Action Items
    pending_actions = []
    action_id = 1
    if pending_leaves > 0:
        pending_actions.append({
            "id": action_id,
            "title": f"Review {pending_leaves} Pending Leave Requests",
            "subtext": "Awaiting HR approval and balance validation",
            "badge": "Urgent",
            "badge_type": "critical",
            "action": "Review",
            "target": "time_off_requests",
        })
        action_id += 1

    if expiring_contracts > 0:
        pending_actions.append({
            "id": action_id,
            "title": f"{expiring_contracts} Employment Contracts Expiring Soon",
            "subtext": "Expiring within next 30 days — renewal required",
            "badge": "Attention",
            "badge_type": "amber",
            "action": "Review",
            "target": "all_contracts",
        })
        action_id += 1

    if draft_contracts > 0:
        pending_actions.append({
            "id": action_id,
            "title": f"{draft_contracts} Draft Contracts Pending Signature",
            "subtext": "New joiner onboarding documents ready",
            "badge": "Draft",
            "badge_type": "purple",
            "action": "Confirm",
            "target": "all_contracts",
        })
        action_id += 1

    # Current payrun status action
    active_payrun = next((pr for pr in reversed(payrun_rows) if pr.status != PayrunStatus.PAID), None)
    if active_payrun:
        pending_actions.append({
            "id": action_id,
            "title": f"Current Payrun Batch: {active_payrun.name}",
            "subtext": f"Status: {active_payrun.status.value} — ready for audit & validation",
            "badge": active_payrun.status.value,
            "badge_type": "green" if active_payrun.status == PayrunStatus.COMPUTED else "amber",
            "action": "Open Batch",
            "target": "payruns",
        })

    return {
        "status": "success",
        "data": {
            "total_employees": total_employees,
            "active_contracts": active_contracts,
            "expiring_contracts": expiring_contracts,
            "draft_contracts": draft_contracts,
            "monthly_payroll_cost": float(monthly_payroll),
            "pending_leave_requests": pending_leaves,
            "present_today": total_present_and_late,
            "on_time_today": present_today,
            "late_today": late_today,
            "on_leave_today": on_leave_today,
            "attendance_rate": att_rate,
            "open_jobs": open_jobs,
            "active_depts_count": active_depts_count,
            "salary_by_department": salary_by_department,
            "headcount_by_department": headcount_by_department,
            "monthly_trend": monthly_trend,
            "recent_leaves": recent_leaves,
            "pending_actions": pending_actions,
        },
    }
