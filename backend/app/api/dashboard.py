from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, distinct, func, select
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
async def get_dashboard_summary(
    period_start: date | None = Query(None),
    period_end: date | None = Query(None),
    department_id: int | None = Query(None),
    status: EmployeeStatus | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Return comprehensive, live executive KPIs and telemetry for HRMS & Payroll Dashboard:
    - Active headcount and department rosters (filtered by dept/status)
    - Running contracts, wage commitments, expiring & draft contracts (excluding terminated employees)
    - Attendance metrics: present, late, absent, incomplete, half-day, overtime, manual edits, coverage rate
    - Approved on-leave counts and pending leave requests
    - Real department salary breakdown and headcount distribution with consistent denominators
    - Monthly payroll liabilities & recent payruns
    - Action items dynamically triggered by database state, including missing bank details warnings
    """
    today = date.today()
    ref_date = period_end or today

    # 1. Total active employees count (filtered)
    emp_filter = []
    if status is not None:
        emp_filter.append(Employee.status == status)
    else:
        emp_filter.append(Employee.status != EmployeeStatus.TERMINATED)

    if department_id is not None:
        emp_filter.append(Employee.department_id == department_id)

    total_emp_res = await db.execute(
        select(func.count(Employee.id)).where(*emp_filter)
    )
    total_employees = total_emp_res.scalar() or 0

    # Total all-company active employees for global ratios
    global_active_res = await db.execute(
        select(func.count(Employee.id)).where(Employee.status != EmployeeStatus.TERMINATED)
    )
    global_active_employees = global_active_res.scalar() or 1

    # 2. Contracts telemetry (excluding terminated employees)
    contract_query = (
        select(
            Contract.status,
            Contract.end_date,
            Contract.wage,
        )
        .join(Employee, Employee.id == Contract.employee_id)
        .where(Employee.status != EmployeeStatus.TERMINATED)
    )
    if department_id is not None:
        contract_query = contract_query.where(Employee.department_id == department_id)
    if status is not None:
        contract_query = contract_query.where(Employee.status == status)

    contracts_res = await db.execute(contract_query)
    all_contracts = contracts_res.all()

    active_contracts = 0
    draft_contracts = 0
    expiring_contracts = 0
    monthly_payroll = Decimal("0.00")

    thirty_days_later = ref_date + timedelta(days=30)
    for c_status, end_d, wage in all_contracts:
        if c_status == ContractStatus.RUNNING:
            active_contracts += 1
            monthly_payroll += wage or Decimal("0.00")
            if end_d and ref_date <= end_d <= thirty_days_later:
                expiring_contracts += 1
        elif c_status == ContractStatus.DRAFT:
            draft_contracts += 1

    # 3. Pending leave requests count & recent requests
    leave_query = select(func.count(TimeOffRequest.id)).where(
        TimeOffRequest.status == TimeOffRequestStatus.PENDING
    )
    if department_id is not None:
        leave_query = leave_query.join(Employee, Employee.id == TimeOffRequest.employee_id).where(
            Employee.department_id == department_id
        )

    pending_leaves_res = await db.execute(leave_query)
    pending_leaves = pending_leaves_res.scalar() or 0

    # Approved leaves covering ref_date
    on_leave_query = select(func.count(TimeOffRequest.id)).where(
        TimeOffRequest.status == TimeOffRequestStatus.APPROVED,
        TimeOffRequest.start_date <= ref_date,
        TimeOffRequest.end_date >= ref_date,
    )
    if department_id is not None:
        on_leave_query = on_leave_query.join(Employee, Employee.id == TimeOffRequest.employee_id).where(
            Employee.department_id == department_id
        )

    on_leave_today_res = await db.execute(on_leave_query)
    on_leave_today = on_leave_today_res.scalar() or 0

    # 4. Attendance telemetry & extended analytics
    att_conditions = []
    if period_start and period_end:
        att_conditions.append(Attendance.attendance_date.between(period_start, period_end))
    else:
        att_conditions.append(Attendance.attendance_date == ref_date)

    att_base_query = select(
        Attendance.status,
        func.count(Attendance.id).label("count"),
        func.coalesce(func.sum(Attendance.overtime_minutes), 0).label("overtime"),
        func.coalesce(func.sum(case((Attendance.is_manual_edit == True, 1), else_=0)), 0).label("manual_edits"),
    )
    if department_id is not None or status is not None:
        att_base_query = att_base_query.join(Employee, Employee.id == Attendance.employee_id)
        if department_id is not None:
            att_base_query = att_base_query.where(Employee.department_id == department_id)
        if status is not None:
            att_base_query = att_base_query.where(Employee.status == status)

    att_base_query = att_base_query.where(*att_conditions).group_by(Attendance.status)
    att_res = await db.execute(att_base_query)
    att_rows = att_res.all()

    present_today = 0
    late_today = 0
    absent_today = 0
    incomplete_today = 0
    half_day_today = 0
    total_overtime_minutes = 0
    total_manual_edits = 0
    total_att_records = 0

    for st, cnt, ot, medits in att_rows:
        total_att_records += cnt
        total_overtime_minutes += int(ot or 0)
        total_manual_edits += int(medits or 0)
        if st == AttendanceStatus.PRESENT:
            present_today += cnt
        elif st == AttendanceStatus.LATE:
            late_today += cnt
        elif st == AttendanceStatus.ABSENT:
            absent_today += cnt
        elif st == AttendanceStatus.INCOMPLETE:
            incomplete_today += cnt
        elif st == AttendanceStatus.HALF_DAY:
            half_day_today += cnt

    total_present_and_late = present_today + late_today
    att_rate = (
        round((total_present_and_late / total_employees * 100), 1)
        if total_employees > 0
        else 0.0
    )
    coverage_rate = (
        round((total_att_records / total_employees * 100), 1)
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

    # 6. Salary and Headcount breakdown by Department (Bug #7 fix)
    dept_stats_res = await db.execute(
        select(
            Department.name,
            func.count(distinct(Employee.id)).filter(Employee.status != EmployeeStatus.TERMINATED).label("emp_count"),
            func.coalesce(func.sum(Contract.wage), 0).label("total_wage"),
        )
        .join(
            Employee,
            (Employee.department_id == Department.id) & (Employee.status != EmployeeStatus.TERMINATED),
            isouter=True,
        )
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
        pct_head = round((emp_count / global_active_employees) * 100, 1) if global_active_employees > 0 else 0.0

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
    recent_leaves_query = (
        select(TimeOffRequest)
        .options(
            selectinload(TimeOffRequest.employee).selectinload(Employee.department),
            selectinload(TimeOffRequest.time_off_type),
        )
    )
    if department_id is not None:
        recent_leaves_query = recent_leaves_query.join(Employee, Employee.id == TimeOffRequest.employee_id).where(
            Employee.department_id == department_id
        )

    recent_leaves_query = recent_leaves_query.order_by(TimeOffRequest.created_at.desc()).limit(8)
    leaves_res = await db.execute(recent_leaves_query)
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

    # Check for missing bank details on active employees with running contracts (Bug #4)
    missing_bank_res = await db.execute(
        select(func.count(distinct(Employee.id)))
        .join(Contract, (Contract.employee_id == Employee.id) & (Contract.status == ContractStatus.RUNNING))
        .where(
            Employee.status == EmployeeStatus.ACTIVE,
            (Employee.bank_account_number.is_(None)) | (Employee.bank_account_number == "") |
            (Employee.bank_name.is_(None)) | (Employee.bank_name == "") |
            (Employee.ifsc_code.is_(None)) | (Employee.ifsc_code == "")
        )
    )
    missing_bank_count = missing_bank_res.scalar() or 0
    if missing_bank_count > 0:
        pending_actions.append({
            "id": action_id,
            "title": f"{missing_bank_count} Active Employees Missing Bank Account Details",
            "subtext": "Direct deposit payout files require valid account and IFSC numbers",
            "badge": "Bank Warning",
            "badge_type": "critical",
            "action": "View Workforce",
            "target": "directory",
        })
        action_id += 1

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
            "absent_today": absent_today,
            "incomplete_today": incomplete_today,
            "half_day_today": half_day_today,
            "overtime_minutes": total_overtime_minutes,
            "manual_edits": total_manual_edits,
            "total_att_records": total_att_records,
            "coverage_rate": coverage_rate,
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
