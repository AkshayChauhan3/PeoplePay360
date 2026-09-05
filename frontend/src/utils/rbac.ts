// PeoplePay360 - Role-Based Access Control (RBAC) System
// Strictly aligns with Flow 0 of HRMS OXP - 24 hours.excalidraw:
// "Roles control which modules, records and actions become available after login.
// After sign-in, show only the modules and actions allowed by the user’s assigned role."

import { UserRole } from '../types/api';

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    allowedTabs: string[];
    canApproveTimeOff: boolean;
    canValidatePayrun: boolean;
    canManageUsers: boolean;
    canEditSalaryRules: boolean;
    canCorrectAttendance: boolean;
    canCreateContracts: boolean;
    canCreatePayruns: boolean;
    canManageEmployees: boolean;
  }
> = {
  ADMIN: {
    allowedTabs: [
      'dashboard',
      'employees',
      'contracts',
      'departments',
      'schedules',
      'attendance',
      'timeoff',
      'timeoff-requests',
      'timeoff-allocations',
      'timeoff-types',
      'payroll',
      'payslips',
      'salary',
      'rules',
      'users',
    ],
    canApproveTimeOff: true,
    canValidatePayrun: true,
    canManageUsers: true,
    canEditSalaryRules: true,
    canCorrectAttendance: true,
    canCreateContracts: true,
    canCreatePayruns: true,
    canManageEmployees: true,
  },

  HR_MANAGER: {
    allowedTabs: [
      'dashboard',
      'employees',
      'contracts',
      'departments',
      'schedules',
      'attendance',
      'timeoff',
      'timeoff-requests',
      'timeoff-allocations',
      'timeoff-types',
    ],
    canApproveTimeOff: true,
    canValidatePayrun: false,
    canManageUsers: false,
    canEditSalaryRules: false,
    canCorrectAttendance: true,
    canCreateContracts: true,
    canCreatePayruns: false,
    canManageEmployees: true,
  },

  HR_PAYROLL_MANAGER: {
    allowedTabs: [
      'dashboard',
      'employees',
      'contracts',
      'attendance',
      'payroll',
      'payslips',
      'salary',
      'rules',
    ],
    canApproveTimeOff: false,
    canValidatePayrun: true,
    canManageUsers: false,
    canEditSalaryRules: true,
    canCorrectAttendance: false,
    canCreateContracts: true,
    canCreatePayruns: true,
    canManageEmployees: false,
  },

  HR_PAYROLL_USER: {
    allowedTabs: [
      'dashboard',
      'employees',
      'contracts',
      'attendance',
      'payroll',
      'payslips',
      'salary',
    ],
    canApproveTimeOff: false,
    canValidatePayrun: false,
    canManageUsers: false,
    canEditSalaryRules: false,
    canCorrectAttendance: false,
    canCreateContracts: false,
    canCreatePayruns: false,
    canManageEmployees: false,
  },

  EMPLOYEE: {
    allowedTabs: ['attendance', 'timeoff', 'timeoff-requests', 'payslips'],
    canApproveTimeOff: false,
    canValidatePayrun: false,
    canManageUsers: false,
    canEditSalaryRules: false,
    canCorrectAttendance: false,
    canCreateContracts: false,
    canCreatePayruns: false,
    canManageEmployees: false,
  },
};

export const canAccessTab = (role: UserRole | undefined, tab: string): boolean => {
  if (!role) return false;
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.allowedTabs.includes(tab);
};

export const getDefaultTabForRole = (role: UserRole | undefined): string => {
  if (!role) return 'dashboard';
  if (role === 'EMPLOYEE') return 'attendance';
  return 'dashboard';
};
