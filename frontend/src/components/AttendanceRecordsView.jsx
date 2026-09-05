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
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [punchedIn, setPunchedIn] = useState(false);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [attRes, sumRes] = await Promise.allSettled([
          apiService.getAttendance(),
          apiService.getDashboardSummary(),
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
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
        setError(err.message || 'Unable to load attendance records.');
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceData();
  }, []);

  const handlePunch = async () => {
    try {
      if (!punchedIn) {
        await apiService.checkIn('self');
        setPunchedIn(true);
      } else {
        await apiService.checkOut('self');
        setPunchedIn(false);
      }
    } catch (err) {
      console.warn('Punch state updated locally:', err);
      setPunchedIn(!punchedIn);
    }
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
            style={{ background: punchedIn ? 'var(--critical, #dc2626)' : 'var(--success, #0b7a42)', border: 'none' }}
          >
            {punchedIn ? '⏹️ Punch Out' : '▶️ Punch In Now'}
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>Export Log</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Present Today</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--success)' }}>{presentCount}</span>
          </div>
          <div className="kpi-subtext">{attendanceRate} attendance rate</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">On Leave</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--primary)' }}>{onLeaveCount}</span>
          </div>
          <div className="kpi-subtext">Approved leave covering today</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Late Check-ins</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: '#b45309' }}>{lateCount}</span>
          </div>
          <div className="kpi-subtext">Arrived after scheduled shift</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Total Active Roster</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--secondary)' }}>{totalEmployees}</span>
          </div>
          <div className="kpi-subtext">Registered workforce headcount</div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-4">
        {['All', 'On Time', 'Late In', 'Half Day'].map(s => (
          <button 
            key={s} 
            onClick={() => setFilter(s)} 
            style={{ 
              padding: '0.35rem 0.75rem', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              cursor: 'pointer', 
              border: '1px solid', 
              transition: 'all 0.2s', 
              background: filter === s ? 'var(--primary)' : 'rgba(255, 255, 255, 0.8)', 
              color: filter === s ? 'white' : 'var(--text-secondary)', 
              borderColor: filter === s ? 'var(--primary)' : 'var(--border-structural)' 
            }}
          >
            {s}
          </button>
        ))}
        <div className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
          Showing records for <span className="font-semibold text-primary">Live Database</span>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee Code</th>
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
                        : 'No employee check-ins recorded in the database yet.'}
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
    </>
  );
};

export default AttendanceRecordsView;
