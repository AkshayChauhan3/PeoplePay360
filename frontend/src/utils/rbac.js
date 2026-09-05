export const ROLES = {
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_PAYROLL_MANAGER: 'HR_PAYROLL_MANAGER',
  HR_PAYROLL_USER: 'HR_PAYROLL_USER',
  EMPLOYEE: 'EMPLOYEE',
};

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_MANAGER: 'Payroll Manager',
  HR_PAYROLL_USER: 'Payroll Specialist',
  EMPLOYEE: 'Employee',
};

export const ROLE_BADGE_COLORS = {
  ADMIN: { bg: 'rgba(59, 18, 63, 0.12)', text: '#3b123f', border: '#3b123f' },
  HR_MANAGER: { bg: 'rgba(0, 81, 102, 0.12)', text: '#005166', border: '#005166' },
  HR_PAYROLL_MANAGER: { bg: 'rgba(30, 64, 175, 0.12)', text: '#1e40af', border: '#1e40af' },
  HR_PAYROLL_USER: { bg: 'rgba(180, 83, 9, 0.12)', text: '#b45309', border: '#b45309' },
  EMPLOYEE: { bg: 'rgba(11, 122, 66, 0.12)', text: '#0b7a42', border: '#0b7a42' },
};

export const ROLE_PERMISSIONS = {
  ADMIN: {
    canManageUsers: true,
    canCreateEmployees: true,
    canEditContracts: true,
    canApproveLeave: true,
    canProcessPayroll: true,
    canEditSalaryRules: true,
    canEditSettings: true,
    allowedViews: [
      'dashboard',
      'directory', 'employee_profile', 'departments', 'job_positions',
      'all_contracts', 'active_contracts', 'contract_detail',
      'attendance_records', 'monthly_overview',
      'time_off_requests', 'leave_allocations', 'time_off_types',
      'payruns', 'payslips', 'salary_structures', 'salary_rules',
      'reports', 'settings',
    ],
  },
  HR_MANAGER: {
    canManageUsers: false,
    canCreateEmployees: true,
    canEditContracts: true,
    canApproveLeave: true,
    canProcessPayroll: false,
    canEditSalaryRules: false,
    canEditSettings: false,
    allowedViews: [
      'dashboard',
      'directory', 'employee_profile', 'departments', 'job_positions',
      'all_contracts', 'active_contracts', 'contract_detail',
      'attendance_records', 'monthly_overview',
      'time_off_requests', 'leave_allocations', 'time_off_types',
      'reports',
    ],
  },
  HR_PAYROLL_MANAGER: {
    canManageUsers: false,
    canCreateEmployees: false,
    canEditContracts: true,
    canApproveLeave: false,
    canProcessPayroll: true,
    canEditSalaryRules: true,
    canEditSettings: false,
    allowedViews: [
      'dashboard',
      'directory', 'employee_profile',
      'all_contracts', 'active_contracts', 'contract_detail',
      'attendance_records', 'monthly_overview',
      'payruns', 'payslips', 'salary_structures', 'salary_rules',
      'reports',
    ],
  },
  HR_PAYROLL_USER: {
    canManageUsers: false,
    canCreateEmployees: false,
    canEditContracts: false,
    canApproveLeave: false,
    canProcessPayroll: false,
    canEditSalaryRules: false,
    canEditSettings: false,
    allowedViews: [
      'dashboard',
      'directory', 'employee_profile',
      'all_contracts',
      'attendance_records',
      'payruns', 'payslips', 'salary_structures',
      'reports',
    ],
  },
  EMPLOYEE: {
    canManageUsers: false,
    canCreateEmployees: false,
    canEditContracts: false,
    canApproveLeave: false,
    canProcessPayroll: false,
    canEditSalaryRules: false,
    canEditSettings: false,
    allowedViews: [
      'dashboard',
      'attendance_records',
      'time_off_requests',
      'payslips',
    ],
  },
};

export const isViewAllowed = (role, viewId) => {
  const r = (role || 'ADMIN').toUpperCase();
  const perms = ROLE_PERMISSIONS[r] || ROLE_PERMISSIONS.EMPLOYEE;
  return perms.allowedViews.includes(viewId);
};

export const hasPermission = (role, permKey) => {
  const r = (role || 'ADMIN').toUpperCase();
  const perms = ROLE_PERMISSIONS[r] || ROLE_PERMISSIONS.EMPLOYEE;
  return !!perms[permKey];
};
