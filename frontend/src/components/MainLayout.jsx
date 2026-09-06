import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import { apiService } from '../services/apiService';

const breadcrumbs = {
  dashboard: 'Dashboard',
  directory: 'Employees › Directory',
  departments: 'Employees › Departments',
  job_positions: 'Employees › Job Positions',
  all_contracts: 'Contracts › All Contracts',
  contract_detail: 'Contracts › Contract Detail',
  active_contracts: 'Contracts › Active Contracts',
  attendance_records: 'Attendance › Records',
  monthly_overview: 'Attendance › Monthly Overview',
  schedules: 'Attendance › Working Schedules',
  time_off_requests: 'Time Off › Requests',
  leave_allocations: 'Time Off › Allocations',
  time_off_types: 'Time Off › Types',
  payruns: 'Payroll › Payruns',
  payslips: 'Payroll › Payslips',
  salary_structures: 'Payroll › Salary Structures',
  salary_rules: 'Payroll › Salary Rules',
  settings: 'System › Settings',
};

/* ─── Avatar initials helper ─── */
const getInitials = (name) =>
  name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '??';

/* ─── Debounce hook ─── */
function useDebounce(val, delay) {
  const [debouncedVal, setDebouncedVal] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedVal(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return debouncedVal;
}

/* ─── Companies list (demo) ─── */
const COMPANIES = [
  { id: 1, name: 'Acme Corp Global', country: 'India', employees: 20, active: true },
  { id: 2, name: 'Acme Corp US',     country: 'United States', employees: 0, active: false },
  { id: 3, name: 'Acme Corp EU',     country: 'Germany', employees: 0, active: false },
];

/* ════════════════════════════════════════════════════════════
   SEARCH BAR
════════════════════════════════════════════════════════════ */
function SearchBar({ onNavigate }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const debouncedQ = useDebounce(query, 280);
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* keyboard shortcut ⌘K / Ctrl+K */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        ref.current?.querySelector('input')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    apiService.getEmployees({ search: debouncedQ, limit: 6 })
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items ?? []);
        setResults(items);
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  const handleSelect = (emp) => {
    setQuery('');
    setOpen(false);
    onNavigate && onNavigate('directory');
  };

  const statusColor = { active: '#16a34a', on_leave: '#d97706', inactive: '#9ca3af', terminated: '#dc2626' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="search-bar">
        {loading
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'var(--color-primary)', flexShrink: 0, animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
        }
        <input
          type="text"
          placeholder="Search employees, payroll records…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.8rem', flex: 1, fontFamily: 'inherit', color: 'var(--text-primary)' }}
        />
        <span className="search-shortcut">⌘K</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '340px',
          background: 'var(--bg-canvas, #fff)', border: '1px solid var(--border-structural)',
          borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 9999, overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border-structural)' }}>
            Employees · {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              No employees found for "<strong>{debouncedQ}</strong>"
            </div>
          )}
          {results.map((emp) => (
            <div key={emp.id}
              onClick={() => handleSelect(emp)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-structural, #f5f7fa)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                {getInitials(`${emp.first_name} ${emp.last_name}`)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {emp.first_name} {emp.last_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {emp.employee_code} · {emp.department_name || emp.job_title || '—'}
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: statusColor[emp.status] + '18', color: statusColor[emp.status] || '#888', textTransform: 'capitalize' }}>
                {emp.status?.replace('_', ' ') || '—'}
              </span>
            </div>
          ))}
          {results.length > 0 && (
            <div
              onClick={() => { setOpen(false); onNavigate('directory'); }}
              style={{ padding: '9px 14px', fontSize: '0.78rem', color: 'var(--color-primary, #6366f1)', fontWeight: 600, borderTop: '1px solid var(--border-structural)', cursor: 'pointer', textAlign: 'center' }}
            >
              View all results in Directory →
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   NOTIFICATIONS PANEL
════════════════════════════════════════════════════════════ */
function NotificationsPanel({ onNavigate }) {
  const [open, setOpen]     = useState(false);
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifs = useCallback(() => {
    if (loading) return;
    setLoading(true);
    Promise.all([
      apiService.getLeaveRequests().catch(() => ({ items: [] })),
      apiService.getPayruns().catch(() => ({ items: [] })),
    ]).then(([leaveRes, payrunRes]) => {
      const leaveItems = (Array.isArray(leaveRes) ? leaveRes : leaveRes?.items ?? [])
        .filter(r => r.state === 'draft' || r.state === 'confirm')
        .slice(0, 4)
        .map(r => ({
          id: `leave-${r.id}`,
          icon: '🏖️',
          title: `Leave request — ${r.employee_name || 'Employee'}`,
          sub: `${r.holiday_status_name || 'Leave'} · ${r.number_of_days ?? '?'} day(s)`,
          time: r.date_from,
          action: 'time_off_requests',
          color: '#f59e0b',
        }));
      const payrunItems = (Array.isArray(payrunRes) ? payrunRes : payrunRes?.items ?? [])
        .filter(r => r.state === 'draft')
        .slice(0, 2)
        .map(r => ({
          id: `payrun-${r.id}`,
          icon: '💳',
          title: `Payrun ready — ${r.name || 'Payroll Run'}`,
          sub: 'Awaiting confirmation',
          time: r.date_start,
          action: 'payruns',
          color: '#6366f1',
        }));
      setItems([...leaveItems, ...payrunItems]);
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && items.length === 0) fetchNotifs();
  };

  const fmt = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch { return d; }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        className="icon-btn"
        title="Notifications"
        style={{ position: 'relative', background: open ? 'var(--surface-structural)' : 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {items.length > 0 && (
          <div className="badge" style={{ position: 'absolute', top: 0, right: 0 }}>{items.length}</div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '320px',
          background: 'var(--bg-canvas, #fff)', border: '1px solid var(--border-structural)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', zIndex: 9999, overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-structural)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Notifications</span>
            <button onClick={fetchNotifs} style={{ fontSize: '0.72rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Refreshing…' : '↺ Refresh'}
            </button>
          </div>

          {loading && items.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontWeight: 500 }}>All caught up!</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>No pending actions</div>
            </div>
          )}
          {items.map((n) => (
            <div key={n.id}
              onClick={() => { setOpen(false); onNavigate(n.action); }}
              style={{ display: 'flex', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-structural)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-structural, #f5f7fa)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: n.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.sub}</div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0, paddingTop: '2px' }}>{fmt(n.time)}</div>
            </div>
          ))}
          {items.length > 0 && (
            <div onClick={() => { setOpen(false); onNavigate('time_off_requests'); }}
              style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>
              View all pending actions →
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPANY SWITCHER
════════════════════════════════════════════════════════════ */
function CompanySwitcher() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(COMPANIES[0]);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="entity-switcher"
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="16" height="16" x="4" y="4" rx="2"/>
          <path d="M4 12h16"/><path d="M12 4v16"/>
        </svg>
        {selected.name}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '260px',
          background: 'var(--bg-canvas, #fff)', border: '1px solid var(--border-structural)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', zIndex: 9999, overflow: 'hidden'
        }}>
          <div style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border-structural)' }}>
            Switch Organization
          </div>
          {COMPANIES.map((c) => (
            <div key={c.id}
              onClick={() => { setSelected(c); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', background: selected.id === c.id ? 'var(--surface-structural)' : 'transparent', transition: 'background 0.15s', opacity: c.employees === 0 ? 0.5 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-structural, #f5f7fa)'}
              onMouseLeave={e => e.currentTarget.style.background = selected.id === c.id ? 'var(--surface-structural)' : 'transparent'}
            >
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--color-primary, #6366f1)22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                  <path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.country} · {c.employees} employees</div>
              </div>
              {selected.id === c.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              )}
            </div>
          ))}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-structural)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Additional companies coming soon
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PROFILE DROPDOWN
════════════════════════════════════════════════════════════ */
function ProfileDropdown({ currentUser, onLogout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = currentUser?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Admin User');
  const roleName    = currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Administrator';
  const email       = currentUser?.email || '';

  const menuItems = [
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      label: 'Employee Directory',
      action: () => { onNavigate('directory'); setOpen(false); }
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
      label: 'Account Settings',
      action: () => { onNavigate('settings'); setOpen(false); }
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>
        </svg>
      ),
      label: 'My Payslips',
      action: () => { onNavigate('payslips'); setOpen(false); }
    },
    {
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
      ),
      label: 'Leave Requests',
      action: () => { onNavigate('time_off_requests'); setOpen(false); }
    },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="user-profile"
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="user-info text-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span className="user-name" style={{ textTransform: 'capitalize' }}>{displayName}</span>
          <span className="user-role" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>{roleName}</span>
        </div>
        <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary, #6366f1)', color: '#fff', fontWeight: 600, fontSize: '13px' }}>
          {getInitials(displayName)}
        </div>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '240px',
          background: 'var(--bg-canvas, #fff)', border: '1px solid var(--border-structural)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', zIndex: 9999, overflow: 'hidden'
        }}>
          {/* Profile header */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border-structural)', background: 'var(--surface-structural, #f7fafa)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700 }}>
                {getInitials(displayName)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{displayName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{email}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginTop: '3px' }}>{roleName}</div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            {menuItems.map((item, i) => (
              <button key={i} onClick={item.action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-structural, #f5f7fa)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Logout */}
          <div style={{ borderTop: '1px solid var(--border-structural)', padding: '6px 0' }}>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#dc2626', fontFamily: 'inherit', textAlign: 'left', fontWeight: 600, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN LAYOUT
════════════════════════════════════════════════════════════ */
const MainLayout = ({ currentView, onNavigate, currentUser, onLogout, onSwitchRole, children }) => {
  const roleName = currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Administrator';

  return (
    <div className="dashboard-wrapper">
      <Sidebar currentView={currentView} onNavigate={onNavigate} currentUser={currentUser} />

      <main className="main-content">
        <header className="global-header">
          {/* Left — breadcrumb + search */}
          <div className="flex items-center gap-6">
            <div className="breadcrumb">
              HRMS <span style={{ margin: '0 0.35rem', color: 'var(--text-secondary)' }}>›</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {breadcrumbs[currentView] || 'Dashboard'}
              </span>
            </div>
            <SearchBar onNavigate={onNavigate} />
          </div>

          {/* Right — actions */}
          <div className="header-actions">
            {/* Role switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-structural, #f7fafa)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-structural)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Demo Persona Preview:</span>
              <select
                className="control-select"
                value={currentUser?.role || 'ADMIN'}
                onChange={(e) => onSwitchRole && onSwitchRole(e.target.value)}
                style={{ fontSize: '11px', fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px' }}
                title="Switch Active Persona / Role"
              >
                <option value="ADMIN">Admin (Full Access)</option>
                <option value="HR_MANAGER">HR Manager</option>
                <option value="HR_PAYROLL_MANAGER">Payroll Manager</option>
                <option value="HR_PAYROLL_USER">Payroll Specialist</option>
                <option value="EMPLOYEE">Employee (Self-Service)</option>
              </select>
            </div>

            {/* Company switcher */}
            <CompanySwitcher />

            {/* Notifications */}
            <NotificationsPanel onNavigate={onNavigate} />

            {/* Profile */}
            <ProfileDropdown
              currentUser={currentUser}
              onLogout={onLogout}
              onNavigate={onNavigate}
            />
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
