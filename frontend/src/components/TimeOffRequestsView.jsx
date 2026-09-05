import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const statusStyle = {
  Pending: { bg: '#fff7ed', text: '#b45309' },
  Approved: { bg: '#eaf5ef', text: '#0b7a42' },
  Rejected: { bg: '#fff2f2', text: '#b71c1c' },
  Refused: { bg: '#fff2f2', text: '#b71c1c' },
};

const normalizeReq = (r, idx) => {
  const empName = r.employee_name || (r.employee ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}`.trim() : `Employee #${idx + 1}`);
  const fromDate = r.start_date || r.date_from || r.from || '2026-09-01';
  const toDate = r.end_date || r.date_to || r.to || '2026-09-05';
  const rawStatus = (r.status || 'PENDING').toUpperCase();
  const displayStatus = rawStatus === 'APPROVED' ? 'Approved' : (rawStatus === 'REFUSED' || rawStatus === 'REJECTED') ? 'Rejected' : 'Pending';

  return {
    id: r.id || `TOR-00${idx + 1}`,
    rawId: r.id,
    name: empName,
    dept: r.department || r.employee?.department?.name || 'Engineering',
    type: r.time_off_type?.name || r.leave_type_name || r.type || 'Annual Leave',
    from: fromDate,
    to: toDate,
    days: r.requested_quantity || r.number_of_days || r.days || 1,
    status: displayStatus,
    rawStatus: rawStatus,
    reason: r.reason || r.name || 'Personal time off',
    initials: empName ? empName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM',
    bg: idx % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
  };
};

