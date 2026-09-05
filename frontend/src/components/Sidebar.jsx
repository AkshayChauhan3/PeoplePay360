import React from 'react';
import Logo from './Logo';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  {
    section: 'EMPLOYEES',
    items: [
      { id: 'directory', label: 'Directory' },
      { id: 'employee_profile', label: 'Employee Profile' },
      { id: 'departments', label: 'Departments' },
      { id: 'job_positions', label: 'Job Positions' },
    ]
  },
  {
    section: 'CONTRACTS',
    items: [
      { id: 'all_contracts', label: 'All Contracts' },
      { id: 'active_contracts', label: 'Active Contracts' },
      { id: 'contract_detail', label: 'Contract Detail' },
    ]
  },
  {
    section: 'ATTENDANCE',
    items: [
      { id: 'attendance_records', label: 'Attendance Records' },
      { id: 'monthly_overview', label: 'Monthly Overview' },
    ]
  },
  {
    section: 'TIME OFF',
    items: [
      { id: 'time_off_requests', label: 'Requests' },
      { id: 'leave_allocations', label: 'Allocations' },
      { id: 'time_off_types', label: 'Time Off Types' },
    ]
  },
  {
    section: 'PAYROLL',
    items: [
      { id: 'payruns', label: 'Payruns' },
      { id: 'payslips', label: 'Payslips' },
      { id: 'salary_structures', label: 'Salary Structures' },
      { id: 'salary_rules', label: 'Salary Rules' },
    ]
  },
  {
    section: 'SYSTEM',
    items: [
      { id: 'reports', label: 'Reports' },
      { id: 'settings', label: 'Settings' },
    ]
  },
];

const Sidebar = ({ currentView, onNavigate }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo />
      </div>

      <div className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.id) {
            // Top-level single item (Dashboard)
            return (
              <div key={i} className="nav-section">
                <a
                  href="#"
                  className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onNavigate(item.id); }}
                >
                  {item.label}
                </a>
              </div>
            );
          }
          return (
            <div key={i} className="nav-section">
              <div className="nav-section-title">{item.section}</div>
              {item.items.map(navItem => (
                <a
                  key={navItem.id}
                  href="#"
                  className={`nav-item ${currentView === navItem.id ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onNavigate(navItem.id); }}
                >
                  {navItem.label}
                </a>
              ))}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="flex items-center gap-2" style={{ color: 'var(--success)', fontWeight: '600' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
          v2.4 Operational
        </div>
        <svg style={{ color: 'var(--text-secondary)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
    </aside>
  );
};

export default Sidebar;
