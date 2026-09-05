import React from 'react';
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
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-header" onClick={() => onSelectTab('dashboard')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon">P</div>
        <div className="logo-text">
          <span>PeoplePay</span>
          <span className="logo-accent">360</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Overview */}
        <div className="nav-section-title">Overview</div>
        <div
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Payroll Dashboard</span>
        </div>

        {/* 1) Employee & Contract Flow */}
        <div className="nav-section-title">1) Employees & Contracts</div>
        <div
          className={`nav-item ${currentTab === 'employees' ? 'active' : ''}`}
          onClick={() => onSelectTab('employees')}
        >
          <Users size={18} />
          <span>Employees Directory</span>
        </div>
        <div
          className={`nav-item ${currentTab === 'contracts' ? 'active' : ''}`}
          onClick={() => onSelectTab('contracts')}
        >
          <FileText size={18} />
          <span>Contracts</span>
        </div>
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

        {/* 2) Attendance Flow */}
        <div className="nav-section-title">2) Attendance Flow</div>
        <div
          className={`nav-item ${currentTab === 'attendance' ? 'active' : ''}`}
          onClick={() => onSelectTab('attendance')}
        >
          <Clock size={18} />
          <span>Attendance Records</span>
        </div>

        {/* 3) Time Off Flow */}
        <div className="nav-section-title">3) Time Off Flow</div>
        <div
          className={`nav-item ${currentTab === 'timeoff' || currentTab === 'timeoff-requests' ? 'active' : ''}`}
          onClick={() => onSelectTab('timeoff-requests')}
        >
          <Calendar size={18} />
          <span>Time Off Requests</span>
        </div>
        <div
          className={`nav-item ${currentTab === 'timeoff-allocations' ? 'active' : ''}`}
          onClick={() => onSelectTab('timeoff-allocations')}
        >
          <Award size={18} />
          <span>Leave Allocations</span>
        </div>
        <div
          className={`nav-item ${currentTab === 'timeoff-types' ? 'active' : ''}`}
          onClick={() => onSelectTab('timeoff-types')}
        >
          <Layers size={18} />
          <span>Time Off Types</span>
        </div>

        {/* 4 & 5) Payroll Flow & Rules */}
        <div className="nav-section-title">4 & 5) Payroll Processing</div>
        <div
          className={`nav-item ${currentTab === 'payroll' ? 'active' : ''}`}
          onClick={() => onSelectTab('payroll')}
        >
          <Banknote size={18} />
          <span>Payruns & Batches</span>
        </div>
        <div
          className={`nav-item ${currentTab === 'payslips' ? 'active' : ''}`}
          onClick={() => onSelectTab('payslips')}
        >
          <Calculator size={18} />
          <span>Employee Payslips</span>
        </div>
        <div
          className={`nav-item ${currentTab === 'salary' ? 'active' : ''}`}
          onClick={() => onSelectTab('salary')}
        >
          <Layers size={18} />
          <span>Salary Structures</span>
        </div>
        <div
          className={`nav-item ${currentTab === 'rules' ? 'active' : ''}`}
          onClick={() => onSelectTab('rules')}
        >
          <Code2 size={18} />
          <span>Salary Rules (AST)</span>
        </div>

        {/* 0) User Access & Admin */}
        <div className="nav-section-title">0) Administration</div>
        <div
          className={`nav-item ${currentTab === 'users' ? 'active' : ''}`}
          onClick={() => onSelectTab('users')}
        >
          <ShieldCheck size={18} />
          <span>User Management</span>
        </div>
      </nav>
    </aside>
  );
};
