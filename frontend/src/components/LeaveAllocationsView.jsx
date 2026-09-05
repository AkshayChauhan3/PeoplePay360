import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const LeaveAllocationsView = () => {
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    employeeId: '',
    typeId: '',
    quantity: 18,
    validFrom: `${currentYear}-01-01`,
    validTo: `${currentYear}-12-31`,
    notes: 'Annual leave allocation quota',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchAllocationsData = async () => {
    setLoading(true);
    try {
      const [allocRes, empRes, typesRes] = await Promise.allSettled([
        apiService.getAllocations(),
        apiService.getEmployees({ limit: 100 }),
        apiService.getTimeOffTypes(),
      ]);

      if (allocRes.status === 'fulfilled') {
        const raw = allocRes.value;
        setAllocations(Array.isArray(raw) ? raw : (raw?.items || []));
      }

      if (empRes.status === 'fulfilled') {
        const rawEmps = empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []);
        setEmployees(rawEmps);
        if (rawEmps.length > 0 && !formData.employeeId) {
          setFormData(f => ({ ...f, employeeId: rawEmps[0].id }));
        }
      }

      if (typesRes.status === 'fulfilled') {
        const rawTypes = Array.isArray(typesRes.value) ? typesRes.value : (typesRes.value?.items || []);
        setLeaveTypes(rawTypes);
        if (rawTypes.length > 0 && !formData.typeId) {
          setFormData(f => ({ ...f, typeId: rawTypes[0].id }));
        }
      }
    } catch (err) {
      console.warn('Error fetching leave allocations:', err);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocationsData();
  }, []);

  const handleGrant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const empId = Number(formData.employeeId);
      const typeId = Number(formData.typeId) || (leaveTypes[0]?.id || 1);
      if (!empId) {
        throw new Error('Please select an employee.');
      }

      await apiService.createAllocation({
        employee_id: empId,
        time_off_type_id: typeId,
        allocation_quantity: Number(formData.quantity) || 1,
        valid_from: formData.validFrom,
        valid_to: formData.validTo,
        notes: formData.notes.trim() || undefined,
      });

      showToast('Leave allocation granted successfully in PostgreSQL!');
      setShowModal(false);
      await fetchAllocationsData();
    } catch (err) {
      console.error('Failed to grant leave allocation:', err);
      alert(`Failed to grant allocation: ${err.message || 'Validation error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAllocation = async (id, empName) => {
    if (!window.confirm(`Are you sure you want to cancel the leave allocation for ${empName}?`)) {
      return;
    }
    try {
      await apiService.cancelAllocation(id);
      showToast('Leave allocation cancelled.');
      await fetchAllocationsData();
    } catch (err) {
      console.error('Failed to cancel allocation:', err);
      alert(`Cancellation failed: ${err.message || 'Cannot cancel used allocation'}`);
    }
  };

  const handleExportCSV = () => {
    if (allocations.length === 0) {
      alert('No allocations to export.');
      return;
    }
    const headers = ['Allocation ID', 'Employee', 'Leave Type', 'Allocated Days', 'Used Days', 'Remaining Days', 'Valid From', 'Valid To', 'Status'];
    const rows = allocations.map(a => {
      const empName = a.employee?.full_name || (a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : `Employee #${a.employee_id}`);
      const typeName = a.time_off_type?.name || 'Leave';
      return [
        a.id,
        `"${empName}"`,
        `"${typeName}"`,
        a.allocated_quantity,
        a.used_quantity || 0,
        a.remaining_quantity || 0,
        `"${a.valid_from}"`,
        `"${a.valid_to}"`,
        `"${a.status || 'APPROVED'}"`
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Leave_Allocations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = allocations.length;
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.allocated_quantity || 0), 0);
  const totalUsed = allocations.reduce((sum, a) => sum + Number(a.used_quantity || 0), 0);
  const totalRemaining = allocations.reduce((sum, a) => sum + Number(a.remaining_quantity || 0), 0);

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF • LIVE DATABASE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Leave Allocations</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Track and manage leave allowances and balances per employee directly from the database.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Grant Allocation
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Active Allocations</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalCount}</span>
          </div>
          <div className="kpi-subtext">Total grant records</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Allocated</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalAllocated}d</span>
          </div>
          <div className="kpi-subtext">Across workforce</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Used</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalUsed}d</span>
          </div>
          <div className="kpi-subtext">Leaves approved YTD</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Remaining</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalRemaining}d</span>
          </div>
          <div className="kpi-subtext">Available balance</div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Allocated</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>Validity Window</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>Loading leave allocations from database...</span>
                  </div>
                </td>
              </tr>
            ) : allocations.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏖️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No Leave Allocations Found</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No employee leave allowances have been granted in the database yet. Click "Grant Allocation" above to assign quotas.</div>
                </td>
              </tr>
            ) : (
              allocations.map(a => {
                const empName = a.employee?.full_name || (a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : `Employee #${a.employee_id}`);
                const typeName = a.time_off_type?.name || 'Leave';
                const status = (a.status || 'APPROVED').toUpperCase();
                return (
                  <tr key={a.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td>
                      <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{empName}</div>
                      <div className="text-[10px] text-muted">{a.employee?.employee_code || `EMP-${a.employee_id}`}</div>
                    </td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>{typeName}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.allocated_quantity}d</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{a.used_quantity || 0}d</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--success)' }}>{a.remaining_quantity || 0}d</td>
                    <td className="text-xs text-muted">{a.valid_from} → {a.valid_to}</td>
                    <td>
                      <span className={`badge ${status === 'APPROVED' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                        {status}
                      </span>
                    </td>
                    <td>
                      {status === 'APPROVED' ? (
                        <button
                          onClick={() => handleCancelAllocation(a.id, empName)}
                          style={{ fontSize: '0.7rem', fontWeight: 600, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                          title="Revoke allocation"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-muted">Revoked</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grant Allocation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Grant Leave Allocation</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <form onSubmit={handleGrant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Select Employee *</label>
                <select
                  required
                  className="control-select"
                  style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code}) · {emp.department_name || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Time Off Type *</label>
                <select
                  required
                  className="control-select"
                  style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                  value={formData.typeId}
                  onChange={e => setFormData({ ...formData, typeId: e.target.value })}
                >
                  <option value="">-- Choose Type --</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Allocation Days Quota *</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  className="form-input"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Valid From *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.validFrom}
                    onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Valid To *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.validTo}
                    onChange={e => setFormData({ ...formData, validTo: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Notes / Grant Reason</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Annual policy grant"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Granting...' : 'Grant Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveAllocationsView;
