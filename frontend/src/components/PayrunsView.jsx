import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const statusStyle = {
  PAID: { bg: '#eaf5ef', text: '#0b7a42' },
  COMPUTED: { bg: '#eef7f7', text: '#005166' },
  VALIDATED: { bg: '#fff7ed', text: '#b45309' },
  DRAFT: { bg: '#f7fafa', text: '#49636a' },
  CANCELLED: { bg: '#fef2f2', text: '#b91c1c' },
};

const normalizePayrun = (pr, idx) => {
  const grossNum = typeof pr.total_gross === 'number' ? pr.total_gross : parseFloat(pr.total_gross) || 0;
  const deductionNum = typeof pr.total_deduction === 'number' ? pr.total_deduction : parseFloat(pr.total_deduction) || 0;
  const netNum = typeof pr.total_net === 'number' ? pr.total_net : parseFloat(pr.total_net) || 0;

  return {
    id: `PR-2026-${String(pr.id).padStart(3, '0')}`,
    rawId: pr.id,
    period: pr.name || `${pr.period_start} to ${pr.period_end}`,
    start: pr.period_start,
    end: pr.period_end,
    employees: pr.payslip_count !== undefined ? pr.payslip_count : (pr.payslips?.length || 0),
    rawGross: grossNum,
    rawDeductions: deductionNum,
    rawNet: netNum,
    gross: `₹${grossNum.toLocaleString('en-IN')}`,
    deductions: `₹${deductionNum.toLocaleString('en-IN')}`,
    net: `₹${netNum.toLocaleString('en-IN')}`,
    status: pr.status || 'DRAFT',
    date: pr.period_end || pr.date_end || 'Current',
  };
};

const formatCurrencyShort = (amount) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

