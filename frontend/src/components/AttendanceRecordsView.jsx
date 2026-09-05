import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const statusStyle = {
  'On Time': { bg: '#eaf5ef', text: '#0b7a42' },
  'Late In': { bg: '#fff7ed', text: '#b45309' },
  'Remote': { bg: '#eef7f7', text: '#005166' },
  'Leave': { bg: '#f6f0f7', text: '#3b123f' },
  'Absent': { bg: '#fef2f2', text: '#b91c1c' },
  'Half Day': { bg: '#fef3c7', text: '#92400e' },
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
  else if (r.status === 'INCOMPLETE') statusText = 'On Time';
  else if (r.status === 'PRESENT') statusText = 'On Time';
  else if (r.status) statusText = r.status;

  const empIdCode = r.employee?.employee_code || (typeof r.employee_id === 'string' ? r.employee_id.slice(0, 8) : `EMP-${1000 + idx}`);

  return {
    id: r.id,
    empCode: empIdCode,
    name: name,
    dept: r.department || r.employee?.department?.name || 'Engineering',
    date: r.attendance_date || r.date || new Date().toISOString().split('T')[0],
    checkIn: checkInTime,
    checkOut: checkOutTime,
    hours: hours,
    rawStatus: r.status,
    status: statusText,
    initials: name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM',
    bg: idx % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
    color: '#fff',
  };
};

const AttendanceRecordsView = () => {
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
    setTimeout(() => setToastMsg(''), 3500);
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
        if (rawEmps.length > 0 && !manualForm.employeeId) {
          setManualForm(f => ({ ...f, employeeId: rawEmps[0].id }));
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

  const handlePunch = async () => {
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
    const headers = ['Employee', 'Employee Code', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
    const rows = filtered.map(r => [
      `"${r.name}"`,
      `"${r.empCode}"`,
      `"${r.dept}"`,
      `"${r.date}"`,
      `"${r.checkIn}"`,
      `"${r.checkOut}"`,
      `"${r.hours}"`,
      `"${r.status}"`
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

  // Dynamic KPI counts
  const presentCount = summary?.present_today ?? records.filter(r => r.status === 'On Time' || r.status === 'Late In').length;
  const onLeaveCount = summary?.on_leave_today ?? 0;
  const lateCount = summary?.late_today ?? records.filter(r => r.status === 'Late In').length;
  const totalEmployees = summary?.total_employees ?? records.length;
  const attendanceRate = summary?.attendance_rate !== undefined 
    ? `${summary.attendance_rate}%` 
    : (totalEmployees > 0 ? `${Math.round((presentCount / totalEmployees) * 100)}%` : '100%');

  const filtered = filter === 'All' ? records : records.filter(r => r.status === filter);

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATTENDANCE • LIVE TELEMETRY</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Attendance Records</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Live daily punch-in/out logs, biometric tracking, and presence rate.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="btn-primary" 
            onClick={handlePunch}
            disabled={punchLoading}
            style={{ background: punchedIn ? 'var(--critical, #dc2626)' : 'var(--success, #0b7a42)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {punchLoading ? 'Processing...' : (punchedIn ? '⏹️ Punch Out' : '▶️ Punch In Now')}
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
          <div className="kpi-title">On Approved Leave</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--secondary)' }}>{onLeaveCount}</span>
          </div>
          <div className="kpi-subtext">Approved time off</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Logged Headcount</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalEmployees}</span>
          </div>
          <div className="kpi-subtext">Active workforce roster</div>
        </div>
      </div>

      <div className="dashboard-filter-bar mb-4" style={{ display: 'flex', gap: '8px' }}>
        {['All', 'On Time', 'Late In', 'Half Day', 'Absent'].map(status => (
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
              cursor: 'pointer'
            }}
          >
            {status}
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading attendance logs...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No attendance records found</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      {filter !== 'All' 
                        ? 'No attendance entries match this filter.' 
                        : 'No employee check-ins recorded in the database yet. Use "+ Manual Record" to log attendance.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((emp, i) => {
                const ss = statusStyle[emp.status] || { bg: '#f7fafa', text: '#49636a' };
                return (
                  <tr key={`${emp.id}-${i}`} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.bg, color: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                          {emp.initials}
                        </div>
                        <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{emp.name}</span>
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
                    <td className="text-xs font-semibold" style={{ color: emp.checkOut === '--' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{emp.checkOut}</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{emp.hours}</td>
                    <td>
                      <span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
                <select
                  required
                  className="control-select"
                  style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                  value={manualForm.employeeId}
                  onChange={e => setManualForm({ ...manualForm, employeeId: e.target.value })}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code}) · {emp.department_name || 'Staff'}
                    </option>
                  ))}
                </select>
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
