import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import EntityCombobox from './EntityCombobox';

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
    lead: emp.manager?.first_name ? `${emp.manager.first_name} ${emp.manager.last_name}` : (emp.lead || 'None (Direct Report)'),
    managerId: emp.manager_id,
    workingScheduleId: emp.working_schedule_id,
    userId: emp.user_id || emp.user?.id || null,
    userEmail: emp.user_email || emp.user?.email || null,
    location: 'Bengaluru HQ',
    status: (emp.status || 'ACTIVE').toUpperCase(),
    joiningDate: emp.joining_date,
    phone: emp.phone || null,
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
  const [schedules, setSchedules] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [showAddModal, setShowAddModal] = useState(false);
  const [linkingEmployee, setLinkingEmployee] = useState(null);
  const [selectedLinkUserId, setSelectedLinkUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [newEmp, setNewEmp] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    positionId: '',
    managerId: '',
    workingScheduleId: '',
    userId: '',
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
      const [empRes, sumRes, deptRes, posRes, schedRes, userRes] = await Promise.allSettled([
        apiService.getEmployees({ limit: 500 }),
        apiService.getDashboardSummary(),
        apiService.getDepartments(),
        apiService.getJobPositions(),
        apiService.getSchedules(),
        apiService.getUsers({ limit: 500 }),
      ]);

      if (empRes.status === 'fulfilled') {
        const data = empRes.value;
        const raw = data?.items || (Array.isArray(data) ? data : []);
        setEmployees(raw.map(normalizeEmployee));
        setError(null);
      } else {
        const errMsg = empRes.reason?.message || 'Failed to retrieve workforce from server';
        console.error('Failed to load employees:', empRes.reason);
        setError(errMsg);
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

      if (schedRes.status === 'fulfilled') {
        const sList = Array.isArray(schedRes.value) ? schedRes.value : (schedRes.value?.items || []);
        setSchedules(sList);
      }

      if (userRes.status === 'fulfilled') {
        const uList = Array.isArray(userRes.value) ? userRes.value : (userRes.value?.items || []);
        setAvailableUsers(uList);
      }
    } catch (err) {
      console.error('Workforce sync error:', err);
      setError(err.message || 'Unable to sync live workforce data from database.');
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
      const schedId = newEmp.workingScheduleId ? Number(newEmp.workingScheduleId) : undefined;
      const mgrId = newEmp.managerId ? Number(newEmp.managerId) : undefined;
      const usrId = newEmp.userId ? Number(newEmp.userId) : undefined;
      const empCode = newEmp.employeeCode.trim().toUpperCase() || `EMP${String(Date.now()).slice(-4)}`;

      await apiService.createEmployee({
        employee_code: empCode,
        first_name: newEmp.firstName.trim(),
        last_name: newEmp.lastName.trim(),
        email: newEmp.email.trim(),
        phone: newEmp.phone.trim() || undefined,
        department_id: depId,
        job_position_id: posId,
        manager_id: mgrId,
        working_schedule_id: schedId,
        user_id: usrId,
        joining_date: newEmp.joiningDate,
        status: 'ACTIVE',
      });

      showToast(`Employee ${newEmp.firstName} ${newEmp.lastName} (${empCode}) created successfully!`);
      setShowAddModal(false);
      setNewEmp({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: departments[0]?.id || '',
        positionId: positions[0]?.id || '',
        managerId: '',
        workingScheduleId: '',
        userId: '',
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

  const handleLinkUser = async (e) => {
    e.preventDefault();
    if (!linkingEmployee || !selectedLinkUserId) return;
    setSaving(true);
    try {
      await apiService.linkUserToEmployee(linkingEmployee.rawId, selectedLinkUserId);
      showToast(`Linked User #${selectedLinkUserId} to ${linkingEmployee.name}!`);
      setLinkingEmployee(null);
      setSelectedLinkUserId('');
      await fetchWorkforceData();
    } catch (err) {
      alert(`Failed to link user account: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkUser = async (emp) => {
    if (!window.confirm(`Unlink user account from ${emp.name}?`)) return;
    try {
      await apiService.unlinkUserFromEmployee(emp.rawId);
      showToast(`Unlinked user account from ${emp.name}`);
      await fetchWorkforceData();
    } catch (err) {
      alert(`Failed to unlink user account: ${err.message}`);
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
          <button className="btn-secondary" onClick={fetchWorkforceData} title="Reload workforce records from database">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Reload
          </button>
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

      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          background: '#fff2f2',
          border: '1px solid #f87171',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <strong>Sync Notice:</strong> {error}
              <div style={{ fontSize: '12px', marginTop: '2px', color: '#b91c1c' }}>
                If you recently re-seeded the database, your session token may be invalid. Please sign in again.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={fetchWorkforceData}
              style={{ fontSize: '12px', padding: '4px 12px', height: 'auto', background: '#fff' }}
            >
              ↻ Retry Sync
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                apiService.logout();
                window.location.reload();
              }}
              style={{ fontSize: '12px', padding: '4px 12px', height: 'auto', background: '#b91c1c', borderColor: '#b91c1c' }}
            >
              Sign In Again
            </button>
          </div>
        </div>
      )}

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

          {/* List vs Kanban View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-base)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-structural)', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Table / List View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              title="Kanban Cards View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'kanban' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'kanban' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="9" rx="1"/>
                <rect x="14" y="3" width="7" height="5" rx="1"/>
                <rect x="14" y="12" width="7" height="9" rx="1"/>
                <rect x="3" y="16" width="7" height="5" rx="1"/>
              </svg>
              <span>Kanban</span>
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>EMPLOYEE CODE</th>
                <th>STATUS</th>
                <th>DEPARTMENT</th>
                <th>JOB POSITION</th>
                <th>LOGIN ACCOUNT</th>
                <th>WORK LOCATION</th>
                <th>FORM / PROFILE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading employees...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No employees found in database</div>
                      <div style={{ fontSize: '13px', maxWidth: '380px' }}>
                        {searchTerm || deptFilter !== 'All' 
                          ? 'No employees match your search or filter criteria.' 
                          : 'No employee records are displaying. Click "Reload Live Data" below to fetch all 400 employees from PostgreSQL.'}
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={fetchWorkforceData}
                        style={{ marginTop: '12px', fontSize: '12.5px', padding: '6px 14px' }}
                      >
                        ↻ Reload Live Data
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr 
                    key={emp.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td>
                      <div 
                        className="flex items-center gap-3" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNavigate('employee_profile', emp.rawId)}
                        title="Click to view Employee Profile & Smart Buttons"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: 'var(--surface-purple-tint)', color: 'var(--primary)' }}>
                          {emp.initials}
                        </div>
                        <div>
                          <div className="font-bold text-[13px] hover:underline" style={{ color: 'var(--primary)' }}>{emp.name}</div>
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
                      {emp.userId ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '11.5px', color: '#065f46', fontWeight: 600 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span>User #{emp.userId}</span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkUser(emp)}
                            title="Unlink user login account"
                            style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '0 2px', fontSize: '12px', fontWeight: 800 }}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkingEmployee(emp);
                            setSelectedLinkUserId('');
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px dashed #cbd5e1',
                            background: '#f8fafc',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Match and link this employee with an existing User ID"
                        >
                          <span>+</span> Link User ID
                        </button>
                      )}
                    </td>
                    <td className="text-sm text-muted">
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {emp.location}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onNavigate('employee_profile', emp.rawId)}
                        className="btn-secondary"
                        style={{ padding: '3px 9px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        title="Open Employee Form & Smart Buttons"
                      >
                        <span>Form</span> →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* Kanban Cards View */
          <div style={{ padding: '1.25rem', background: '#f8fafc' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto' }}></div>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading workforce cards...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, margin: '0 auto 10px auto' }}>
                  <rect x="3" y="3" width="7" height="9" rx="1"/>
                  <rect x="14" y="3" width="7" height="5" rx="1"/>
                  <rect x="14" y="12" width="7" height="9" rx="1"/>
                  <rect x="3" y="16" width="7" height="5" rx="1"/>
                </svg>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No employees match your search or filter</div>
                <div style={{ fontSize: '13px', marginTop: '6px' }}>Try selecting a different department, clearing search, or reload live data.</div>
                <button
                  className="btn-secondary"
                  onClick={fetchWorkforceData}
                  style={{ marginTop: '12px', fontSize: '12.5px', padding: '6px 14px' }}
                >
                  ↻ Reload Live Data
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
                {filteredEmployees.map(emp => (
                  <div
                    key={emp.id}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-structural)',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--secondary)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-structural)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      {/* Top Header: Avatar + Name + Status */}
                      <div 
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}
                        onClick={() => onNavigate('employee_profile', emp.rawId)}
                        title="Click to open Employee Profile Form"
                      >
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            background: 'var(--surface-purple-tint)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '15px',
                            flexShrink: 0,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                          }}
                        >
                          {emp.initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {emp.name}
                            </div>
                            <span
                              className={`badge ${emp.status === 'ACTIVE' ? 'badge-green' : emp.status === 'ON_LEAVE' ? 'badge-amber' : 'badge-purple'}`}
                              style={{ fontSize: '9px', padding: '1px 6px', flexShrink: 0 }}
                            >
                              {emp.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.position}
                          </div>
                          <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600, marginTop: '2px' }}>
                            {emp.dept}
                          </div>
                        </div>
                      </div>

                      {/* Middle metadata: Contact & Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11.5px', color: 'var(--text-secondary)', padding: '10px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                        </div>
                        {emp.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span>{emp.phone}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>{emp.location}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                          <span style={{ fontSize: '11px' }}>Manager: <strong style={{ color: 'var(--text-primary)' }}>{emp.lead}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                          <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Login:
                          </span>
                          {emp.userId ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '1px 6px', borderRadius: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '11px', color: '#065f46', fontWeight: 600 }}>
                              <span>User #{emp.userId}</span>
                              <button
                                type="button"
                                onClick={() => handleUnlinkUser(emp)}
                                title="Unlink user account"
                                style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '0 2px', fontSize: '11px', fontWeight: 800 }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingEmployee(emp);
                                setSelectedLinkUserId('');
                              }}
                              style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: '1px dashed #cbd5e1',
                                background: '#f8fafc',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                color: 'var(--primary)',
                                cursor: 'pointer',
                              }}
                            >
                              + Link User ID
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Code & Joining Date & View Profile */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-semibold">
                          {emp.id}
                        </span>
                        {emp.joiningDate && (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {emp.joiningDate}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('employee_profile', emp.rawId)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--primary)',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '2px 4px',
                        }}
                        title="Open Employee Form & Smart Buttons"
                      >
                        Form →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-muted">Showing <span className="font-semibold text-gray-800">1-{filteredEmployees.length}</span> of <span className="font-semibold text-gray-800">{employees.length}</span> employees · <span style={{ color: 'var(--secondary)' }}>FastAPI Live Sync</span></div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '580px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Add New Employee</h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Create employee master profile & link optional login credentials
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
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
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={newEmp.phone} 
                    onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} 
                    placeholder="+91 98765 43210"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Employee Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newEmp.employeeCode} 
                    onChange={e => setNewEmp({ ...newEmp, employeeCode: e.target.value.toUpperCase() })} 
                    placeholder="Auto-generated if blank (e.g. EMP0401)"
                    style={{ width: '100%' }}
                  />
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <EntityCombobox
                    value={newEmp.departmentId}
                    onChange={(id) => setNewEmp({ ...newEmp, departmentId: id ?? '' })}
                    options={departments.map(d => ({ id: d.id, label: d.name, sublabel: d.code }))}
                    placeholder="Search department…"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Job Position *</label>
                  <EntityCombobox
                    value={newEmp.positionId}
                    onChange={(id) => setNewEmp({ ...newEmp, positionId: id ?? '' })}
                    options={positions.map(p => ({ id: p.id, label: p.name, sublabel: p.code }))}
                    placeholder="Search position…"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Reporting Manager</label>
                  <EntityCombobox
                    value={newEmp.managerId}
                    onChange={(id) => setNewEmp({ ...newEmp, managerId: id ?? '' })}
                    options={employees.map(e => ({ 
                      id: e.rawId, 
                      label: `${e.name} (${e.id})`, 
                      sublabel: `${e.position} • ${e.dept}` 
                    }))}
                    placeholder="Select manager (optional)…"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Working Schedule</label>
                  <EntityCombobox
                    value={newEmp.workingScheduleId}
                    onChange={(id) => setNewEmp({ ...newEmp, workingScheduleId: id ?? '' })}
                    options={schedules.map(s => ({ id: s.id, label: s.name, sublabel: `${s.hours_per_week}h/wk (${s.calendar_type})` }))}
                    placeholder="Select schedule…"
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Link Login Account (User ID)
                </label>
                <EntityCombobox
                  value={newEmp.userId}
                  onChange={(id) => setNewEmp({ ...newEmp, userId: id ?? '' })}
                  options={availableUsers.map(u => ({
                    id: u.id,
                    label: `${u.name || (u.first_name ? `${u.first_name} ${u.last_name || ''}` : 'User')} (ID #${u.id})`,
                    sublabel: `${u.email} • Role: ${u.role || 'USER'}${u.employee_id ? ` • Already linked to EMP #${u.employee_id}` : ' • Unlinked'}`
                  }))}
                  placeholder="Select existing User account to match…"
                />
                <span style={{ display: 'block', marginTop: '5px', fontSize: '11px', color: '#64748b' }}>
                  Optional. Matches this new employee record with an existing system login User ID.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border-structural)', paddingTop: '14px' }}>
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

      {/* Quick Link User ID Modal */}
      {linkingEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Link Login Account</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Attach a User account to <strong>{linkingEmployee.name}</strong> ({linkingEmployee.id})
                </p>
              </div>
              <button 
                onClick={() => setLinkingEmployee(null)} 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleLinkUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Select User ID & Account *
                </label>
                <EntityCombobox
                  value={selectedLinkUserId}
                  onChange={(id) => setSelectedLinkUserId(id ?? '')}
                  options={availableUsers.map(u => ({
                    id: u.id,
                    label: `${u.name || (u.first_name ? `${u.first_name} ${u.last_name || ''}` : 'User')} (ID #${u.id})`,
                    sublabel: `${u.email} • Role: ${u.role || 'USER'}${u.employee_id ? ` • Currently linked to EMP #${u.employee_id}` : ' • Unlinked'}`
                  }))}
                  placeholder="Search user by name, email or ID…"
                  required
                />
                <span style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                  Select an existing system user to grant them access to this employee profile.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-structural)', paddingTop: '14px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setLinkingEmployee(null)} 
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={saving || !selectedLinkUserId}
                >
                  {saving ? 'Linking Account…' : 'Confirm Link'}
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
