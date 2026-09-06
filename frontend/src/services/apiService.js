// PeoplePay360 - Unified API Service Layer
// Direct connection to FastAPI backend (/api/v1/...)

import { apiClient } from './apiClient';

export const apiService = {
  // =========================================================================
  // 0. HEALTH & AUTH (Live in FastAPI backend)
  // =========================================================================
  async health() {
    return await apiClient.get('/api/v1/health');
  },

  async login(email, password) {
    const res = await apiClient.post('/api/v1/auth/login', { email, password });
    if (res?.access_token) {
      apiClient.setTokens(res.access_token, res.refresh_token);
      if (res.user) {
        apiClient.setStoredUser(res.user);
      }
    }
    return res;
  },

  async getMe() {
    const user = await apiClient.get('/api/v1/auth/me');
    if (user) {
      apiClient.setStoredUser(user);
    }
    return user;
  },

  async register(data) {
    return await apiClient.post('/api/v1/auth/register', data);
  },

  logout() {
    apiClient.clearTokens();
  },

  // =========================================================================
  // 1. EMPLOYEES & WORKFORCE
  // =========================================================================
  async getEmployees(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/employees${query ? `?${query}` : ''}`);
  },

  async getEmployeeById(id) {
    return await apiClient.get(`/api/v1/employees/${id}`);
  },

  async createEmployee(data) {
    return await apiClient.post('/api/v1/employees', data);
  },

  async updateEmployee(id, data) {
    return await apiClient.patch(`/api/v1/employees/${id}`, data);
  },

  async deleteEmployee(id) {
    return await apiClient.delete(`/api/v1/employees/${id}`);
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/users${query ? `?${query}` : ''}`);
  },

  async linkUserToEmployee(employeeId, userId) {
    return await apiClient.post(`/api/v1/employees/${employeeId}/user`, { user_id: Number(userId) });
  },

  async unlinkUserFromEmployee(employeeId) {
    return await apiClient.delete(`/api/v1/employees/${employeeId}/user`);
  },

  async getEmployeeContracts(employeeId) {
    return await apiClient.get(`/api/v1/employees/${employeeId}/contracts`);
  },

  async getEmployeeAttendance(employeeId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/employees/${employeeId}/attendance${query ? `?${query}` : ''}`);
  },

  async getEmployeeTimeOffRequests(employeeId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/employees/${employeeId}/time-off/requests${query ? `?${query}` : ''}`);
  },

  async getEmployeeLeaveAllocations(employeeId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/employees/${employeeId}/time-off/allocations${query ? `?${query}` : ''}`);
  },

  async getEmployeeTimeOffBalances(employeeId) {
    return await apiClient.get(`/api/v1/employees/${employeeId}/time-off/balances`);
  },

  // =========================================================================
  // 2. DEPARTMENTS & MASTER DATA
  // =========================================================================
  async getDepartments(includeInactive = false) {
    return await apiClient.get(`/api/v1/departments?include_inactive=${includeInactive}`);
  },

  async getDepartmentById(id) {
    return await apiClient.get(`/api/v1/departments/${id}`);
  },

  async createDepartment(data) {
    return await apiClient.post('/api/v1/departments', data);
  },

  async updateDepartment(id, data) {
    return await apiClient.patch(`/api/v1/departments/${id}`, data);
  },

  async deleteDepartment(id) {
    return await apiClient.delete(`/api/v1/departments/${id}`);
  },

  async getJobPositions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/job-positions${query ? `?${query}` : ''}`);
  },

  async createJobPosition(data) {
    return await apiClient.post('/api/v1/job-positions', data);
  },

  async updateJobPosition(id, data) {
    return await apiClient.patch(`/api/v1/job-positions/${id}`, data);
  },

  async deleteJobPosition(id) {
    return await apiClient.delete(`/api/v1/job-positions/${id}`);
  },

  // =========================================================================
  // 3. CONTRACTS
  // =========================================================================
  async getContracts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/contracts${query ? `?${query}` : ''}`);
  },

  async getContractById(id) {
    return await apiClient.get(`/api/v1/contracts/${id}`);
  },

  async createContract(data) {
    return await apiClient.post('/api/v1/contracts', data);
  },

  async updateContract(id, data) {
    return await apiClient.patch(`/api/v1/contracts/${id}`, data);
  },

  async activateContract(id) {
    return await apiClient.post(`/api/v1/contracts/${id}/activate`, {});
  },

  async cancelContract(id) {
    return await apiClient.post(`/api/v1/contracts/${id}/cancel`, {});
  },

  // =========================================================================
  // 4. ATTENDANCE & REAL-TIME SESSIONS
  // =========================================================================
  async getAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/attendance${query ? `?${query}` : ''}`);
  },

  async getAttendanceSession() {
    return await apiClient.get('/api/v1/attendance/session');
  },

  async checkIn(payload = null) {
    const body = typeof payload === 'object' && payload !== null
      ? payload
      : (payload ? { timestamp: payload } : {});
    return await apiClient.post('/api/v1/attendance/check-in', body);
  },

  async checkOut(sessionIdOrPayload = null, timestamp = null) {
    let body = {};
    if (typeof sessionIdOrPayload === 'object' && sessionIdOrPayload !== null) {
      body = sessionIdOrPayload;
    } else {
      if (sessionIdOrPayload) body.session_id = sessionIdOrPayload;
      if (timestamp) body.timestamp = timestamp;
    }
    return await apiClient.post('/api/v1/attendance/check-out', body);
  },

  async createManualAttendance(data) {
    return await apiClient.post('/api/v1/attendance', data);
  },

  async updateAttendance(id, data) {
    return await apiClient.patch(`/api/v1/attendance/${id}`, data);
  },

  async deleteAttendance(id) {
    return await apiClient.delete(`/api/v1/attendance/${id}`);
  },

  // =========================================================================
  // 5. TIME OFF & LEAVE MANAGEMENT
  // =========================================================================
  async getLeaveRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/timeoff/requests${query ? `?${query}` : ''}`);
  },

  async submitLeaveRequest(data) {
    return await apiClient.post('/api/v1/timeoff/requests', data);
  },

  async approveLeaveRequest(id) {
    return await apiClient.post(`/api/v1/timeoff/requests/${id}/approve`, {});
  },

  async refuseLeaveRequest(id, reason = 'Rejected by HR Manager') {
    return await apiClient.post(`/api/v1/timeoff/requests/${id}/refuse`, { refusal_reason: reason });
  },

  async cancelLeaveRequest(id) {
    return await apiClient.post(`/api/v1/timeoff/requests/${id}/cancel`, {});
  },

  async getAllocations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/timeoff/allocations${query ? `?${query}` : ''}`);
  },

  async createAllocation(data) {
    return await apiClient.post('/api/v1/timeoff/allocations', data);
  },

  async cancelAllocation(id) {
    return await apiClient.delete(`/api/v1/timeoff/allocations/${id}`);
  },

  async getTimeOffTypes(includeInactive = false) {
    return await apiClient.get(`/api/v1/timeoff/types?include_inactive=${includeInactive}`);
  },

  async getLeaveBalances(employeeId = null) {
    const q = employeeId ? `?employee_id=${employeeId}` : '';
    return await apiClient.get(`/api/v1/timeoff/balances${q}`);
  },

  // =========================================================================
  // 6. PAYROLL & SALARY RULES
  // =========================================================================
  async getPayruns(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/payruns${query ? `?${query}` : ''}`);
  },

  async getPayrunById(id) {
    return await apiClient.get(`/api/v1/payruns/${id}`);
  },

  async previewPayrunWizard(data) {
    return await apiClient.post('/api/v1/payruns/preview', data);
  },

  async createPayrun(data) {
    return await apiClient.post('/api/v1/payruns', data);
  },

  async computePayrun(id) {
    return await apiClient.post(`/api/v1/payruns/${id}/compute`, {});
  },

  async validatePayrun(id) {
    return await apiClient.post(`/api/v1/payruns/${id}/validate`, {});
  },

  async markPayrunPaid(id) {
    return await apiClient.post(`/api/v1/payruns/${id}/mark-paid`, {});
  },

  async cancelPayrun(id) {
    return await apiClient.post(`/api/v1/payruns/${id}/cancel`, {});
  },

  async deletePayrun(id) {
    return await apiClient.delete(`/api/v1/payruns/${id}`);
  },

  async getPayrunPayslips(id, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/payruns/${id}/payslips${query ? `?${query}` : ''}`);
  },

  // ---------------- Payslips ----------------
  async getPayslips(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/payslips${query ? `?${query}` : ''}`);
  },

  async getPayslipById(id) {
    return await apiClient.get(`/api/v1/payslips/${id}`);
  },

  async downloadPayslipPdf(id, filename = null) {
    const blob = await apiClient.downloadBlob(`/api/v1/payslips/${id}/pdf`);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `payslip_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  },

  // ---------------- Salary Structures ----------------
  async getSalaryStructures(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/salary-structures${query ? `?${query}` : ''}`);
  },

  async getSalaryStructureById(id) {
    return await apiClient.get(`/api/v1/salary-structures/${id}`);
  },

  async createSalaryStructure(data) {
    return await apiClient.post('/api/v1/salary-structures', data);
  },

  async updateSalaryStructure(id, data) {
    return await apiClient.patch(`/api/v1/salary-structures/${id}`, data);
  },

  async deleteSalaryStructure(id) {
    return await apiClient.delete(`/api/v1/salary-structures/${id}`);
  },

  async previewSalaryStructure(id, data) {
    return await apiClient.post(`/api/v1/salary-structures/${id}/preview`, data);
  },

  // ---------------- Salary Rules ----------------
  async getSalaryRules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/salary-rules${query ? `?${query}` : ''}`);
  },

  async getSalaryRuleById(id) {
    return await apiClient.get(`/api/v1/salary-rules/${id}`);
  },

  async createSalaryRule(data) {
    return await apiClient.post('/api/v1/salary-rules', data);
  },

  async updateSalaryRule(id, data) {
    return await apiClient.patch(`/api/v1/salary-rules/${id}`, data);
  },

  async deleteSalaryRule(id) {
    return await apiClient.delete(`/api/v1/salary-rules/${id}`);
  },

  // =========================================================================
  // 7. DASHBOARD ANALYTICS
  // =========================================================================
  async getDashboardSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/dashboard/summary${query ? `?${query}` : ''}`);
  },

  // =========================================================================
  // 8. WORKING SCHEDULES
  // =========================================================================
  async getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/schedules${query ? `?${query}` : ''}`);
  },

  async getScheduleById(id) {
    return await apiClient.get(`/api/v1/schedules/${id}`);
  },

  async createSchedule(data) {
    return await apiClient.post('/api/v1/schedules', data);
  },

  async updateSchedule(id, data) {
    return await apiClient.patch(`/api/v1/schedules/${id}`, data);
  },

  async deleteSchedule(id) {
    return await apiClient.delete(`/api/v1/schedules/${id}`);
  },
};

