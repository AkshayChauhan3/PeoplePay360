"""
seed_demo_data.py — PeoplePay360
Populates the PostgreSQL database with realistic, comprehensive demo records across all HRMS & Payroll modules:
- Departments & Job Positions
- Working Schedules & Daily Schedule Lines
- Employees & Associated User Accounts
- Employment Contracts (Running, Expiring, Draft, Expired)
- Time Off Types, Allocations, and Requests (covering Today and Pending)
- Daily Attendances (Present, Late, Absent, with worked hours)
- Salary Structure & Salary Rules
- Payruns (Historical Paid & Current Active) with Payslips & Payslip Lines
"""

import asyncio
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
import uuid

from sqlalchemy import select, text
from app.db.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.department import Department
from app.models.job_position import JobPosition
from app.models.schedule import Schedule, ScheduleLine
from app.models.employee import Employee, EmployeeStatus
from app.models.contract import Contract, ContractStatus
from app.models.time_off import (
    TimeOffType,
    TimeOffUnit,
    TimeOffAllocation,
    AllocationStatus,
    TimeOffRequest,
    TimeOffRequestStatus,
)
from app.models.attendance import Attendance, AttendanceStatus
from app.models.salary_structure import SalaryStructure
from app.models.salary_rule import SalaryRule, SalaryRuleCategory, ComputationType
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.models.payslip_line import PayslipLine
from app.models.user import User


