import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const levelColors = {
  'C-Suite': { bg: '#f6f0f7', text: '#3b123f' },
  'VP': { bg: '#eef7f7', text: '#005166' },
  'L7': { bg: '#f6f0f7', text: '#3b123f' },
  'L6': { bg: '#eef7f7', text: '#005166' },
  'L5': { bg: '#f6f0f7', text: '#3b123f' },
  'L4': { bg: '#f7fafa', text: '#49636a' },
};

const normalizePosition = (p, idx) => ({
  id: p.code || p.id || `JP-00${idx + 1}`,
  title: p.name || p.title || 'Job Position',
  dept: p.department?.name || p.department_name || p.dept || 'General',
  level: p.level || 'L4',
  type: p.employment_type || p.type || 'Full-time',
  openings: p.expected_employees !== undefined ? p.expected_employees : (p.openings || 0),
  filled: p.current_employees !== undefined ? p.current_employees : (p.filled || 0),
  location: p.location || 'Corporate HQ',
  salary: p.salary || 'Standard Band',
});

const JobPositionsView = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPositions = async () => {
      setLoading(true);
      setError(null);
      try {
        const [posRes, empRes] = await Promise.allSettled([
          apiService.getJobPositions(),
          apiService.getEmployees(),
        ]);
        const rawPos = posRes.status === 'fulfilled' && Array.isArray(posRes.value) ? posRes.value : [];
        const rawEmps = empRes.status === 'fulfilled' 
          ? (empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []))
          : [];

        const normalized = rawPos.map((p, idx) => {
          const filledEmps = rawEmps.filter(e => e.job_position_id === p.id);
          const sampleEmp = filledEmps[0];
          const deptName = sampleEmp?.department?.name || 'General Operations';

          return {
            id: p.code || `JP-00${idx + 1}`,
            rawId: p.id,
            title: p.name || 'Job Position',
            dept: deptName,
            level: (p.name || '').includes('VP') || (p.name || '').includes('Head') ? 'L7' : ((p.name || '').includes('Senior') || (p.name || '').includes('Manager') ? 'L6' : 'L4'),
            type: 'Full-time',
            openings: Math.max(0, 2 - filledEmps.length),
            filled: filledEmps.length,
            location: 'Corporate HQ',
            salary: '₹12–24 LPA',
          };
        });

        setPositions(normalized);
      } catch (err) {
        console.error('Failed to fetch job positions:', err);
        setError(err.message || 'Unable to load job positions.');
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPositions();
  }, []);

  const filtered = positions.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.dept.toLowerCase().includes(search.toLowerCase())
  );

  const totalPositions = positions.length;
  const totalOpen = positions.reduce((acc, p) => acc + (Number(p.openings) || 0), 0);
  const totalFilled = positions.reduce((acc, p) => acc + (Number(p.filled) || 0), 0);

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
          { label: 'Total Positions', value: totalPositions },
          { label: 'Open Vacancies', value: totalOpen },
          { label: 'Filled Headcount', value: totalFilled },
          { label: 'Avg. Salary Range', value: 'Competitive' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-title">{kpi.label}</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{kpi.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="search-bar" style={{ width: '360px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search positions..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', flex: 1, fontFamily: 'inherit' }} />
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
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
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading job positions...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No job positions found</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      {search ? 'No positions matched your search query.' : 'No job positions configured yet. Click "+ New Position" above to define roles.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(pos => {
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
              })
            )}
          </tbody>
        </table>
      </div>

    </>
  );
};

export default JobPositionsView;
