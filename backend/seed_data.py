"""
PeoplePay360 — Production-Grade Seed Data Generator (400 Employees)

This script populates an end-to-end, logically consistent enterprise HR & Payroll dataset:
- Standard Roles (EMPLOYEE, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)
- 8 Functional Departments (Executive, Engineering, Cloud, Product, HR, Finance, Sales, Customer Success)
- 30 Standardized Job Positions
- 4 Salary Structures (EXEC_COMP, TECH_COMP, SALES_COMP, CORP_COMP) with 32 complete computation rules
- Standard & Flexible Working Schedules with shift timings
- Standard Leave Types (PTO, SICK, UNPAID) with 2026 employee allocations
- 400 Employees organized in a strict 5-tier organizational hierarchy (CEO -> C-Suite -> Directors -> Managers -> Seniors -> Mid/Juniors):
    * 100% referential integrity with zero circular manager loops
    * Unique corporate emails and valid contact numbers
    * Realistic Indian Banking Details (HDFC, ICICI, SBI, Axis, Kotak, PNB) with matching IFSC & algorithmically valid PAN cards
    * 8 intentional missing-bank records (~2%) for testing Bank Payout Audit & readiness warnings
- 400 Active Employment Contracts (RUNNING status) with realistic tiered market wages
- Standard Administrative and Employee User Accounts with bcrypt-hashed credentials
- September 2026 Computed Payrun with full payslips for immediate export & email testing

Usage:
    python seed_data.py                # Run seed (preserves or skips existing records)
    python seed_data.py --reset        # Wipe prior data and run a fresh 400-employee seed
    python seed_data.py --no-payrun    # Seed master data & employees without computing demo payrun
"""

import argparse
import asyncio
import datetime
import decimal
from decimal import Decimal
import random
import sys
from typing import Any

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

# App imports
from app.core.security import hash_password
from app.db.database import AsyncSessionLocal, engine
from app.models.attendance import Attendance, AttendanceStatus
from app.models.contract import Contract, ContractStatus
from app.models.department import Department
from app.models.email_delivery import PayslipEmailDelivery
from app.models.employee import Employee, EmployeeStatus
from app.models.job_position import JobPosition
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.models.payslip_line import PayslipLine
from app.models.role import Role
from app.models.salary_rule import ComputationType, SalaryRule, SalaryRuleCategory
from app.models.salary_structure import SalaryStructure
from app.models.schedule import WorkingSchedule, WorkingScheduleDay
from app.models.time_off import (
    AllocationStatus,
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffType,
    TimeOffUnit,
)
from app.models.user import User
from app.services import (
    payroll_processing_service,
    payrun_service,
    role_service,
    schedule_service,
    time_off_type_service,
)

# ---------------------------------------------------------------------------
# Pre-computed bcrypt hashes for speed (avoiding 400 slow CPU bcrypt cycles)
# ---------------------------------------------------------------------------
HASH_ADMIN_123 = hash_password("Admin@123")
HASH_HR_123456 = hash_password("Hr@123456")
HASH_PAYROLL_123 = hash_password("Payroll@123")
HASH_EMPLOYEE_123 = hash_password("Employee@123")

# ---------------------------------------------------------------------------
# Realistic Indian Names & Banking Data Pools
# ---------------------------------------------------------------------------
FIRST_NAMES = [
    "Rajesh", "Priya", "Vikram", "Sunita", "Ananya", "Arjun", "Sneha", "Karthik",
    "Divya", "Rohan", "Meera", "Alok", "Sanjay", "Kavita", "Deepak", "Pooja",
    "Siddharth", "Neha", "Amit", "Ritu", "Manoj", "Anita", "Varun", "Shreya",
    "Harish", "Preeti", "Sandeep", "Tanvi", "Gaurav", "Isha", "Nikhil", "Pallavi",
    "Simran", "Mayank", "Aarti", "Prashant", "Komal", "Kunal", "Rashmi", "Vivek",
    "Shikha", "Tarun", "Rashi", "Mohit", "Jyoti", "Abhishek", "Swati", "Aditya",
    "Bhavna", "Chetan", "Dolly", "Girish", "Hemant", "Indira", "Jatin", "Kiran",
    "Lalit", "Madhavi", "Naveen", "Omkar", "Pratibha", "Radhika", "Sameer", "Tanya",
    "Umesh", "Vandana", "Yash", "Zoya", "Aakash", "Barkha", "Chirag", "Devika",
    "Eshwar", "Geeta", "Himanshu", "Juhi", "Kapil", "Leela", "Manish", "Nandini",
    "Parul", "Rohit", "Sakshi", "Tushar", "Urvi", "Vinay", "Yamini", "Anirudh",
    "Charu", "Darshan", "Ekta", "Farhan", "Garima", "Hardik", "Ishaan", "Jaya",
    "Kailash", "Lavanya", "Mukesh", "Nidhi", "Paras", "Rina", "Shantanu", "Tejas",
    "Uday", "Varsha", "Vidya", "Akhil", "Brijesh", "Damini", "Falguni", "Govind"
]

LAST_NAMES = [
    "Singhania", "Nair", "Malhotra", "Rao", "Deshmukh", "Mehta", "Kulkarni", "Iyer",
    "Joshi", "Verma", "Chatterjee", "Banerjee", "Gupta", "Reddy", "Sharma", "Agarwal",
    "Choudhury", "Mishra", "Saxena", "Tiwari", "Kapoor", "Bhatia", "Patel", "Shah",
    "Pandey", "Bhatt", "Mukherjee", "Dutta", "Bose", "Menon", "Pillai", "Nambiar",
    "Ghosh", "Sen", "Das", "Chakraborty", "Sengupta", "Roy", "Saha", "Basu",
    "Chauhan", "Yadav", "Thakur", "Rathore", "Pawar", "Shinde", "Patil", "Gaikwad",
    "Bhide", "Kadam", "Sarin", "Khanna", "Dhawan", "Soni", "Ahuja", "Arora",
    "Bansal", "Goel", "Garg", "Jindal", "Mittal", "Singhal", "Tayal", "Kansal"
]

BANKS = [
    {
        "name": "HDFC Bank",
        "ifsc_prefix": "HDFC000",
        "acc_prefix": "50100",
        "branches": ["1024", "1850", "2450", "3110", "4200"],
    },
    {
        "name": "ICICI Bank",
        "ifsc_prefix": "ICIC000",
        "acc_prefix": "00040",
        "branches": ["2150", "3410", "4820", "5910", "6320"],
    },
    {
        "name": "State Bank of India",
        "ifsc_prefix": "SBIN000",
        "acc_prefix": "20401",
        "branches": ["4512", "5890", "6710", "8120", "9450"],
    },
    {
        "name": "Axis Bank",
        "ifsc_prefix": "UTIB000",
        "acc_prefix": "91801",
        "branches": ["3180", "4290", "5620", "7110", "8430"],
    },
    {
        "name": "Kotak Mahindra Bank",
        "ifsc_prefix": "KKBK000",
        "acc_prefix": "12110",
        "branches": ["1940", "2830", "3750", "4610", "5520"],
    },
    {
        "name": "Punjab National Bank",
        "ifsc_prefix": "PUNB000",
        "acc_prefix": "01550",
        "branches": ["7800", "8910", "9230", "1450", "2670"],
    },
]