async def seed():
    async with AsyncSessionLocal() as session:
        print("Starting PeoplePay360 database seeding...")

        # -------------------------------------------------------------
        # 0. Clean slate for demo data (excluding users.id = 1 admin)
        # -------------------------------------------------------------
        print("Clearing previous demo records...")
        await session.execute(text("DELETE FROM payslip_lines;"))
        await session.execute(text("DELETE FROM payslips;"))
        await session.execute(text("DELETE FROM payruns;"))
        await session.execute(text("DELETE FROM attendances;"))
        await session.execute(text("DELETE FROM time_off_requests;"))
        await session.execute(text("DELETE FROM time_off_allocations;"))
        await session.execute(text("DELETE FROM time_off_types;"))
        await session.execute(text("DELETE FROM contracts;"))
        await session.execute(text("UPDATE users SET employee_id = NULL;"))
        await session.execute(text("DELETE FROM employees;"))
        await session.execute(text("DELETE FROM salary_rules;"))
        await session.execute(text("DELETE FROM salary_structures;"))
        await session.execute(text("DELETE FROM working_schedule_days;"))
        await session.execute(text("DELETE FROM working_schedules;"))
        await session.execute(text("DELETE FROM job_positions;"))
        await session.execute(text("DELETE FROM departments;"))
        await session.execute(text("DELETE FROM users WHERE id > 1;"))
        await session.commit()

        # -------------------------------------------------------------
        # 1. Departments
        # -------------------------------------------------------------
        print("Seeding Departments...")
        dept_data = [
            ("Engineering", "ENG", "Core software development, cloud infrastructure, and QA"),
            ("Product & Design", "PRD", "Product strategy, roadmap, and UI/UX design"),
            ("Operations", "OPS", "Company logistics, customer success, and operations"),
            ("Human Resources", "HR", "Talent acquisition, employee relations, and payroll"),
            ("Sales & Marketing", "SALES", "Enterprise sales, business development, and branding"),
            ("Finance", "FIN", "Corporate accounting, financial planning, and audits"),
        ]
        dept_objs = {}
        for name, code, desc in dept_data:
            dept = Department(name=name, code=code, description=desc, is_active=True)
            session.add(dept)
            await session.flush()
            dept_objs[code] = dept

        # -------------------------------------------------------------
        # 2. Job Positions
        # -------------------------------------------------------------
        print("Seeding Job Positions...")
        job_data = [
            ("Engineering Lead", "ENG-LD", "Technical leadership & engineering architecture"),
            ("Senior Fullstack Engineer", "ENG-SFE", "Frontend and backend platform development"),
            ("Backend Engineer", "ENG-BE", "API, microservices, and database engineering"),
            ("DevOps Architect", "ENG-DO", "Cloud infrastructure, CI/CD, and site reliability"),
            ("Principal Product Manager", "PRD-PM", "Product definition and sprint strategy"),
            ("Lead Product Designer", "PRD-LPD", "Design system, wireframes, and prototypes"),
            ("Operations Director", "OPS-DIR", "Operational excellence and team enablement"),
            ("Operations Associate", "OPS-ASC", "Day-to-day business operations & logistics"),
            ("HR Generalist", "HR-GEN", "People operations and benefits coordination"),
            ("Talent Partner", "HR-TP", "Recruitment and employee onboarding"),
            ("Enterprise Account Exec", "SAL-EAE", "Strategic accounts and client partnerships"),
            ("Financial Controller", "FIN-FC", "Financial reporting and compliance oversight"),
        ]
        job_objs = {}
        for name, code, desc in job_data:
            job = JobPosition(name=name, code=code, description=desc, is_active=True)
            session.add(job)
            await session.flush()
            job_objs[code] = job

        # -------------------------------------------------------------
        # 3. Working Schedule
        # -------------------------------------------------------------
        print("Seeding Working Schedule...")
        sched = Schedule(
            name="Standard 40h General Schedule",
            calendar_type="STANDARD",
            hours_per_week=Decimal("40.00"),
            days_per_week=5,
            is_active=True,
        )
        session.add(sched)
        await session.flush()

        for day in range(5):  # Mon-Fri
            s_line = ScheduleLine(
                schedule_id=sched.id,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(18, 0),
                break_minutes=60,
                work_hours=Decimal("8.00"),
            )
            session.add(s_line)
        await session.flush()

        # -------------------------------------------------------------
        # 4. Salary Structure & Rules
        # -------------------------------------------------------------
        print("Seeding Salary Structure & Rules...")
        struct = SalaryStructure(
            name="Standard Full-Time Tech & Corporate Structure",
            code="STD_FT_2026",
            description="Default graded compensation template with Basic, HRA, Allowance, PF, and Tax",
            is_active=True,
        )
        session.add(struct)
        await session.flush()

        rules = [
            SalaryRule(
                salary_structure_id=struct.id,
                name="Basic Salary",
                code="BASIC",
                category=SalaryRuleCategory.BASIC,
                sequence=10,
                computation_type=ComputationType.PERCENTAGE,
                percentage=Decimal("50.00"),
                percentage_base="WAGE",
                is_active=True,
            ),
            SalaryRule(
                salary_structure_id=struct.id,
                name="House Rent Allowance",
                code="HRA",
                category=SalaryRuleCategory.ALLOWANCE,
                sequence=20,
                computation_type=ComputationType.PERCENTAGE,
                percentage=Decimal("25.00"),
                percentage_base="WAGE",
                is_active=True,
            ),
            SalaryRule(
                salary_structure_id=struct.id,
                name="Special Allowance",
                code="SPECIAL",
                category=SalaryRuleCategory.ALLOWANCE,
                sequence=30,
                computation_type=ComputationType.PERCENTAGE,
                percentage=Decimal("25.00"),
                percentage_base="WAGE",
                is_active=True,
            ),
            SalaryRule(
                salary_structure_id=struct.id,
                name="Provident Fund (PF)",
                code="PF",
                category=SalaryRuleCategory.DEDUCTION,
                sequence=40,
                computation_type=ComputationType.PERCENTAGE,
                percentage=Decimal("12.00"),
                percentage_base="BASIC",
                is_active=True,
            ),
            SalaryRule(
                salary_structure_id=struct.id,
                name="Professional Tax",
                code="PT",
                category=SalaryRuleCategory.DEDUCTION,
                sequence=50,
                computation_type=ComputationType.FIXED,
                fixed_amount=Decimal("200.00"),
                is_active=True,
            ),
            SalaryRule(
                salary_structure_id=struct.id,
                name="TDS / Income Tax",
                code="TDS",
                category=SalaryRuleCategory.DEDUCTION,
                sequence=60,
                computation_type=ComputationType.PERCENTAGE,
                percentage=Decimal("10.00"),
                percentage_base="BASIC",
                is_active=True,
            ),
        ]
        for r in rules:
            session.add(r)
        await session.flush()

        # -------------------------------------------------------------
        # 5. Employees
        # -------------------------------------------------------------
        print("Seeding Employees...")
        today = date.today()
        emp_records_data = [
            # code, first, last, email, phone, dept, job, wage, join_delta_days, status, contract_type
            ("EMP-001", "Aarav", "Sharma", "aarav.sharma@peoplepay360.com", "+91 98201 11223", "ENG", "ENG-LD", 185000, 700, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-002", "Priya", "Patel", "priya.patel@peoplepay360.com", "+91 98201 22334", "ENG", "ENG-SFE", 145000, 520, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-003", "Rohan", "Mehta", "rohan.mehta@peoplepay360.com", "+91 98201 33445", "ENG", "ENG-BE", 110000, 410, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-004", "Ananya", "Iyer", "ananya.iyer@peoplepay360.com", "+91 98201 44556", "PRD", "PRD-PM", 160000, 600, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-005", "Vikram", "Singh", "vikram.singh@peoplepay360.com", "+91 98201 55667", "PRD", "PRD-LPD", 130000, 350, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-006", "Neha", "Gupta", "neha.gupta@peoplepay360.com", "+91 98201 66778", "OPS", "OPS-DIR", 175000, 800, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-007", "Rahul", "Verma", "rahul.verma@peoplepay360.com", "+91 98201 77889", "OPS", "OPS-ASC", 65000, 200, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-008", "Divya", "Nair", "divya.nair@peoplepay360.com", "+91 98201 88990", "HR", "HR-GEN", 95000, 480, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-009", "Siddharth", "Joshi", "siddharth.joshi@peoplepay360.com", "+91 98201 99001", "HR", "HR-TP", 85000, 310, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-0010", "Sneha", "Reddy", "sneha.reddy@peoplepay360.com", "+91 98202 11223", "SALES", "SAL-EAE", 140000, 450, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-0011", "Karan", "Kapoor", "karan.kapoor@peoplepay360.com", "+91 98202 22334", "ENG", "ENG-DO", 155000, 390, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-0012", "Pooja", "Sen", "pooja.sen@peoplepay360.com", "+91 98202 33445", "FIN", "FIN-FC", 190000, 650, EmployeeStatus.ACTIVE, "RUNNING"),
            ("EMP-0013", "Arjun", "Malhotra", "arjun.malhotra@peoplepay360.com", "+91 98202 44556", "ENG", "ENG-BE", 115000, 180, EmployeeStatus.ACTIVE, "EXPIRING"),
            ("EMP-0014", "Meera", "Choudhury", "meera.c@peoplepay360.com", "+91 98202 55667", "PRD", "PRD-LPD", 125000, 150, EmployeeStatus.ACTIVE, "EXPIRING"),
            ("EMP-0015", "Rajesh", "Kumar", "rajesh.kumar@peoplepay360.com", "+91 98202 66778", "OPS", "OPS-ASC", 60000, 15, EmployeeStatus.ACTIVE, "RUNNING"),   # Joiner last 15 days
            ("EMP-0016", "Sunita", "Rao", "sunita.rao@peoplepay360.com", "+91 98202 77889", "SALES", "SAL-EAE", 135000, 8, EmployeeStatus.ACTIVE, "RUNNING"),    # Joiner last 8 days
            ("EMP-0017", "Amit", "Trivedi", "amit.trivedi@peoplepay360.com", "+91 98202 88990", "ENG", "ENG-SFE", 140000, 5, EmployeeStatus.ACTIVE, "DRAFT"),      # Joiner last 5 days, Draft
            ("EMP-0018", "Kavita", "Chawla", "kavita.chawla@peoplepay360.com", "+91 98202 99001", "HR", "HR-GEN", 90000, 2, EmployeeStatus.ACTIVE, "DRAFT"),         # Joiner last 2 days, Draft
            ("EMP-0019", "Vivek", "Oberoi", "vivek.oberoi@peoplepay360.com", "+91 98203 11223", "ENG", "ENG-BE", 105000, 500, EmployeeStatus.ON_LEAVE, "RUNNING"),
            ("EMP-0020", "Tara", "Deshmukh", "tara.deshmukh@peoplepay360.com", "+91 98203 22334", "FIN", "FIN-FC", 180000, 550, EmployeeStatus.ON_LEAVE, "RUNNING"),
        ]

        emp_objs = []
        contract_objs = []

        for code, fn, ln, email, phone, d_code, j_code, wage, join_delta, status, contract_mode in emp_records_data:
            joining_d = today - timedelta(days=join_delta)
            emp = Employee(
                employee_code=code,
                first_name=fn,
                last_name=ln,
                email=email,
                phone=phone,
                date_of_birth=joining_d - timedelta(days=365 * 28),
                joining_date=joining_d,
                department_id=dept_objs[d_code].id,
                job_position_id=job_objs[j_code].id,
                status=status,
                working_schedule_id=sched.id,
            )
            session.add(emp)
            await session.flush()
            emp_objs.append(emp)

            # Contract setup
            start_d = joining_d
            end_d = None
            c_status = ContractStatus.RUNNING

            if contract_mode == "DRAFT":
                c_status = ContractStatus.DRAFT
                start_d = today + timedelta(days=7)
            elif contract_mode == "EXPIRING":
                c_status = ContractStatus.RUNNING
                end_d = today + timedelta(days=14)  # Expiring within 14 days
            else:
                end_d = today + timedelta(days=365)

            contract = Contract(
                contract_number=f"CTR-{code}-{start_d.strftime('%Y%m')}",
                employee_id=emp.id,
                department_id=dept_objs[d_code].id,
                job_position_id=job_objs[j_code].id,
                salary_structure_id=struct.id,
                start_date=start_d,
                end_date=end_d,
                wage=Decimal(str(wage)),
                status=c_status,
            )
            session.add(contract)
            contract_objs.append(contract)

        await session.flush()

        # Link Admin User to Divya Nair (HR Generalist)
        admin_res = await session.execute(select(User).where(User.id == 1))
        admin_user = admin_res.scalar_one_or_none()
        if admin_user:
            admin_user.employee_id = emp_objs[7].id  # Divya Nair

        # Create demo accounts for other roles
        demo_pwd_hash = hash_password("PeoplePay360#2026")
        demo_users_spec = [
            ("hr.manager@peoplepay360.com", 2, emp_objs[8].id),       # Siddharth Joshi
            ("payroll.user@peoplepay360.com", 3, emp_objs[6].id),      # Rahul Verma
            ("payroll.manager@peoplepay360.com", 4, emp_objs[11].id),  # Pooja Sen
            ("employee@peoplepay360.com", 1, emp_objs[0].id),         # Aarav Sharma
        ]
        for u_email, r_id, e_id in demo_users_spec:
            user = User(
                email=u_email,
                password_hash=demo_pwd_hash,
                role_id=r_id,
                employee_id=e_id,
                is_active=True,
            )
            session.add(user)
        await session.flush()

        # -------------------------------------------------------------
        # 6. Time Off Types, Allocations & Requests
        # -------------------------------------------------------------
        print("Seeding Time Off Types, Allocations, and Requests...")
        pto_type = TimeOffType(
            name="Paid Time Off / Annual Leave",
            code="PTO",
            description="Standard annual vacation allocation",
            unit=TimeOffUnit.DAYS,
            requires_allocation=True,
            approval_required=True,
            payroll_integration=True,
            is_active=True,
        )
        sick_type = TimeOffType(
            name="Sick & Medical Leave",
            code="SICK",
            description="Medical and emergency health leave",
            unit=TimeOffUnit.DAYS,
            requires_allocation=True,
            approval_required=False,
            payroll_integration=True,
            is_active=True,
        )
        casual_type = TimeOffType(
            name="Casual Leave",
            code="CASUAL",
            description="Short notice personal leave",
            unit=TimeOffUnit.DAYS,
            requires_allocation=True,
            approval_required=True,
            payroll_integration=False,
            is_active=True,
        )
        session.add_all([pto_type, sick_type, casual_type])
        await session.flush()

        # Allocations for each employee
        alloc_objs = {}
        for emp in emp_objs:
            alloc = TimeOffAllocation(
                employee_id=emp.id,
                time_off_type_id=pto_type.id,
                allocation_quantity=Decimal("20.00"),
                consumed_quantity=Decimal("2.00"),
                valid_from=date(today.year, 1, 1),
                valid_to=date(today.year, 12, 31),
                status=AllocationStatus.APPROVED,
                notes="Annual standard allotment",
            )
            session.add(alloc)
            await session.flush()
            alloc_objs[emp.id] = alloc

        # 1. Two employees ON LEAVE TODAY (Vivek Oberoi, Tara Deshmukh)
        req_today1 = TimeOffRequest(
            employee_id=emp_objs[18].id,  # Vivek
            time_off_type_id=pto_type.id,
            allocation_id=alloc_objs[emp_objs[18].id].id,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=2),
            requested_quantity=Decimal("4.00"),
            reason="Family vacation in Goa",
            status=TimeOffRequestStatus.APPROVED,
            approved_by=admin_user.id if admin_user else 1,
            approved_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        req_today2 = TimeOffRequest(
            employee_id=emp_objs[19].id,  # Tara
            time_off_type_id=sick_type.id,
            allocation_id=alloc_objs[emp_objs[19].id].id,
            start_date=today,
            end_date=today + timedelta(days=1),
            requested_quantity=Decimal("2.00"),
            reason="Medical consultation & recovery",
            status=TimeOffRequestStatus.APPROVED,
            approved_by=admin_user.id if admin_user else 1,
            approved_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        session.add_all([req_today1, req_today2])

        # 2. Four PENDING leave requests awaiting approval
        pending_requests = [
            TimeOffRequest(
                employee_id=emp_objs[1].id,  # Priya Patel
                time_off_type_id=pto_type.id,
                allocation_id=alloc_objs[emp_objs[1].id].id,
                start_date=today + timedelta(days=5),
                end_date=today + timedelta(days=8),
                requested_quantity=Decimal("4.00"),
                reason="Attending family function in Ahmedabad",
                status=TimeOffRequestStatus.PENDING,
            ),
            TimeOffRequest(
                employee_id=emp_objs[3].id,  # Ananya Iyer
                time_off_type_id=pto_type.id,
                allocation_id=alloc_objs[emp_objs[3].id].id,
                start_date=today + timedelta(days=10),
                end_date=today + timedelta(days=12),
                requested_quantity=Decimal("3.00"),
                reason="Attending product design conference",
                status=TimeOffRequestStatus.PENDING,
            ),
            TimeOffRequest(
                employee_id=emp_objs[6].id,  # Rahul Verma
                time_off_type_id=casual_type.id,
                allocation_id=alloc_objs[emp_objs[6].id].id,
                start_date=today + timedelta(days=3),
                end_date=today + timedelta(days=3),
                requested_quantity=Decimal("1.00"),
                reason="Personal administrative paperwork",
                status=TimeOffRequestStatus.PENDING,
            ),
            TimeOffRequest(
                employee_id=emp_objs[9].id,  # Sneha Reddy
                time_off_type_id=pto_type.id,
                allocation_id=alloc_objs[emp_objs[9].id].id,
                start_date=today + timedelta(days=14),
                end_date=today + timedelta(days=18),
                requested_quantity=Decimal("5.00"),
                reason="Annual family holiday",
                status=TimeOffRequestStatus.PENDING,
            ),
        ]
        session.add_all(pending_requests)

        # 3. Past approved leaves for rich history
        for idx in [0, 2, 4, 10]:
            session.add(
                TimeOffRequest(
                    employee_id=emp_objs[idx].id,
                    time_off_type_id=pto_type.id,
                    allocation_id=alloc_objs[emp_objs[idx].id].id,
                    start_date=today - timedelta(days=30),
                    end_date=today - timedelta(days=28),
                    requested_quantity=Decimal("3.00"),
                    reason="Past planned leave",
                    status=TimeOffRequestStatus.APPROVED,
                    approved_by=admin_user.id if admin_user else 1,
                    approved_at=datetime.now(timezone.utc) - timedelta(days=35),
                )
            )
        await session.flush()

        # -------------------------------------------------------------
        # 7. Attendances (Today & Recent Days)
        # -------------------------------------------------------------
        print("Seeding Attendance records...")
        # Today's attendances
        # - Employees 0..12: PRESENT on time
        # - Employees 13..15: LATE
        # - Employees 16..17: Draft new hires (not yet checking in)
        # - Employees 18..19: ON LEAVE
        for idx in range(13):
            check_in_time = datetime.combine(today, time(8, 45 + (idx % 10)), tzinfo=timezone.utc)
            check_out_time = datetime.combine(today, time(18, idx % 15), tzinfo=timezone.utc)
            att = Attendance(
                employee_id=emp_objs[idx].id,
                attendance_date=today,
                check_in=check_in_time,
                check_out=check_out_time,
                worked_minutes=480,
                late_minutes=0,
                overtime_minutes=15 if idx % 3 == 0 else 0,
                status=AttendanceStatus.PRESENT,
            )
            session.add(att)

        for idx in [13, 14, 15]:
            late_min = 25 + ((idx - 13) * 10)
            check_in_time = datetime.combine(today, time(9, 30 + (idx % 10)), tzinfo=timezone.utc)
            check_out_time = datetime.combine(today, time(18, 30), tzinfo=timezone.utc)
            att = Attendance(
                employee_id=emp_objs[idx].id,
                attendance_date=today,
                check_in=check_in_time,
                check_out=check_out_time,
                worked_minutes=450,
                late_minutes=late_min,
                overtime_minutes=0,
                status=AttendanceStatus.LATE,
            )
            session.add(att)

        # Previous 3 business days for trend charts
        for day_offset in [1, 2, 3]:
            past_date = today - timedelta(days=day_offset)
            for idx in range(16):
                check_in_time = datetime.combine(past_date, time(8, 45 + (idx % 10)), tzinfo=timezone.utc)
                check_out_time = datetime.combine(past_date, time(18, 5), tzinfo=timezone.utc)
                att = Attendance(
                    employee_id=emp_objs[idx].id,
                    attendance_date=past_date,
                    check_in=check_in_time,
                    check_out=check_out_time,
                    worked_minutes=480,
                    late_minutes=0,
                    overtime_minutes=0,
                    status=AttendanceStatus.PRESENT,
                )
                session.add(att)
        await session.flush()

        # -------------------------------------------------------------
        # 8. Payruns & Payslips
        # -------------------------------------------------------------
        print("Seeding Payruns and Payslips...")
        # Payrun 1: July 2026 (PAID)
        pr_jul = Payrun(
            name="July 2026 Monthly Payroll Batch",
            salary_structure_id=struct.id,
            period_start=date(2026, 7, 1),
            period_end=date(2026, 7, 31),
            status=PayrunStatus.PAID,
            created_by=admin_user.id if admin_user else 1,
        )
        session.add(pr_jul)
        await session.flush()

        # Payrun 2: August 2026 (PAID)
        pr_aug = Payrun(
            name="August 2026 Monthly Payroll Batch",
            salary_structure_id=struct.id,
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31),
            status=PayrunStatus.PAID,
            created_by=admin_user.id if admin_user else 1,
        )
        session.add(pr_aug)
        await session.flush()

        # Payrun 3: Current Month September 2026 (COMPUTED / VALIDATED)
        pr_sep = Payrun(
            name="September 2026 Monthly Payroll Batch",
            salary_structure_id=struct.id,
            period_start=date(2026, 9, 1),
            period_end=date(2026, 9, 30),
            status=PayrunStatus.COMPUTED,
            created_by=admin_user.id if admin_user else 1,
        )
        session.add(pr_sep)
        await session.flush()

        # Create payslips for all active running contracts in September
        running_contracts = [c for c in contract_objs if c.status == ContractStatus.RUNNING]
        for contract in running_contracts:
            wage = contract.wage
            basic = wage * Decimal("0.50")
            hra = wage * Decimal("0.25")
            special = wage * Decimal("0.25")
            gross = basic + hra + special
            pf = basic * Decimal("0.12")
            pt = Decimal("200.00")
            tds = basic * Decimal("0.10")
            deductions = pf + pt + tds
            net = gross - deductions

            ps = Payslip(
                payrun_id=pr_sep.id,
                employee_id=contract.employee_id,
                contract_id=contract.id,
                salary_structure_id=struct.id,
                period_start=date(2026, 9, 1),
                period_end=date(2026, 9, 30),
                status=PayslipStatus.COMPUTED,
                worked_days=Decimal("22.00"),
                gross_amount=gross,
                deduction_amount=deductions,
                net_amount=net,
            )
            session.add(ps)
            await session.flush()

            # Payslip lines
            lines = [
                PayslipLine(payslip_id=ps.id, code="BASIC", name="Basic Salary", category=SalaryRuleCategory.BASIC, sequence=10, amount=basic),
                PayslipLine(payslip_id=ps.id, code="HRA", name="House Rent Allowance", category=SalaryRuleCategory.ALLOWANCE, sequence=20, amount=hra),
                PayslipLine(payslip_id=ps.id, code="SPECIAL", name="Special Allowance", category=SalaryRuleCategory.ALLOWANCE, sequence=30, amount=special),
                PayslipLine(payslip_id=ps.id, code="PF", name="Provident Fund (PF)", category=SalaryRuleCategory.DEDUCTION, sequence=40, amount=pf),
                PayslipLine(payslip_id=ps.id, code="PT", name="Professional Tax", category=SalaryRuleCategory.DEDUCTION, sequence=50, amount=pt),
                PayslipLine(payslip_id=ps.id, code="TDS", name="TDS / Income Tax", category=SalaryRuleCategory.DEDUCTION, sequence=60, amount=tds),
            ]
            session.add_all(lines)

            # August Paid Payslip for history
            ps_aug = Payslip(
                payrun_id=pr_aug.id,
                employee_id=contract.employee_id,
                contract_id=contract.id,
                salary_structure_id=struct.id,
                period_start=date(2026, 8, 1),
                period_end=date(2026, 8, 31),
                status=PayslipStatus.PAID,
                worked_days=Decimal("22.00"),
                gross_amount=gross,
                deduction_amount=deductions,
                net_amount=net,
            )
            session.add(ps_aug)

        await session.commit()
        print("Database seeding completed successfully with 100% cohesive live data!")

if __name__ == "__main__":
    asyncio.run(seed())
