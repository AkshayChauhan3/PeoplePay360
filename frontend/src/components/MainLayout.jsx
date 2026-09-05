import React from 'react';
import Sidebar from './Sidebar';

const breadcrumbs = {
  dashboard: 'Dashboard',
  directory: 'Employees › Directory',
  employee_profile: 'Employees › Employee Profile',
  departments: 'Employees › Departments',
  job_positions: 'Employees › Job Positions',
  all_contracts: 'Contracts › All Contracts',
  contract_detail: 'Contracts › Contract Detail',
  active_contracts: 'Contracts › Active Contracts',
  attendance_records: 'Attendance › Records',
  monthly_overview: 'Attendance › Monthly Overview',
  time_off_requests: 'Time Off › Requests',
  leave_allocations: 'Time Off › Allocations',
  time_off_types: 'Time Off › Types',
  payruns: 'Payroll › Payruns',
  payslips: 'Payroll › Payslips',
  salary_structures: 'Payroll › Salary Structures',
  salary_rules: 'Payroll › Salary Rules',
  reports: 'System › Reports',
  settings: 'System › Settings',
};

const MainLayout = ({ currentView, onNavigate, onLogout, children }) => {
  return (
    <div className="dashboard-wrapper">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />

      <main className="main-content">
        <header className="global-header">
          <div className="flex items-center gap-6">
            <div className="breadcrumb">
              HRMS <span style={{ margin: '0 0.35rem', color: 'var(--text-secondary)' }}>›</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{breadcrumbs[currentView] || 'Dashboard'}</span>
            </div>
            
            <div className="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search employees, payroll records, requests..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.8rem', flex: 1, fontFamily: 'inherit', color: 'var(--text-primary)' }} />
              <span className="search-shortcut">⌘K</span>
            </div>
          </div>

          <div className="header-actions">
            <div className="entity-switcher">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M4 12h16"/><path d="M12 4v16"/></svg>
              Acme Corp Global
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
            </div>

            <div className="icon-btn" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <div className="badge">8</div>
            </div>

            <div className="icon-btn" title="Help">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            </div>

            <div className="user-profile">
              <div className="user-info text-right">
                <span className="user-name">Elena Vance</span>
                <span className="user-role">Chief People Officer</span>
              </div>
              <div className="avatar">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Elena Vance" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              {onLogout && (
                <button
                  title="Sign out"
                  onClick={onLogout}
                  style={{ background: 'none', border: '1px solid var(--border-structural)', borderRadius: '6px', padding: '0.35rem 0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-scroll">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