def generate_pan(last_name: str, index: int) -> str:
    """Generate an authentic, valid Indian PAN number (e.g. ABCPS1234F)."""
    p1 = chr(65 + ((index * 3) % 26))
    p2 = chr(65 + ((index * 7 + 5) % 26))
    p3 = chr(65 + ((index * 11 + 9) % 26))
    entity = "P"  # Individual / Person
    surname_initial = last_name[0].upper()
    digits = f"{(index * 137 + 1000) % 9000 + 1000}"
    checksum = chr(65 + ((index * 13 + 3) % 26))
    return f"{p1}{p2}{p3}{entity}{surname_initial}{digits}{checksum}"

# ---------------------------------------------------------------------------
# Database Seeder Class
# ---------------------------------------------------------------------------
class DatabaseSeeder:
    def __init__(self, db: AsyncSession, reset: bool = False, create_payrun: bool = True):
        self.db = db
        self.reset = reset
        self.create_payrun = create_payrun
        self.departments: dict[str, Department] = {}
        self.job_positions: dict[str, JobPosition] = {}
        self.salary_structures: dict[str, SalaryStructure] = {}
        self.schedules: dict[str, WorkingSchedule] = {}
        self.roles: dict[str, Role] = {}
        self.time_off_types: dict[str, TimeOffType] = {}
        self.employees: list[Employee] = []

    async def run(self):
        print("\n" + "=" * 70)
        print("  🚀 PeoplePay360 — Starting Comprehensive 400-Employee Data Seeder")
        print("=" * 70)

        if self.reset:
            await self._reset_database()

        await self._seed_core_masters()
        await self._seed_salary_structures_and_rules()
        await self._seed_departments_and_job_positions()
        await self._seed_employees_and_contracts()
        await self._seed_user_accounts()
        await self._seed_leave_allocations()
        await self._seed_attendance_records()

        if self.create_payrun:
            await self._seed_sample_payrun()

        await self.db.commit()
        print("\n" + "=" * 70)
        print("  🎉 SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        self._print_summary()

    # -----------------------------------------------------------------------
    # 1. Database Truncation (Reset Mode)
    # -----------------------------------------------------------------------
    async def _reset_database(self):
        print("\n[1/7] 🧹 Resetting database tables (cascade)...")
        tables = [
            "payslip_email_deliveries", "payslip_lines", "payslips", "payruns",
            "contracts", "time_off_requests", "time_off_allocations",
            "attendances", "users", "employees", "salary_rules",
            "salary_structures", "job_positions", "departments",
        ]
        for tbl in tables:
            await self.db.execute(text(f"TRUNCATE TABLE {tbl} CASCADE;"))
        await self.db.commit()
        print("      ✓ Database cleaned.")

    # -----------------------------------------------------------------------
    # 2. Seed Core Masters (Roles, Schedules, Leave Types)
    # -----------------------------------------------------------------------
    async def _seed_core_masters(self):
        print("\n[2/7] ⚙️  Seeding System Roles, Schedules & Leave Types...")
        # Roles
        seeded_roles = await role_service.seed_default_roles(self.db)
        for r in seeded_roles:
            self.roles[r.name] = r
        print(f"      ✓ {len(self.roles)} System Roles verified.")

        # Default Schedule
        std_sched = await schedule_service.seed_default_schedule(self.db)
        self.schedules["STANDARD"] = std_sched

        # Additional Flexible Tech Schedule (10:00 to 19:00)
        res = await self.db.execute(select(WorkingSchedule).where(WorkingSchedule.name == "Flexible Tech 40 Hours/Week"))
        flex_sched = res.scalar_one_or_none()
        if not flex_sched:
            flex_lines = [
                WorkingScheduleDay(
                    day_of_week=d,
                    start_time=datetime.time(10, 0, 0),
                    end_time=datetime.time(19, 0, 0),
                    break_minutes=60,
                    work_hours=Decimal("8.00"),
                )
                for d in range(5)
            ]
            flex_sched = WorkingSchedule(
                name="Flexible Tech 40 Hours/Week",
                calendar_type="FLEXIBLE",
                hours_per_week=Decimal("40.00"),
                days_per_week=5,
                is_active=True,
                lines=flex_lines,
            )
            self.db.add(flex_sched)
            await self.db.flush()
        self.schedules["FLEXIBLE"] = flex_sched
        print("      ✓ Working Schedules configured (Standard & Flexible).")

        # Time Off Types
        leave_types = await time_off_type_service.seed_default_time_off_types(self.db)
        for lt in leave_types:
            self.time_off_types[lt.code] = lt
        print(f"      ✓ {len(self.time_off_types)} Leave Types verified (PTO, SICK, UNPAID).")

    # -----------------------------------------------------------------------
    # 3. Seed Salary Structures & Calculation Rules
    # -----------------------------------------------------------------------
    async def _seed_salary_structures_and_rules(self):
        print("\n[3/7] 💰 Seeding 4 Industry Salary Structures & Calculation Rules...")
        structure_configs = [
            {
                "code": "EXEC_COMP",
                "name": "Executive Leadership Remuneration",
                "description": "Compensation model for C-Suite and Executive Directors",
                "rules": [
                    ("Basic Salary", "BASIC", SalaryRuleCategory.BASIC, 10, ComputationType.FORMULA, "CONTRACT_WAGE * 0.40"),
                    ("House Rent Allowance", "HRA", SalaryRuleCategory.ALLOWANCE, 20, ComputationType.FORMULA, "BASIC * 0.50"),
                    ("Executive Allowance", "EXEC_ALLOW", SalaryRuleCategory.ALLOWANCE, 30, ComputationType.FORMULA, "CONTRACT_WAGE - BASIC - HRA"),
                    ("Gross Earnings", "GROSS", SalaryRuleCategory.GROSS, 40, ComputationType.FORMULA, "BASIC + HRA + EXEC_ALLOW"),
                    ("Provident Fund", "PF", SalaryRuleCategory.DEDUCTION, 50, ComputationType.FORMULA, "BASIC * 0.12"),
                    ("Professional Tax", "PT", SalaryRuleCategory.DEDUCTION, 60, ComputationType.FORMULA, "200.00"),
                    ("Income Tax (TDS)", "TDS", SalaryRuleCategory.DEDUCTION, 70, ComputationType.FORMULA, "GROSS * 0.15"),
                    ("Net Take-Home Salary", "NET", SalaryRuleCategory.NET, 80, ComputationType.FORMULA, "GROSS - PF - PT - TDS"),
                ],
            },
            {
                "code": "TECH_COMP",
                "name": "Software Engineering & Cloud Remuneration",
                "description": "Standard engineering compensation model with high basic and tech allowance",
                "rules": [
                    ("Basic Salary", "BASIC", SalaryRuleCategory.BASIC, 10, ComputationType.FORMULA, "CONTRACT_WAGE * 0.50"),
                    ("House Rent Allowance", "HRA", SalaryRuleCategory.ALLOWANCE, 20, ComputationType.FORMULA, "BASIC * 0.40"),
                    ("Special Tech Allowance", "SPECIAL", SalaryRuleCategory.ALLOWANCE, 30, ComputationType.FORMULA, "CONTRACT_WAGE - BASIC - HRA"),
                    ("Gross Earnings", "GROSS", SalaryRuleCategory.GROSS, 40, ComputationType.FORMULA, "BASIC + HRA + SPECIAL"),
                    ("Provident Fund", "PF", SalaryRuleCategory.DEDUCTION, 50, ComputationType.FORMULA, "BASIC * 0.12"),
                    ("Professional Tax", "PT", SalaryRuleCategory.DEDUCTION, 60, ComputationType.FORMULA, "200.00"),
                    ("Income Tax (TDS)", "TDS", SalaryRuleCategory.DEDUCTION, 70, ComputationType.FORMULA, "GROSS * 0.10"),
                    ("Net Take-Home Salary", "NET", SalaryRuleCategory.NET, 80, ComputationType.FORMULA, "GROSS - PF - PT - TDS"),
                ],
            },
            {
                "code": "SALES_COMP",
                "name": "Sales & Enterprise Growth Remuneration",
                "description": "Sales compensation with commission and travel allowances",
                "rules": [
                    ("Basic Salary", "BASIC", SalaryRuleCategory.BASIC, 10, ComputationType.FORMULA, "CONTRACT_WAGE * 0.45"),
                    ("House Rent Allowance", "HRA", SalaryRuleCategory.ALLOWANCE, 20, ComputationType.FORMULA, "BASIC * 0.40"),
                    ("Sales Variable Allowance", "VARIABLE", SalaryRuleCategory.ALLOWANCE, 30, ComputationType.FORMULA, "CONTRACT_WAGE - BASIC - HRA"),
                    ("Gross Earnings", "GROSS", SalaryRuleCategory.GROSS, 40, ComputationType.FORMULA, "BASIC + HRA + VARIABLE"),
                    ("Provident Fund", "PF", SalaryRuleCategory.DEDUCTION, 50, ComputationType.FORMULA, "BASIC * 0.12"),
                    ("Professional Tax", "PT", SalaryRuleCategory.DEDUCTION, 60, ComputationType.FORMULA, "200.00"),
                    ("Income Tax (TDS)", "TDS", SalaryRuleCategory.DEDUCTION, 70, ComputationType.FORMULA, "GROSS * 0.08"),
                    ("Net Take-Home Salary", "NET", SalaryRuleCategory.NET, 80, ComputationType.FORMULA, "GROSS - PF - PT - TDS"),
                ],
            },
            {
                "code": "CORP_COMP",
                "name": "Corporate Operations & HR Remuneration",
                "description": "Standard corporate compensation structure for HR, Finance, and CS",
                "rules": [
                    ("Basic Salary", "BASIC", SalaryRuleCategory.BASIC, 10, ComputationType.FORMULA, "CONTRACT_WAGE * 0.50"),
                    ("House Rent Allowance", "HRA", SalaryRuleCategory.ALLOWANCE, 20, ComputationType.FORMULA, "BASIC * 0.40"),
                    ("Operational Allowance", "SPECIAL", SalaryRuleCategory.ALLOWANCE, 30, ComputationType.FORMULA, "CONTRACT_WAGE - BASIC - HRA"),
                    ("Gross Earnings", "GROSS", SalaryRuleCategory.GROSS, 40, ComputationType.FORMULA, "BASIC + HRA + SPECIAL"),
                    ("Provident Fund", "PF", SalaryRuleCategory.DEDUCTION, 50, ComputationType.FORMULA, "BASIC * 0.12"),
                    ("Professional Tax", "PT", SalaryRuleCategory.DEDUCTION, 60, ComputationType.FORMULA, "200.00"),
                    ("Income Tax (TDS)", "TDS", SalaryRuleCategory.DEDUCTION, 70, ComputationType.FORMULA, "GROSS * 0.05"),
                    ("Net Take-Home Salary", "NET", SalaryRuleCategory.NET, 80, ComputationType.FORMULA, "GROSS - PF - PT - TDS"),
                ],
            },
        ]

        for s_data in structure_configs:
            res = await self.db.execute(select(SalaryStructure).where(SalaryStructure.code == s_data["code"]))
            struct = res.scalar_one_or_none()
            if not struct:
                struct = SalaryStructure(
                    code=s_data["code"],
                    name=s_data["name"],
                    description=s_data["description"],
                    is_active=True,
                )
                self.db.add(struct)
                await self.db.flush()

                # Add Rules
                for r_name, r_code, r_cat, r_seq, r_type, r_formula in s_data["rules"]:
                    rule = SalaryRule(
                        salary_structure_id=struct.id,
                        name=r_name,
                        code=r_code,
                        category=r_cat,
                        sequence=r_seq,
                        computation_type=r_type,
                        formula=r_formula,
                        is_active=True,
                    )
                    self.db.add(rule)
                await self.db.flush()
            self.salary_structures[s_data["code"]] = struct

        print("      ✓ 4 Salary Structures ready with 32 formula rules.")

    # -----------------------------------------------------------------------
    # 4. Seed Departments & Job Positions
    # -----------------------------------------------------------------------
    async def _seed_departments_and_job_positions(self):
        print("\n[4/7] 🏢 Seeding 8 Functional Departments & 30 Job Positions...")
        dept_data = [
            ("EXEC", "Executive Management", "Head: Rajesh Singhania | C-Suite and executive organizational leadership"),
            ("ENG", "Software Engineering", "Head: Priya Nair | Core product development, platform, and quality engineering"),
            ("CLOUD", "Cloud & Infrastructure", "Head: Vikram Malhotra | SRE, cloud architecture, and DevOps infrastructure"),
            ("PROD", "Product & UX Design", "Head: Sunita Rao | Product management, roadmap, and user experience design"),
            ("HR", "Human Resources", "Head: Ananya Deshmukh | People operations, talent acquisition, culture, and payroll"),
            ("FIN", "Finance & Accounts", "Head: Arjun Mehta | Corporate finance, financial planning, billing, and accounting"),
            ("SALES", "Sales & Enterprise Growth", "Head: Sneha Kulkarni | Enterprise business development and customer acquisition"),
            ("CS", "Customer Success & Operations", "Head: Karthik Iyer | Customer onboarding, technical support, and account health"),
            ("EXEC", "Executive Management", "C-Suite and executive organizational leadership"),
            ("ENG", "Software Engineering", "Core product development, platform, and quality engineering"),
            ("CLOUD", "Cloud & Infrastructure", "SRE, cloud architecture, and DevOps infrastructure"),
            ("PROD", "Product & UX Design", "Product management, roadmap, and user experience design"),
            ("HR", "Human Resources", "People operations, talent acquisition, culture, and payroll"),
            ("FIN", "Finance & Accounts", "Corporate finance, financial planning, billing, and accounting"),
            ("SALES", "Sales & Enterprise Growth", "Enterprise business development and customer acquisition"),
            ("CS", "Customer Success & Operations", "Customer onboarding, technical support, and account health"),
        ]

        for code, name, desc in dept_data:
            res = await self.db.execute(select(Department).where(Department.code == code))
            dept = res.scalar_one_or_none()
            if not dept:
                dept = Department(code=code, name=name, description=desc, is_active=True)
                self.db.add(dept)
                await self.db.flush()
            else:
                dept.description = desc
            self.departments[code] = dept

        pos_data = [
            # EXEC
            ("CEO", "Chief Executive Officer", "EXEC"),
            ("CTO", "Chief Technology Officer", "EXEC"),
            ("COO", "Chief Operating Officer", "EXEC"),
            ("CFO", "Chief Financial Officer", "EXEC"),
            ("CHRO", "Chief Human Resources Officer", "EXEC"),
            ("CRO", "Chief Revenue Officer", "EXEC"),
            ("CPO", "Chief Product Officer", "EXEC"),
            # ENG
            ("ENG_DIR", "Director of Engineering", "ENG"),
            ("ENG_MGR", "Engineering Manager", "ENG"),
            ("STAFF_SWE", "Staff Software Engineer", "ENG"),
            ("SR_SWE", "Senior Software Engineer", "ENG"),
            ("SWE", "Software Engineer", "ENG"),
            ("JR_SWE", "Junior Software Engineer", "ENG"),
            ("QA_LEAD", "QA Engineering Lead", "ENG"),
            ("SR_QA", "Senior QA Automation Engineer", "ENG"),
            ("QA_ENG", "QA Automation Engineer", "ENG"),
            # CLOUD
            ("CLOUD_DIR", "Director of Cloud & DevOps", "CLOUD"),
            ("DEVOPS_LEAD", "DevOps Team Lead", "CLOUD"),
            ("SR_DEVOPS", "Senior DevOps Engineer", "CLOUD"),
            ("DEVOPS_ENG", "DevOps Engineer", "CLOUD"),
            # PROD
            ("PROD_DIR", "Director of Product Strategy", "PROD"),
            ("SR_PM", "Senior Product Manager", "PROD"),
            ("PM", "Product Manager", "PROD"),
            ("SR_UIUX", "Senior UI/UX Designer", "PROD"),
            ("UIUX_DES", "UI/UX Designer", "PROD"),
            # HR
            ("HR_DIR", "Director of People Operations", "HR"),
            ("HR_MGR", "HR Operations Manager", "HR"),
            ("PAYROLL_LEAD", "Payroll & Compliance Lead", "HR"),
            ("SR_RECRUITER", "Senior Talent Acquisition Specialist", "HR"),
            ("HR_GENERALIST", "HR Generalist", "HR"),
            # FIN
            ("FIN_DIR", "Director of Corporate Finance", "FIN"),
            ("FIN_MGR", "Finance & Accounts Manager", "FIN"),
            ("SR_ACCOUNTANT", "Senior Corporate Accountant", "FIN"),
            ("ACCOUNTANT", "Staff Accountant", "FIN"),
            # SALES
            ("SALES_DIR", "Director of Enterprise Sales", "SALES"),
            ("SALES_MGR", "Regional Sales Manager", "SALES"),
            ("SR_AE", "Senior Account Executive", "SALES"),
            ("AE", "Account Executive", "SALES"),
            ("SDR_LEAD", "SDR Team Lead", "SALES"),
            ("SDR", "Sales Development Representative", "SALES"),
            # CS
            ("CS_DIR", "Director of Customer Success", "CS"),
            ("CS_MGR", "Customer Success Manager", "CS"),
            ("SR_CSM", "Senior Customer Success Manager", "CS"),
            ("CS_SPEC", "Customer Support Specialist", "CS"),
        ]

        for code, name, dept_code in pos_data:
            res = await self.db.execute(select(JobPosition).where(JobPosition.code == code))
            pos = res.scalar_one_or_none()
            if not pos:
                pos = JobPosition(code=code, name=name, description=f"{name} in {dept_code}", is_active=True)
                self.db.add(pos)
                await self.db.flush()
            self.job_positions[code] = pos

        print(f"      ✓ 8 Departments and {len(self.job_positions)} Job Positions active.")

    # -----------------------------------------------------------------------
    # 5. Seed 400 Employees & Contracts (Strict 5-Tier Tree)
    # -----------------------------------------------------------------------
    async def _seed_employees_and_contracts(self):
        print("\n[5/7] 👥 Generating 400 Logically Related Employees, Bank Accounts & Contracts...")

        # Clear existing employees if in reset mode
        self.employees = []
        blueprints: list[dict[str, Any]] = []

        # Tier breakdown:
        # Level 0 (1): CEO (Rajesh Singhania) -> manager: None
        # Level 1 (6): C-Suite (CTO, COO, CFO, CHRO, CRO, CPO) -> manager: EMP0001
        # Level 2 (12): Directors -> manager: Respective C-Suite
        # Level 3 (36): Managers/Leads -> manager: Respective Director
        # Level 4 (144): Senior Staff -> manager: Respective Manager/Lead
        # Level 5 (201): Mid & Junior Staff -> manager: Respective Manager or Senior Staff
        # Total = 1 + 6 + 12 + 36 + 144 + 201 = 400!

        # Level 0: CEO
        blueprints.append({
            "code": "EMP0001",
            "pos": "CEO",
            "dept": "EXEC",
            "struct": "EXEC_COMP",
            "wage": Decimal("650000.00"),
            "manager_idx": None,
            "fn": "Rajesh",
            "ln": "Singhania",
            "level": 0,
        })

        # Level 1: C-Suite (6)
        c_suite = [
            ("CTO", "ENG", "EXEC_COMP", Decimal("450000.00"), "Priya", "Nair"),
            ("COO", "CS", "EXEC_COMP", Decimal("420000.00"), "Vikram", "Malhotra"),
            ("CFO", "FIN", "EXEC_COMP", Decimal("430000.00"), "Sunita", "Rao"),
            ("CHRO", "HR", "EXEC_COMP", Decimal("390000.00"), "Ananya", "Deshmukh"),
            ("CRO", "SALES", "EXEC_COMP", Decimal("440000.00"), "Arjun", "Mehta"),
            ("CPO", "PROD", "EXEC_COMP", Decimal("410000.00"), "Sneha", "Kulkarni"),
        ]
        for pos, dept, struct, wage, fn, ln in c_suite:
            idx = len(blueprints) + 1
            blueprints.append({
                "code": f"EMP{idx:04d}",
                "pos": pos,
                "dept": dept,
                "struct": struct,
                "wage": wage,
                "manager_idx": 0,  # Reports to CEO (index 0)
                "fn": fn,
                "ln": ln,
                "level": 1,
            })

        # Level 2: Directors (12)
        directors = [
            ("ENG_DIR", "ENG", "TECH_COMP", Decimal("310000.00"), 1, "Karthik", "Iyer"),
            ("ENG_DIR", "ENG", "TECH_COMP", Decimal("300000.00"), 1, "Divya", "Joshi"),
            ("CLOUD_DIR", "CLOUD", "TECH_COMP", Decimal("290000.00"), 1, "Rohan", "Verma"),
            ("CS_DIR", "CS", "CORP_COMP", Decimal("260000.00"), 2, "Meera", "Chatterjee"),
            ("CS_DIR", "CS", "CORP_COMP", Decimal("250000.00"), 2, "Alok", "Banerjee"),
            ("FIN_DIR", "FIN", "CORP_COMP", Decimal("280000.00"), 3, "Sanjay", "Gupta"),
            ("FIN_DIR", "FIN", "CORP_COMP", Decimal("270000.00"), 3, "Kavita", "Reddy"),
            ("HR_DIR", "HR", "CORP_COMP", Decimal("250000.00"), 4, "Deepak", "Sharma"),
            ("HR_DIR", "HR", "CORP_COMP", Decimal("240000.00"), 4, "Pooja", "Agarwal"),
            ("SALES_DIR", "SALES", "SALES_COMP", Decimal("290000.00"), 5, "Siddharth", "Choudhury"),
            ("SALES_DIR", "SALES", "SALES_COMP", Decimal("270000.00"), 5, "Neha", "Mishra"),
            ("PROD_DIR", "PROD", "TECH_COMP", Decimal("280000.00"), 6, "Amit", "Saxena"),
        ]
        l2_indices = []
        for pos, dept, struct, wage, mgr_idx, fn, ln in directors:
            idx = len(blueprints) + 1
            l2_indices.append(len(blueprints))
            blueprints.append({
                "code": f"EMP{idx:04d}",
                "pos": pos,
                "dept": dept,
                "struct": struct,
                "wage": wage,
                "manager_idx": mgr_idx,
                "fn": fn,
                "ln": ln,
                "level": 2,
            })

        # Level 3: Managers & Leads (36) — 3 per Level 2 Director
        l3_indices = []
        l3_roles_map = {
            "ENG": [("ENG_MGR", "TECH_COMP", Decimal("210000.00")), ("QA_LEAD", "TECH_COMP", Decimal("190000.00")), ("STAFF_SWE", "TECH_COMP", Decimal("200000.00"))],
            "CLOUD": [("DEVOPS_LEAD", "TECH_COMP", Decimal("200000.00")), ("DEVOPS_LEAD", "TECH_COMP", Decimal("195000.00")), ("DEVOPS_LEAD", "TECH_COMP", Decimal("190000.00"))],
            "CS": [("CS_MGR", "CORP_COMP", Decimal("160000.00")), ("CS_MGR", "CORP_COMP", Decimal("155000.00")), ("CS_MGR", "CORP_COMP", Decimal("150000.00"))],
            "FIN": [("FIN_MGR", "CORP_COMP", Decimal("180000.00")), ("FIN_MGR", "CORP_COMP", Decimal("175000.00")), ("FIN_MGR", "CORP_COMP", Decimal("170000.00"))],
            "HR": [("HR_MGR", "CORP_COMP", Decimal("165000.00")), ("PAYROLL_LEAD", "CORP_COMP", Decimal("170000.00")), ("HR_MGR", "CORP_COMP", Decimal("160000.00"))],
            "SALES": [("SALES_MGR", "SALES_COMP", Decimal("195000.00")), ("SALES_MGR", "SALES_COMP", Decimal("190000.00")), ("SDR_LEAD", "SALES_COMP", Decimal("160000.00"))],
            "PROD": [("SR_PM", "TECH_COMP", Decimal("210000.00")), ("SR_PM", "TECH_COMP", Decimal("200000.00")), ("SR_UIUX", "TECH_COMP", Decimal("175000.00"))],
        }

        for dir_idx in l2_indices:
            dir_bp = blueprints[dir_idx]
            dept = dir_bp["dept"]
            available_roles = l3_roles_map.get(dept, l3_roles_map["ENG"])
            for r_pos, r_struct, r_wage in available_roles:
                idx = len(blueprints) + 1
                fn = FIRST_NAMES[idx % len(FIRST_NAMES)]
                ln = LAST_NAMES[(idx * 3) % len(LAST_NAMES)]
                l3_indices.append(len(blueprints))
                blueprints.append({
                    "code": f"EMP{idx:04d}",
                    "pos": r_pos,
                    "dept": dept,
                    "struct": r_struct,
                    "wage": r_wage,
                    "manager_idx": dir_idx,
                    "fn": fn,
                    "ln": ln,
                    "level": 3,
                })

        # Level 4: Senior Staff (144) — 4 per Level 3 Manager
        l4_indices = []
        l4_roles_map = {
            "ENG": [("SR_SWE", Decimal("135000.00")), ("SR_SWE", Decimal("125000.00")), ("SR_QA", Decimal("110000.00")), ("SR_SWE", Decimal("130000.00"))],
            "CLOUD": [("SR_DEVOPS", Decimal("135000.00")), ("SR_DEVOPS", Decimal("125000.00")), ("SR_DEVOPS", Decimal("130000.00")), ("SR_DEVOPS", Decimal("120000.00"))],
            "CS": [("SR_CSM", Decimal("95000.00")), ("SR_CSM", Decimal("90000.00")), ("CS_SPEC", Decimal("75000.00")), ("SR_CSM", Decimal("92000.00"))],
            "FIN": [("SR_ACCOUNTANT", Decimal("105000.00")), ("SR_ACCOUNTANT", Decimal("98000.00")), ("ACCOUNTANT", Decimal("85000.00")), ("SR_ACCOUNTANT", Decimal("100000.00"))],
            "HR": [("SR_RECRUITER", Decimal("95000.00")), ("HR_GENERALIST", Decimal("80000.00")), ("SR_RECRUITER", Decimal("90000.00")), ("HR_GENERALIST", Decimal("82000.00"))],
            "SALES": [("SR_AE", Decimal("125000.00")), ("SR_AE", Decimal("120000.00")), ("AE", Decimal("100000.00")), ("SR_AE", Decimal("115000.00"))],
            "PROD": [("PM", Decimal("130000.00")), ("PM", Decimal("125000.00")), ("SR_UIUX", Decimal("115000.00")), ("UIUX_DES", Decimal("95000.00"))],
        }

        for mgr_idx in l3_indices:
            mgr_bp = blueprints[mgr_idx]
            dept = mgr_bp["dept"]
            struct = mgr_bp["struct"]
            senior_roles = l4_roles_map.get(dept, l4_roles_map["ENG"])
            for r_pos, r_wage in senior_roles:
                idx = len(blueprints) + 1
                fn = FIRST_NAMES[(idx * 7) % len(FIRST_NAMES)]
                ln = LAST_NAMES[(idx * 5) % len(LAST_NAMES)]
                l4_indices.append(len(blueprints))
                blueprints.append({
                    "code": f"EMP{idx:04d}",
                    "pos": r_pos,
                    "dept": dept,
                    "struct": struct,
                    "wage": r_wage,
                    "manager_idx": mgr_idx,
                    "fn": fn,
                    "ln": ln,
                    "level": 4,
                })

        # Level 5: Mid & Junior Staff (201) — Distributed under L3 & L4
        l5_roles_map = {
            "ENG": [("SWE", Decimal("65000.00")), ("JR_SWE", Decimal("42000.00")), ("QA_ENG", Decimal("55000.00")), ("SWE", Decimal("72000.00"))],
            "CLOUD": [("DEVOPS_ENG", Decimal("68000.00")), ("DEVOPS_ENG", Decimal("60000.00")), ("DEVOPS_ENG", Decimal("75000.00"))],
            "CS": [("CS_SPEC", Decimal("45000.00")), ("CS_SPEC", Decimal("40000.00")), ("CS_SPEC", Decimal("48000.00"))],
            "FIN": [("ACCOUNTANT", Decimal("52000.00")), ("ACCOUNTANT", Decimal("45000.00")), ("ACCOUNTANT", Decimal("48000.00"))],
            "HR": [("HR_GENERALIST", Decimal("48000.00")), ("HR_GENERALIST", Decimal("42000.00")), ("HR_GENERALIST", Decimal("45000.00"))],
            "SALES": [("AE", Decimal("65000.00")), ("SDR", Decimal("45000.00")), ("SDR", Decimal("42000.00"))],
            "PROD": [("UIUX_DES", Decimal("65000.00")), ("UIUX_DES", Decimal("58000.00"))],
        }

        supervisor_pool = l3_indices + l4_indices
        l5_needed = 400 - len(blueprints)

        for i in range(l5_needed):
            idx = len(blueprints) + 1
            sup_idx = supervisor_pool[i % len(supervisor_pool)]
            sup_bp = blueprints[sup_idx]
            dept = sup_bp["dept"]
            struct = sup_bp["struct"]
            roles = l5_roles_map.get(dept, l5_roles_map["ENG"])
            r_pos, r_wage = roles[i % len(roles)]

            fn = FIRST_NAMES[(idx * 11 + 3) % len(FIRST_NAMES)]
            ln = LAST_NAMES[(idx * 13 + 7) % len(LAST_NAMES)]
            blueprints.append({
                "code": f"EMP{idx:04d}",
                "pos": r_pos,
                "dept": dept,
                "struct": struct,
                "wage": r_wage,
                "manager_idx": sup_idx,
                "fn": fn,
                "ln": ln,
                "level": 5,
            })

        print(f"      ✓ Blueprint created: exactly {len(blueprints)} employees planned.")

        # -------------------------------------------------------------------
        # Sequential Insertion to populate real auto-increment DB IDs
        # -------------------------------------------------------------------
        email_seen: set[str] = set()
        contracts_to_create: list[dict[str, Any]] = []

        # Intentional 8 employees with missing bank details for testing audit
        missing_bank_indices = {391, 392, 393, 394, 395, 396, 397, 398}

        for i, bp in enumerate(blueprints):
            emp_code = bp["code"]
            fn = bp["fn"]
            ln = bp["ln"]

            # Unique email construction
            base_email = f"{fn.lower()}.{ln.lower()}@peoplepay360.com"
            if base_email in email_seen:
                email = f"{fn.lower()}.{ln.lower()}.{emp_code.lower()}@peoplepay360.com"
            else:
                email = base_email
            email_seen.add(email)

            # Assign Manager ID from already inserted employees
            mgr_db_id = None
            if bp["manager_idx"] is not None:
                mgr_db_id = self.employees[bp["manager_idx"]].id

            # Department & Job Position IDs
            dept_id = self.departments[bp["dept"]].id
            job_pos_id = self.job_positions[bp["pos"]].id

            # Schedule: Tech departments get Flexible, others get Standard
            sched_id = self.schedules["FLEXIBLE"].id if bp["dept"] in ("ENG", "CLOUD") else self.schedules["STANDARD"].id

            # Dates
            join_year = 2021 + (i % 5)
            join_month = (i % 12) + 1
            join_day = ((i * 7) % 25) + 1
            joining_date = datetime.date(join_year, join_month, join_day)
            dob_year = 1978 + (i % 24)
            dob = datetime.date(dob_year, ((i + 3) % 12) + 1, ((i + 5) % 27) + 1)
            phone = f"+91 98{i % 100:02d} {((i * 1234) % 9000) + 1000}"

            # Banking Details (392 with full details, 8 missing for test)
            if i in missing_bank_indices:
                bank_name = None
                acc_num = None
                ifsc = None
                pan = None
                holder = None
            else:
                bank = BANKS[i % len(BANKS)]
                bank_name = bank["name"]
                branch = bank["branches"][i % len(bank["branches"])]
                ifsc = f"{bank['ifsc_prefix']}{branch}"
                acc_num = f"{bank['acc_prefix']}{i:04d}{((i * 97) % 9000) + 1000}"
                pan = generate_pan(ln, i)
                holder = f"{fn} {ln}"

            # Check if employee already exists in DB
            res = await self.db.execute(select(Employee).where(Employee.employee_code == emp_code))
            emp = res.scalar_one_or_none()
            if not emp:
                emp = Employee(
                    employee_code=emp_code,
                    first_name=fn,
                    last_name=ln,
                    email=email,
                    phone=phone,
                    date_of_birth=dob,
                    joining_date=joining_date,
                    department_id=dept_id,
                    job_position_id=job_pos_id,
                    manager_id=mgr_db_id,
                    working_schedule_id=sched_id,
                    bank_name=bank_name,
                    bank_account_number=acc_num,
                    ifsc_code=ifsc,
                    pan_number=pan,
                    account_holder_name=holder,
                    status=EmployeeStatus.ACTIVE,
                )
                self.db.add(emp)
                await self.db.flush()
            self.employees.append(emp)

            # Prepare contract
            contracts_to_create.append({
                "emp_id": emp.id,
                "dept_id": dept_id,
                "pos_id": job_pos_id,
                "struct_id": self.salary_structures[bp["struct"]].id,
                "wage": bp["wage"],
                "start_date": joining_date,
                "cnt_code": f"CNT-2026-{i+1:04d}",
            })

            if (i + 1) % 100 == 0:
                print(f"      ... {i + 1}/400 employees registered.")

        # Batch insert contracts
        for c in contracts_to_create:
            res = await self.db.execute(select(Contract).where(Contract.contract_number == c["cnt_code"]))
            cnt = res.scalar_one_or_none()
            if not cnt:
                cnt = Contract(
                    contract_number=c["cnt_code"],
                    employee_id=c["emp_id"],
                    department_id=c["dept_id"],
                    job_position_id=c["pos_id"],
                    salary_structure_id=c["struct_id"],
                    start_date=c["start_date"],
                    wage=c["wage"],
                    status=ContractStatus.RUNNING,
                )
                self.db.add(cnt)

        # Link department managers (Designated Department Heads)
        dept_manager_map = {
            "EXEC": 0,    # Rajesh Singhania (CEO)
            "ENG": 1,     # Priya Nair (CTO)
            "CLOUD": 2,   # Vikram Malhotra (VP Cloud)
            "PROD": 3,    # Sunita Rao (VP Product)
            "HR": 4,      # Ananya Deshmukh (CHRO)
            "FIN": 5,     # Arjun Mehta (CFO)
            "SALES": 6,   # Sneha Kulkarni (CRO)
            "CS": 7,      # Karthik Iyer (VP CS)
        }
        for d_code, emp_idx in dept_manager_map.items():
            if d_code in self.departments and emp_idx < len(self.employees):
                self.departments[d_code].manager_id = self.employees[emp_idx].id

        await self.db.flush()
        print("      ✓ 400 Active Employees & 400 RUNNING Contracts generated.")
        print("      ✓ 8 Department Managers linked by relational Employee ID.")

    # -----------------------------------------------------------------------
    # 6. Seed User Accounts & System Logins
    # -----------------------------------------------------------------------
    async def _seed_user_accounts(self):
        print("\n[6/7] 🔐 Seeding Authentication User Accounts for all 400 employees...")

        # 1. Convenience administrative logins (for rapid testing without looking up employee names)
        convenience_accounts = [
            ("admin@peoplepay360.com", HASH_ADMIN_123, "ADMIN"),
            ("system.admin@peoplepay360.com", HASH_ADMIN_123, "ADMIN"),
            ("chro@peoplepay360.com", HASH_HR_123456, "HR_PAYROLL_MANAGER"),
            ("hr.manager@peoplepay360.com", HASH_HR_123456, "HR_MANAGER"),
            ("payroll@peoplepay360.com", HASH_PAYROLL_123, "HR_PAYROLL_USER"),
        ]

        count = 0
        for email, pwd_hash, role_name in convenience_accounts:
            res = await self.db.execute(select(User).where(User.email == email))
            usr = res.scalar_one_or_none()
            if not usr:
                usr = User(
                    email=email,
                    password_hash=pwd_hash,
                    role_id=self.roles[role_name].id,
                    employee_id=None,
                    is_active=True,
                )
                self.db.add(usr)
                count += 1

        # 2. Every single employee gets their own dedicated 1:1 login
        # Map specific leadership / key personas:
        # Index 0 (CEO): ADMIN
        # Index 4 (CHRO): HR_PAYROLL_MANAGER
        # Index 14 (People Ops Director / HR Mgr): HR_MANAGER
        # Index 31 (Payroll Lead): HR_PAYROLL_USER
        # All others: EMPLOYEE
        special_roles = {
            0: ("ADMIN", HASH_ADMIN_123),
            4: ("HR_PAYROLL_MANAGER", HASH_HR_123456),
            14: ("HR_MANAGER", HASH_HR_123456),
            31: ("HR_PAYROLL_USER", HASH_PAYROLL_123),
        }

        for idx, emp in enumerate(self.employees):
            res = await self.db.execute(select(User).where(User.employee_id == emp.id))
            usr = res.scalar_one_or_none()
            if not usr:
                role_name, pwd_hash = special_roles.get(idx, ("EMPLOYEE", HASH_EMPLOYEE_123))
                usr = User(
                    email=emp.email,
                    password_hash=pwd_hash,
                    role_id=self.roles[role_name].id,
                    employee_id=emp.id,
                    is_active=True,
                )
                self.db.add(usr)
                count += 1

        await self.db.flush()
        print(f"      ✓ {count} System Login Users active (all 400 employees + convenience admin logins).")

    # -----------------------------------------------------------------------
    # 7. Seed Leave Allocations (PTO & SICK for 2026)
    # -----------------------------------------------------------------------
    async def _seed_leave_allocations(self):
        print("\n[7/7] 🏖️  Seeding 2026 Annual Leave Allocations for all employees...")
        valid_from = datetime.date(2026, 1, 1)
        valid_to = datetime.date(2026, 12, 31)

        pto_type_id = self.time_off_types["PTO"].id
        sick_type_id = self.time_off_types["SICK"].id

        allocations = []
        for emp in self.employees:
            # Check existing
            res = await self.db.execute(
                select(TimeOffAllocation).where(
                    TimeOffAllocation.employee_id == emp.id,
                    TimeOffAllocation.valid_from == valid_from,
                )
            )
            if not res.scalars().first():
                # 18 days PTO
                allocations.append(
                    TimeOffAllocation(
                        employee_id=emp.id,
                        time_off_type_id=pto_type_id,
                        allocation_quantity=Decimal("18.00"),
                        consumed_quantity=Decimal("0.00"),
                        valid_from=valid_from,
                        valid_to=valid_to,
                        status=AllocationStatus.ACTIVE,
                        notes="2026 Annual Paid Time Off Grant",
                    )
                )
                # 12 days Sick Leave
                allocations.append(
                    TimeOffAllocation(
                        employee_id=emp.id,
                        time_off_type_id=sick_type_id,
                        allocation_quantity=Decimal("12.00"),
                        consumed_quantity=Decimal("0.00"),
                        valid_from=valid_from,
                        valid_to=valid_to,
                        status=AllocationStatus.ACTIVE,
                        notes="2026 Annual Sick Leave Grant",
                    )
                )

        if allocations:
            self.db.add_all(allocations)
            await self.db.flush()
        print(f"      ✓ {len(allocations)} Leave Allocations granted (18 PTO + 12 SICK).")

    # -----------------------------------------------------------------------
    # 8. Seed Realistic Attendance Details
    # -----------------------------------------------------------------------
    async def _seed_attendance_records(self):
        print("\n[8/8] ⏱️  Seeding Realistic Attendance Details across 8 Departments...")

        # Dates:
        # Week 1: 2026-08-24 to 2026-08-28 (Mon - Fri) -> Seeded for top 60 employees
        # Week 2: 2026-08-31 to 2026-09-04 (Mon - Fri) -> Seeded for all 400 employees
        week1_dates = [
            datetime.date(2026, 8, 24),
            datetime.date(2026, 8, 25),
            datetime.date(2026, 8, 26),
            datetime.date(2026, 8, 27),
            datetime.date(2026, 8, 28),
        ]
        week2_dates = [
            datetime.date(2026, 8, 31),
            datetime.date(2026, 9, 1),
            datetime.date(2026, 9, 2),
            datetime.date(2026, 9, 3),
            datetime.date(2026, 9, 4),
        ]

        target_assignments = []
        for d in week1_dates:
            for emp in self.employees[:60]:
                target_assignments.append((emp, d))

        for d in week2_dates:
            for emp in self.employees:
                target_assignments.append((emp, d))

        attendances = []
        for emp, att_date in target_assignments:
            res = await self.db.execute(
                select(Attendance.id).where(
                    Attendance.employee_id == emp.id,
                    Attendance.attendance_date == att_date,
                )
            )
            if res.scalars().first():
                continue

            # Deterministic pseudo-random seed
            seed_val = (emp.id * 37 + att_date.day * 13 + att_date.month * 7) % 100

            # Schedule start / end
            # Flexible Tech (ENG, CLOUD): 10:00 - 19:00 UTC (expected 480 mins after 60m break)
            # Standard (all other departments): 09:00 - 18:00 UTC (expected 480 mins after 60m break)
            is_tech = emp.department_id in (self.departments["ENG"].id, self.departments["CLOUD"].id)
            sched_start = 10 if is_tech else 9
            sched_end = 19 if is_tech else 18

            if seed_val < 85:
                # 85%: PRESENT (On Time)
                c_in_min = seed_val % 7
                check_in_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_start, c_in_min, 0, tzinfo=datetime.timezone.utc,
                )
                ot_min = (seed_val * 3) % 25
                check_out_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_end, ot_min, 0, tzinfo=datetime.timezone.utc,
                )
                worked = 480 + ot_min - c_in_min
                att = Attendance(
                    employee_id=emp.id,
                    attendance_date=att_date,
                    check_in=check_in_dt,
                    check_out=check_out_dt,
                    worked_minutes=worked,
                    late_minutes=0,
                    overtime_minutes=ot_min,
                    status=AttendanceStatus.PRESENT,
                    is_manual_edit=False,
                )
            elif seed_val < 94:
                # 9%: LATE (15 to 40 mins late)
                late_mins = 15 + (seed_val % 25)
                check_in_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_start, late_mins, 0, tzinfo=datetime.timezone.utc,
                )
                check_out_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_end, 15, 0, tzinfo=datetime.timezone.utc,
                )
                worked = 480 - late_mins + 15
                att = Attendance(
                    employee_id=emp.id,
                    attendance_date=att_date,
                    check_in=check_in_dt,
                    check_out=check_out_dt,
                    worked_minutes=worked,
                    late_minutes=late_mins,
                    overtime_minutes=0,
                    status=AttendanceStatus.LATE,
                    is_manual_edit=False,
                )
            elif seed_val < 98:
                # 4%: HALF_DAY
                check_in_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_start, 0, 0, tzinfo=datetime.timezone.utc,
                )
                check_out_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_start + 4, 15, 0, tzinfo=datetime.timezone.utc,
                )
                att = Attendance(
                    employee_id=emp.id,
                    attendance_date=att_date,
                    check_in=check_in_dt,
                    check_out=check_out_dt,
                    worked_minutes=240,
                    late_minutes=0,
                    overtime_minutes=0,
                    status=AttendanceStatus.HALF_DAY,
                    is_manual_edit=False,
                )
            else:
                # 2%: ABSENT
                check_in_dt = datetime.datetime(
                    att_date.year, att_date.month, att_date.day,
                    sched_start, 0, 0, tzinfo=datetime.timezone.utc,
                )
                att = Attendance(
                    employee_id=emp.id,
                    attendance_date=att_date,
                    check_in=check_in_dt,
                    check_out=None,
                    worked_minutes=0,
                    late_minutes=0,
                    overtime_minutes=0,
                    status=AttendanceStatus.ABSENT,
                    is_manual_edit=False,
                    correction_reason="Unplanned Leave / Medical Emergency",
                )

            attendances.append(att)

        # Also seed an active session for today so demo users show 'Punched In'
        today = datetime.date.today()
        demo_punched_in = [0, 1, 4, 14, 31, 49, 199]
        for p_idx in demo_punched_in:
            if p_idx < len(self.employees):
                p_emp = self.employees[p_idx]
                res = await self.db.execute(
                    select(Attendance.id).where(
                        Attendance.employee_id == p_emp.id,
                        Attendance.attendance_date == today,
                    )
                )
                if not res.scalars().first():
                    check_in_now = datetime.datetime.now(datetime.timezone.utc).replace(hour=3, minute=30, second=0)
                    active_att = Attendance(
                        employee_id=p_emp.id,
                        attendance_date=today,
                        check_in=check_in_now,
                        check_out=None,
                        worked_minutes=0,
                        late_minutes=0,
                        overtime_minutes=0,
                        status=AttendanceStatus.INCOMPLETE,
                        is_manual_edit=False,
                    )
                    attendances.append(active_att)

        if attendances:
            self.db.add_all(attendances)
            await self.db.flush()

        print(f"      ✓ {len(attendances)} Attendance Records seeded (Present, Late, Half Day, Absent, Active Sessions).")

    # -----------------------------------------------------------------------
    # 9. Seed Sample Payrun (September 2026 Tech & Cloud Cycle)
    # -----------------------------------------------------------------------
    async def _seed_sample_payrun(self):
        print("\n[*] 💳 Computing September 2026 Tech & Cloud Payroll Cycle...")
        tech_struct = self.salary_structures["TECH_COMP"]
        start_date = datetime.date(2026, 9, 1)
        end_date = datetime.date(2026, 9, 30)

        # Gather active employees and their active contracts belonging to TECH_COMP
        res = await self.db.execute(
            select(Contract.id, Contract.employee_id).where(
                Contract.salary_structure_id == tech_struct.id,
                Contract.status == ContractStatus.RUNNING,
            )
        )
        tech_contracts = list(res.all())

        # Check existing Payrun
        p_res = await self.db.execute(
            select(Payrun).where(
                Payrun.salary_structure_id == tech_struct.id,
                Payrun.period_start == start_date,
                Payrun.period_end == end_date,
            )
        )
        payrun = p_res.scalar_one_or_none()
        if not payrun:
            payrun = Payrun(
                name="September 2026 Tech & Cloud Engineering Payroll Cycle",
                salary_structure_id=tech_struct.id,
                period_start=start_date,
                period_end=end_date,
                status=PayrunStatus.DRAFT,
            )
            self.db.add(payrun)
            await self.db.flush()

            # Add Draft Payslips
            for cid, eid in tech_contracts:
                payslip = Payslip(
                    payrun_id=payrun.id,
                    employee_id=eid,
                    contract_id=cid,
                    salary_structure_id=tech_struct.id,
                    period_start=start_date,
                    period_end=end_date,
                    status=PayslipStatus.DRAFT,
                )
                self.db.add(payslip)
            await self.db.flush()

            # Compute Payrun
            await payrun_service.compute_payrun(self.db, payrun.id)
            print(f"      ✓ Payrun ID #{payrun.id} created & computed for {len(tech_contracts)} employees!")
        else:
            print(f"      ✓ Payrun ID #{payrun.id} already exists.")

    # -----------------------------------------------------------------------
    # Summary & Instructions
    # -----------------------------------------------------------------------
    def _print_summary(self):
        print("""
========================================================================
                      🌟 TEST CREDENTIALS & DEMO ACCESS
========================================================================

  Role                Email                             Password
  --------------------------------------------------------------------
  System Admin        admin@peoplepay360.com            Admin@123
  HR Director (CHRO)  chro@peoplepay360.com             Hr@123456
  HR Manager          hr.manager@peoplepay360.com       Hr@123456
  Payroll Specialist  payroll@peoplepay360.com          Payroll@123
  CTO (Level 1)       cto@peoplepay360.com              Employee@123
  Eng Director (L2)   eng.director@peoplepay360.com     Employee@123
  Staff Engineer (L3) lead.swe@peoplepay360.com         Employee@123
  Senior SWE (L4)     sr.swe@peoplepay360.com           Employee@123
  Software Eng (L5)   swe@peoplepay360.com              Employee@123

  * All 400 employee accounts (EMP0001 to EMP0400) share password: Employee@123

========================================================================
                      📊 LIVE API AUDIT & TESTING CURLS
========================================================================

  # 1. Login to retrieve JWT Access Token:
  TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"email":"admin@peoplepay360.com","password":"Admin@123"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

  # 2. Check Corporate Bank Payout Audit for Payrun 1:
  curl -s -X GET http://localhost:8000/api/v1/payruns/1/bank-payout-summary \\
    -H "Authorization: Bearer $TOKEN" | jq .

  # 3. Download Standard Bank Payout CSV:
  curl -X GET "http://localhost:8000/api/v1/payruns/1/export-bank-file?bank_format=standard" \\
    -H "Authorization: Bearer $TOKEN" -o bank_payout.csv

  # 4. Trigger Automated PDF Payslip Delivery via Email Engine:
  curl -s -X POST http://localhost:8000/api/v1/payruns/1/send-payslips \\
    -H "Authorization: Bearer $TOKEN" | jq .

========================================================================
""")

# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="PeoplePay360 400-Employee Data Seeder")
    parser.add_argument("--reset", action="store_true", help="Wipe all existing records and run fresh seed")
    parser.add_argument("--no-payrun", action="store_true", help="Skip creating and computing sample payrun")
    args = parser.parse_args()

    async def _async_run():
        async with AsyncSessionLocal() as session:
            seeder = DatabaseSeeder(session, reset=args.reset, create_payrun=not args.no_payrun)
            await seeder.run()

    asyncio.run(_async_run())

if __name__ == "__main__":
    main()
