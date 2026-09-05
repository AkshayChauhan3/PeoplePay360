import React from 'react';
import Logo from './Logo';
import { isViewAllowed, ROLE_LABELS, ROLE_BADGE_COLORS } from '../utils/rbac';

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

const Sidebar = ({ currentView, onNavigate, currentUser }) => {
  const userRole = (currentUser?.role || 'ADMIN').toUpperCase();
  const badgeStyle = ROLE_BADGE_COLORS[userRole] || ROLE_BADGE_COLORS.EMPLOYEE;
  const roleTitle = ROLE_LABELS[userRole] || 'Staff';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo />
      </div>

      {/* Role Pill Banner */}
      <div style={{ padding: '0 1rem 0.75rem 1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: badgeStyle.bg,
          border: `1px solid ${badgeStyle.border}33`,
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: badgeStyle.text,
              display: 'inline-block'
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: badgeStyle.text,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              {roleTitle}
            </span>
          </div>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>RBAC</span>
        </div>
      </div>

      <div className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.id) {
            // Top-level item
            if (!isViewAllowed(userRole, item.id)) return null;
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

          // Section filtering by RBAC
          const allowedItems = item.items.filter(navItem => isViewAllowed(userRole, navItem.id));
          if (allowedItems.length === 0) return null;

          return (
            <div key={i} className="nav-section">
              <div className="nav-section-title">{item.section}</div>
              {allowedItems.map(navItem => (
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
        <div className="flex items-center gap-2" style={{ color: 'var(--success)', fontWeight: '600', fontSize: '11px' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="10" r="10" /></svg>
          RBAC Active
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>PeoplePay360</span>
      </div>
    </aside>
  );
};

export default Sidebar;
