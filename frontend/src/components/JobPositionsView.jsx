import React, { useState } from 'react';

const positions = [
  { id: 'JP-001', title: 'Lead Staff Architect', dept: 'Engineering', level: 'L7', type: 'Full-time', openings: 1, filled: 5, location: 'Bengaluru Hub', salary: '₹28–38 LPA' },
  { id: 'JP-002', title: 'Senior UX Designer', dept: 'Product & UX', level: 'L5', type: 'Full-time', openings: 1, filled: 4, location: 'London Office', salary: '₹20–28 LPA' },
  { id: 'JP-003', title: 'Chief People Officer', dept: 'People Ops', level: 'C-Suite', type: 'Full-time', openings: 0, filled: 1, location: 'Mumbai HQ', salary: '₹50–70 LPA' },
  { id: 'JP-004', title: 'VP Global Enterprise', dept: 'Sales & Growth', level: 'VP', type: 'Full-time', openings: 2, filled: 3, location: 'Singapore', salary: '₹40–55 LPA' },
  { id: 'JP-005', title: 'Senior DevOps Engineer', dept: 'Engineering', level: 'L6', type: 'Full-time', openings: 2, filled: 6, location: 'Bengaluru Hub', salary: '₹22–32 LPA' },
  { id: 'JP-006', title: 'Head of Infrastructure', dept: 'Operations', level: 'L6', type: 'Full-time', openings: 1, filled: 2, location: 'Mumbai HQ', salary: '₹25–35 LPA' },
  { id: 'JP-007', title: 'Payroll Specialist', dept: 'Finance', level: 'L4', type: 'Full-time', openings: 0, filled: 3, location: 'Dubai Hub', salary: '₹10–15 LPA' },
  { id: 'JP-008', title: 'Frontend Engineer', dept: 'Engineering', level: 'L4', type: 'Full-time', openings: 3, filled: 8, location: 'Remote', salary: '₹15–22 LPA' },
];

const levelColors = {
  'C-Suite': { bg: '#f6f0f7', text: '#3b123f' },
  'VP': { bg: '#eef7f7', text: '#005166' },
  'L7': { bg: '#f6f0f7', text: '#3b123f' },
  'L6': { bg: '#eef7f7', text: '#005166' },
  'L5': { bg: '#f6f0f7', text: '#3b123f' },
  'L4': { bg: '#f7fafa', text: '#49636a' },
};

const JobPositionsView = () => {
  const [search, setSearch] = useState('');

  const filtered = positions.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.dept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORKFORCE CORE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Job Positions</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Define and manage roles, levels, and compensation bands.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Export</button>
          <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Position
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Positions', value: '8' },
          { label: 'Open Vacancies', value: '10' },
          { label: 'Filled Headcount', value: '32' },
          { label: 'Avg. Salary Range', value: '₹24 LPA' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="search-bar" style={{ width: '360px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search positions..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', flex: 1, fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Department</th>
              <th>Level</th>
              <th>Filled</th>
              <th>Open</th>
              <th>Location</th>
              <th>Salary Band</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(pos => {
              const lc = levelColors[pos.level] || { bg: '#f7fafa', text: '#49636a' };
              return (
                <tr key={pos.id} style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{pos.title}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pos.id}</div>
                  </td>
                  <td className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{pos.dept}</td>
                  <td><span style={{ background: lc.bg, color: lc.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{pos.level}</span></td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.filled}</td>
                  <td>
                    <span style={{ color: pos.openings > 0 ? 'var(--secondary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.8rem' }}>{pos.openings}</span>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pos.location}</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.salary}</td>
                  <td>
                    <span style={{ background: pos.openings > 0 ? 'var(--surface-teal-tint)' : 'var(--surface-neutral)', color: pos.openings > 0 ? 'var(--secondary)' : 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {pos.openings > 0 ? 'Hiring' : 'Closed'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default JobPositionsView;
