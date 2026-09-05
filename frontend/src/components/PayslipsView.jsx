import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const statusStyle = {
  PAID: { bg: '#eaf5ef', text: '#0b7a42' },
  CONFIRMED: { bg: '#e0f2fe', text: '#0369a1' },
  COMPUTED: { bg: '#fef3c7', text: '#b45309' },
  DRAFT: { bg: '#f3f4f6', text: '#4b5563' },
  Generated: { bg: '#eaf5ef', text: '#0b7a42' },
  Pending: { bg: '#fff7ed', text: '#b45309' },
};

const normalizePayslip = (ps, idx) => {
  const empName = ps.employee_name || (ps.employee ? `${ps.employee.first_name} ${ps.employee.last_name}` : `Employee #${idx + 1}`);
  const monthStr = ps.period_start
    ? new Date(ps.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Monthly Payrun';
  const grossNum = Number(ps.gross_amount ?? ps.gross_wage ?? 0);
  const dedNum = Number(ps.deduction_amount ?? ps.total_deductions ?? 0);
  const netNum = Number(ps.net_amount ?? ps.net_wage ?? (grossNum - dedNum));
  const rawStatus = (ps.status || ps.state || 'DRAFT').toUpperCase();

  return {
    id: `PS-${String(ps.id || idx + 1).padStart(4, '0')}`,
    rawId: ps.id,
    name: empName,
    empId: ps.employee_id ? String(ps.employee_id).slice(0, 8) : `PP-${1000 + idx}`,
    dept: ps.department || ps.dept || (ps.employee?.department?.name || 'General'),
    month: monthStr,
    grossNum,
    dedNum,
    netNum,
    gross: `₹${grossNum.toLocaleString('en-IN')}`,
    deductions: `₹${dedNum.toLocaleString('en-IN')}`,
    net: `₹${netNum.toLocaleString('en-IN')}`,
    status: rawStatus === 'PAID' ? 'Generated' : (rawStatus === 'COMPUTED' ? 'Computed' : rawStatus),
    rawStatus,
    initials: empName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
    bg: idx % 2 === 0 ? '#3b123f' : '#005166',
    lines: ps.lines || [],
  };
};

const PayslipsView = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchPayslips = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPayslips();
      const items = data?.items || (Array.isArray(data) ? data : []);
      setPayslips(items.map(normalizePayslip));
    } catch (err) {
      console.error('Failed to fetch payslips:', err);
      setError(err.message || 'Unable to load payslips.');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handleDownloadPdf = async (slip) => {
    if (!slip?.rawId) return;
    setDownloadingId(slip.rawId);
    try {
      const safeName = `${slip.name.replace(/[^a-zA-Z0-9]/g, '_')}_${slip.month.replace(/\s+/g, '_')}.pdf`;
      await apiService.downloadPayslipPdf(slip.rawId, safeName);
      showToast(`Payslip PDF for ${slip.name} downloaded successfully!`);
    } catch (err) {
      console.error('Download PDF error:', err);
      showToast(`Failed to download PDF: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportStatement = () => {
    if (filteredPayslips.length === 0) return;
    const headers = ['Payslip ID', 'Employee', 'Employee Code', 'Department', 'Cycle Period', 'Gross Amount', 'Deductions', 'Net Disbursed', 'Status'];
    const rows = filteredPayslips.map(ps => [
      ps.id,
      ps.name,
      ps.empId,
      ps.dept,
      ps.month,
      ps.grossNum,
      ps.dedNum,
      ps.netNum,
      ps.status,
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslips_statement_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueMonths = Array.from(new Set(payslips.map(p => p.month))).filter(Boolean);
  const filteredPayslips = monthFilter === 'ALL' 
    ? payslips 
    : payslips.filter(p => p.month === monthFilter);

  const generatedCount = filteredPayslips.filter(p => p.status === 'Generated' || p.rawStatus === 'PAID').length;
  const pendingCount = filteredPayslips.length - generatedCount;

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
            <option value="ALL">All Pay Cycles ({payslips.length})</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={handleExportStatement}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Statement
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 600,
          background: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Payslips', value: filteredPayslips.length, sub: monthFilter === 'ALL' ? 'Across all cycles' : `Cycle: ${monthFilter}` },
          { label: 'Generated / Paid', value: generatedCount, sub: `${filteredPayslips.length > 0 ? ((generatedCount / filteredPayslips.length) * 100).toFixed(0) : 0}% processed` },
          { label: 'Pending / Computed', value: pendingCount, sub: 'Awaiting disbursement' },
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
              <th>Payslip ID</th>
              <th>Cycle Period</th>
              <th>Gross Amount</th>
              <th>Deductions</th>
              <th>Net Disbursed</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading payslips...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPayslips.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No payslips found in database</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      No payslips found matching this cycle in the database. Run a payrun computation to generate individual employee payslips.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayslips.map(ps => {
                const ss = statusStyle[ps.rawStatus] || statusStyle[ps.status] || { bg: '#f3f4f6', text: '#4b5563' };
                const isDownloading = downloadingId === ps.rawId;

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
                    <td className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{ps.month}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{ps.gross}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--critical)' }}>{ps.deductions}</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--success)' }}>{ps.net}</td>
                    <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{ps.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedSlip(ps)}
                          style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                        >
                          Breakdown
                        </button>
                        <button 
                          onClick={() => handleDownloadPdf(ps)}
                          disabled={isDownloading}
                          style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', background: 'var(--primary)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: isDownloading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Stream official ReportLab PDF from FastAPI backend"
                        >
                          {isDownloading ? '…' : '📄 PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payslip Modal */}
      {selectedSlip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '520px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{selectedSlip.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedSlip.empId} • {selectedSlip.dept} • {selectedSlip.month}</div>
              </div>
              <button onClick={() => setSelectedSlip(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f7fafa', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Gross Wage</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSlip.gross}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff2f2', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--critical)' }}>Total Deductions</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--critical)' }}>- {selectedSlip.deductions}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-teal-tint)', borderRadius: '6px', border: '1px solid var(--color-secondary)' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>Net Disbursed</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--secondary)' }}>{selectedSlip.net}</span>
              </div>

              {selectedSlip.lines && selectedSlip.lines.length > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-structural)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Itemized Salary Lines ({selectedSlip.lines.length})
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedSlip.lines.map((line, li) => (
                      <div key={line.id || li} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: '#fcfcfc', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{line.name || line.code}</span>
                        <span style={{ fontWeight: 600, color: (line.category || '').toUpperCase().includes('DEDUCTION') ? 'var(--critical)' : 'var(--text-primary)' }}>
                          ₹{Number(line.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setSelectedSlip(null)}>Close</button>
              <button 
                className="btn-primary" 
                onClick={() => handleDownloadPdf(selectedSlip)}
                disabled={downloadingId === selectedSlip.rawId}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {downloadingId === selectedSlip.rawId ? 'Downloading…' : 'Download Official PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PayslipsView;
