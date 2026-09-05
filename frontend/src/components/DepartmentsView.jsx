import React, { useState } from 'react';

const departments = [
  { id: 'D001', name: 'Engineering', head: 'Ananya Sharma', headTitle: 'Lead Staff Architect', employees: 42, location: 'Bengaluru Hub', budget: '₹2.4Cr', openRoles: 5, color: '#eef7f7', textColor: '#005166' },
  { id: 'D002', name: 'Product & UX', head: 'Marcus Brody', headTitle: 'Senior UX Designer', employees: 18, location: 'London Office', budget: '₹1.1Cr', openRoles: 2, color: '#f6f0f7', textColor: '#3b123f' },
  { id: 'D003', name: 'People Ops', head: 'Elena Vance', headTitle: 'Chief People Officer', employees: 12, location: 'Mumbai HQ', budget: '₹78L', openRoles: 1, color: '#eef7f7', textColor: '#005166' },
  { id: 'D004', name: 'Sales & Growth', head: 'Vikram Sen', headTitle: 'VP Global Enterprise', employees: 31, location: 'Singapore', budget: '₹1.8Cr', openRoles: 4, color: '#f6f0f7', textColor: '#3b123f' },
  { id: 'D005', name: 'Operations', head: 'David Miller', headTitle: 'Head of Infrastructure', employees: 23, location: 'Mumbai HQ', budget: '₹95L', openRoles: 3, color: '#eef7f7', textColor: '#005166' },
  { id: 'D006', name: 'Finance', head: 'Aisha Al-Mansoor', headTitle: 'Payroll Specialist', employees: 9, location: 'Dubai Hub', budget: '₹62L', openRoles: 1, color: '#f6f0f7', textColor: '#3b123f' },
];

const DepartmentsView = ({ onNavigate }) => {
  const [search, setSearch] = useState('');

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORKFORCE CORE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Departments</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage organisational structure and team hierarchy.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button className="btn-primary" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Department
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Departments', value: '6', sub: 'Across all regions' },
          { label: 'Total Headcount', value: '135', sub: 'Across all departments' },
          { label: 'Open Roles', value: '16', sub: 'Currently hiring' },
          { label: 'Avg Team Size', value: '22.5', sub: 'Per department' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{kpi.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="search-bar" style={{ width: '360px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search departments..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', flex: 1, fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(dept => (
          <div key={dept.id} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.5rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(36,28,36,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div style={{ display: 'inline-block', background: dept.color, color: dept.textColor, fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{dept.id}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{dept.name}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{dept.employees}</div>
            </div>
            <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.head}</span> · {dept.headTitle}
            </div>
            <div className="flex items-center gap-4" style={{ borderTop: '1px solid var(--border-structural)', paddingTop: '0.75rem' }}>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>📍 {dept.location}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Budget: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.budget}</span></div>
              <div className="text-xs" style={{ color: dept.openRoles > 0 ? 'var(--secondary)' : 'var(--text-secondary)', fontWeight: 600 }}>{dept.openRoles} Open Roles</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default DepartmentsView;
