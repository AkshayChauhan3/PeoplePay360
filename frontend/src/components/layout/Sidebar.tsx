import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { canAccessTab } from '../../utils/rbac';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Calendar,
  Banknote,
  Calculator,
  Building2,
  CalendarDays,
  ShieldCheck,
  Award,
  Layers,
  Code2,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const role = user?.role;

  const showWorkforce =
    canAccessTab(role, 'employees') ||
    canAccessTab(role, 'contracts') ||
    canAccessTab(role, 'departments') ||
    canAccessTab(role, 'schedules');

  const showPayroll =
    canAccessTab(role, 'payroll') ||
    canAccessTab(role, 'payslips') ||
    canAccessTab(role, 'salary') ||
    canAccessTab(role, 'rules');

  const showTimeOff =
    canAccessTab(role, 'timeoff') ||
    canAccessTab(role, 'timeoff-requests') ||
    canAccessTab(role, 'timeoff-allocations') ||
    canAccessTab(role, 'timeoff-types');

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header" onClick={() => onSelectTab(canAccessTab(role, 'dashboard') ? 'dashboard' : 'attendance')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon">P</div>
        <div className="logo-text">
          <span>PeoplePay</span>
          <span className="logo-accent">360</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Overview */}
        {canAccessTab(role, 'dashboard') && (
          <>
            <div className="nav-section-title">Overview</div>
            <div
              className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onSelectTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Payroll Dashboard</span>
            </div>
          </>
        )}

        {/* 1) Employee & Contract Flow */}
        {showWorkforce && (
          <>
            <div className="nav-section-title">1) Workforce & Contracts</div>
            {canAccessTab(role, 'employees') && (
              <div
                className={`nav-item ${currentTab === 'employees' ? 'active' : ''}`}
                onClick={() => onSelectTab('employees')}
              >
                <Users size={18} />
                <span>Employees Directory</span>
              </div>
            )}
            {canAccessTab(role, 'contracts') && (
              <div
                className={`nav-item ${currentTab === 'contracts' ? 'active' : ''}`}
                onClick={() => onSelectTab('contracts')}
              >
                <FileText size={18} />
                <span>Contracts</span>
              </div>
            )}
            {canAccessTab(role, 'departments') && (
              <div
                className={`nav-item ${currentTab === 'departments' ? 'active' : ''}`}
                onClick={() => onSelectTab('departments')}
              >
                <Building2 size={18} />
                <span>Departments</span>
              </div>
            )}
            {canAccessTab(role, 'schedules') && (
              <div
                className={`nav-item ${currentTab === 'schedules' ? 'active' : ''}`}
                onClick={() => onSelectTab('schedules')}
              >
                <CalendarDays size={18} />
                <span>Working Schedules</span>
              </div>
            )}
          </>
        )}

        {/* 2) Attendance Flow */}
        {canAccessTab(role, 'attendance') && (
          <>
            <div className="nav-section-title">2) Attendance Flow</div>
            <div
              className={`nav-item ${currentTab === 'attendance' ? 'active' : ''}`}
              onClick={() => onSelectTab('attendance')}
            >
              <Clock size={18} />
              <span>{role === 'EMPLOYEE' ? 'My Attendance Log' : 'Attendance Records'}</span>
            </div>
          </>
        )}

        {/* 3) Time Off Flow */}
        {showTimeOff && (
          <>
            <div className="nav-section-title">3) Time Off Flow</div>
            {canAccessTab(role, 'timeoff-requests') && (
              <div
                className={`nav-item ${currentTab === 'timeoff' || currentTab === 'timeoff-requests' ? 'active' : ''}`}
                onClick={() => onSelectTab('timeoff-requests')}
              >
                <Calendar size={18} />
                <span>{role === 'EMPLOYEE' ? 'My Leave Requests' : 'Time Off Requests'}</span>
              </div>
            )}
            {canAccessTab(role, 'timeoff-allocations') && (
              <div
                className={`nav-item ${currentTab === 'timeoff-allocations' ? 'active' : ''}`}
                onClick={() => onSelectTab('timeoff-allocations')}
              >
                <Award size={18} />
                <span>Leave Allocations</span>
              </div>
            )}
            {canAccessTab(role, 'timeoff-types') && (
              <div
                className={`nav-item ${currentTab === 'timeoff-types' ? 'active' : ''}`}
                onClick={() => onSelectTab('timeoff-types')}
              >
                <Layers size={18} />
                <span>Time Off Types</span>
              </div>
            )}
          </>
        )}

        {/* 4 & 5) Payroll Flow & Rules */}
        {showPayroll && (
          <>
            <div className="nav-section-title">4 & 5) Payroll Processing</div>
            {canAccessTab(role, 'payroll') && (
              <div
                className={`nav-item ${currentTab === 'payroll' ? 'active' : ''}`}
                onClick={() => onSelectTab('payroll')}
              >
                <Banknote size={18} />
                <span>Payruns & Batches</span>
              </div>
            )}
            {canAccessTab(role, 'payslips') && (
              <div
                className={`nav-item ${currentTab === 'payslips' ? 'active' : ''}`}
                onClick={() => onSelectTab('payslips')}
              >
                <Calculator size={18} />
                <span>{role === 'EMPLOYEE' ? 'My Payslips' : 'Employee Payslips'}</span>
              </div>
            )}
            {canAccessTab(role, 'salary') && (
              <div
                className={`nav-item ${currentTab === 'salary' ? 'active' : ''}`}
                onClick={() => onSelectTab('salary')}
              >
                <Layers size={18} />
                <span>Salary Structures</span>
              </div>
            )}
            {canAccessTab(role, 'rules') && (
              <div
                className={`nav-item ${currentTab === 'rules' ? 'active' : ''}`}
                onClick={() => onSelectTab('rules')}
              >
                <Code2 size={18} />
                <span>Salary Rules (AST)</span>
              </div>
            )}
          </>
        )}

        {/* 0) User Access & Admin */}
        {canAccessTab(role, 'users') && (
          <>
            <div className="nav-section-title">0) Administration</div>
            <div
              className={`nav-item ${currentTab === 'users' ? 'active' : ''}`}
              onClick={() => onSelectTab('users')}
            >
              <ShieldCheck size={18} />
              <span>User Management</span>
            </div>
          </>
        )}
      </nav>

      {/* Role Indicator Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)', fontSize: '11px' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Shield size={12} color="var(--primary)" />
          <span>Active Persona / Access</span>
        </div>
        <div style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.02em' }}>
          {role || 'GUEST'}
        </div>
      </div>
    </aside>
  );
};