const PayrunsView = ({ onNavigate }) => {
  const [payruns, setPayruns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [newPeriod, setNewPeriod] = useState({ 
    name: 'October 2026 Monthly Payroll Batch', 
    structure_id: '',
    start: '2026-10-01', 
    end: '2026-10-31' 
  });

  const showToast = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
  };

  const fetchPayruns = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payrunsRes, structsRes] = await Promise.allSettled([
        apiService.getPayruns(),
        apiService.getSalaryStructures(),
      ]);

      if (payrunsRes.status === 'fulfilled') {
        const raw = payrunsRes.value?.items || (Array.isArray(payrunsRes.value) ? payrunsRes.value : []);
        setPayruns(raw.map(normalizePayrun));
      }
      if (structsRes.status === 'fulfilled') {
        const structList = structsRes.value?.items || (Array.isArray(structsRes.value) ? structsRes.value : []);
        setStructures(structList);
        if (structList.length > 0 && !newPeriod.structure_id) {
          setNewPeriod(prev => ({ ...prev, structure_id: structList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch payruns:', err);
      setError(err.message || 'Unable to load payruns.');
      setPayruns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayruns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const structId = Number(newPeriod.structure_id) || (structures[0]?.id || 1);
      await apiService.createPayrun({
        name: newPeriod.name,
        salary_structure_id: structId,
        period_start: newPeriod.start,
        period_end: newPeriod.end,
      });
      showToast('success', 'Payroll batch initialized successfully in DRAFT state.');
      setShowModal(false);
      await fetchPayruns();
    } catch (err) {
      console.error('Failed to create payrun:', err);
      showToast('error', `Failed to create payrun: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompute = async (id) => {
    setProcessingId(id);
    try {
      await apiService.computePayrun(id);
      showToast('success', `Payrun batch PR-${id} computed successfully!`);
      await fetchPayruns();
    } catch (err) {
      console.error('Payrun compute error:', err);
      showToast('error', `Computation failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleValidate = async (id) => {
    setProcessingId(id);
    try {
      await apiService.validatePayrun(id);
      showToast('success', `Payrun batch PR-${id} validated and verified!`);
      await fetchPayruns();
    } catch (err) {
      console.error('Payrun validate error:', err);
      showToast('error', `Validation failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this payrun as PAID and freeze all payslip salary lines?')) return;
    setProcessingId(id);
    try {
      await apiService.markPayrunPaid(id);
      showToast('success', `Payrun batch PR-${id} successfully marked as PAID!`);
      await fetchPayruns();
    } catch (err) {
      console.error('Payrun mark-paid error:', err);
      showToast('error', `Failed to close payrun: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this payrun batch?')) return;
    setProcessingId(id);
    try {
      await apiService.cancelPayrun(id);
      showToast('success', `Payrun batch PR-${id} cancelled.`);
      await fetchPayruns();
    } catch (err) {
      console.error('Payrun cancel error:', err);
      showToast('error', `Cancel failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this draft payrun batch?')) return;
    setProcessingId(id);
    try {
      await apiService.deletePayrun(id);
      showToast('success', `Payrun batch PR-${id} deleted.`);
      await fetchPayruns();
    } catch (err) {
      console.error('Payrun delete error:', err);
      showToast('error', `Delete failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportCSV = () => {
    if (payruns.length === 0) return;
    const headers = ['Payrun ID', 'Period', 'Slips Count', 'Gross Pay', 'Deductions', 'Net Pay', 'End Date', 'Status'];
    const rows = payruns.map(p => [
      p.id,
      p.period,
      p.employees,
      p.rawGross,
      p.rawDeductions,
      p.rawNet,
      p.date,
      p.status,
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payruns_register_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Dynamic KPI computations from live payruns
  const latestPayrun = payruns[0] || null;
  const lastPaidPayrun = payruns.find(p => p.status === 'PAID') || latestPayrun;
  const latestGross = latestPayrun ? formatCurrencyShort(latestPayrun.rawGross) : '₹0';
  const lastNet = lastPaidPayrun ? formatCurrencyShort(lastPaidPayrun.rawNet) : '₹0';
  const latestDeductions = latestPayrun ? formatCurrencyShort(latestPayrun.rawDeductions) : '₹0';
  const avgNet = latestPayrun && latestPayrun.employees > 0
    ? `₹${Math.round(latestPayrun.rawNet / latestPayrun.employees).toLocaleString('en-IN')}`
    : '₹0';

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL • LIVE CYCLES</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Payruns</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Process and manage monthly payroll cycles with statutory audit compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Register
          </button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Payrun
          </button>
        </div>
      </div>

      {actionMessage.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 600,
          background: actionMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#f87171'}`,
          color: actionMessage.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{actionMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{actionMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Current Batch Gross</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{latestGross}</span>
          </div>
          <div className="kpi-subtext">{latestPayrun ? latestPayrun.period : 'No active batch'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Net Disbursed (Paid)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--success)' }}>{lastNet}</span>
          </div>
          <div className="kpi-subtext">{lastPaidPayrun ? lastPaidPayrun.period : 'Historical settlement'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Total Deductions</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--critical)' }}>{latestDeductions}</span>
          </div>
          <div className="kpi-subtext">Statutory PF + Tax + PT</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Avg. Net Salary</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ color: 'var(--primary)' }}>{avgNet}</span>
          </div>
          <div className="kpi-subtext">Per active employee payslip</div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Payrun ID</th>
              <th>Period</th>
              <th>Employees</th>
              <th>Gross Pay</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading payruns...</span>
                  </div>
                </td>
              </tr>
            ) : payruns.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No payrun cycles created</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      No payroll runs have been scheduled yet. Click "+ New Payrun" above to initialize a monthly payroll batch.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              payruns.map(pr => {
                const ss = statusStyle[pr.status] || { bg: '#f7fafa', text: '#49636a' };
                const isProcessing = processingId === pr.rawId;

                return (
                  <tr key={pr.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>{pr.id}</span></td>
                    <td className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{pr.period}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.employees} Slips</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{pr.gross}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--critical)' }}>{pr.deductions}</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--success)' }}>{pr.net}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{pr.date}</td>
                    <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{pr.status}</span></td>
                    <td>
                      <div className="flex gap-2 items-center flex-wrap">
                        {/* 1. DRAFT Actions: Compute or Delete */}
                        {pr.status === 'DRAFT' && (
                          <>
                            <button 
                              onClick={() => handleCompute(pr.rawId)}
                              disabled={isProcessing}
                              style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', background: 'var(--primary)', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                              title="Calculate payroll lines from attendance and contracts"
                            >
                              {isProcessing ? 'Computing…' : 'Compute'}
                            </button>
                            <button 
                              onClick={() => handleDelete(pr.rawId)}
                              disabled={isProcessing}
                              style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--critical)', background: '#fff2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                              title="Delete this draft payrun batch"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {/* 2. COMPUTED Actions: Validate or Cancel */}
                        {pr.status === 'COMPUTED' && (
                          <>
                            <button 
                              onClick={() => handleValidate(pr.rawId)}
                              disabled={isProcessing}
                              style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', background: '#0284c7', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                              title="Audit and validate computed payslips"
                            >
                              {isProcessing ? 'Validating…' : 'Validate'}
                            </button>
                            <button 
                              onClick={() => handleCancel(pr.rawId)}
                              disabled={isProcessing}
                              style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--critical)', background: '#fff2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {/* 3. VALIDATED Actions: Mark Paid or Cancel */}
                        {pr.status === 'VALIDATED' && (
                          <>
                            <button 
                              onClick={() => handleMarkPaid(pr.rawId)}
                              disabled={isProcessing}
                              style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', background: 'var(--success, #0b7a42)', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                              title="Finalize settlement and mark as paid"
                            >
                              {isProcessing ? 'Settling…' : 'Mark Paid'}
                            </button>
                            <button 
                              onClick={() => handleCancel(pr.rawId)}
                              disabled={isProcessing}
                              style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--critical)', background: '#fff2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {/* Payslips drill-down */}
                        <button 
                          onClick={() => onNavigate && onNavigate('payslips')}
                          style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                        >
                          Payslips →
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

      {/* New Payrun Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '460px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Initialize New Payrun Cycle</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Cycle Name / Period *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newPeriod.name} 
                  onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Salary Structure Template *</label>
                <select 
                  className="control-select" 
                  style={{ width: '100%', height: '38px' }}
                  value={newPeriod.structure_id} 
                  onChange={e => setNewPeriod({ ...newPeriod, structure_id: e.target.value })}
                >
                  {structures.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || `SS-${s.id}`})</option>
                  ))}
                  {structures.length === 0 && (
                    <option value="1">Standard Full-Time Tech Structure</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Start Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={newPeriod.start} 
                    onChange={e => setNewPeriod({ ...newPeriod, start: e.target.value })} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>End Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={newPeriod.end} 
                    onChange={e => setNewPeriod({ ...newPeriod, end: e.target.value })} 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {submitting ? 'Initializing Batch…' : 'Create Payrun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PayrunsView;
