import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackPayslips = [
  { id: 'PS-2024-01-1042', name: 'Ananya Sharma', empId: 'PP-1042', dept: 'Engineering', month: 'January 2024', gross: '₹2,15,000', deductions: '₹32,250', net: '₹1,82,750', status: 'Generated', initials: 'AS', bg: '#3b123f' },
  { id: 'PS-2024-01-1089', name: 'Marcus Brody', empId: 'PP-1089', dept: 'Product & UX', month: 'January 2024', gross: '₹1,65,000', deductions: '₹24,750', net: '₹1,40,250', status: 'Generated', initials: 'MB', bg: '#005166' },
  { id: 'PS-2024-01-0914', name: 'Elena Vance', empId: 'PP-0914', dept: 'People Ops', month: 'January 2024', gross: '₹3,50,000', deductions: '₹52,500', net: '₹2,97,500', status: 'Generated', initials: 'EV', bg: '#542052' },
  { id: 'PS-2024-01-1184', name: 'Vikram Sen', empId: 'PP-1184', dept: 'Sales & Growth', month: 'January 2024', gross: '₹2,80,000', deductions: '₹42,000', net: '₹2,38,000', status: 'Generated', initials: 'VS', bg: '#064252' },
  { id: 'PS-2024-01-1188', name: 'Priya Patel', empId: 'PP-1188', dept: 'Engineering', month: 'January 2024', gross: '₹1,75,000', deductions: '₹26,250', net: '₹1,48,750', status: 'Pending', initials: 'PP', bg: '#3b123f' },
  { id: 'PS-2024-01-1021', name: 'David Miller', empId: 'PP-1021', dept: 'Operations', month: 'January 2024', gross: '₹1,95,000', deductions: '₹29,250', net: '₹1,65,750', status: 'Pending', initials: 'DM', bg: '#005166' },
];

const statusStyle = { Generated: { bg: '#eaf5ef', text: '#0b7a42' }, Pending: { bg: '#fff7ed', text: '#b45309' } };

const normalizePayslip = (ps, idx) => ({
  id: ps.payslip_number || ps.id || `PS-2024-01-${1000 + idx}`,
  name: ps.employee_name || ps.name || 'Employee',
  empId: ps.employee_id || ps.empId || `PP-${1000 + idx}`,
  dept: ps.department || ps.dept || 'Engineering',
  month: ps.month || 'January 2024',
  gross: ps.gross_wage ? `₹${ps.gross_wage.toLocaleString('en-IN')}` : (ps.gross || '₹1,80,000'),
  deductions: ps.total_deductions ? `₹${ps.total_deductions.toLocaleString('en-IN')}` : (ps.deductions || '₹25,000'),
  net: ps.net_wage ? `₹${ps.net_wage.toLocaleString('en-IN')}` : (ps.net || '₹1,55,000'),
  status: ps.state === 'PAID' ? 'Generated' : (ps.status || 'Generated'),
  initials: ps.initials || (ps.employee_name ? ps.employee_name.split(' ').map(n=>n[0]).join('') : 'EM'),
  bg: idx % 2 === 0 ? '#3b123f' : '#005166',
});

const PayslipsView = () => {
  const [payslips, setPayslips] = useState(fallbackPayslips);
  const [monthFilter, setMonthFilter] = useState('January 2024');
  const [selectedSlip, setSelectedSlip] = useState(null);

  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        const data = await apiService.getPayslips();
        if (Array.isArray(data) && data.length > 0) {
          setPayslips(data.map(normalizePayslip));
        }
      } catch (err) {
        console.warn('Using fallback payslips:', err);
      }
    };
    fetchPayslips();
  }, []);

  const generatedCount = payslips.filter(p => p.status === 'Generated').length;
  const pendingCount = payslips.filter(p => p.status === 'Pending').length;

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Payslips</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>View and distribute individual employee payslips.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="control-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
            <option>January 2024</option>
            <option>December 2023</option>
            <option>November 2023</option>
          </select>
          <button className="btn-secondary">Export All</button>
          <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Send All</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Payslips', value: payslips.length, sub: `For ${monthFilter}` },
          { label: 'Generated', value: generatedCount, sub: `${((generatedCount / (payslips.length || 1)) * 100).toFixed(0)}% complete` },
          { label: 'Pending', value: pendingCount, sub: 'Awaiting processing' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{kpi.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Payslip ID</th>
              <th>Month</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map(ps => {
              const ss = statusStyle[ps.status] || {};
              return (
                <tr key={ps.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: ps.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{ps.initials}</div>
                      <div>
                        <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{ps.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ps.dept}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.65rem', background: '#f7fafa', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>{ps.id}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ps.month}</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{ps.gross}</td>
                  <td className="text-xs" style={{ color: 'var(--critical)' }}>{ps.deductions}</td>
                  <td className="text-xs font-bold" style={{ color: 'var(--success)' }}>{ps.net}</td>
                  <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{ps.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedSlip(ps)}
                        style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                      >
                        View Breakdown
                      </button>
                      <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>PDF</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Payslip Modal */}
      {selectedSlip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{selectedSlip.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedSlip.empId} • {selectedSlip.dept} • {selectedSlip.month}</div>
              </div>
              <button onClick={() => setSelectedSlip(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f7fafa', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Gross Salary</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSlip.gross}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff2f2', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--critical)' }}>Statutory Deductions (PF/TDS)</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--critical)' }}>- {selectedSlip.deductions}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--surface-teal-tint)', borderRadius: '6px', border: '1px solid var(--color-secondary)' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>Net Disbursed</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--secondary)' }}>{selectedSlip.net}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setSelectedSlip(null)}>Close</button>
              <button className="btn-primary" onClick={() => alert(`Downloading Payslip PDF for ${selectedSlip.name}`)}>Download Official PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PayslipsView;
