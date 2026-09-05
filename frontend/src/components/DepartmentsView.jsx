import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const normalizeDept = (d, i) => ({
  id: d.dept_id || d.id || `D00${i + 1}`,
  name: d.name || 'General Department',
  head: d.manager_name || d.head || 'Department Lead',
  headTitle: d.headTitle || 'Head of Department',
  employees: d.employee_count !== undefined ? d.employee_count : (d.employees || 0),
  location: d.location || 'Corporate HQ',
  budget: d.budget || '₹0',
  openRoles: d.openRoles !== undefined ? d.openRoles : 0,
  color: i % 2 === 0 ? '#eef7f7' : '#f6f0f7',
  textColor: i % 2 === 0 ? '#005166' : '#3b123f',
});

const DepartmentsView = ({ onNavigate }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', head: '', location: 'Corporate HQ', budget: '₹50L' });

  useEffect(() => {
    const fetchDepts = async () => {
      setLoading(true);
      setError(null);
      try {
        const [deptRes, empRes] = await Promise.allSettled([
          apiService.getDepartments(),
          apiService.getEmployees(),
        ]);
        
        const rawDepts = deptRes.status === 'fulfilled' && Array.isArray(deptRes.value) ? deptRes.value : [];
        const rawEmps = empRes.status === 'fulfilled' 
          ? (empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []))
          : [];

        const normalized = rawDepts.map((d, i) => {
          const deptEmps = rawEmps.filter(e => e.department_id === d.id);
          const manager = deptEmps.find(e => (e.job_position?.name || '').toLowerCase().includes('manager') || (e.job_position?.name || '').toLowerCase().includes('lead')) || deptEmps[0];
          const mgrName = manager ? `${manager.first_name} ${manager.last_name}` : 'Team Lead';
          const mgrTitle = manager?.job_position?.name || 'Department Lead';

          return {
            id: d.code || `D00${i + 1}`,
            rawId: d.id,
            name: d.name || 'Department',
            head: mgrName,
            headTitle: mgrTitle,
            employees: deptEmps.length,
            location: 'Corporate HQ',
            budget: `₹${(deptEmps.length * 65000).toLocaleString('en-IN')}/mo`,
            openRoles: Math.max(0, 3 - deptEmps.length),
            color: i % 2 === 0 ? '#eef7f7' : '#f6f0f7',
            textColor: i % 2 === 0 ? '#005166' : '#3b123f',
          };
        });

        setDepartments(normalized);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        setError(err.message || 'Unable to load departments from database.');
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDepts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await apiService.createDepartment(newDept);
      setDepartments(prev => [normalizeDept(created, prev.length), ...prev]);
      setShowModal(false);
      setNewDept({ name: '', head: '', location: 'Mumbai HQ', budget: '₹50L' });
    } catch (err) {
      console.error('Failed to create department:', err);
    }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase())
  );

  const totalHeadcount = departments.reduce((acc, curr) => acc + (Number(curr.employees) || 0), 0);
  const totalOpenRoles = departments.reduce((acc, curr) => acc + (Number(curr.openRoles) || 0), 0);

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
          <button 
            className="btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Department
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Departments', value: departments.length, sub: 'Across all regions' },
          { label: 'Total Headcount', value: totalHeadcount, sub: 'Across all departments' },
          { label: 'Open Roles', value: totalOpenRoles, sub: 'Currently hiring' },
          { label: 'Avg Team Size', value: (totalHeadcount / (departments.length || 1)).toFixed(1), sub: 'Per department' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-title">{kpi.label}</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{kpi.value}</span>
            </div>
            <div className="kpi-subtext">{kpi.sub}</div>
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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--text-secondary)', background: 'var(--surface-primary)', borderRadius: '12px', border: '1px solid var(--border-structural)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading departments...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--text-secondary)', background: 'var(--surface-primary)', borderRadius: '12px', border: '1px solid var(--border-structural)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="M15 9h6" /><path d="M15 15h6" />
            </svg>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>No departments found in database</div>
            <div style={{ fontSize: '13px', maxWidth: '380px' }}>
              {search 
                ? 'No departments matched your search query.' 
                : 'Your database has no registered departments yet. Click "New Department" above to add your first organisation unit.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(dept => (
            <div key={dept.id} className="card-panel" style={{ cursor: 'pointer' }}>
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
      )}

      {/* New Department Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '450px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>New Department</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newDept.name} 
                  onChange={e => setNewDept({ ...newDept, name: e.target.value })} 
                  placeholder="e.g. Legal & Compliance"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department Lead</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newDept.head} 
                  onChange={e => setNewDept({ ...newDept, head: e.target.value })} 
                  placeholder="e.g. Tariq Patel"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Location</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newDept.location} 
                  onChange={e => setNewDept({ ...newDept, location: e.target.value })} 
                  placeholder="e.g. Mumbai HQ"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Annual Budget</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newDept.budget} 
                  onChange={e => setNewDept({ ...newDept, budget: e.target.value })} 
                  placeholder="e.g. ₹85L"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DepartmentsView;
