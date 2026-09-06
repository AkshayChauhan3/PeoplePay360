import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const EmployeeProfileView = ({ employeeId, currentUser, onNavigate }) => {
  const [employee, setEmployee] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'contracts' | 'attendance' | 'timeoff'
  const [showQuickPunchModal, setShowQuickPunchModal] = useState(false);
  const [punchAction, setPunchAction] = useState('IN'); // 'IN' | 'OUT'
  const [punchTime, setPunchTime] = useState(new Date().toISOString().slice(11, 16));
  const [punchReason, setPunchReason] = useState('Profile quick punch');
  const [punching, setPunching] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // ── Edit Employee ────────────────────────────────────────────────────────────
  const CAN_EDIT_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
  const canEdit = CAN_EDIT_ROLES.includes((currentUser?.role || '').toUpperCase());

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [masterDepts, setMasterDepts] = useState([]);
  const [masterPositions, setMasterPositions] = useState([]);
  const [masterSchedules, setMasterSchedules] = useState([]);
  const [masterManagers, setMasterManagers] = useState([]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const loadMasterData = async () => {
    if (masterDataLoaded) return;
    try {
      const [dRes, pRes, sRes, mRes] = await Promise.allSettled([
        apiService.getDepartments(),
        apiService.getJobPositions(),
        apiService.getSchedules(),
        apiService.getEmployees({ limit: 500 }),
      ]);
      if (dRes.status === 'fulfilled') {
        const d = Array.isArray(dRes.value) ? dRes.value : (dRes.value?.items || []);
        setMasterDepts(d);
      }
      if (pRes.status === 'fulfilled') {
        const p = Array.isArray(pRes.value) ? pRes.value : (pRes.value?.items || []);
        setMasterPositions(p);
      }
      if (sRes.status === 'fulfilled') {
        const s = Array.isArray(sRes.value) ? sRes.value : (sRes.value?.items || []);
        setMasterSchedules(s);
      }
      if (mRes.status === 'fulfilled') {
        const m = mRes.value?.items || (Array.isArray(mRes.value) ? mRes.value : []);
        setMasterManagers(m);
      }
      setMasterDataLoaded(true);
    } catch (err) {
      console.error('Failed to load master data for edit form', err);
    }
  };

  const openEditModal = async (emp) => {
    await loadMasterData();
    setEditForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      employee_code: emp.employee_code || '',
      joining_date: emp.joining_date ? String(emp.joining_date).slice(0, 10) : '',
      status: emp.status || 'ACTIVE',
      department_id: emp.department_id ? String(emp.department_id) : '',
      job_position_id: emp.job_position_id ? String(emp.job_position_id) : '',
      manager_id: emp.manager_id ? String(emp.manager_id) : '',
      working_schedule_id: emp.working_schedule_id ? String(emp.working_schedule_id) : '',
      bank_name: emp.bank_name || '',
      bank_account_number: emp.bank_account_number || '',
      ifsc_code: emp.ifsc_code || '',
      pan_number: emp.pan_number || '',
      account_holder_name: emp.account_holder_name || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const payload = {};
      if (editForm.first_name.trim()) payload.first_name = editForm.first_name.trim();
      if (editForm.last_name.trim()) payload.last_name = editForm.last_name.trim();
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      if (editForm.phone !== undefined) payload.phone = editForm.phone.trim() || null;
      if (editForm.employee_code.trim()) payload.employee_code = editForm.employee_code.trim();
      if (editForm.joining_date) payload.joining_date = editForm.joining_date;
      if (editForm.status) payload.status = editForm.status;
      if (editForm.department_id) payload.department_id = Number(editForm.department_id);
      if (editForm.job_position_id) payload.job_position_id = Number(editForm.job_position_id);
      payload.manager_id = editForm.manager_id ? Number(editForm.manager_id) : null;
      payload.working_schedule_id = editForm.working_schedule_id ? Number(editForm.working_schedule_id) : null;
      if (editForm.bank_name !== undefined) payload.bank_name = editForm.bank_name.trim() || null;
      if (editForm.bank_account_number !== undefined) payload.bank_account_number = editForm.bank_account_number.trim() || null;
      if (editForm.ifsc_code !== undefined) payload.ifsc_code = editForm.ifsc_code.trim() || null;
      if (editForm.pan_number !== undefined) payload.pan_number = editForm.pan_number.trim() || null;
      if (editForm.account_holder_name !== undefined) payload.account_holder_name = editForm.account_holder_name.trim() || null;

      await apiService.updateEmployee(employee.id, payload);
      setShowEditModal(false);
      showToast(`✅ Employee ${editForm.first_name} ${editForm.last_name} updated successfully!`);
      await fetchProfileData(); // re-fetch live data
    } catch (err) {
      console.error('Failed to update employee:', err);
      setEditError(err.message || 'Failed to save changes. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      let targetId = employeeId;
      if (!targetId && currentUser?.employee_id) {
        targetId = currentUser.employee_id;
      }

      let emp = null;
      if (targetId) {
        emp = await apiService.getEmployeeById(targetId);
      } else {
        const empsRes = await apiService.getEmployees({ limit: 1 });
        const list = empsRes?.items || (Array.isArray(empsRes) ? empsRes : []);
        if (list.length > 0) emp = list[0];
      }

      if (!emp) {
        setEmployee(null);
        return;
      }
      setEmployee(emp);

      // Fetch smart button child records in parallel
      const [cntRes, attRes, toRes, allocRes] = await Promise.allSettled([
        apiService.getEmployeeContracts(emp.id),
        apiService.getEmployeeAttendance(emp.id, { limit: 100 }),
        apiService.getEmployeeTimeOffRequests(emp.id),
        apiService.getEmployeeLeaveAllocations(emp.id),
      ]);

      if (cntRes.status === 'fulfilled') {
        const cList = Array.isArray(cntRes.value) ? cntRes.value : (cntRes.value?.items || []);
        setContracts(cList);
      }
      if (attRes.status === 'fulfilled') {
        const aList = attRes.value?.items || (Array.isArray(attRes.value) ? attRes.value : []);
        setAttendances(aList);
      }
      if (toRes.status === 'fulfilled') {
        const tList = Array.isArray(toRes.value) ? toRes.value : (toRes.value?.items || []);
        setTimeOffRequests(tList);
      }
      if (allocRes.status === 'fulfilled') {
        const alList = Array.isArray(allocRes.value) ? allocRes.value : (allocRes.value?.items || []);
        setAllocations(alList);
      }
    } catch (err) {
      console.error('Error loading employee profile:', err);
      setError(err.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [employeeId, currentUser]);

  const handleQuickPunch = async (e) => {
    e.preventDefault();
    if (!employee) return;
    setPunching(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const isoTimestamp = `${today}T${punchTime}:00Z`;

      if (punchAction === 'IN') {
        await apiService.checkIn({
          employee_id: employee.id,
          timestamp: isoTimestamp,
        });
        showToast(`Checked in ${employee.first_name} at ${punchTime}!`);
      } else {
        await apiService.checkOut({
          employee_id: employee.id,
          timestamp: isoTimestamp,
        });
        showToast(`Checked out ${employee.first_name} at ${punchTime}!`);
      }
      setShowQuickPunchModal(false);
      await fetchProfileData();
    } catch (err) {
      console.error('Quick punch error:', err);
      alert(`Attendance punch error: ${err.message || 'Check-in/out failed.'}`);
    } finally {
      setPunching(false);
    }
  };

  if (loading) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading employee master form & smart button records...</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👤</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>No Employee Record Found</h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>There is no employee record found matching this ID in PostgreSQL.</p>
        <button className="btn-primary" onClick={() => onNavigate('directory')}>
          Back to Directory
        </button>
      </div>
    );
  }

  const fullName = employee.full_name || `${employee.first_name} ${employee.last_name}`;
  const empCode = employee.employee_code || `EMP-${employee.id}`;
  const deptName = employee.department?.name || 'Department Unassigned';
  const jobTitle = employee.job_position?.name || employee.job_title || 'Staff Member';
  const activeContract = contracts.find(c => c.status === 'RUNNING') || contracts[0];
  const pendingTimeOffCount = timeOffRequests.filter(t => (t.status || '').toUpperCase() === 'PENDING').length;
  const totalAllocatedDays = allocations.reduce((sum, a) => sum + Number(a.quantity || a.allocated_days || 0), 0);

  const statusColor = employee.status === 'ACTIVE' ? 'badge-green' : employee.status === 'ON_LEAVE' ? 'badge-amber' : 'badge-purple';

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      {/* Breadcrumb & Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <button 
            onClick={() => onNavigate('directory')}
            style={{ border: 'none', background: 'transparent', color: 'var(--secondary)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            Workforce Directory
          </button>
          <span>/</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fullName} ({empCode})</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {canEdit && (
            <button
              className="btn-primary"
              onClick={() => openEditModal(employee)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
            >
              <span>✏️</span> Edit Employee
            </button>
          )}
          <button 
            className="btn-secondary" 
            onClick={() => setShowQuickPunchModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <span>⏱</span> Quick Punch Attendance
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => onNavigate('directory')}
            style={{ fontSize: '12.5px' }}
          >
            ← Back to Directory
          </button>
        </div>
      </div>

      {/* Main Employee Form Header Card with ERP Smart Buttons */}
      <div className="card-panel mb-6" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-structural)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          {/* Left: Employee Info Block */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', minWidth: '320px', flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <div 
                style={{ 
                  width: '84px', 
                  height: '84px', 
                  borderRadius: '16px', 
                  background: 'var(--surface-purple-tint)', 
                  color: 'var(--primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 800, 
                  fontSize: '28px',
                  border: '2px solid rgba(22, 101, 52, 0.1)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                }}
              >
                {fullName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px' }}>
                <span className={`badge ${statusColor}`} style={{ fontSize: '10px', padding: '2px 7px' }}>
                  {employee.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {fullName}
                </h1>
                <span style={{ fontFamily: 'monospace', fontSize: '11.5px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#475569', fontWeight: 600 }}>
                  {empCode}
                </span>
                {employee.user_id && (
                  <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 7px', borderRadius: '6px', fontWeight: 600 }}>
                    User Account #{employee.user_id}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                {jobTitle} · <span style={{ color: '#0f766e' }}>{deptName}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 16px', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <span>{employee.email}</span>
                </div>
                {employee.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>{employee.phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <span>Manager: <strong style={{ color: 'var(--text-primary)' }}>{employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : 'Direct Report'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Joined: {employee.joining_date || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: ODOO-STYLE SMART BUTTONS BAR */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            {/* 1. Contracts Smart Button */}
            <button
              type="button"
              onClick={() => onNavigate('all_contracts', employee.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                minWidth: '110px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Open contracts filtered for this employee"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>CONTRACTS</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '3px' }}>
                {contracts.length}
              </div>
              <div style={{ fontSize: '10.5px', color: activeContract ? '#059669' : '#64748b', fontWeight: 600 }}>
                {activeContract ? activeContract.status : 'No Contract'}
              </div>
            </button>

            {/* 2. Attendance Smart Button */}
            <button
              type="button"
              onClick={() => onNavigate('attendance_records', employee.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                minWidth: '110px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Open attendance records filtered for this employee"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>ATTENDANCE</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)', marginTop: '3px' }}>
                {attendances.length}
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                Recorded Logs
              </div>
            </button>

            {/* 3. Time Off Smart Button */}
            <button
              type="button"
              onClick={() => onNavigate('time_off_requests', employee.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                minWidth: '110px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Open time off requests filtered for this employee"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>TIME OFF</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '3px' }}>
                {timeOffRequests.length}
              </div>
              <div style={{ fontSize: '10.5px', color: pendingTimeOffCount > 0 ? '#b45309' : '#64748b', fontWeight: 600 }}>
                {pendingTimeOffCount > 0 ? `${pendingTimeOffCount} Pending` : 'Requests'}
              </div>
            </button>

            {/* 4. Allocations Smart Button */}
            <button
              type="button"
              onClick={() => onNavigate('leave_allocations', employee.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                minWidth: '110px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Open leave allocations filtered for this employee"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>ALLOCATIONS</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed', marginTop: '3px' }}>
                {totalAllocatedDays}d
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                {allocations.length} Policies
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #f1f5f9', marginTop: '1.5rem', paddingTop: '1rem' }}>
          {[
            { id: 'overview', label: 'Overview & Work Details' },
            { id: 'contracts', label: `Contracts (${contracts.length})` },
            { id: 'attendance', label: `Recent Attendance (${attendances.length})` },
            { id: 'timeoff', label: `Time Off & Balances (${timeOffRequests.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview & Work Details */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Org & Position */}
          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏢</span> Organization & Reporting
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{deptName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Job Position:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{jobTitle}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reporting Manager:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : 'Direct Report (No Manager)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Working Schedule:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {employee.working_schedule?.name || 'Standard 40h (Mon-Fri)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Joining Date:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{employee.joining_date || 'Recorded'}</strong>
              </div>
            </div>
          </div>

          {/* Payroll & Banking Details */}
          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💳</span> Payroll & Bank Account
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Bank Name:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{employee.bank_name || 'HDFC Bank'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Account Number:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {employee.bank_account_number ? `•••• •••• ${employee.bank_account_number.slice(-4)}` : '501002348912'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>IFSC Code:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{employee.ifsc_code || 'HDFC0001234'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PAN Number:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{employee.pan_number || 'ABCDE1234F'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Wage:</span>
                <strong style={{ color: '#059669', fontSize: '13px' }}>
                  {activeContract ? `₹${Number(activeContract.wage || 0).toLocaleString('en-IN')}/mo` : 'No Active Wage'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contracts */}
      {activeTab === 'contracts' && (
        <div className="card-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>Employment Contracts</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>All contracts linked to {fullName}</p>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => onNavigate('all_contracts', employee.id)}
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              Open in Contracts Module →
            </button>
          </div>

          {contracts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No employment contracts recorded for this employee yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract Reference</th>
                  <th>Status</th>
                  <th>Salary Structure</th>
                  <th>Gross Wage</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td><span className="font-mono text-xs font-semibold">{c.contract_number || `#CNT-${c.id}`}</span></td>
                    <td>
                      <span className={`badge ${c.status === 'RUNNING' ? 'badge-green' : c.status === 'EXPIRED' ? 'badge-amber' : 'badge-purple'}`} style={{ fontSize: '10px' }}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-xs">{c.salary_structure?.name || 'Standard Band'}</td>
                    <td className="text-xs font-bold" style={{ color: '#059669' }}>₹{Number(c.wage || 0).toLocaleString('en-IN')}</td>
                    <td className="text-xs">{c.start_date || 'N/A'}</td>
                    <td className="text-xs">{c.end_date || 'Permanent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Recent Attendance */}
      {activeTab === 'attendance' && (
        <div className="card-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>Attendance History</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Daily biometric & manual check-in logs</p>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => onNavigate('attendance_records', employee.id)}
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              Open in Attendance Module →
            </button>
          </div>

          {attendances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No attendance logs recorded for this employee yet. Use "Quick Punch Attendance" to record today's session.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Net Hours</th>
                  <th>Status</th>
                  <th>Correction / Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendances.slice(0, 10).map(att => (
                  <tr key={att.id}>
                    <td className="text-xs font-semibold">{att.attendance_date}</td>
                    <td className="text-xs">{att.check_in ? String(att.check_in).slice(11, 16) : '--'}</td>
                    <td className="text-xs">{att.check_out ? String(att.check_out).slice(11, 16) : '--'}</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>
                      {att.worked_minutes ? `${(att.worked_minutes / 60).toFixed(1)}h` : '--'}
                    </td>
                    <td>
                      <span className={`badge ${att.status === 'PRESENT' ? 'badge-green' : att.status === 'INCOMPLETE' ? 'badge-amber' : att.status === 'LATE' ? 'badge-amber' : 'badge-purple'}`} style={{ fontSize: '10px' }}>
                        {att.status}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: '#64748b' }}>
                      {att.correction_reason || (att.is_manual_edit ? 'Manual entry' : 'System log')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Time Off & Balances */}
      {activeTab === 'timeoff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Allocations Summary */}
          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>Leave Policy Allocations</h3>
              <button 
                className="btn-secondary" 
                onClick={() => onNavigate('leave_allocations', employee.id)}
                style={{ fontSize: '12px' }}
              >
                Open Allocations Module →
              </button>
            </div>
            {allocations.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No leave allocations assigned yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {allocations.map(al => (
                  <div key={al.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {al.time_off_type?.name || 'Leave Type'}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {al.quantity || al.allocated_days || 0} Days
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Valid: {al.valid_from ? al.valid_from.slice(0, 10) : '2026-01-01'} to {al.valid_to ? al.valid_to.slice(0, 10) : '2026-12-31'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requests History */}
          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>Time Off Requests History</h3>
              <button 
                className="btn-secondary" 
                onClick={() => onNavigate('time_off_requests', employee.id)}
                style={{ fontSize: '12px' }}
              >
                Open Time Off Module →
              </button>
            </div>
            {timeOffRequests.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No time off requests filed.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {timeOffRequests.map(r => (
                    <tr key={r.id}>
                      <td className="text-xs font-semibold">{r.time_off_type?.name || 'Leave'}</td>
                      <td className="text-xs">{r.start_date || r.from_date}</td>
                      <td className="text-xs">{r.end_date || r.to_date}</td>
                      <td className="text-xs font-bold">{r.requested_quantity || r.number_of_days || 1}d</td>
                      <td>
                        <span className={`badge ${r.status === 'APPROVED' ? 'badge-green' : r.status === 'REJECTED' ? 'badge-purple' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: '#64748b' }}>{r.reason || 'Personal leave'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Employee Modal ──────────────────────────────────────────────── */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '720px', maxWidth: '100%', padding: '28px', boxShadow: '0 24px 40px rgba(0,0,0,0.18)', marginBottom: '24px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>✏️ Edit Employee</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Editing: <strong>{employee?.first_name} {employee?.last_name}</strong> · {employee?.employee_code} · Changes sync live to database
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1 }}
              >✕</button>
            </div>

            <form onSubmit={handleSaveEmployee}>
              {/* Error banner */}
              {editError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                  ⚠️ {editError}
                </div>
              )}

              {/* Section: Personal Info */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>👤</span> Personal Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>First Name *</label>
                    <input
                      type="text" required className="form-input"
                      value={editForm.first_name || ''}
                      onChange={e => handleEditField('first_name', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Last Name *</label>
                    <input
                      type="text" required className="form-input"
                      value={editForm.last_name || ''}
                      onChange={e => handleEditField('last_name', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Work Email *</label>
                    <input
                      type="email" required className="form-input"
                      value={editForm.email || ''}
                      onChange={e => handleEditField('email', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Phone</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.phone || ''}
                      onChange={e => handleEditField('phone', e.target.value)}
                      placeholder="+91 9876543210"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Employment Info */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💼</span> Employment Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Employee Code *</label>
                    <input
                      type="text" required className="form-input"
                      value={editForm.employee_code || ''}
                      onChange={e => handleEditField('employee_code', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Joining Date</label>
                    <input
                      type="date" className="form-input"
                      value={editForm.joining_date || ''}
                      onChange={e => handleEditField('joining_date', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Status</label>
                    <select
                      className="form-input"
                      value={editForm.status || 'ACTIVE'}
                      onChange={e => handleEditField('status', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Organisation */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏢</span> Organisation & Reporting
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Department</label>
                    <select
                      className="form-input"
                      value={editForm.department_id || ''}
                      onChange={e => handleEditField('department_id', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">— Select Department —</option>
                      {masterDepts.map(d => (
                        <option key={d.id} value={String(d.id)}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Job Position</label>
                    <select
                      className="form-input"
                      value={editForm.job_position_id || ''}
                      onChange={e => handleEditField('job_position_id', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">— Select Position —</option>
                      {masterPositions.map(p => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Reporting Manager</label>
                    <select
                      className="form-input"
                      value={editForm.manager_id || ''}
                      onChange={e => handleEditField('manager_id', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">— No Manager (Direct Report) —</option>
                      {masterManagers
                        .filter(m => String(m.id) !== String(employee?.id))
                        .map(m => (
                          <option key={m.id} value={String(m.id)}>
                            {m.full_name || `${m.first_name} ${m.last_name}`} ({m.employee_code})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Working Schedule</label>
                    <select
                      className="form-input"
                      value={editForm.working_schedule_id || ''}
                      onChange={e => handleEditField('working_schedule_id', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">— Default Schedule —</option>
                      {masterSchedules.map(s => (
                        <option key={s.id} value={String(s.id)}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Banking */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💳</span> Payroll & Bank Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Account Holder Name</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.account_holder_name || ''}
                      onChange={e => handleEditField('account_holder_name', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Bank Name</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.bank_name || ''}
                      onChange={e => handleEditField('bank_name', e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Account Number</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.bank_account_number || ''}
                      onChange={e => handleEditField('bank_account_number', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>IFSC Code</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.ifsc_code || ''}
                      onChange={e => handleEditField('ifsc_code', e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>PAN Number</label>
                    <input
                      type="text" className="form-input"
                      value={editForm.pan_number || ''}
                      onChange={e => handleEditField('pan_number', e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {saving ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Saving to Database…
                    </>
                  ) : (
                    <>💾 Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Attendance Punch Modal */}
      {showQuickPunchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '440px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--primary)' }}>Quick Attendance Punch</h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Punch attendance on behalf of <strong>{fullName}</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowQuickPunchModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickPunch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Punch Action *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPunchAction('IN')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: punchAction === 'IN' ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: punchAction === 'IN' ? '#ecfdf5' : '#ffffff',
                      color: punchAction === 'IN' ? '#065f46' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    ▶️ Check In
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunchAction('OUT')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: punchAction === 'OUT' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: punchAction === 'OUT' ? '#fef2f2' : '#ffffff',
                      color: punchAction === 'OUT' ? '#b91c1c' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    ⏹️ Check Out
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Punch Time (HH:MM) *</label>
                <input 
                  type="time" 
                  required 
                  className="form-input" 
                  value={punchTime} 
                  onChange={e => setPunchTime(e.target.value)} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Audit Note / Reason</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={punchReason} 
                  onChange={e => setPunchReason(e.target.value)} 
                  placeholder="e.g. Card scanner bypass"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowQuickPunchModal(false)} disabled={punching}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={punching}>
                  {punching ? 'Recording Punch…' : `Confirm ${punchAction === 'IN' ? 'Check In' : 'Check Out'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeProfileView;
