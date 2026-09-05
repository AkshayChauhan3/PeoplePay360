// PeoplePay360 - Unified Service Implementation for all endpoints in contracts/openapi.yaml

import { apiClient } from './apiClient';
import * as mock from './mockData';
import {
  UserResponse,
  TokenResponse,
  EmployeeListOut,
  EmployeeDetailOut,
  EmployeeCreateIn,
  DepartmentOut,
  DepartmentIn,
  ContractOut,
  ContractIn,
  ScheduleOut,
  ScheduleIn,
  AttendanceOut,
  AttendanceSessionOut,
  LeaveTypeOut,
  LeaveTypeIn,
  AllocationOut,
  AllocationIn,
  LeaveRequestOut,
  LeaveRequestIn,
  SalaryStructureOut,
  SalaryStructureIn,
  SalaryRuleOut,
  SalaryRuleIn,
  PayrunListOut,
  PayrunDetailOut,
  EligibleEmployeePreview,
  PayrunPreviewIn,
  PayrunCreateIn,
  PayslipSummaryOut,
  PayslipDetailOut,
  DashboardSummaryOut,
  AttendanceOverviewOut,
  TimeOffOverviewOut,
  DepartmentOverviewOut,
  DepartmentSalaryCostChart,
  MonthlyNetSalaryTrendChart,
} from '../types/api';

const inMemoryEmployees = [...mock.mockEmployees];
const inMemoryContracts = [...mock.mockContracts];
const inMemoryDepartments = [...mock.mockDepartments];
const inMemorySchedules = [...mock.mockSchedules];
const inMemoryAttendance = [...mock.mockAttendanceRecords];
const inMemoryLeaveRequests = [...mock.mockLeaveRequests];
const inMemoryAllocations = [...mock.mockAllocations];
const inMemoryLeaveTypes = [...mock.mockLeaveTypes];
const inMemoryPayruns = [...mock.mockPayruns];
const inMemoryStructures = [...mock.mockSalaryStructures];
const inMemoryUsers = [...mock.mockUsers];

let activeSession: AttendanceSessionOut = {
  has_active_session: true,
  session_id: 'att-sess-1',
  check_in_time: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
  elapsed_seconds: 16200,
};

