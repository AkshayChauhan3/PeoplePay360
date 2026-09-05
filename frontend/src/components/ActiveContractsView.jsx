import React from 'react';

const ActiveContractsView = ({ onNavigate }) => {
  const contracts = [
    { id: 'CNT-2024-0891', name: 'Ananya Sharma', dept: 'Engineering', type: 'Standard Executive', start: '01 Jul 2022', end: '30 Jun 2025', gross: '₹2,15,000/mo', status: 'Active', daysLeft: 184, initials: 'AS', bg: '#3b123f' },
    { id: 'CNT-2024-0892', name: 'Marcus Brody', dept: 'Product & UX', type: 'Standard Employment', start: '15 Apr 2021', end: '14 Apr 2024', gross: '₹1,65,000/mo', status: 'Expiring Soon', daysLeft: 32, initials: 'MB', bg: '#005166' },
    { id: 'CNT-2024-0893', name: 'Elena Vance', dept: 'People Ops', type: 'Executive Agreement', start: '01 Jan 2022', end: '31 Dec 2025', gross: '₹3,50,000/mo', status: 'Active', daysLeft: 364, initials: 'EV', bg: '#542052' },
    { id: 'CNT-2024-0894', name: 'Vikram Sen', dept: 'Sales & Growth', type: 'Sales Commission', start: '01 Mar 2023', end: '28 Feb 2025', gross: '₹2,80,000/mo', status: 'Active', daysLeft: 290, initials: 'VS', bg: '#064252' },
    { id: 'CNT-2024-0895', name: 'Priya Patel', dept: 'Engineering', type: 'Standard Employment', start: '12 Aug 2022', end: '11 Aug 2024', gross: '₹1,75,000/mo', status: 'Expiring Soon', daysLeft: 14, initials: 'PP', bg: '#3b123f' },
    { id: 'CNT-2024-0896', name: 'David Miller', dept: 'Operations', type: 'Standard Employment', start: '05 Sep 2021', end: '04 Sep 2024', gross: '₹1,95,000/mo', status: 'Active', daysLeft: 237, initials: 'DM', bg: '#005166' },
  ];

  const statusStyle = { Active: { bg: '#eaf5ef', text: '#0b7a42' }, 'Expiring Soon': { bg: '#fff7ed', text: '#b45309' } };

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONTRACTS</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Active Contracts</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>All currently running employment agreements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Export</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Active', value: '4', sub: 'Fully running contracts' },
          { label: 'Expiring Soon', value: '2', sub: 'Within 60 days' },
          { label: 'Avg. Contract Value', value: '₹2.3L/mo', sub: 'Monthly gross basis' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-title">{kpi.label}</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{kpi.value}</span>
            </div>
            <div className="kpi-subtext">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Contract ID</th>
              <th>Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Days Left</th>
              <th>Gross/Month</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => {
              const ss = statusStyle[c.status] || {};
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('contract_detail')}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{c.initials}</div>
                      <div>
                        <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.dept}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{c.id}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.type}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.start}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.end}</td>
                  <td className="text-xs font-bold" style={{ color: c.daysLeft < 60 ? '#b45309' : 'var(--secondary)' }}>{c.daysLeft}d</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.gross}</td>
                  <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{c.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ActiveContractsView;
