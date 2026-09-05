import React, { useState } from 'react';
import Logo from './Logo';
import { isViewAllowed, ROLE_LABELS, ROLE_BADGE_COLORS } from '../utils/rbac';

const NavIcon = ({ name }) => {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case 'dashboard':
      return <svg {...props}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
    case 'directory':
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'employee_profile':
      return <svg {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'departments':
      return <svg {...props}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
    case 'job_positions':
      return <svg {...props}><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'all_contracts':
      return <svg {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
    case 'active_contracts':
      return <svg {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>;
    case 'contract_detail':
      return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
    case 'attendance_records':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'monthly_overview':
      return <svg {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
    case 'time_off_requests':
      return <svg {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>;
    case 'leave_allocations':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'payruns':
      return <svg {...props}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'payslips':
      return <svg {...props}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>;
    case 'salary_structures':
      return <svg {...props}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
    case 'salary_rules':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'settings':
      return <svg {...props}><line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="3" y2="3"/><line x1="4" x2="20" y1="12" y2="12"/><circle cx="9" cy="21" r="2"/><circle cx="14" cy="3" r="2"/><circle cx="8" cy="12" r="2"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="4"/></svg>;
  }
};

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
      { id: 'settings', label: 'Settings' },
    ]
  },
];

const Sidebar = ({ currentView, onNavigate, currentUser }) => {
  const [collapsed, setCollapsed] = useState(false);
  const userRole = (currentUser?.role || 'ADMIN').toUpperCase();
  const badgeStyle = ROLE_BADGE_COLORS[userRole] || ROLE_BADGE_COLORS.EMPLOYEE;
  const roleTitle = ROLE_LABELS[userRole] || 'Staff';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
      {/* Brand & Shrink / Expand Toggle */}
      <div 
        className="sidebar-brand" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '1rem 0.5rem' : '1.25rem 1rem',
          position: 'relative',
        }}
      >
        <Logo collapsed={collapsed} />
        
        {/* Toggle Shrink / Expand Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Shrink Sidebar'}
          style={{
            background: 'var(--surface-neutral, #f7fafa)',
            border: '1px solid var(--border-structural)',
            borderRadius: '6px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            padding: 0,
            transition: 'all 0.15s ease',
            marginLeft: collapsed ? 0 : '8px',
            marginTop: collapsed ? '8px' : 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-teal-tint, #eef7f7)'; e.currentTarget.style.color = 'var(--secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-neutral, #f7fafa)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Role Pill Banner */}
      <div style={{ padding: collapsed ? '0.5rem 0.4rem' : '0 1rem 0.75rem 1rem' }}>
        {collapsed ? (
          <div 
            title={`Active Role: ${roleTitle}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              background: badgeStyle.bg,
              border: `1px solid ${badgeStyle.border}33`,
              borderRadius: '8px',
              cursor: 'default',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: badgeStyle.text,
              display: 'inline-block'
            }} />
          </div>
        ) : (
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
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>ROLE</span>
          </div>
        )}
      </div>

      {/* Navigation list */}
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
                  title={collapsed ? item.label : undefined}
                  style={collapsed ? { justifyContent: 'center', fontSize: '15px' } : { display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', flexShrink: 0 }}>
                    <NavIcon name={item.id} />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </a>
              </div>
            );
          }

          // Section filtering by RBAC
          const allowedItems = item.items.filter(navItem => isViewAllowed(userRole, navItem.id));
          if (allowedItems.length === 0) return null;

          return (
            <div key={i} className="nav-section">
              {!collapsed && <div className="nav-section-title">{item.section}</div>}
              {allowedItems.map(navItem => (
                <a
                  key={navItem.id}
                  href="#"
                  className={`nav-item ${currentView === navItem.id ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onNavigate(navItem.id); }}
                  title={collapsed ? navItem.label : undefined}
                  style={collapsed ? { justifyContent: 'center', fontSize: '15px' } : { display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', flexShrink: 0 }}>
                    <NavIcon name={navItem.id} />
                  </span>
                  {!collapsed && <span>{navItem.label}</span>}
                </a>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer (RBAC Active Removed) */}
      <div className="sidebar-footer" style={collapsed ? { justifyContent: 'center', padding: '0.75rem 0.25rem' } : undefined}>
        {collapsed ? (
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>360</span>
        ) : (
          <>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>PeoplePay 360</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>v1.0</span>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
