import React, { useState } from 'react';

const records = [
  { id: 'PP-1042', name: 'Ananya Sharma', dept: 'Engineering', date: '2024-01-15', checkIn: '09:02', checkOut: '18:35', hours: '9h 33m', status: 'On Time', initials: 'AS', bg: '#3b123f', color: '#fff' },
  { id: 'PP-1089', name: 'Marcus Brody', dept: 'Product & UX', date: '2024-01-15', checkIn: '09:45', checkOut: '18:00', hours: '8h 15m', status: 'Late In', initials: 'MB', bg: '#005166', color: '#fff' },
  { id: 'PP-0914', name: 'Elena Vance', dept: 'People Ops', date: '2024-01-15', checkIn: '08:30', checkOut: '19:00', hours: '10h 30m', status: 'On Time', initials: 'EV', bg: '#542052', color: '#fff' },
  { id: 'PP-1184', name: 'Vikram Sen', dept: 'Sales & Growth', date: '2024-01-15', checkIn: '--', checkOut: '--', hours: '--', status: 'Remote', initials: 'VS', bg: '#064252', color: '#fff' },
  { id: 'PP-1188', name: 'Priya Patel', dept: 'Engineering', date: '2024-01-15', checkIn: '09:00', checkOut: '18:00', hours: '9h 00m', status: 'On Time', initials: 'PP', bg: '#3b123f', color: '#fff' },
  { id: 'PP-1021', name: 'David Miller', dept: 'Operations', date: '2024-01-15', checkIn: '10:15', checkOut: '18:30', hours: '8h 15m', status: 'Late In', initials: 'DM', bg: '#005166', color: '#fff' },
  { id: 'PP-1285', name: 'Aisha Al-Mansoor', dept: 'Finance', date: '2024-01-15', checkIn: '--', checkOut: '--', hours: '--', status: 'Leave', initials: 'AA', bg: '#49636a', color: '#fff' },
];

const statusStyle = { 'On Time': { bg: '#eaf5ef', text: '#0b7a42' }, 'Late In': { bg: '#fff7ed', text: '#b45309' }, 'Remote': { bg: '#eef7f7', text: '#005166' }, 'Leave': { bg: '#f6f0f7', text: '#3b123f' } };

const AttendanceRecordsView = () => {
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? records : records.filter(r => r.status === filter);

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATTENDANCE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Attendance Records</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Daily punch-in/out logs and attendance tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Export</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Present Today', value: '212', sub: '85.5% attendance rate', color: 'var(--success)' },
          { label: 'On Leave', value: '14', sub: '8 Paid, 6 Remote Flex', color: 'var(--primary)' },
          { label: 'Late Check-ins', value: '18', sub: 'Within 30-min window', color: '#b45309' },
          { label: 'Absent', value: '22', sub: 'Unaccounted today', color: 'var(--critical)' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-4">
        {['All', 'On Time', 'Late In', 'Remote', 'Leave'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s', background: filter === s ? 'var(--primary)' : 'white', color: filter === s ? 'white' : 'var(--text-secondary)', borderColor: filter === s ? 'var(--primary)' : 'var(--border-structural)' }}>
            {s}
          </button>
        ))}
        <div className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>Showing records for <span className="font-semibold text-primary">15 Jan 2024</span></div>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const ss = statusStyle[emp.status] || { bg: '#f7fafa', text: '#49636a' };
              return (
                <tr key={emp.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.bg, color: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{emp.initials}</div>
                      <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{emp.name}</span>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{emp.id}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.dept}</td>
                  <td className="text-xs font-semibold" style={{ color: emp.checkIn === '--' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{emp.checkIn}</td>
                  <td className="text-xs font-semibold" style={{ color: emp.checkOut === '--' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{emp.checkOut}</td>
                  <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{emp.hours}</td>
                  <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{emp.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AttendanceRecordsView;
