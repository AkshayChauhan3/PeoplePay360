import React from 'react';

const ReportsView = ({ onNavigate }) => {
  const reportCategories = [
    {
      title: 'Headcount Reports',
      icon: '👥',
      color: '#3b123f',
      bg: '#f6f0f7',
      targetView: 'directory',
      reports: [
        { name: 'Workforce Headcount Summary', desc: 'Total employees by department, location, and type' },
        { name: 'New Joiners Report', desc: 'Employees who joined in a selected period' },
        { name: 'Active Personnel Roster', desc: 'Complete verified personnel status register' },
      ]
    },
    {
      title: 'Payroll Reports',
      icon: '💰',
      color: '#005166',
      bg: '#eef7f7',
      targetView: 'payruns',
      reports: [
        { name: 'Monthly Payroll Summary', desc: 'Gross, deductions, and net pay by department' },
        { name: 'CTC vs Actuals', desc: 'Cost-to-company vs disbursed amount analysis' },
        { name: 'Statutory PF & ESI Register', desc: 'Statutory deduction and compliance audit log' },
      ]
    },
    {
      title: 'Attendance Reports',
      icon: '📅',
      color: '#542052',
      bg: '#f6f0f7',
      targetView: 'attendance_records',
      reports: [
        { name: 'Monthly Attendance Register', desc: 'Daily attendance matrix for all employees' },
        { name: 'Punctuality & Exceptions Audit', desc: 'Employees with late arrivals or missing punches' },
        { name: 'Biometric Timesheet Ledger', desc: 'Clock-in/out timestamps and session telemetry' },
      ]
    },
    {
      title: 'Leave Reports',
      icon: '🏖️',
      color: '#064252',
      bg: '#eef7f7',
      targetView: 'time_off_requests',
      reports: [
        { name: 'Leave Balance & Allowance Ledger', desc: 'Remaining leave days per employee' },
        { name: 'Leave Utilisation by Department', desc: 'Leave taken vs entitled per category' },
        { name: 'Pending Sign-Off Register', desc: 'Leave requests awaiting manager action' },
      ]
    },
  ];

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYSTEM</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Reports & Telemetry</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Live database query reports and operational exports.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {reportCategories.map((cat, ci) => (
          <div key={ci} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-structural)', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cat.color }}>{cat.title}</span>
              </div>
              <button 
                className="btn-ghost-purple" 
                style={{ fontSize: '11px', padding: '2px 8px' }}
                onClick={() => onNavigate && onNavigate(cat.targetView)}
              >
                Open Module →
              </button>
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
                    <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', marginTop: '0.2rem', fontWeight: 600 }}>Source: Live PostgreSQL DB</div>
                  </div>
                  <div className="flex gap-2" style={{ flexShrink: 0, marginLeft: '1rem' }}>
                    <button 
                      style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'var(--surface-teal-tint)', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer' }}
                      onClick={() => onNavigate && onNavigate(cat.targetView)}
                    >
                      View Live
                    </button>
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
