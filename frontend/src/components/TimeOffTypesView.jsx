import React from 'react';

const types = [
  { id: 'LT-001', name: 'Annual Leave', days: 24, accrual: 'Monthly', carryover: '10 days', applicable: 'All Employees', paid: true },
  { id: 'LT-002', name: 'Sick Leave', days: 12, accrual: 'Annually', carryover: 'None', applicable: 'All Employees', paid: true },
  { id: 'LT-003', name: 'Maternity Leave', days: 90, accrual: 'One-time', carryover: 'N/A', applicable: 'Female Employees', paid: true },
  { id: 'LT-004', name: 'Paternity Leave', days: 15, accrual: 'One-time', carryover: 'N/A', applicable: 'Male Employees', paid: true },
  { id: 'LT-005', name: 'Comp Off', days: 'As earned', accrual: 'Per overtime day', carryover: '60 days', applicable: 'All Employees', paid: true },
  { id: 'LT-006', name: 'Bereavement Leave', days: 5, accrual: 'Per event', carryover: 'None', applicable: 'All Employees', paid: true },
  { id: 'LT-007', name: 'Unpaid Leave', days: 'Unlimited', accrual: 'On request', carryover: 'N/A', applicable: 'All Employees', paid: false },
];

const TimeOffTypesView = () => (
  <>
    <div className="dashboard-header-strip">
      <div className="dashboard-title">
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Time Off Types</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Configure leave policies and entitlement rules.</p>
      </div>
      <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Leave Type
      </button>
    </div>

    <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Leave Type</th>
            <th>Days Allowed</th>
            <th>Accrual</th>
            <th>Carry Over</th>
            <th>Applicable To</th>
            <th>Paid</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map(t => (
            <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <td><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{t.id}</span></td>
              <td className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
              <td className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>{typeof t.days === 'number' ? `${t.days}d` : t.days}</td>
              <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.accrual}</td>
              <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.carryover}</td>
              <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.applicable}</td>
              <td><span style={{ background: t.paid ? '#eaf5ef' : '#fff2f2', color: t.paid ? 'var(--success)' : 'var(--critical)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{t.paid ? 'Paid' : 'Unpaid'}</span></td>
              <td>
                <div className="flex gap-2">
                  <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Edit</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

export default TimeOffTypesView;
