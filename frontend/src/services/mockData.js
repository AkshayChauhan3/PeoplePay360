/**
 * @deprecated PeoplePay360 - Mock Data Fixtures
 * 
 * All views have been transitioned to connect directly to the FastAPI/PostgreSQL live backend.
 * Hardcoded mock fallback data is removed in favor of real API calls, loading indicators,
 * and empty-state placeholders.
 * 
 * Retained for legacy signature compatibility only (all fixtures empty).
 */

export const mockUsers = [];
export const mockEmployees = [];
export const mockDepartments = [];
export const mockContracts = [];
export const mockAttendanceRecords = [];
export const mockTimeOffRequests = [];
export const mockAllocations = [];
export const mockLeaveTypes = [];
export const mockPayruns = [];
export const mockPayslips = [];
export const mockSalaryStructures = [];
export const mockSalaryRules = [];
export const mockDashboardSummary = {
  total_employees: 0,
  active_contracts: 0,
  pending_leave_requests: 0,
  monthly_payroll_cost: 0,
  attendance_rate: 0,
};
