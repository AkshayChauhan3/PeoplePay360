import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const normalizeEmployee = (emp, idx) => {
  const name = emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
  const joinDate = emp.joining_date ? new Date(emp.joining_date) : null;
  const isRecentJoiner = joinDate ? (new Date() - joinDate) / (1000 * 60 * 60 * 24) <= 30 : false;

  return {
    id: emp.employee_code || emp.employee_id || (typeof emp.id === 'string' ? emp.id.slice(0, 8) : `EMP-${1000 + idx}`),
    rawId: emp.id,
    name: name,
    firstName: emp.first_name,
    lastName: emp.last_name,
    email: emp.email || emp.work_email || 'emp@peoplepay360.internal',
    initials: name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM',
    dept: emp.department?.name || emp.department || emp.dept || 'Engineering',
    departmentId: emp.department_id,
    position: emp.job_position?.name || emp.job_title || emp.job_position || emp.position || 'Staff',
    jobPositionId: emp.job_position_id,
    lead: emp.manager?.first_name ? `${emp.manager.first_name} ${emp.manager.last_name}` : (emp.lead || 'Executive Lead'),
    location: 'Bengaluru HQ',
    status: (emp.status || 'ACTIVE').toUpperCase(),
    joiningDate: emp.joining_date,
    isRecentJoiner,
    avatar: null,
    bg: 'var(--surface-purple-tint)',
    color: 'var(--primary)',
  };
};

