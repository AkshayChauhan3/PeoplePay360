import React from 'react';

const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const monthlyData = [
  { month: 'Apr', present: 91, absent: 5, late: 4 },
  { month: 'May', present: 89, absent: 7, late: 4 },
  { month: 'Jun', present: 87, absent: 8, late: 5 },
  { month: 'Jul', present: 90, absent: 5, late: 5 },
  { month: 'Aug', present: 88, absent: 6, late: 6 },
  { month: 'Sep', present: 85, absent: 9, late: 6 },
  { month: 'Oct', present: 92, absent: 4, late: 4 },
  { month: 'Nov', present: 90, absent: 5, late: 5 },
  { month: 'Dec', present: 84, absent: 10, late: 6 },
  { month: 'Jan', present: 86, absent: 8, late: 6 },
  { month: 'Feb', present: 88, absent: 7, late: 5 },
  { month: 'Mar', present: 91, absent: 5, late: 4 },
];

const deptAttendance = [
  { dept: 'Engineering', rate: 91.2, employees: 42 },
  { dept: 'Sales & Growth', rate: 88.5, employees: 31 },
  { dept: 'Operations', rate: 87.0, employees: 23 },
  { dept: 'Product & UX', rate: 93.1, employees: 18 },
  { dept: 'People Ops', rate: 95.0, employees: 12 },
  { dept: 'Finance', rate: 89.4, employees: 9 },
];

const MonthlyOverviewView = () => (
  <>
    <div className="dashboard-header-strip">
      <div className="dashboard-title">
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATTENDANCE</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Monthly Overview</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>FY 2023–24 attendance trends and departmental breakdown.</p>
      </div>
      <div className="flex items-center gap-2">
        <select className="control-select"><option>FY 2023–24</option><option>FY 2022–23</option></select>
        <button className="btn-secondary">Export Report</button>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Avg Attendance Rate', value: '88.9%', sub: 'Across all departments' },
        { label: 'Total Working Days', value: '264', sub: 'FY 2023–24' },
        { label: 'Peak Month', value: 'Oct', sub: '92% attendance' },
        { label: 'Lowest Month', value: 'Dec', sub: '84% attendance' },
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

    {/* Bar Chart */}
    <div className="card-panel mb-6">
      <div className="font-bold text-sm mb-4" style={{ color: 'var(--primary)' }}>Monthly Attendance Rate (%)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '160px' }}>
        {monthlyData.map((m, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.present}%</div>
            <div style={{ width: '100%', background: i === 9 ? 'var(--secondary)' : 'var(--surface-teal-tint)', borderRadius: '3px 3px 0 0', height: `${m.present * 1.4}px`, transition: 'height 0.3s' }}></div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.month}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Department Breakdown */}
    <div className="card-panel">
      <div className="font-bold text-sm mb-4" style={{ color: 'var(--primary)' }}>Department Attendance Rate</div>
      <div className="flex flex-col gap-3">
        {deptAttendance.sort((a, b) => b.rate - a.rate).map((dept, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{dept.dept}</span>
              <span className="text-xs font-bold" style={{ color: dept.rate >= 90 ? 'var(--success)' : dept.rate >= 85 ? 'var(--secondary)' : 'var(--critical)' }}>{dept.rate}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--surface-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${dept.rate}%`, background: dept.rate >= 90 ? 'var(--success)' : dept.rate >= 85 ? 'var(--secondary)' : 'var(--critical)', borderRadius: '4px', transition: 'width 0.5s' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

export default MonthlyOverviewView;
