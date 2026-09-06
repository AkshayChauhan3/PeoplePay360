import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import EntityCombobox from './EntityCombobox';

const statusStyle = {
  'On Time': { bg: '#eaf5ef', text: '#0b7a42' },
  'Late In': { bg: '#fff7ed', text: '#b45309' },
  'Remote': { bg: '#eef7f7', text: '#005166' },
  'Leave': { bg: '#f6f0f7', text: '#3b123f' },
  'Absent': { bg: '#fef2f2', text: '#b91c1c' },
  'Half Day': { bg: '#fef3c7', text: '#92400e' },
  'Incomplete': { bg: '#fef3c7', text: '#b45309' },
};

const normalizeRecord = (r, idx) => {
  const name = r.employee_name || (r.employee ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}`.trim() : `Employee #${idx + 1}`);
  const checkInTime = r.check_in ? (typeof r.check_in === 'string' && r.check_in.includes('T') ? r.check_in.split('T')[1]?.slice(0, 5) : r.check_in) : '--';
  const checkOutTime = r.check_out ? (typeof r.check_out === 'string' && r.check_out.includes('T') ? r.check_out.split('T')[1]?.slice(0, 5) : r.check_out) : '--';
  const hours = r.worked_minutes ? `${(r.worked_minutes / 60).toFixed(1)}h` : (r.net_hours ? `${r.net_hours}h` : '--');

  let statusText = 'On Time';
  if (r.status === 'LATE') statusText = 'Late In';
  else if (r.status === 'ABSENT') statusText = 'Absent';
  else if (r.status === 'HALF_DAY') statusText = 'Half Day';
  else if (r.status === 'INCOMPLETE') statusText = 'Incomplete';
  else if (r.status === 'PRESENT') statusText = 'On Time';
  else if (r.status) statusText = r.status;

  const empIdCode = r.employee?.employee_code || (typeof r.employee_id === 'string' ? r.employee_id.slice(0, 8) : `EMP-${1000 + idx}`);
  const rawEmpId = r.employee_id || r.employee?.id;

  return {
    id: r.id,
    employeeId: rawEmpId ? Number(rawEmpId) : null,
    empCode: empIdCode,
    name: name,
    dept: r.department || r.employee?.department?.name || 'Engineering',
    date: r.attendance_date || r.date || new Date().toISOString().split('T')[0],
    checkIn: checkInTime,
    checkOut: checkOutTime,
    rawCheckIn: r.check_in,
    rawCheckOut: r.check_out,
    hours: hours,
    rawStatus: r.status,
    status: statusText,
    isManualEdit: Boolean(r.is_manual_edit),
    correctionReason: r.correction_reason || null,
    initials: name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM',
    bg: idx % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
    color: '#fff',
  };
};

