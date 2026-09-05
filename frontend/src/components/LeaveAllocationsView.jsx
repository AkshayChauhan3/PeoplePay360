import React from 'react';

const allocations = [
  { name: 'Ananya Sharma', id: 'PP-1042', dept: 'Engineering', annual: 24, sick: 12, comp: 5, used: 8, remaining: 16, initials: 'AS', bg: '#3b123f' },
  { name: 'Marcus Brody', id: 'PP-1089', dept: 'Product & UX', annual: 24, sick: 12, comp: 3, used: 15, remaining: 9, initials: 'MB', bg: '#005166' },
  { name: 'Elena Vance', id: 'PP-0914', dept: 'People Ops', annual: 30, sick: 12, comp: 8, used: 10, remaining: 20, initials: 'EV', bg: '#542052' },
  { name: 'Vikram Sen', id: 'PP-1184', dept: 'Sales & Growth', annual: 24, sick: 12, comp: 2, used: 6, remaining: 18, initials: 'VS', bg: '#064252' },
  { name: 'Priya Patel', id: 'PP-1188', dept: 'Engineering', annual: 24, sick: 12, comp: 4, used: 12, remaining: 12, initials: 'PP', bg: '#3b123f' },
  { name: 'David Miller', id: 'PP-1021', dept: 'Operations', annual: 24, sick: 12, comp: 1, used: 3, remaining: 21, initials: 'DM', bg: '#005166' },
];

const LeaveAllocationsView = () => (
  <>
    <div className="dashboard-header-strip">
      <div className="dashboard-title">
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Leave Allocations</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Track and manage leave balances per employee.</p>
      </div>
      <div className="flex items-center gap-2">
        <select className="control-select"><option>FY 2023–24</option></select>
        <button className="btn-secondary">Export</button>
        <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Allocate Leave</button>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Employees', value: '248', sub: 'Active headcount' },
        { label: 'Avg. Used Leaves', value: '8.1d', sub: 'Per employee YTD' },
        { label: 'Avg. Remaining', value: '15.9d', sub: 'Per employee' },
        { label: 'Leaves Expiring', value: '34', sub: 'End of quarter' },
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
            <th>Annual Leave</th>
            <th>Sick Leave</th>
            <th>Comp Off</th>
            <th>Used</th>
            <th>Remaining</th>
            <th>Utilisation</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map(emp => {
            const total = emp.annual + emp.sick + emp.comp;
            const pct = Math.round((emp.used / emp.annual) * 100);
            return (
              <tr key={emp.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: emp.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{emp.initials}</div>
                    <div>
                      <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{emp.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.dept}</div>
                    </div>
                  </div>
                </td>
                <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.annual}d</td>
                <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.sick}d</td>
                <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.comp}d</td>
                <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{emp.used}d</td>
                <td className="text-xs font-bold" style={{ color: emp.remaining < 8 ? 'var(--critical)' : 'var(--success)' }}>{emp.remaining}d</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: '6px', background: 'var(--surface-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--critical)' : pct > 50 ? 'var(--secondary)' : 'var(--success)', borderRadius: '4px' }}></div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)', minWidth: '30px' }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);

export default LeaveAllocationsView;
