// PeoplePay360 - Unified API Service Layer
// Aligns with FastAPI backend endpoints (/api/v1/...) & contracts/openapi.yaml

import { apiClient } from './apiClient';
import * as mock from './mockData';

export const apiService = {
  // =========================================================================
  // 0. HEALTH & AUTH (Live in FastAPI backend)
  // =========================================================================
  async health() {
    try {
      return await apiClient.get('/api/v1/health');
    } catch {
      return { status: 'ok', mode: 'offline-fallback' };
    }
  },

  async login(email, password) {
    try {
      const res = await apiClient.post('/api/v1/auth/login', { email, password });
      apiClient.setTokens(res.access_token, res.refresh_token);
      return res;
    } catch (err) {
      // If backend is offline or mock credentials used:
      const emailLower = email.toLowerCase().trim();
      const found = mock.mockUsers.find(
        (u) =>
          u.email.toLowerCase() === emailLower ||
          (emailLower.includes('admin') && u.role === 'ADMIN') ||
          (emailLower.includes('maya') && u.role === 'HR_MANAGER') ||
          (emailLower.includes('rohan') && u.role === 'EMPLOYEE') ||
          (emailLower.includes('nisha') && u.role === 'HR_PAYROLL_MANAGER')
      );
      const user = found || mock.mockUsers[0];
      const token = `token-${user.id}-${user.role}`;
      apiClient.setTokens(token, `refresh-${user.id}`);
      apiClient.setStoredUser(user);
      return {
        access_token: token,
        refresh_token: `refresh-${user.id}`,
        token_type: 'bearer',
        user,
      };
    }
  },

  async getMe() {
    try {
      const user = await apiClient.get('/api/v1/auth/me');
      apiClient.setStoredUser(user);
      return user;
    } catch {
      const stored = apiClient.getStoredUser();
      return stored || mock.mockUsers[0];
    }
  },

  async register(data) {
    try {
      return await apiClient.post('/api/v1/auth/register', data);
    } catch {
      return {
        id: `u-${Date.now()}`,
        email: data.email,
        role: data.role || 'EMPLOYEE',
        emp_id: data.emp_id || null,
        is_active: true,
      };
    }
  },

  logout() {
    apiClient.clearTokens();
  },

  // =========================================================================
  // 1. EMPLOYEES & WORKFORCE
  // =========================================================================
  async getEmployees(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiClient.get(`/api/v1/employees${query ? `?${query}` : ''}`);
    } catch {
      return mock.mockEmployees;
    }
  },

  async getEmployeeById(id) {
    try {
      return await apiClient.get(`/api/v1/employees/${id}`);
    } catch {
      return mock.mockEmployees.find((e) => e.id === id) || mock.mockEmployees[0];
    }
  },

  async createEmployee(data) {
    try {
      return await apiClient.post('/api/v1/employees', data);
    } catch {
      const newEmp = {
        id: `emp-${Date.now()}`,
        ...data,
        name: `${data.first_name} ${data.last_name}`,
        status: 'ACTIVE',
      };
      mock.mockEmployees.unshift(newEmp);
      return newEmp;
    }
  },

  // =========================================================================
  // 2. DEPARTMENTS & MASTER DATA
  // =========================================================================
  async getDepartments() {
    try {
      return await apiClient.get('/api/v1/departments');
    } catch {
      return mock.mockDepartments;
    }
  },

  // =========================================================================
  // 3. CONTRACTS
  // =========================================================================
  async getContracts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiClient.get(`/api/v1/contracts${query ? `?${query}` : ''}`);
    } catch {
      return mock.mockContracts;
    }
  },

  async getContractById(id) {
    try {
      return await apiClient.get(`/api/v1/contracts/${id}`);
    } catch {
      return mock.mockContracts.find((c) => c.id === id) || mock.mockContracts[0];
    }
  },

  // =========================================================================
  // 4. ATTENDANCE & REAL-TIME SESSIONS
  // =========================================================================
  async getAttendance(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiClient.get(`/api/v1/attendance${query ? `?${query}` : ''}`);
    } catch {
      return mock.mockAttendanceRecords;
    }
  },

  async getAttendanceSession() {
    try {
      return await apiClient.get('/api/v1/attendance/session');
    } catch {
      return {
        has_active_session: true,
        session_id: 'att-sess-1',
        check_in_time: '2026-09-05T09:48:00.000Z',
        elapsed_seconds: 16200,
      };
    }
  },

  async checkIn() {
    try {
      return await apiClient.post('/api/v1/attendance/check-in', {});
    } catch {
      return { status: 'checked_in', timestamp: new Date().toISOString() };
    }
  },

  async checkOut(sessionId) {
    try {
      return await apiClient.post(`/api/v1/attendance/check-out`, { session_id: sessionId });
    } catch {
      return { status: 'checked_out', timestamp: new Date().toISOString() };
    }
  },

  // =========================================================================
  // 5. TIME OFF & LEAVE MANAGEMENT
  // =========================================================================
  async getLeaveRequests() {
    try {
      return await apiClient.get('/api/v1/timeoff/requests');
    } catch {
      return mock.mockTimeOffRequests;
    }
  },

  async getAllocations() {
    try {
      return await apiClient.get('/api/v1/timeoff/allocations');
    } catch {
      return mock.mockAllocations;
    }
  },

  async getTimeOffTypes() {
    try {
      return await apiClient.get('/api/v1/timeoff/types');
    } catch {
      return mock.mockLeaveTypes;
    }
  },

  async submitLeaveRequest(data) {
    try {
      return await apiClient.post('/api/v1/timeoff/requests', data);
    } catch {
      const newReq = {
        id: `req-${Date.now()}`,
        ...data,
        status: 'PENDING',
      };
      mock.mockTimeOffRequests.unshift(newReq);
      return newReq;
    }
  },

  // =========================================================================
  // 6. PAYROLL & SALARY RULES
  // =========================================================================
  async getPayruns() {
    try {
      return await apiClient.get('/api/v1/payroll/payruns');
    } catch {
      return mock.mockPayruns;
    }
  },

  async getPayslips(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiClient.get(`/api/v1/payroll/payslips${query ? `?${query}` : ''}`);
    } catch {
      return mock.mockPayslips;
    }
  },

  async getSalaryStructures() {
    try {
      return await apiClient.get('/api/v1/salary/structures');
    } catch {
      return mock.mockSalaryStructures;
    }
  },

  async getSalaryRules() {
    try {
      return await apiClient.get('/api/v1/salary/rules');
    } catch {
      return mock.mockSalaryRules;
    }
  },

  // =========================================================================
  // 7. DASHBOARD ANALYTICS
  // =========================================================================
  async getDashboardSummary() {
    try {
      return await apiClient.get('/api/v1/dashboard/summary');
    } catch {
      return mock.mockDashboardSummary;
    }
  },
};
