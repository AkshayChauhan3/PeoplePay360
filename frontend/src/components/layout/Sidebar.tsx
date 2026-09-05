import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Banknote,
  Calculator,
  Building2,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';

  const isPayrollAccess = role === 'ADMIN' || role === 'HR_PAYROLL_MANAGER' || role === 'HR_PAYROLL_USER';
  const isHRAccess = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'HR_PAYROLL_MANAGER';
  const isAdmin = role === 'ADMIN';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">P</div>
        <div className="logo-text">
          <span>PeoplePay</span>
          <span className="logo-accent">360</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Overview</div>
        <div
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div className="nav-section-title">Workforce & Operations</div>
        <div
          className={`nav-item ${currentTab === 'employees' ? 'active' : ''}`}
          onClick={() => onSelectTab('employees')}
        >
          <Users size={18} />
          <span>Employees</span>
        </div>

        <div
          className={`nav-item ${currentTab === 'attendance' ? 'active' : ''}`}
          onClick={() => onSelectTab('attendance')}
        >
          <Clock size={18} />
          <span>Attendance</span>
        </div>

        <div
          className={`nav-item ${currentTab === 'timeoff' ? 'active' : ''}`}
          onClick={() => onSelectTab('timeoff')}
        >
          <Calendar size={18} />
          <span>Time Off</span>
        </div>

        {isPayrollAccess && (
          <>
            <div className="nav-section-title">Payroll Engine</div>
            <div
              className={`nav-item ${currentTab === 'payroll' ? 'active' : ''}`}
              onClick={() => onSelectTab('payroll')}
            >
              <Banknote size={18} />
              <span>Payruns & Payslips</span>
            </div>

            <div
              className={`nav-item ${currentTab === 'salary' ? 'active' : ''}`}
              onClick={() => onSelectTab('salary')}
            >
              <Calculator size={18} />
              <span>Salary Structures</span>
            </div>
          </>
        )}

        {isHRAccess && (
          <>
            <div className="nav-section-title">Organization Master</div>
            <div
              className={`nav-item ${currentTab === 'departments' ? 'active' : ''}`}
              onClick={() => onSelectTab('departments')}
            >
              <Building2 size={18} />
              <span>Departments</span>
            </div>

            <div
              className={`nav-item ${currentTab === 'schedules' ? 'active' : ''}`}
              onClick={() => onSelectTab('schedules')}
            >
              <CalendarDays size={18} />
              <span>Working Schedules</span>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <div className="nav-section-title">Administration</div>
            <div
              className={`nav-item ${currentTab === 'users' ? 'active' : ''}`}
              onClick={() => onSelectTab('users')}
            >
              <ShieldCheck size={18} />
              <span>User & Roles</span>
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          API Contract: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>v0.0.1</span>
        </div>
      </div>
    </aside>
  );
};
