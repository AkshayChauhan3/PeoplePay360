import React from 'react';

const payruns = [
  { id: 'PR-2024-012', period: 'December 2023', employees: 248, gross: '₹1,24,80,000', deductions: '₹18,72,000', net: '₹1,06,08,000', status: 'Completed', date: '31 Dec 2023' },
  { id: 'PR-2024-011', period: 'November 2023', employees: 246, gross: '₹1,23,00,000', deductions: '₹18,45,000', net: '₹1,04,55,000', status: 'Completed', date: '30 Nov 2023' },
  { id: 'PR-2024-010', period: 'October 2023', employees: 244, gross: '₹1,22,00,000', deductions: '₹18,30,000', net: '₹1,03,70,000', status: 'Completed', date: '31 Oct 2023' },
  { id: 'PR-2024-013', period: 'January 2024', employees: 248, gross: '₹1,25,50,000', deductions: '₹18,82,500', net: '₹1,06,67,500', status: 'In Progress', date: '31 Jan 2024' },
];

const statusStyle = { Completed: { bg: '#eaf5ef', text: '#0b7a42' }, 'In Progress': { bg: '#fff7ed', text: '#b45309' }, Draft: { bg: '#f7fafa', text: '#49636a' } };

const PayrunsView = () => (
  <>
    <div className="dashboard-header-strip">
      <div className="dashboard-title">
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Payruns</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Process and manage monthly payroll cycles.</p>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary">Export</button>
        <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>+ New Payrun</button>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Current Month Gross', value: '₹1.25Cr', sub: 'Jan 2024 payrun' },
        { label: 'Net Disbursed (Dec)', value: '₹1.06Cr', sub: 'Last completed payrun' },
        { label: 'Total Deductions', value: '₹18.8L', sub: 'TDS + PF + ESI' },
        { label: 'Avg. Net Salary', value: '₹43,013', sub: 'Per employee' },
      ].map((kpi, i) => (
        <div key={i} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{kpi.value}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.sub}</div>
        </div>
      ))}
    </div>

    <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Payrun ID</th>
            <th>Period</th>
            <th>Employees</th>
            <th>Gross Pay</th>
            <th>Deductions</th>
            <th>Net Pay</th>
            <th>Processed On</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payruns.map(pr => {
            const ss = statusStyle[pr.status] || {};
            return (
              <tr key={pr.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{pr.id}</span></td>
                <td className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{pr.period}</td>
                <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.employees}</td>
                <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.gross}</td>
                <td className="text-xs" style={{ color: 'var(--critical)' }}>{pr.deductions}</td>
                <td className="text-xs font-bold" style={{ color: 'var(--success)' }}>{pr.net}</td>
                <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pr.date}</td>
                <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{pr.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>View</button>
                    {pr.status === 'In Progress' && <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', background: 'var(--primary)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Process</button>}
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

export default PayrunsView;
