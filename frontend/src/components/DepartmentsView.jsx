import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import EntityCombobox from './EntityCombobox';

const normalizeDept = (d, i) => ({
  id: d.code || `D00${i + 1}`,
  rawId: d.id,
  name: d.name || 'General Department',
  head: d.manager?.full_name || (d.manager_id ? `Employee #${d.manager_id}` : 'No Manager Assigned'),
  headTitle: d.manager?.job_title || (d.manager ? 'Department Head' : 'Unassigned'),
  employees: d.employee_count !== undefined ? d.employee_count : 0,
  location: 'Corporate HQ',
  budget: `₹${((d.employee_count || 0) * 65000).toLocaleString('en-IN')}/mo`,
  openRoles: Math.max(0, 3 - (d.employee_count || 0)),
  isActive: d.is_active !== undefined ? d.is_active : true,
  color: i % 2 === 0 ? '#eef7f7' : '#f6f0f7',
  textColor: i % 2 === 0 ? '#005166' : '#3b123f',
});

const DepartmentsView = ({ onNavigate }) => {
  const [departments, setDepartments] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    code: '',
    manager_id: '',
    description: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchDepts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, empRes] = await Promise.allSettled([
        apiService.getDepartments(),
        apiService.getEmployees({ limit: 500 }),
      ]);
      
      const rawDepts = deptRes.status === 'fulfilled' && Array.isArray(deptRes.value) ? deptRes.value : [];
      const rawEmps = empRes.status === 'fulfilled' 
        ? (empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []))
        : [];

      setEmployeesList(rawEmps);

      const normalized = rawDepts.map((d, i) => {
        const mgrName = d.manager?.full_name 
          || (d.manager_id ? `Employee #${d.manager_id}` : 'No Manager Assigned');
        const mgrTitle = d.manager?.job_title 
          || (d.manager ? 'Department Head' : 'Unassigned');
        const empCount = d.employee_count !== undefined ? d.employee_count : 0;

        return {
          id: d.code || `D00${i + 1}`,
          rawId: d.id,
          name: d.name || 'Department',
          code: d.code,
          managerId: d.manager_id,
          manager: d.manager,
          head: mgrName,
          headTitle: mgrTitle,
          employees: empCount,
          description: d.description || '',
          location: 'Corporate HQ',
          budget: `₹${(empCount * 65000).toLocaleString('en-IN')}/mo`,
          openRoles: Math.max(0, 3 - empCount),
          isActive: d.is_active,
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

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setForm({ name: '', code: '', manager_id: '', description: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      code: dept.code || dept.id,
      manager_id: dept.managerId !== null && dept.managerId !== undefined ? String(dept.managerId) : '',
      description: dept.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const generatedCode = form.code?.trim()
        ? form.code.trim().toUpperCase()
        : form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15);

      const managerIdInt = form.manager_id ? parseInt(form.manager_id, 10) : null;

      const payload = {
        name: form.name.trim(),
        code: generatedCode,
        description: form.description?.trim() || null,
        manager_id: managerIdInt,
      };

      if (editingDept) {
        await apiService.updateDepartment(editingDept.rawId, payload);
        showToast(`Department "${form.name}" updated successfully!`);
      } else {
        await apiService.createDepartment(payload);
        showToast(`Department "${form.name}" registered in database!`);
      }
      setShowModal(false);
      await fetchDepts();
    } catch (err) {
      console.error('Failed to save department:', err);
      alert(`Error saving department: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to deactivate department "${dept.name}"?`)) return;
    try {
      await apiService.deleteDepartment(dept.rawId);
      showToast(`Department "${dept.name}" deactivated.`);
      await fetchDepts();
    } catch (err) {
      console.error('Failed to delete department:', err);
      alert(`Error deactivating department: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (departments.length === 0) return;
    const headers = ['Code', 'Department Name', 'Lead', 'Headcount', 'Budget', 'Status'];
    const rows = departments.map(d => [d.id, d.name, d.head, d.employees, d.budget, d.isActive ? 'Active' : 'Inactive']);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `departments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase())
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
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button 
            className="btn-primary" 
            onClick={handleOpenCreate}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Department
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 600,
          background: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Departments', value: departments.length, sub: 'Across all units' },
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
          <input type="text" placeholder="Search departments by name or code..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', flex: 1, fontFamily: 'inherit' }} />
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
            <div key={dept.id} className="card-panel" style={{ transition: 'box-shadow 0.2s' }}>
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
              <div className="flex items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border-structural)', paddingTop: '0.75rem' }}>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div>📍 {dept.location}</div>
                  <div>Budget: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.budget}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEdit(dept)}
                    style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(dept)}
                    style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--critical)', background: '#fff2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                    title="Deactivate department"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit Department Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '450px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                {editingDept ? `Edit Department — ${editingDept.name}` : 'New Department'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department Name *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g. Legal & Compliance"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department Code (optional, auto-generated if empty)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={form.code} 
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                  placeholder="e.g. DEPT_LEGAL"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Department Manager (Select Employee)
                  Department Manager (Search Employee or enter ID)
                </label>
                <select 
                  className="form-input" 
                  value={form.manager_id} 
                  onChange={e => setForm({ ...form, manager_id: e.target.value })}
                  style={{ width: '100%', height: '38px', background: 'white' }}
                >
                  <option value="">-- No Manager Assigned --</option>
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code} · {emp.job_title || emp.job_position?.name || 'Staff'})
                    </option>
                  ))}
                </select>
                <EntityCombobox
                  value={form.manager_id}
                  onChange={(id) => setForm({ ...form, manager_id: id ?? '' })}
                  options={employeesList.map(e => ({
                    id: e.id,
                    label: `${e.first_name} ${e.last_name}`,
                    sublabel: `${e.employee_code} · ${e.job_title || e.job_position?.name || 'Staff'}`
                  }))}
                  placeholder="Type name, code, or employee ID…"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                  Assign an existing employee by their ID as the department head.
                  Type to filter by name/code, or paste raw employee ID directly.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description (optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="e.g. Core platform engineering and infrastructure"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (editingDept ? 'Save Changes' : 'Save Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DepartmentsView;
