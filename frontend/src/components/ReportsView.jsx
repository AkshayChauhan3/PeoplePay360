import React from 'react';

const ReportsView = () => {
  const reportCategories = [
    {
      title: 'Headcount Reports',
      icon: '👥',
      color: '#3b123f',
      bg: '#f6f0f7',
      reports: [
        { name: 'Workforce Headcount Summary', desc: 'Total employees by department, location, and type', lastGenerated: '15 Jan 2024' },
        { name: 'New Joiners Report', desc: 'Employees who joined in a selected period', lastGenerated: '01 Jan 2024' },
        { name: 'Attrition & Exit Report', desc: 'Turnover analysis with exit reasons', lastGenerated: '31 Dec 2023' },
      ]
    },
    {
      title: 'Payroll Reports',
      icon: '💰',
      color: '#005166',
      bg: '#eef7f7',
      reports: [
        { name: 'Monthly Payroll Summary', desc: 'Gross, deductions, and net pay by department', lastGenerated: '15 Jan 2024' },
        { name: 'CTC vs Actuals', desc: 'Cost-to-company vs disbursed amount analysis', lastGenerated: '31 Dec 2023' },
        { name: 'PF & TDS Compliance', desc: 'Statutory deduction and compliance report', lastGenerated: '31 Dec 2023' },
      ]
    },
    {
      title: 'Attendance Reports',
      icon: '📅',
      color: '#542052',
      bg: '#f6f0f7',
      reports: [
        { name: 'Monthly Attendance Register', desc: 'Daily attendance matrix for all employees', lastGenerated: '31 Dec 2023' },
        { name: 'Late Arrivals Report', desc: 'Employees with habitual late check-ins', lastGenerated: '31 Dec 2023' },
        { name: 'Absenteeism Report', desc: 'Unplanned absences by department', lastGenerated: '31 Dec 2023' },
      ]
    },
    {
      title: 'Leave Reports',
      icon: '🏖',
      color: '#064252',
      bg: '#eef7f7',
      reports: [
        { name: 'Leave Balance Report', desc: 'Remaining leave days per employee', lastGenerated: '15 Jan 2024' },
        { name: 'Leave Utilisation', desc: 'Leave taken vs entitled per category', lastGenerated: '31 Dec 2023' },
        { name: 'Pending Approval Report', desc: 'Leave requests awaiting manager action', lastGenerated: '15 Jan 2024' },
      ]
    },
  ];

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYSTEM</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Reports</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Generate and download HR and payroll reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Scheduled Reports</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {reportCategories.map((cat, ci) => (
          <div key={ci} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-structural)', background: cat.bg, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cat.color }}>{cat.title}</span>
            </div>
            <div>
              {cat.reports.map((rep, ri) => (
                <div key={ri} style={{ padding: '0.9rem 1.25rem', borderBottom: ri < cat.reports.length - 1 ? '1px solid var(--border-structural)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{rep.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{rep.desc}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Last: {rep.lastGenerated}</div>
                  </div>
                  <div className="flex gap-2" style={{ flexShrink: 0, marginLeft: '1rem' }}>
                    <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'var(--surface-teal-tint)', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>Generate</button>
                    <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>PDF</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ReportsView;
