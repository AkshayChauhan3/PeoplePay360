import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const normalizeEmployee = (emp, idx) => {
  const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
  const joinDate = emp.joining_date ? new Date(emp.joining_date) : null;
  const isRecentJoiner = joinDate ? (new Date() - joinDate) / (1000 * 60 * 60 * 24) <= 30 : false;

  return {
    id: emp.employee_code || emp.employee_id || (typeof emp.id === 'string' ? emp.id.slice(0, 8) : `EMP-${1000 + idx}`),
    name: name,
    email: emp.email || emp.work_email || 'emp@peoplepay360.internal',
    initials: name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM',
    dept: emp.department?.name || emp.department || emp.dept || 'Engineering',
    position: emp.job_position?.name || emp.job_title || emp.job_position || emp.position || 'Staff',
    lead: emp.manager?.first_name ? `${emp.manager.first_name} ${emp.manager.last_name}` : (emp.lead || 'Executive Lead'),
    location: emp.location || 'Bengaluru HQ',
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
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', dept: 'Engineering', position: '', location: 'Bengaluru HQ' });

  useEffect(() => {
    const fetchWorkforceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [empRes, sumRes] = await Promise.allSettled([
          apiService.getEmployees(),
          apiService.getDashboardSummary(),
        ]);

        if (empRes.status === 'fulfilled') {
          const data = empRes.value;
          const raw = data?.items || data?.data || (Array.isArray(data) ? data : []);
          setEmployees(raw.map(normalizeEmployee));
        }

        if (sumRes.status === 'fulfilled' && sumRes.value) {
          const sData = sumRes.value?.data || sumRes.value;
          setSummary(sData);
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
        setError(err.message || 'Unable to load employees from database.');
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkforceData();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const created = await apiService.createEmployee({
        first_name: newEmp.name.split(' ')[0] || newEmp.name,
        last_name: newEmp.name.split(' ').slice(1).join(' ') || '',
        work_email: newEmp.email,
        department: newEmp.dept,
        job_position: newEmp.position,
        location: newEmp.location,
      });
      setEmployees(prev => [normalizeEmployee(created, prev.length + 1), ...prev]);
      setShowAddModal(false);
      setNewEmp({ name: '', email: '', dept: 'Engineering', position: '', location: 'Bengaluru HQ' });
    } catch (err) {
      console.error('Failed to create employee:', err);
    }
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

  // Distinct departments for filter
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
          <button className="btn-secondary" onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export Directory
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Employee
          </button>
        </div>
      </div>

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
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-structural)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">ACTIVE & PRESENT TODAY</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{presentCount}</span>
            <span className="text-sm ml-1 font-semibold" style={{ color: 'var(--secondary)' }}>{attendanceRate}</span>
          </div>
          <div className="kpi-subtext mt-3 font-medium" style={{ color: 'var(--secondary)' }}>
            {summary?.on_time_today !== undefined ? `${summary.on_time_today} On Time · ${summary?.late_today || 0} Late Arrivals` : 'Verified check-ins'}
          </div>
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-teal-tint)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
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
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-purple-tint)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary)' }}><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/></svg>
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
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-teal-tint)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
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
              <th>REPORTING LEAD</th>
              <th>WORK LOCATION</th>
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
                <tr key={emp.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onNavigate('employee_profile')}>
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
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>
                        {emp.lead ? emp.lead.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase() : 'EV'}
                      </div>
                      <span className="text-sm font-medium">{emp.lead}</span>
                    </div>
                  </td>
                  <td className="text-sm text-muted">
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {emp.location}
                    </div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newEmp.name} 
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} 
                  placeholder="e.g. Ramesh Chandra"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Work Email</label>
                <input 
                  type="email" 
                  required 
                  className="form-input" 
                  value={newEmp.email} 
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} 
                  placeholder="r.chandra@peoplepay360.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department</label>
                <select 
                  className="control-select" 
                  style={{ width: '100%' }}
                  value={newEmp.dept} 
                  onChange={e => setNewEmp({ ...newEmp, dept: e.target.value })}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product & Design">Product & Design</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Job Position</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newEmp.position} 
                  onChange={e => setNewEmp({ ...newEmp, position: e.target.value })} 
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Location</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newEmp.location} 
                  onChange={e => setNewEmp({ ...newEmp, location: e.target.value })} 
                  placeholder="e.g. Bengaluru HQ"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeDirectoryView;
