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

  // =========================================================================
  // 2. DEPARTMENTS & MASTER DATA
  // =========================================================================
  async getDepartments() {
    return await apiClient.get('/api/v1/departments');
  },

  async createDepartment(data) {
    return await apiClient.post('/api/v1/departments', data);
  },

  async getJobPositions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/job-positions${query ? `?${query}` : ''}`);
  },

  async createJobPosition(data) {
    return await apiClient.post('/api/v1/job-positions', data);
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

  async checkIn() {
    return await apiClient.post('/api/v1/attendance/check-in', {});
  },

  async checkOut(sessionId) {
    return await apiClient.post(`/api/v1/attendance/check-out`, { session_id: sessionId });
  },

  // =========================================================================
  // 5. TIME OFF & LEAVE MANAGEMENT
  // =========================================================================
  async getLeaveRequests() {
    return await apiClient.get('/api/v1/timeoff/requests');
  },

  async getAllocations() {
    return await apiClient.get('/api/v1/timeoff/allocations');
  },

  async getTimeOffTypes() {
    return await apiClient.get('/api/v1/timeoff/types');
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

  // =========================================================================
  // 6. PAYROLL & SALARY RULES
  // =========================================================================
  async getPayruns() {
    return await apiClient.get('/api/v1/payruns');
  },

  async getPayslips(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiClient.get(`/api/v1/payslips${query ? `?${query}` : ''}`);
  },

  async getSalaryStructures() {
    return await apiClient.get('/api/v1/salary-structures');
  },

  async getSalaryRules() {
    return await apiClient.get('/api/v1/salary-rules');
  },

  // =========================================================================
  // 7. DASHBOARD ANALYTICS
  // =========================================================================
  async getDashboardSummary() {
    return await apiClient.get('/api/v1/dashboard/summary');
  },
};