const TimeOffRequestsView = () => {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newReq, setNewReq] = useState({
    employeeId: '',
    typeId: '',
    from: '',
    to: '',
    days: 1,
    reason: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, sumRes, empRes, typesRes] = await Promise.allSettled([
        apiService.getLeaveRequests(),
        apiService.getDashboardSummary(),
        apiService.getEmployees({ limit: 100 }),
        apiService.getTimeOffTypes(),
      ]);

      if (reqRes.status === 'fulfilled') {
        const data = reqRes.value;
        const raw = data?.items || data?.data || (Array.isArray(data) ? data : []);
        setRequests(raw.map(normalizeReq));
      }

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        const sData = sumRes.value?.data || sumRes.value;
        setSummary(sData);
      }

      if (empRes.status === 'fulfilled') {
        const rawEmps = empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []);
        setEmployees(rawEmps);
        if (rawEmps.length > 0 && !newReq.employeeId) {
          setNewReq(prev => ({ ...prev, employeeId: rawEmps[0].id }));
        }
      }

      if (typesRes.status === 'fulfilled') {
        const rawTypes = Array.isArray(typesRes.value) ? typesRes.value : (typesRes.value?.items || []);
        setLeaveTypes(rawTypes);
        if (rawTypes.length > 0 && !newReq.typeId) {
          setNewReq(prev => ({ ...prev, typeId: rawTypes[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
      setError(err.message || 'Unable to load leave requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      await apiService.approveLeaveRequest(id);
      showToast('Leave request approved successfully!');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved', rawStatus: 'APPROVED' } : r));
    } catch (err) {
      console.error('Approve leave error:', err);
      alert(`Approval error: ${err.message || 'Failed to approve request'}`);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for refusing this leave request:', 'Operational commitments');
    if (reason === null) return;
    try {
      await apiService.refuseLeaveRequest(id, reason || 'Refused by HR Manager');
      showToast('Leave request refused.');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected', rawStatus: 'REFUSED' } : r));
    } catch (err) {
      console.error('Reject leave error:', err);
      alert(`Refusal error: ${err.message || 'Failed to refuse request'}`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const empId = Number(newReq.employeeId);
      const typeId = Number(newReq.typeId) || (leaveTypes[0]?.id || 1);
      if (!empId) {
        throw new Error('Please select an employee.');
      }
      if (!newReq.from || !newReq.to) {
        throw new Error('Please specify both from and to dates.');
      }

      await apiService.submitLeaveRequest({
        employee_id: empId,
        time_off_type_id: typeId,
        start_date: newReq.from,
        end_date: newReq.to,
        requested_quantity: Number(newReq.days) || 1,
        reason: newReq.reason.trim() || 'Leave request',
      });

      showToast('Leave request submitted to database successfully!');
      setShowModal(false);
      setNewReq({
        employeeId: employees[0]?.id || '',
        typeId: leaveTypes[0]?.id || '',
        from: '',
        to: '',
        days: 1,
        reason: '',
      });
      await fetchRequests();
    } catch (err) {
      console.error('Failed to submit leave request:', err);
      alert(`Submission failed: ${err.message || 'Error submitting leave'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (requests.length === 0) {
      alert('No requests to export.');
      return;
    }
    const headers = ['Request ID', 'Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
    const rows = filtered.map(r => [
      `"${r.id}"`,
      `"${r.name}"`,
      `"${r.dept}"`,
      `"${r.type}"`,
      `"${r.from}"`,
      `"${r.to}"`,
      r.days,
      `"${r.status}"`,
      `"${r.reason.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Leave_Requests_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTodayLeaves = requests.filter(r => r.status === 'Approved' && r.from <= todayStr && r.to >= todayStr).length;
  const onLeaveToday = summary?.on_leave_today ?? activeTodayLeaves;

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF • LIVE DATABASE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Leave Requests</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Review and manage employee time-off requests with real-time balance checks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Request
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div style={{ background: '#fff7ed', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#b45309', opacity: 0.8 }}>Pending Approval</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>{pendingCount}</div>
        </div>
        <div style={{ background: '#eaf5ef', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--success)', opacity: 0.8 }}>Approved Requests</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{approvedCount}</div>
        </div>
        <div style={{ background: '#fff2f2', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--critical)', opacity: 0.8 }}>Rejected / Refused</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--critical)', lineHeight: 1 }}>{rejectedCount}</div>
        </div>
        <div style={{ background: '#f7fafa', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--secondary)', opacity: 0.8 }}>On Leave Today</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)', lineHeight: 1 }}>{onLeaveToday}</div>
        </div>
      </div>

      <div className="dashboard-filter-bar mb-4" style={{ display: 'flex', gap: '8px' }}>
        {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`filter-chip ${filter === status ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filter === status ? '1px solid var(--primary)' : '1px solid var(--border-structural)',
              background: filter === status ? 'var(--primary)' : 'white',
              color: filter === status ? 'white' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Duration</th>
              <th>Reason</th>
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
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading leave requests...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No leave requests found</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>There are no {filter !== 'All' ? filter.toLowerCase() : ''} leave requests registered in the database.</div>
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const ss = statusStyle[r.status] || { bg: '#f7fafa', text: 'var(--text-secondary)' };
                return (
                  <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: r.bg, color: 'white' }}>
                          {r.initials}
                        </div>
                        <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.dept}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>{r.type}</td>
                    <td className="text-xs">{r.from}</td>
                    <td className="text-xs">{r.to}</td>
                    <td className="text-xs font-bold">{r.days} day{r.days !== 1 ? 's' : ''}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '200px' }} title={r.reason}>{r.reason}</td>
                    <td>
                      <span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.rawStatus === 'PENDING' ? (
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleApprove(r.rawId || r.id)} 
                            style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', background: 'var(--success, #0b7a42)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReject(r.rawId || r.id)} 
                            style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--critical)', background: '#fff2f2', border: '1px solid #fed7d7', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Finalized</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Submit Leave Request</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Select Employee *</label>
                <select
                  required
                  className="control-select"
                  style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                  value={newReq.employeeId}
                  onChange={e => setNewReq({ ...newReq, employeeId: e.target.value })}
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
                  value={newReq.typeId} 
                  onChange={e => setNewReq({ ...newReq, typeId: e.target.value })}
                >
                  <option value="">-- Choose Type --</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>From Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={newReq.from} 
                    onChange={e => setNewReq({ ...newReq, from: e.target.value })} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>To Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={newReq.to} 
                    onChange={e => setNewReq({ ...newReq, to: e.target.value })} 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Requested Days *</label>
                <input 
                  type="number" 
                  step="0.5"
                  min="0.5"
                  required 
                  className="form-input" 
                  value={newReq.days} 
                  onChange={e => setNewReq({ ...newReq, days: Number(e.target.value) })} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Reason *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newReq.reason} 
                  onChange={e => setNewReq({ ...newReq, reason: e.target.value })} 
                  placeholder="e.g. Planned family vacation / Medical checkup"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeOffRequestsView;
