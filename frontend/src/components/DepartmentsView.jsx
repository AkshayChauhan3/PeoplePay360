import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackDepartments = [
  { id: 'D001', name: 'Engineering', head: 'Ananya Sharma', headTitle: 'Lead Staff Architect', employees: 42, location: 'Bengaluru Hub', budget: '₹2.4Cr', openRoles: 5, color: '#eef7f7', textColor: '#005166' },
  { id: 'D002', name: 'Product & UX', head: 'Marcus Brody', headTitle: 'Senior UX Designer', employees: 18, location: 'London Office', budget: '₹1.1Cr', openRoles: 2, color: '#f6f0f7', textColor: '#3b123f' },
  { id: 'D003', name: 'People Ops', head: 'Elena Vance', headTitle: 'Chief People Officer', employees: 12, location: 'Mumbai HQ', budget: '₹78L', openRoles: 1, color: '#eef7f7', textColor: '#005166' },
  { id: 'D004', name: 'Sales & Growth', head: 'Vikram Sen', headTitle: 'VP Global Enterprise', employees: 31, location: 'Singapore', budget: '₹1.8Cr', openRoles: 4, color: '#f6f0f7', textColor: '#3b123f' },
  { id: 'D005', name: 'Operations', head: 'David Miller', headTitle: 'Head of Infrastructure', employees: 23, location: 'Mumbai HQ', budget: '₹95L', openRoles: 3, color: '#eef7f7', textColor: '#005166' },
  { id: 'D006', name: 'Finance', head: 'Aisha Al-Mansoor', headTitle: 'Payroll Specialist', employees: 9, location: 'Dubai Hub', budget: '₹62L', openRoles: 1, color: '#f6f0f7', textColor: '#3b123f' },
];

const normalizeDept = (d, i) => ({
  id: d.dept_id || d.id || `D00${i + 1}`,
  name: d.name || 'General Department',
  head: d.manager_name || d.head || 'Lead Manager',
  headTitle: d.headTitle || 'Department Lead',
  employees: d.employee_count !== undefined ? d.employee_count : (d.employees || 12),
  location: d.location || 'Corporate HQ',
  budget: d.budget || '₹50L',
  openRoles: d.openRoles !== undefined ? d.openRoles : 2,
  color: i % 2 === 0 ? '#eef7f7' : '#f6f0f7',
  textColor: i % 2 === 0 ? '#005166' : '#3b123f',
});

const DepartmentsView = ({ onNavigate }) => {
  const [departments, setDepartments] = useState(fallbackDepartments);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', head: '', location: 'Mumbai HQ', budget: '₹50L' });

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await apiService.getDepartments();
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data.map(normalizeDept));
        }
      } catch (err) {
        console.warn('Using fallback departments:', err);
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
