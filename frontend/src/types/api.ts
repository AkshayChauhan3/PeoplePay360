// PeoplePay360 - TypeScript interfaces matching contracts/openapi.yaml 1:1

export type UserRole = 'EMPLOYEE' | 'HR_MANAGER' | 'HR_PAYROLL_USER' | 'HR_PAYROLL_MANAGER' | 'ADMIN';

export interface UserResponse {
  id: string;
  emp_id?: string | null;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ErrorEnvelope {
  detail: string;
  code: string;
}

export type EmployeeType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'PROBATION';

export interface EmployeeListOut {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  work_email: string;
  job_title: string;
  department_name: string;
  status: string;
}

export interface EmployeeDetailOut {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  work_email: string;
  phone?: string | null;
  job_title: string;
  employee_type: EmployeeType;
  department_id?: string | null;
  department_name?: string | null;
  manager_id?: string | null;
  join_date: string;
  is_active: boolean;
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  smart_button_counts: {
    contracts: number;
    attendance: number;
    timeoff: number;
  };
}

export interface EmployeeCreateIn {
  employee_code: string;
  first_name: string;
  last_name: string;
  work_email: string;
  job_title: string;
  department_id?: string | null;
  employee_type?: EmployeeType;
  join_date: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
}

export interface DepartmentOut {
  id: string;
  name: string;
  code: string;
  manager_name?: string | null;
}

export interface DepartmentIn {
  name: string;
  code: string;
  manager_employee_id?: string | null;
}

export type ContractStatus = 'DRAFT' | 'RUNNING' | 'EXPIRED' | 'CANCELLED';

export interface ContractOut {
  id: string;
  reference: string;
  employee_id: string;
  employee_name?: string;
  schedule_id: string;
  schedule_name?: string;
  salary_structure_id: string;
  salary_structure_name?: string;
  start_date: string;
  end_date?: string | null;
  wage: number;
  status: ContractStatus;
}

export interface ContractIn {
  reference: string;
  employee_id: string;
  schedule_id: string;
  salary_structure_id: string;
  start_date: string;
  end_date?: string | null;
  wage: number;
  status?: ContractStatus;
}

export interface ScheduleLine {
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_hours: number;
  work_hours?: number;
}

export interface ScheduleOut {
  id: string;
  name: string;
  calendar_type?: string;
  hours_per_week: number;
  days_per_week: number;
  lines: ScheduleLine[];
}

export interface ScheduleIn {
  name: string;
  lines: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_hours: number;
  }>;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'MISSING_CHECKOUT' | 'OVERTIME';

export interface AttendanceOut {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in: string;
  check_out?: string | null;
  elapsed_hours?: number | null;
  net_hours?: number | null;
  status: AttendanceStatus;
  is_exception: boolean;
}

export interface AttendanceSessionOut {
  has_active_session: boolean;
  session_id?: string | null;
  check_in_time?: string | null;
  elapsed_seconds?: number | null;
}

export interface LeaveTypeOut {
  id: string;
  name: string;
  code: string;
  unit: 'DAYS' | 'HOURS';
  requires_allocation: boolean;
  display_color?: string;
}

export interface LeaveTypeIn {
  name: string;
  code: string;
  unit?: 'DAYS' | 'HOURS';
  requires_allocation?: boolean;
  display_color?: string;
}

export interface AllocationOut {
  id: string;
  employee_id: string;
  employee_name?: string;
  leave_type_name: string;
  allocated_days: number;
  taken_days: number;
  remaining_days: number;
  validity_start: string;
  validity_end: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED';
}

export interface AllocationIn {
  employee_id: string;
  leave_type_id: string;
  allocated_days: number;
  validity_start: string;
  validity_end: string;
}

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REFUSED';

export interface LeaveRequestOut {
  id: string;
  employee_id: string;
  employee_name?: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason?: string | null;
  status: LeaveRequestStatus;
}

export interface LeaveRequestIn {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface SalaryStructureOut {
  id: string;
  name: string;
  code: string;
  rule_count: number;
  active: boolean;
  description?: string;
}

export interface SalaryStructureIn {
  name: string;
  code: string;
  description?: string;
}

export type RuleCategory = 'BASIC' | 'ALLOWANCE' | 'GROSS' | 'DEDUCTION' | 'NET';
export type ComputationMethod = 'FIXED' | 'PERCENTAGE' | 'FORMULA';

export interface SalaryRuleOut {
  id: string;
  sequence: number;
  name: string;
  code: string;
  category: RuleCategory;
  computation_method: ComputationMethod;
  amount?: number | null;
  percentage?: number | null;
  percentage_base_code?: string | null;
  formula_expression?: string | null;
}

export interface SalaryRuleIn {
  sequence: number;
  name: string;
  code: string;
  category: RuleCategory;
  computation_method: ComputationMethod;
  amount?: number | null;
  percentage?: number | null;
  percentage_base_code?: string | null;
  formula_expression?: string | null;
}

export type PayrunStatus = 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';

export interface PayrunListOut {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  employee_count: number;
  status: PayrunStatus;
  warning_count: number;
  total_net?: number;
}

export interface EligibleEmployeePreview {
  employee_id: string;
  employee_name: string;
  department_name?: string;
  working_hours_per_week: number;
  contract_start_date: string;
  wage: number;
}

export interface PayrunPreviewIn {
  salary_structure_id: string;
  period_start: string;
  period_end: string;
  employee_type?: string;
}

export interface PayrunCreateIn {
  name: string;
  salary_structure_id: string;
  period_start: string;
  period_end: string;
  selected_employee_ids: string[];
}

export interface PayslipSummaryOut {
  id: string;
  employee_name: string;
  worked_days: number;
  basic: number;
  gross: number;
  net: number;
  status: 'Draft' | 'Computed' | 'Done' | 'Paid';
  has_warning: boolean;
  warning_reason?: string | null;
}

export interface PayrunDetailOut {
  id: string;
  name: string;
  salary_structure_name: string;
  period_start: string;
  period_end: string;
  status: PayrunStatus;
  employee_count: number;
  warning_count: number;
  total_gross?: number;
  total_deductions?: number;
  total_net?: number;
  payslips: PayslipSummaryOut[];
}

export interface PayslipLine {
  rule_sequence: number;
  rule_name: string;
  rule_code: string;
  category: string;
  rate?: number | null;
  quantity: number;
  amount: number;
  total: number;
}

export interface PayslipDetailOut {
  id: string;
  employee_name: string;
  structure_name: string;
  payrun_name?: string;
  period_start: string;
  period_end: string;
  worked_days: number;
  scheduled_days?: number;
  status: string;
  has_warning?: boolean;
  warning_reason?: string | null;
  lines: PayslipLine[];
}

export interface DashboardSummaryOut {
  total_net_salary_paid: number;
  payslips_generated: number;
  avg_salary_per_employee: number;
  approved_time_off_days: number;
  attendance_health?: number | null;
}

export interface AttendanceOverviewOut {
  present: number;
  late: number;
  absent: number;
  overtime: number;
  missing_checkouts: number;
}

export interface TimeOffOverviewOut {
  leave_type: string;
  approved_days: number;
  pending_requests: number;
  remaining_balance?: number | null;
}

export interface DepartmentOverviewOut {
  department: string;
  headcount: number;
  total_salary: number;
}

export interface DepartmentSalaryCostChart {
  department: string;
  total_salary: number;
}

export interface MonthlyNetSalaryTrendChart {
  month: string;
  net_amount: number;
}
