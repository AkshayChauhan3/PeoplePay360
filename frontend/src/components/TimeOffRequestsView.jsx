import React, { useState } from 'react';

const requests = [
  { id: 'TOR-001', name: 'Marcus Brody', dept: 'Product & UX', type: 'Annual Leave', from: '22 Jan 2024', to: '26 Jan 2024', days: 5, status: 'Pending', reason: 'Family vacation', initials: 'MB', bg: '#005166' },
  { id: 'TOR-002', name: 'Priya Patel', dept: 'Engineering', type: 'Sick Leave', from: '15 Jan 2024', to: '16 Jan 2024', days: 2, status: 'Approved', reason: 'Medical appointment', initials: 'PP', bg: '#3b123f' },
  { id: 'TOR-003', name: 'Vikram Sen', dept: 'Sales & Growth', type: 'Comp Off', from: '18 Jan 2024', to: '18 Jan 2024', days: 1, status: 'Approved', reason: 'Weekend work compensation', initials: 'VS', bg: '#064252' },
  { id: 'TOR-004', name: 'David Miller', dept: 'Operations', type: 'Annual Leave', from: '05 Feb 2024', to: '12 Feb 2024', days: 6, status: 'Pending', reason: 'International travel', initials: 'DM', bg: '#005166' },
  { id: 'TOR-005', name: 'Aisha Al-Mansoor', dept: 'Finance', type: 'Maternity Leave', from: '01 Mar 2024', to: '31 May 2024', days: 90, status: 'Approved', reason: 'Maternity leave', initials: 'AA', bg: '#49636a' },
  { id: 'TOR-006', name: 'Ananya Sharma', dept: 'Engineering', type: 'Annual Leave', from: '10 Feb 2024', to: '14 Feb 2024', days: 5, status: 'Rejected', reason: 'Project deadline conflict', initials: 'AS', bg: '#3b123f' },
];

const statusStyle = {
  Pending: { bg: '#fff7ed', text: '#b45309' },
  Approved: { bg: '#eaf5ef', text: '#0b7a42' },
  Rejected: { bg: '#fff2f2', text: '#b71c1c' },
};

const TimeOffRequestsView = () => {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Leave Requests</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Review and manage employee time-off requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Export</button>
          <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>+ New Request</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Approval', value: '2', color: '#b45309', bg: '#fff7ed' },
          { label: 'Approved This Month', value: '18', color: 'var(--success)', bg: '#eaf5ef' },
          { label: 'Rejected', value: '3', color: 'var(--critical)', bg: '#fff2f2' },
          { label: 'On Leave Today', value: '14', color: 'var(--secondary)', bg: 'var(--surface-teal-tint)' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: kpi.bg, border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: kpi.color, opacity: 0.8 }}>{kpi.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s', background: filter === s ? 'var(--primary)' : 'white', color: filter === s ? 'white' : 'var(--text-secondary)', borderColor: filter === s ? 'var(--primary)' : 'var(--border-structural)' }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              {filter === 'Pending' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(req => {
              const ss = statusStyle[req.status] || {};
              return (
                <tr key={req.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: req.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{req.initials}</div>
                      <div>
                        <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{req.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{req.dept}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{req.type}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{req.from}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{req.to}</td>
                  <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{req.days}d</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '200px' }}>{req.reason}</td>
                  <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{req.status}</span></td>
                  {filter === 'Pending' && req.status === 'Pending' && (
                    <td>
                      <div className="flex gap-2">
                        <button style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                        <button style={{ background: '#fff2f2', color: 'var(--critical)', border: '1px solid var(--critical)', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TimeOffRequestsView;