const EmployeeDirectoryView = ({ onNavigate }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [newEmp, setNewEmp] = useState({
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    positionId: '',
    joiningDate: new Date().toISOString().slice(0, 10),
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchWorkforceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, sumRes, deptRes, posRes] = await Promise.allSettled([
        apiService.getEmployees({ limit: 200 }),
        apiService.getDashboardSummary(),
        apiService.getDepartments(),
        apiService.getJobPositions(),
      ]);

      if (empRes.status === 'fulfilled') {
        const data = empRes.value;
        const raw = data?.items || (Array.isArray(data) ? data : []);
        setEmployees(raw.map(normalizeEmployee));
      }

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        const sData = sumRes.value?.data || sumRes.value;
        setSummary(sData);
      }

      if (deptRes.status === 'fulfilled') {
        const dList = Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value?.items || []);
        setDepartments(dList);
        if (dList.length > 0 && !newEmp.departmentId) {
          setNewEmp(prev => ({ ...prev, departmentId: dList[0].id }));
        }
      }

      if (posRes.status === 'fulfilled') {
        const pList = Array.isArray(posRes.value) ? posRes.value : (posRes.value?.items || []);
        setPositions(pList);
        if (pList.length > 0 && !newEmp.positionId) {
          setNewEmp(prev => ({ ...prev, positionId: pList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load workforce:', err);
      setError(err.message || 'Unable to load employees from database.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkforceData();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const depId = Number(newEmp.departmentId) || (departments[0]?.id || 1);
      const posId = Number(newEmp.positionId) || (positions[0]?.id || 1);
      const empCode = `EMP${String(Date.now()).slice(-4)}`;

      await apiService.createEmployee({
        employee_code: empCode,
        first_name: newEmp.firstName.trim(),
        last_name: newEmp.lastName.trim(),
        email: newEmp.email.trim(),
        department_id: depId,
        job_position_id: posId,
        joining_date: newEmp.joiningDate,
        status: 'ACTIVE',
      });

      showToast(`Employee ${newEmp.firstName} ${newEmp.lastName} (${empCode}) created!`);
      setShowAddModal(false);
      setNewEmp({
        firstName: '',
        lastName: '',
        email: '',
        departmentId: departments[0]?.id || '',
        positionId: positions[0]?.id || '',
        joiningDate: new Date().toISOString().slice(0, 10),
      });
      await fetchWorkforceData();
    } catch (err) {
      console.error('Failed to create employee:', err);
      alert(`Error creating employee: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) return;
    const headers = ['Employee Code', 'Full Name', 'Work Email', 'Department', 'Job Position', 'Status', 'Joining Date'];
    const rows = filteredEmployees.map(emp => [
      emp.id,
      emp.name,
      emp.email,
      emp.dept,
      emp.position,
      emp.status,
      emp.joiningDate || '',
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Dynamic KPI computations
  const totalHeadcount = employees.length;
  const activeStaff = employees.filter(e => e.status === 'ACTIVE').length;
  const onLeaveStaff = employees.filter(e => e.status === 'ON_LEAVE').length;
  const presentCount = summary?.present_today ?? activeStaff;
  const onLeaveCount = summary?.on_leave_today ?? onLeaveStaff;
  const recentJoinersCount = employees.filter(e => e.isRecentJoiner).length;
  const attendanceRate = summary?.attendance_rate !== undefined 
    ? `${summary.attendance_rate}%` 
    : (totalHeadcount > 0 ? `${Math.round((presentCount / totalHeadcount) * 100)}%` : '100%');

  const departmentsList = ['All', ...new Set(employees.map(e => e.dept).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || emp.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)' }}>WORKFORCE DIRECTORY • Live PostgreSQL Database</div>
          <h2>Employees</h2>
          <p>Manage and organize your workforce from one central place.</p>
        </div>
        <div className="dashboard-controls">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Directory
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Employee
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

      <div className="kpi-grid mb-6">
        <div className="kpi-card relative">
          <div className="kpi-title">TOTAL WORKFORCE</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalHeadcount}</span>
            <span className="text-sm ml-1 text-muted">Headcount</span>
          </div>
          <div className="kpi-subtext mt-3 flex items-center gap-2">
            <span className="status-pill active">{activeStaff} Active</span>
            {onLeaveStaff > 0 && <span className="status-pill highlight">{onLeaveStaff} On Leave</span>}
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">ACTIVE & PRESENT TODAY</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{presentCount}</span>
            <span className="text-sm ml-1 font-semibold" style={{ color: 'var(--secondary)' }}>{attendanceRate}</span>
          </div>
          <div className="kpi-subtext mt-3 font-medium" style={{ color: 'var(--secondary)' }}>
            Verified check-ins
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">ON LEAVE / AWAY</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{onLeaveCount}</span>
            <span className="text-sm ml-1 text-muted">personnel</span>
          </div>
          <div className="kpi-subtext mt-3 flex items-center gap-2">
            <span className="status-pill highlight">{summary?.pending_leave_requests ?? 0} Pending Sign-offs</span>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">NEW JOINERS (RECENT 30D)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">+{recentJoinersCount}</span>
            <span className="text-sm ml-1 font-semibold" style={{ color: 'var(--secondary)' }}>Live joined</span>
          </div>
          <div className="kpi-subtext mt-3 font-medium" style={{ color: 'var(--secondary)' }}>
            Onboarded within last 30 days
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="p-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-structural)', background: 'var(--surface-structural)' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '400px', background: 'var(--surface-base)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              type="text" 
              placeholder="Search employees by name, ID, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="control-select" 
            style={{ background: 'var(--surface-base)' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {departmentsList.map(dept => (
              <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
            ))}
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>EMPLOYEE CODE</th>
              <th>STATUS</th>
              <th>DEPARTMENT</th>
              <th>JOB POSITION</th>
              <th>WORK LOCATION</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No employees found in database</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      {searchTerm || deptFilter !== 'All' 
                        ? 'No employees match your search or filter criteria.' 
                        : 'Your workforce database is currently empty. Click "Add Employee" above to register your first team member.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr 
                  key={emp.id} 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onNavigate('employee_profile', emp.rawId)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: 'var(--surface-purple-tint)', color: 'var(--primary)' }}>
                        {emp.initials}
                      </div>
                      <div>
                        <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{emp.name}</div>
                        <div className="text-xs text-muted">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold">{emp.id}</span></td>
                  <td>
                    <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-green' : emp.status === 'ON_LEAVE' ? 'badge-amber' : 'badge-purple'}`} style={{ fontSize: '10px' }}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill structural">
                      {emp.dept}
                    </span>
                  </td>
                  <td className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{emp.position}</td>
                  <td className="text-sm text-muted">
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {emp.location}
                    </div>
                  </td>
                  <td>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNavigate('employee_profile', emp.rawId); }}
                      style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                    >
                      Profile →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="p-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-muted">Showing <span className="font-semibold text-gray-800">1-{filteredEmployees.length}</span> of <span className="font-semibold text-gray-800">{employees.length}</span> employees · <span style={{ color: 'var(--secondary)' }}>FastAPI Live Sync</span></div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>First Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={newEmp.firstName} 
                    onChange={e => setNewEmp({ ...newEmp, firstName: e.target.value })} 
                    placeholder="e.g. Ramesh"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Last Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={newEmp.lastName} 
                    onChange={e => setNewEmp({ ...newEmp, lastName: e.target.value })} 
                    placeholder="e.g. Chandra"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Work Email *</label>
                <input 
                  type="email" 
                  required 
                  className="form-input" 
                  value={newEmp.email} 
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} 
                  placeholder="r.chandra@peoplepay360.com"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <select 
                    className="control-select" 
                    style={{ width: '100%', height: '38px' }}
                    value={newEmp.departmentId} 
                    onChange={e => setNewEmp({ ...newEmp, departmentId: e.target.value })}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Job Position *</label>
                  <select 
                    className="control-select" 
                    style={{ width: '100%', height: '38px' }}
                    value={newEmp.positionId} 
                    onChange={e => setNewEmp({ ...newEmp, positionId: e.target.value })}
                  >
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Joining Date *</label>
                <input 
                  type="date" 
                  required
                  className="form-input" 
                  value={newEmp.joiningDate} 
                  onChange={e => setNewEmp({ ...newEmp, joiningDate: e.target.value })} 
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating Employee…' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeDirectoryView;