export const apiService = {
  // =========================================================================
  // 0. HEALTH & AUTH
  // =========================================================================
  async health(): Promise<{ status: string }> {
    return apiClient.get('/api/v1/health', () => ({ status: 'ok' }));
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    return apiClient.post(
      '/api/v1/auth/login',
      { email, password },
      () => {
        const emailLower = email.toLowerCase().trim();
        const found = inMemoryUsers.find(
          (u) =>
            u.email.toLowerCase() === emailLower ||
            (emailLower.includes('admin') && u.role === 'ADMIN') ||
            (emailLower.includes('maya') && u.role === 'HR_MANAGER') ||
            (emailLower.includes('priya') && u.role === 'HR_MANAGER') ||
            (emailLower.includes('rohan') && u.role === 'EMPLOYEE') ||
            (emailLower.includes('nisha') && u.role === 'HR_PAYROLL_MANAGER') ||
            (emailLower.includes('aarav') && (u.role === 'HR_PAYROLL_MANAGER' || u.role === 'HR_PAYROLL_USER'))
        );
        const user = found || inMemoryUsers.find((u) => u.role === 'ADMIN') || inMemoryUsers[0];
        const token = `mock-token-${user.id}-${user.role}`;
        apiClient.setTokens(token, `mock-refresh-${user.id}`);
        return {
          access_token: token,
          refresh_token: `mock-refresh-${user.id}`,
          token_type: 'bearer',
        };
      }
    );
  },

  async register(data: { email: string; password: string; role?: string; emp_id?: string }): Promise<UserResponse> {
    return apiClient.post(
      '/api/v1/auth/register',
      data,
      () => {
        const newUser: UserResponse = {
          id: `u-${Date.now()}`,
          emp_id: data.emp_id || null,
          email: data.email,
          role: (data.role as any) || 'EMPLOYEE',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        inMemoryUsers.push(newUser);
        return newUser;
      }
    );
  },

  async getMe(): Promise<UserResponse> {
    return apiClient.get('/api/v1/auth/me', () => {
      const token = apiClient.getAccessToken();
      if (token && token.startsWith('mock-token-')) {
        const rest = token.replace('mock-token-', '');
        const found = inMemoryUsers.find((u) => rest.startsWith(u.id));
        if (found) return found;
      }
      return inMemoryUsers.find((u) => u.role === 'ADMIN') || inMemoryUsers[0];
    });
  },

  async getUsers(search?: string, role?: string): Promise<UserResponse[]> {
    return apiClient.get('/api/v1/users', () => {
      let filtered = [...inMemoryUsers];
      if (search) {
        filtered = filtered.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));
      }
      if (role) {
        filtered = filtered.filter((u) => u.role === role);
      }
      return filtered;
    });
  },

  async updateUser(id: string, data: { is_active?: boolean; role?: string }): Promise<UserResponse> {
    return apiClient.patch(`/api/v1/users/${id}`, data, () => {
      const idx = inMemoryUsers.findIndex((u) => u.id === id);
      if (idx !== -1) {
        inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...data as any, updated_at: new Date().toISOString() };
        return inMemoryUsers[idx];
      }
      throw new Error('User not found');
    });
  },

  // =========================================================================
  // 1. EMPLOYEES, CONTRACTS & SCHEDULES
  // =========================================================================
  async getEmployees(params?: { view?: 'kanban' | 'list'; search?: string; department_id?: string; employee_type?: string }): Promise<EmployeeListOut[]> {
    return apiClient.get('/api/v1/employees', () => {
      let list = inMemoryEmployees.map((e) => ({
        id: e.id,
        employee_code: e.employee_code,
        first_name: e.first_name,
        last_name: e.last_name,
        work_email: e.work_email,
        job_title: e.job_title,
        department_name: e.department_name || 'Unassigned',
        status: e.is_active ? 'Active' : 'Inactive',
      }));

      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (e) =>
            e.first_name.toLowerCase().includes(q) ||
            e.last_name.toLowerCase().includes(q) ||
            e.employee_code.toLowerCase().includes(q) ||
            e.work_email.toLowerCase().includes(q)
        );
      }
      if (params?.department_id) {
        const dept = inMemoryDepartments.find((d) => d.id === params.department_id);
        if (dept) list = list.filter((e) => e.department_name === dept.name);
      }
      return list;
    });
  },

  async getEmployeeById(id: string): Promise<EmployeeDetailOut> {
    return apiClient.get(`/api/v1/employees/${id}`, () => {
      const emp = inMemoryEmployees.find((e) => e.id === id);
      if (!emp) throw new Error('Employee not found');
      return emp;
    });
  },

  async createEmployee(data: EmployeeCreateIn): Promise<EmployeeDetailOut> {
    return apiClient.post('/api/v1/employees', data, () => {
      const dept = inMemoryDepartments.find((d) => d.id === data.department_id);
      const newEmp: EmployeeDetailOut = {
        id: `emp-${Date.now()}`,
        employee_code: data.employee_code,
        first_name: data.first_name,
        last_name: data.last_name,
        work_email: data.work_email,
        job_title: data.job_title,
        department_id: data.department_id || null,
        department_name: dept ? dept.name : null,
        employee_type: data.employee_type || 'FULL_TIME',
        join_date: data.join_date,
        is_active: true,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        ifsc_code: data.ifsc_code || null,
        smart_button_counts: { contracts: 0, attendance: 0, timeoff: 0 },
      };
      inMemoryEmployees.push(newEmp);
      return newEmp;
    });
  },

  async updateEmployee(id: string, data: Partial<EmployeeDetailOut>): Promise<EmployeeDetailOut> {
    return apiClient.patch(`/api/v1/employees/${id}`, data, () => {
      const idx = inMemoryEmployees.findIndex((e) => e.id === id);
      if (idx !== -1) {
        inMemoryEmployees[idx] = { ...inMemoryEmployees[idx], ...data };
        return inMemoryEmployees[idx];
      }
      throw new Error('Employee not found');
    });
  },

  async getEmployeeContracts(empId: string): Promise<ContractOut[]> {
    return apiClient.get(`/api/v1/employees/${empId}/contracts`, () => {
      return inMemoryContracts.filter((c) => c.employee_id === empId);
    });
  },

  async getEmployeeAttendance(empId: string): Promise<AttendanceOut[]> {
    return apiClient.get(`/api/v1/employees/${empId}/attendance`, () => {
      return inMemoryAttendance.filter((a) => a.employee_id === empId);
    });
  },

  async getEmployeeTimeOff(empId: string): Promise<LeaveRequestOut[]> {
    return apiClient.get(`/api/v1/employees/${empId}/timeoff`, () => {
      return inMemoryLeaveRequests.filter((l) => l.employee_id === empId);
    });
  },

  // Departments
  async getDepartments(): Promise<DepartmentOut[]> {
    return apiClient.get('/api/v1/departments', () => inMemoryDepartments);
  },

  async createDepartment(data: DepartmentIn): Promise<DepartmentOut> {
    return apiClient.post('/api/v1/departments', data, () => {
      const newDept: DepartmentOut = {
        id: `dept-${Date.now()}`,
        name: data.name,
        code: data.code,
        manager_name: null,
      };
      inMemoryDepartments.push(newDept);
      return newDept;
    });
  },

  async updateDepartment(id: string, data: DepartmentIn): Promise<DepartmentOut> {
    return apiClient.patch(`/api/v1/departments/${id}`, data, () => {
      const idx = inMemoryDepartments.findIndex((d) => d.id === id);
      if (idx !== -1) {
        inMemoryDepartments[idx] = { ...inMemoryDepartments[idx], name: data.name, code: data.code };
        return inMemoryDepartments[idx];
      }
      throw new Error('Department not found');
    });
  },

  // Contracts
  async getContracts(employee_id?: string): Promise<ContractOut[]> {
    return apiClient.get('/api/v1/contracts', () => {
      if (employee_id) return inMemoryContracts.filter((c) => c.employee_id === employee_id);
      return inMemoryContracts;
    });
  },

  async createContract(data: ContractIn): Promise<ContractOut> {
    return apiClient.post('/api/v1/contracts', data, () => {
      const emp = inMemoryEmployees.find((e) => e.id === data.employee_id);
      const sched = inMemorySchedules.find((s) => s.id === data.schedule_id);
      const struct = inMemoryStructures.find((s) => s.id === data.salary_structure_id);
      const newCon: ContractOut = {
        id: `con-${Date.now()}`,
        reference: data.reference,
        employee_id: data.employee_id,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        schedule_id: data.schedule_id,
        schedule_name: sched ? sched.name : 'Standard 40 Hours/Week',
        salary_structure_id: data.salary_structure_id,
        salary_structure_name: struct ? struct.name : 'Regular Full-Time Structure',
        start_date: data.start_date,
        end_date: data.end_date || null,
        wage: data.wage,
        status: data.status || 'DRAFT',
      };
      inMemoryContracts.push(newCon);
      return newCon;
    });
  },

  // Working Schedules
  async getSchedules(): Promise<ScheduleOut[]> {
    return apiClient.get('/api/v1/schedules', () => inMemorySchedules);
  },

  async createSchedule(data: ScheduleIn): Promise<ScheduleOut> {
    return apiClient.post('/api/v1/schedules', data, () => {
      const totalHours = data.lines.reduce((acc, l) => {
        const start = parseInt(l.start_time.split(':')[0], 10);
        const end = parseInt(l.end_time.split(':')[0], 10);
        return acc + (end - start - l.break_hours);
      }, 0);

      const newSched: ScheduleOut = {
        id: `sched-${Date.now()}`,
        name: data.name,
        calendar_type: 'Custom',
        hours_per_week: totalHours,
        days_per_week: data.lines.length,
        lines: data.lines.map((l) => ({ ...l, work_hours: 8 })),
      };
      inMemorySchedules.push(newSched);
      return newSched;
    });
  },

  // =========================================================================
  // 2. ATTENDANCE & QUICK SESSION WIDGET
  // =========================================================================
  async getAttendanceSession(): Promise<AttendanceSessionOut> {
    return apiClient.get('/api/v1/attendance/session', () => activeSession);
  },

  async checkIn(): Promise<AttendanceOut> {
    return apiClient.post('/api/v1/attendance/check-in', {}, () => {
      activeSession = {
        has_active_session: true,
        session_id: `att-${Date.now()}`,
        check_in_time: new Date().toISOString(),
        elapsed_seconds: 0,
      };
      const record: AttendanceOut = {
        id: activeSession.session_id!,
        employee_id: inMemoryEmployees[0].id,
        employee_name: `${inMemoryEmployees[0].first_name} ${inMemoryEmployees[0].last_name}`,
        date: new Date().toISOString().split('T')[0],
        check_in: activeSession.check_in_time!,
        check_out: null,
        elapsed_hours: 0,
        net_hours: 0,
        status: 'PRESENT',
        is_exception: false,
      };
      inMemoryAttendance.unshift(record);
      return record;
    });
  },

  async checkOut(sessionId: string): Promise<AttendanceOut> {
    return apiClient.post(`/api/v1/attendance/${sessionId}/check-out`, {}, () => {
      activeSession = {
        has_active_session: false,
        session_id: null,
        check_in_time: null,
        elapsed_seconds: null,
      };
      const existing = inMemoryAttendance.find((a) => a.id === sessionId);
      if (existing) {
        existing.check_out = new Date().toISOString();
        existing.elapsed_hours = 8.5;
        existing.net_hours = 7.5;
        return existing;
      }
      return inMemoryAttendance[0];
    });
  },

  async getAttendance(params?: { employee_id?: string; date_from?: string; date_to?: string; status?: string }): Promise<AttendanceOut[]> {
    return apiClient.get('/api/v1/attendance', () => {
      let list = [...inMemoryAttendance];
      if (params?.status) {
        list = list.filter((a) => a.status === params.status);
      }
      if (params?.employee_id) {
        list = list.filter((a) => a.employee_id === params.employee_id);
      }
      return list;
    });
  },

  async correctAttendance(id: string, data: { check_in: string; check_out: string; reason: string }): Promise<AttendanceOut> {
    return apiClient.post(`/api/v1/attendance/${id}/correct`, data, () => {
      const existing = inMemoryAttendance.find((a) => a.id === id);
      if (existing) {
        existing.check_in = data.check_in;
        existing.check_out = data.check_out;
        existing.status = 'PRESENT';
        existing.is_exception = false;
        return existing;
      }
      throw new Error('Record not found');
    });
  },

  // =========================================================================
  // 3. TIME OFF & ALLOCATIONS
  // =========================================================================
  async getTimeOffTypes(): Promise<LeaveTypeOut[]> {
    return apiClient.get('/api/v1/timeoff/types', () => inMemoryLeaveTypes);
  },

  async createTimeOffType(data: LeaveTypeIn): Promise<LeaveTypeOut> {
    return apiClient.post('/api/v1/timeoff/types', data, () => {
      const newType: LeaveTypeOut = {
        id: `lt-${Date.now()}`,
        name: data.name,
        code: data.code,
        unit: data.unit || 'DAYS',
        requires_allocation: data.requires_allocation ?? true,
        display_color: data.display_color || '#005166',
      };
      inMemoryLeaveTypes.push(newType);
      return newType;
    });
  },

  async getAllocations(employee_id?: string): Promise<AllocationOut[]> {
    return apiClient.get('/api/v1/timeoff/allocations', () => {
      if (employee_id) return inMemoryAllocations.filter((a) => a.employee_id === employee_id);
      return inMemoryAllocations;
    });
  },

  async grantAllocation(data: AllocationIn): Promise<AllocationOut> {
    return apiClient.post('/api/v1/timeoff/allocations', data, () => {
      const emp = inMemoryEmployees.find((e) => e.id === data.employee_id);
      const lt = inMemoryLeaveTypes.find((l) => l.id === data.leave_type_id);
      const newAlloc: AllocationOut = {
        id: `alloc-${Date.now()}`,
        employee_id: data.employee_id,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        leave_type_name: lt ? lt.name : 'Paid Time Off',
        allocated_days: data.allocated_days,
        taken_days: 0,
        remaining_days: data.allocated_days,
        validity_start: data.validity_start,
        validity_end: data.validity_end,
        status: 'APPROVED',
      };
      inMemoryAllocations.push(newAlloc);
      return newAlloc;
    });
  },

  async getLeaveRequests(employee_id?: string, status?: string): Promise<LeaveRequestOut[]> {
    return apiClient.get('/api/v1/timeoff/requests', () => {
      let list = [...inMemoryLeaveRequests];
      if (employee_id) list = list.filter((r) => r.employee_id === employee_id);
      if (status) list = list.filter((r) => r.status === status);
      return list;
    });
  },

  async submitLeaveRequest(data: LeaveRequestIn): Promise<LeaveRequestOut> {
    return apiClient.post('/api/v1/timeoff/requests', data, () => {
      const lt = inMemoryLeaveTypes.find((l) => l.id === data.leave_type_id);
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

      const newReq: LeaveRequestOut = {
        id: `lr-${Date.now()}`,
        employee_id: inMemoryEmployees[0].id,
        employee_name: `${inMemoryEmployees[0].first_name} ${inMemoryEmployees[0].last_name}`,
        leave_type_name: lt ? lt.name : 'Paid Time Off',
        start_date: data.start_date,
        end_date: data.end_date,
        duration_days: duration,
        reason: data.reason || null,
        status: 'PENDING',
      };
      inMemoryLeaveRequests.unshift(newReq);
      return newReq;
    });
  },

  async approveLeaveRequest(id: string): Promise<LeaveRequestOut> {
    return apiClient.post(`/api/v1/timeoff/requests/${id}/approve`, {}, () => {
      const req = inMemoryLeaveRequests.find((r) => r.id === id);
      if (req) {
        req.status = 'APPROVED';
        return req;
      }
      throw new Error('Request not found');
    });
  },

  async refuseLeaveRequest(id: string): Promise<LeaveRequestOut> {
    return apiClient.post(`/api/v1/timeoff/requests/${id}/refuse`, {}, () => {
      const req = inMemoryLeaveRequests.find((r) => r.id === id);
      if (req) {
        req.status = 'REFUSED';
        return req;
      }
      throw new Error('Request not found');
    });
  },

  // =========================================================================
  // 4. SALARY STRUCTURES & RULES
  // =========================================================================
  async getSalaryStructures(): Promise<SalaryStructureOut[]> {
    return apiClient.get('/api/v1/salary/structures', () => inMemoryStructures);
  },

  async createSalaryStructure(data: SalaryStructureIn): Promise<SalaryStructureOut> {
    return apiClient.post('/api/v1/salary/structures', data, () => {
      const newS: SalaryStructureOut = {
        id: `struct-${Date.now()}`,
        name: data.name,
        code: data.code,
        rule_count: 0,
        active: true,
        description: data.description,
      };
      inMemoryStructures.push(newS);
      mock.mockSalaryRules[newS.id] = [];
      return newS;
    });
  },

  async getSalaryRules(structureId: string): Promise<SalaryRuleOut[]> {
    return apiClient.get(`/api/v1/salary/rules?salary_structure_id=${structureId}`, () => {
      return mock.mockSalaryRules[structureId] || mock.mockSalaryRules['struct-1'] || [];
    });
  },

  async createSalaryRule(structureId: string, data: SalaryRuleIn): Promise<SalaryRuleOut> {
    return apiClient.post('/api/v1/salary/rules', data, () => {
      const newRule: SalaryRuleOut = {
        id: `r-${Date.now()}`,
        ...data,
      };
      if (!mock.mockSalaryRules[structureId]) {
        mock.mockSalaryRules[structureId] = [];
      }
      mock.mockSalaryRules[structureId].push(newRule);
      return newRule;
    });
  },

  // =========================================================================
  // 5. PAYROLL: PAYRUN WIZARD & PAYSLIPS
  // =========================================================================
  async previewEligibleEmployees(data: PayrunPreviewIn): Promise<EligibleEmployeePreview[]> {
    return apiClient.post('/api/v1/payruns/preview-eligible-employees', data, () => {
      return mock.mockEligibleEmployees;
    });
  },

  async createPayrun(data: PayrunCreateIn): Promise<PayrunDetailOut> {
    return apiClient.post('/api/v1/payruns', data, () => {
      const selected = inMemoryEmployees.filter((e) => data.selected_employee_ids.includes(e.id));
      const payslips: PayslipSummaryOut[] = selected.map((emp, i) => ({
        id: `ps-${Date.now()}-${i}`,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        worked_days: 22,
        basic: 42500,
        gross: 85000,
        net: 79700,
        status: 'Draft',
        has_warning: false,
      }));

      const newPayrun: PayrunDetailOut = {
        id: `payrun-${Date.now()}`,
        name: data.name,
        salary_structure_name: 'Regular Full-Time Structure',
        period_start: data.period_start,
        period_end: data.period_end,
        status: 'DRAFT',
        employee_count: payslips.length,
        warning_count: 0,
        total_gross: payslips.length * 85000,
        total_deductions: payslips.length * 5300,
        total_net: payslips.length * 79700,
        payslips,
      };

      inMemoryPayruns.unshift(newPayrun);
      return newPayrun;
    });
  },

  async getPayruns(): Promise<PayrunListOut[]> {
    return apiClient.get('/api/v1/payruns', () => {
      return inMemoryPayruns.map((p) => ({
        id: p.id,
        name: p.name,
        period_start: p.period_start,
        period_end: p.period_end,
        employee_count: p.employee_count,
        status: p.status,
        warning_count: p.warning_count,
        total_net: p.total_net,
      }));
    });
  },

  async getPayrunById(id: string): Promise<PayrunDetailOut> {
    return apiClient.get(`/api/v1/payruns/${id}`, () => {
      const pr = inMemoryPayruns.find((p) => p.id === id);
      if (pr) return pr;
      return inMemoryPayruns[0];
    });
  },

  async computePayrun(id: string): Promise<PayrunDetailOut> {
    return apiClient.post(`/api/v1/payruns/${id}/compute`, {}, () => {
      const pr = inMemoryPayruns.find((p) => p.id === id);
      if (pr) {
        pr.status = 'COMPUTED';
        pr.payslips = pr.payslips.map((ps) => ({ ...ps, status: 'Computed' }));
        return pr;
      }
      throw new Error('Payrun not found');
    });
  },

  async validatePayrun(id: string): Promise<PayrunDetailOut> {
    return apiClient.post(`/api/v1/payruns/${id}/validate`, {}, () => {
      const pr = inMemoryPayruns.find((p) => p.id === id);
      if (pr) {
        pr.status = 'VALIDATED';
        pr.payslips = pr.payslips.map((ps) => ({ ...ps, status: 'Done' }));
        return pr;
      }
      throw new Error('Payrun not found');
    });
  },

  async markPayrunPaid(id: string, paymentRef: string): Promise<PayrunDetailOut> {
    return apiClient.post(`/api/v1/payruns/${id}/mark-paid`, { payment_reference: paymentRef }, () => {
      const pr = inMemoryPayruns.find((p) => p.id === id);
      if (pr) {
        pr.status = 'PAID';
        pr.payslips = pr.payslips.map((ps) => ({ ...ps, status: 'Paid' }));
        return pr;
      }
      throw new Error('Payrun not found');
    });
  },

  async sendPayslips(id: string): Promise<{ total_dispatched: number; failed: number }> {
    return apiClient.post(`/api/v1/payruns/${id}/send-payslips`, {}, () => {
      const pr = inMemoryPayruns.find((p) => p.id === id);
      const count = pr ? pr.employee_count : 6;
      return { total_dispatched: count, failed: 0 };
    });
  },

  async getPayslips(payrunId?: string): Promise<PayslipSummaryOut[]> {
    return apiClient.get('/api/v1/payslips', () => {
      if (payrunId) {
        const pr = inMemoryPayruns.find((p) => p.id === payrunId);
        return pr ? pr.payslips : [];
      }
      return inMemoryPayruns[0]?.payslips || [];
    });
  },

  async getPayslipDetail(id: string): Promise<PayslipDetailOut> {
    return apiClient.get(`/api/v1/payslips/${id}`, () => {
      if (mock.mockPayslipDetails[id]) return mock.mockPayslipDetails[id];
      return mock.mockPayslipDetails['ps-sep-1'];
    });
  },

  // =========================================================================
  // 6. PAYROLL DASHBOARD ANALYTICS
  // =========================================================================
  async getDashboardSummary(): Promise<DashboardSummaryOut> {
    return apiClient.get('/api/v1/dashboard/summary', () => mock.mockDashboardSummary);
  },

  async getAttendanceOverview(): Promise<AttendanceOverviewOut> {
    return apiClient.get('/api/v1/dashboard/attendance-overview', () => mock.mockAttendanceOverview);
  },

  async getTimeOffOverview(): Promise<TimeOffOverviewOut[]> {
    return apiClient.get('/api/v1/dashboard/timeoff-overview', () => mock.mockTimeOffOverview);
  },

  async getDepartmentOverview(): Promise<DepartmentOverviewOut[]> {
    return apiClient.get('/api/v1/dashboard/department-overview', () => mock.mockDepartmentOverview);
  },

  async getSalaryCostByDepartment(): Promise<DepartmentSalaryCostChart[]> {
    return apiClient.get('/api/v1/dashboard/salary-cost-by-department', () => mock.mockSalaryCostByDept);
  },

  async getMonthlyNetSalaryTrend(): Promise<MonthlyNetSalaryTrendChart[]> {
    return apiClient.get('/api/v1/dashboard/monthly-net-salary-trend', () => mock.mockMonthlySalaryTrend);
  },
};
