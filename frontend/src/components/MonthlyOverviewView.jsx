import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const MonthlyOverviewView = () => {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [attRes, deptRes] = await Promise.allSettled([
          apiService.getAttendance(),
          apiService.getDepartments(),
        ]);
        if (attRes.status === 'fulfilled') {
          const items = attRes.value?.items || (Array.isArray(attRes.value) ? attRes.value : []);
          setRecords(items);
        }
        if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) {
          setDepartments(deptRes.value);
        }
      } catch (err) {
        console.warn('Error fetching monthly overview data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalLogs = records.length;
  const presentCount = records.filter(r => (r.status || '').toUpperCase() === 'PRESENT').length;
  const attendanceRate = totalLogs > 0 ? ((presentCount / totalLogs) * 100).toFixed(1) : '0.0';

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATTENDANCE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Monthly Overview</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Live attendance trends and departmental integrity computed from database records.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Avg Attendance Rate</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{attendanceRate}%</span>
          </div>
          <div className="kpi-subtext">Based on {totalLogs} logged records</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Logs Recorded</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalLogs}</span>
          </div>
          <div className="kpi-subtext">Timesheet entries in DB</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Present Punctual</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{presentCount}</span>
          </div>
          <div className="kpi-subtext">Punctual check-ins</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Active Departments</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{departments.length}</span>
          </div>
          <div className="kpi-subtext">Workforce units tracked</div>
        </div>
      </div>

      {loading ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span>Loading monthly attendance data from database...</span>
          </div>
        </div>
      ) : totalLogs === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No Attendance Logs in Database</div>
          <div style={{ fontSize: '0.875rem' }}>There are currently no attendance punch records stored in the database.</div>
        </div>
      ) : (
        <div className="card-panel">
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--primary)' }}>Department Attendance Summary</div>
          <div className="flex flex-col gap-3">
            {departments.map((dept, i) => (
              <div key={dept.id || i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.name}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--success)' }}>{attendanceRate}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${attendanceRate}%`, background: 'var(--success)', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MonthlyOverviewView;