const AttendanceRecordsView = ({ filterEmployeeId, onClearFilter, onNavigate, currentUser }) => {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Quick Punch Modal for Admin/HR
  const [showQuickPunchModal, setShowQuickPunchModal] = useState(false);
  const [quickPunchEmpId, setQuickPunchEmpId] = useState('');
  const [quickPunchType, setQuickPunchType] = useState('IN'); // 'IN' or 'OUT'
  const [submittingQuickPunch, setSubmittingQuickPunch] = useState(false);

  // Correction Modal State (HR Manager / Admin correcting forgotten/mistaken check-in/out)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    checkInTime: '09:00',
    checkOutTime: '18:05',
    reason: 'Forgot to check out',
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: todayStr,
    checkInTime: '09:00',
    checkOutTime: '18:00',
    reason: 'Manual attendance log / Biometric bypass',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [attRes, sumRes, sessionRes, empRes] = await Promise.allSettled([
        apiService.getAttendance(),
        apiService.getDashboardSummary(),
        apiService.getAttendanceSession(),
        apiService.getEmployees({ limit: 100 }),
      ]);

      if (attRes.status === 'fulfilled') {
        const data = attRes.value;
        const raw = data?.items || data?.data || (Array.isArray(data) ? data : []);
        setRecords(raw.map(normalizeRecord));
      }

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        const sData = sumRes.value?.data || sumRes.value;
        setSummary(sData);
      }

      if (sessionRes.status === 'fulfilled' && sessionRes.value) {
        setPunchedIn(Boolean(sessionRes.value?.has_active_session));
      }

      if (empRes.status === 'fulfilled') {
        const rawEmps = empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []);
        setEmployees(rawEmps);
        if (rawEmps.length > 0) {
          if (!manualForm.employeeId) {
            setManualForm(f => ({ ...f, employeeId: rawEmps[0].id }));
          }
          if (!quickPunchEmpId) {
            setQuickPunchEmpId(rawEmps[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setError(err.message || 'Unable to load attendance records.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const handlePersonalPunch = async () => {
    setPunchLoading(true);
    try {
      if (!punchedIn) {
        await apiService.checkIn();
        setPunchedIn(true);
        showToast('Successfully checked in for today!');
      } else {
        await apiService.checkOut();
        setPunchedIn(false);
        showToast('Successfully checked out for today.');
      }
      await fetchAttendanceData();
    } catch (err) {
      console.error('Punch error:', err);
      alert(`Attendance punch error: ${err.message || 'Please ensure your account is linked to an employee profile.'}`);
    } finally {
      setPunchLoading(false);
    }
  };

  // Quick Punch on behalf of any employee (Admin / HR)
  const handleQuickPunchSubmit = async (e) => {
    e.preventDefault();
    const empId = Number(quickPunchEmpId);
    if (!empId) {
      alert('Please select an employee.');
      return;
    }
    setSubmittingQuickPunch(true);
    try {
      const nowIso = new Date().toISOString();
      if (quickPunchType === 'IN') {
        await apiService.checkIn({ employee_id: empId, timestamp: nowIso });
        showToast(`Employee #${empId} checked in successfully!`);
      } else {
        await apiService.checkOut({ employee_id: empId, timestamp: nowIso });
        showToast(`Employee #${empId} checked out successfully!`);
      }
      setShowQuickPunchModal(false);
      await fetchAttendanceData();
    } catch (err) {
      console.error('Quick punch error:', err);
      alert(`Quick punch failed: ${err.message || 'Check if employee has an open session or already checked out.'}`);
    } finally {
      setSubmittingQuickPunch(false);
    }
  };

  // Open Correction Modal
  const handleOpenCorrection = (record) => {
    setEditingRecord(record);
    setCorrectionError('');
    const cIn = record.checkIn && record.checkIn !== '--' ? record.checkIn : '09:00';
    // If checkOut is missing (INCOMPLETE), default to 18:05 as specified in workflow
    const cOut = record.checkOut && record.checkOut !== '--' ? record.checkOut : '18:05';
    const reason = record.rawStatus === 'INCOMPLETE' ? 'Forgot to check out' : (record.correctionReason || 'Shift adjustment');

    setCorrectionForm({
      checkInTime: cIn,
      checkOutTime: cOut,
      reason: reason,
    });
    setShowCorrectionModal(true);
  };

  // Submit Correction to PATCH /api/v1/attendance/{id}
  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!correctionForm.reason || correctionForm.reason.trim().length < 3) {
      setCorrectionError('Mandatory audit reason must be at least 3 characters.');
      return;
    }
    setSubmittingCorrection(true);
    setCorrectionError('');
    try {
      const checkInISO = `${editingRecord.date}T${correctionForm.checkInTime}:00Z`;
      const checkOutISO = correctionForm.checkOutTime ? `${editingRecord.date}T${correctionForm.checkOutTime}:00Z` : null;

      await apiService.updateAttendance(editingRecord.id, {
        check_in: checkInISO,
        check_out: checkOutISO,
        correction_reason: correctionForm.reason.trim(),
      });

      showToast(`Attendance for ${editingRecord.name} corrected! Worked hours & status recalculated.`);
      setShowCorrectionModal(false);
      setEditingRecord(null);
      await fetchAttendanceData();
    } catch (err) {
      console.error('Failed to correct attendance:', err);
      setCorrectionError(err.message || 'Failed to update attendance record.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmittingManual(true);
    try {
      const empId = Number(manualForm.employeeId);
      if (!empId) throw new Error('Please select an employee.');

      const checkInISO = `${manualForm.date}T${manualForm.checkInTime}:00Z`;
      const checkOutISO = manualForm.checkOutTime ? `${manualForm.date}T${manualForm.checkOutTime}:00Z` : null;

      await apiService.createManualAttendance({
        employee_id: empId,
        attendance_date: manualForm.date,
        check_in: checkInISO,
        check_out: checkOutISO,
        correction_reason: manualForm.reason.trim() || 'Manual entry',
      });

      showToast('Manual attendance record created in database!');
      setShowManualModal(false);
      await fetchAttendanceData();
    } catch (err) {
      console.error('Failed to record manual attendance:', err);
      alert(`Error creating attendance record: ${err.message || 'Validation error'}`);
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('No records to export.');
      return;
    }
    const headers = ['Employee', 'Employee Code', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Manual Edit', 'Audit Reason'];
    const rows = filtered.map(r => [
      `"${r.name}"`,
      `"${r.empCode}"`,
      `"${r.dept}"`,
      `"${r.date}"`,
      `"${r.checkIn}"`,
      `"${r.checkOut}"`,
      `"${r.hours}"`,
      `"${r.status}"`,
      `"${r.isManualEdit ? 'Yes' : 'No'}"`,
      `"${r.correctionReason || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter records by employee if filtered from Smart Button / Directory
  const baseRecords = filterEmployeeId
    ? records.filter(r => r.employeeId === Number(filterEmployeeId))
    : records;

  const filtered = filter === 'All' ? baseRecords : baseRecords.filter(r => r.status === filter);

  // Dynamic KPI counts
  const presentCount = summary?.present_today ?? records.filter(r => r.status === 'On Time' || r.status === 'Late In').length;
  const onLeaveCount = summary?.on_leave_today ?? 0;
  const lateCount = summary?.late_today ?? records.filter(r => r.status === 'Late In').length;
  const incompleteCount = records.filter(r => r.rawStatus === 'INCOMPLETE').length;
  const totalEmployees = summary?.total_employees ?? records.length;
  const attendanceRate = summary?.attendance_rate !== undefined 
    ? `${summary.attendance_rate}%` 
    : (totalEmployees > 0 ? `${Math.round((presentCount / totalEmployees) * 100)}%` : '100%');

  const filteredEmpObj = filterEmployeeId ? employees.find(e => e.id === Number(filterEmployeeId)) : null;

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATTENDANCE • LIVE TELEMETRY</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Attendance Records</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Live daily punch-in/out logs, biometric tracking, shift calculation, and manager corrections.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="btn-primary" 
            onClick={handlePersonalPunch}
            disabled={punchLoading}
            style={{ background: punchedIn ? 'var(--critical, #dc2626)' : 'var(--success, #0b7a42)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            title={punchedIn ? "Check out your personal session" : "Check in for today"}
          >
            {punchLoading ? 'Processing...' : (punchedIn ? '⏹️ Punch Out' : '▶️ Punch In Now')}
          </button>
          
          <button 
            className="btn-secondary"
            onClick={() => setShowQuickPunchModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
            title="Punch In or Out on-behalf of any employee"
          >
            ⚡ Quick Punch for Employee
          </button>

          <button 
            className="btn-secondary"
            onClick={() => setShowManualModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Manual Record
          </button>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      {/* Smart Button / Employee Filter Banner */}
      {filterEmployeeId && (
        <div style={{ 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '8px', 
          padding: '10px 16px', 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e40af' }}>
            <span style={{ fontSize: '16px' }}>⏱️</span>
            <span>
              Showing attendance records filtered for{' '}
              <strong>{filteredEmpObj ? `${filteredEmpObj.first_name} ${filteredEmpObj.last_name} (${filteredEmpObj.employee_code})` : `Employee #${filterEmployeeId}`}</strong>
            </span>
            <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {baseRecords.length} records found
            </span>
          </div>
          {onClearFilter && (
            <button 
              onClick={onClearFilter} 
              className="btn-secondary" 
              style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', background: 'white' }}
            >
              ✕ Clear Filter (Show All)
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Present Today</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--success)' }}>{presentCount}</span>
          </div>
          <div className="kpi-subtext">{attendanceRate} attendance rate</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Late Check-ins</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--accent)' }}>{lateCount}</span>
          </div>
          <div className="kpi-subtext">Past shift start window</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Missing Check-Out (Incomplete)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: incompleteCount > 0 ? '#b45309' : 'var(--text-secondary)' }}>{incompleteCount}</span>
          </div>
          <div className="kpi-subtext">Requires HR correction</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">On Approved Leave</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--secondary)' }}>{onLeaveCount}</span>
          </div>
          <div className="kpi-subtext">Approved time off</div>
        </div>
      </div>

      <div className="dashboard-filter-bar mb-4" style={{ display: 'flex', gap: '8px' }}>
        {['All', 'On Time', 'Late In', 'Incomplete', 'Half Day', 'Absent'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`filter-chip ${filter === status ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filter === status ? '1px solid var(--primary)' : '1px solid var(--border-structural)',
              background: filter === status ? 'var(--primary)' : 'white',
              color: filter === status ? 'white' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{status}</span>
            {status === 'Incomplete' && incompleteCount > 0 && (
              <span style={{ background: filter === status ? 'white' : '#fef3c7', color: filter === status ? '#b45309' : '#92400e', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700 }}>
                {incompleteCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Staff ID</th>
              <th>Department</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total Hours</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading attendance logs...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No attendance records found</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      {filter !== 'All' 
                        ? `No attendance entries match the "${filter}" filter.` 
                        : (filterEmployeeId ? 'No attendance records logged for this employee yet.' : 'No employee check-ins recorded yet.')}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((emp, i) => {
                const ss = statusStyle[emp.status] || { bg: '#f7fafa', text: '#49636a' };
                const isIncomplete = emp.rawStatus === 'INCOMPLETE';
                return (
                  <tr key={`${emp.id}-${i}`} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.bg, color: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                          {emp.initials}
                        </div>
                        <div>
                          <span 
                            className="font-bold text-[13px] hover:underline cursor-pointer" 
                            style={{ color: 'var(--text-primary)' }}
                            onClick={() => emp.employeeId && onNavigate && onNavigate('employee_profile', emp.employeeId)}
                            title="View Employee Profile"
                          >
                            {emp.name}
                          </span>
                          {emp.isManualEdit && (
                            <span 
                              style={{ marginLeft: '6px', fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}
                              title={`Manual edit: ${emp.correctionReason || 'No reason provided'}`}
                            >
                              Audit-Edited
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {emp.empCode}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.dept}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.date}</td>
                    <td className="text-xs font-semibold" style={{ color: emp.checkIn === '--' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{emp.checkIn}</td>
                    <td className="text-xs font-semibold" style={{ color: emp.checkOut === '--' ? '#b45309' : 'var(--text-primary)' }}>
                      {emp.checkOut === '--' ? (
                        <span style={{ color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                          Missing Check-Out
                        </span>
                      ) : emp.checkOut}
                    </td>
                    <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{emp.hours}</td>
                    <td>
                      <span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1">
                        {isIncomplete ? (
                          <button
                            onClick={() => handleOpenCorrection(emp)}
                            className="btn-primary"
                            style={{ 
                              padding: '3px 8px', 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              background: '#d97706', 
                              borderColor: '#b45309',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Employee forgot to check out. Click to set check-out time & reason."
                          >
                            ⚠️ Correct Check-Out
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCorrection(emp)}
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}
                            title="Edit / Correct check-in or check-out times"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ATTENDANCE CORRECTION MODAL (HR / Admin) */}
      {showCorrectionModal && editingRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '520px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                  Correct Attendance Record
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  HR Manager / Admin Attendance Correction & Telemetry Recalculation
                </p>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            {correctionError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', fontWeight: 600 }}>
                {correctionError}
              </div>
            )}

            {/* Employee & Record Info Banner */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Employee:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{editingRecord.name} ({editingRecord.empCode})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                <span style={{ fontWeight: 600 }}>{editingRecord.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current Status:</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: editingRecord.rawStatus === 'INCOMPLETE' ? '#b45309' : '#0b7a42',
                  background: editingRecord.rawStatus === 'INCOMPLETE' ? '#fef3c7' : '#eaf5ef',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  {editingRecord.status} {editingRecord.rawStatus === 'INCOMPLETE' ? '(Missing Check-Out)' : ''}
                </span>
              </div>
            </div>

            <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Check In Time *</label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={correctionForm.checkInTime}
                    onChange={e => setCorrectionForm({ ...correctionForm, checkInTime: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                    Check Out Time * {editingRecord.rawStatus === 'INCOMPLETE' ? '(Set to 18:05)' : ''}
                  </label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={correctionForm.checkOutTime}
                    onChange={e => setCorrectionForm({ ...correctionForm, checkOutTime: e.target.value })}
                    style={{ width: '100%', borderColor: editingRecord.rawStatus === 'INCOMPLETE' ? '#d97706' : undefined }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Correction Reason (Mandatory Audit Rationale) *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  className="form-input"
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="e.g. Forgot to check out / Biometric scanner timeout"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                  Required for legal and payroll compliance audit trail.
                </span>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#166534' }}>
                ℹ️ <strong>System Automation:</strong> Upon submission, the server will calculate worked hours (deducting scheduled breaks), verify late arrival against their working schedule, calculate overtime, and update status from <code>INCOMPLETE</code> to <code>PRESENT</code> or <code>LATE</code>.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCorrectionModal(false)} disabled={submittingCorrection}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingCorrection} style={{ background: 'var(--primary)' }}>
                  {submittingCorrection ? 'Recalculating...' : '✓ Save & Recalculate Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PUNCH ON-BEHALF MODAL (HR / Admin) */}
      {showQuickPunchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Quick Punch on Behalf</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Admin / HR Smart Attendance Punch</p>
              </div>
              <button onClick={() => setShowQuickPunchModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <form onSubmit={handleQuickPunchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Select Employee *</label>
                <EntityCombobox
                  value={quickPunchEmpId}
                  onChange={(id) => setQuickPunchEmpId(id ?? '')}
                  options={employees.map(emp => ({
                    id: emp.id,
                    label: `${emp.first_name} ${emp.last_name}`,
                    sublabel: `${emp.employee_code} · ${emp.department_name || 'Staff'}`
                  }))}
                  placeholder="Search employee by name, code..."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>Punch Action *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setQuickPunchType('IN')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: quickPunchType === 'IN' ? '2px solid #059669' : '1px solid var(--border-structural)',
                      background: quickPunchType === 'IN' ? '#ecfdf5' : '#f8fafc',
                      color: quickPunchType === 'IN' ? '#065f46' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ▶️ Check-In Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPunchType('OUT')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: quickPunchType === 'OUT' ? '2px solid #dc2626' : '1px solid var(--border-structural)',
                      background: quickPunchType === 'OUT' ? '#fef2f2' : '#f8fafc',
                      color: quickPunchType === 'OUT' ? '#991b1b' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⏹️ Check-Out Shift
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowQuickPunchModal(false)} disabled={submittingQuickPunch}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submittingQuickPunch}>
                  {submittingQuickPunch ? 'Punching...' : `Submit Check-${quickPunchType === 'IN' ? 'In' : 'Out'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {showManualModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Manual Attendance Entry</h3>
              <button onClick={() => setShowManualModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Select Employee *</label>
                <EntityCombobox
                  value={manualForm.employeeId}
                  onChange={(id) => setManualForm({ ...manualForm, employeeId: id ?? '' })}
                  options={employees.map(emp => ({
                    id: emp.id,
                    label: `${emp.first_name} ${emp.last_name}`,
                    sublabel: `${emp.employee_code} · ${emp.department_name || 'Staff'}`
                  }))}
                  placeholder="Search employee by name, code, or ID…"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Attendance Date *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={manualForm.date}
                  onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Check In Time *</label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={manualForm.checkInTime}
                    onChange={e => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Check Out Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={manualForm.checkOutTime}
                    onChange={e => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Reason / Audit Note</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualForm.reason}
                  onChange={e => setManualForm({ ...manualForm, reason: e.target.value })}
                  placeholder="e.g. Card malfunction / manual logging"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowManualModal(false)} disabled={submittingManual}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submittingManual}>
                  {submittingManual ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceRecordsView;
