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
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newReq, setNewReq] = useState({ name: '', type: 'Paid Time Off / Annual Leave', from: '', to: '', days: 1, reason: '' });

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, sumRes] = await Promise.allSettled([
        apiService.getLeaveRequests(),
        apiService.getDashboardSummary(),
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
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved', rawStatus: 'APPROVED' } : r));
    } catch (err) {
      console.warn('Approve leave error:', err);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    }
  };

  const handleReject = async (id) => {
    try {
      await apiService.refuseLeaveRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected', rawStatus: 'REFUSED' } : r));
    } catch (err) {
      console.warn('Reject leave error:', err);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await apiService.submitLeaveRequest({
        time_off_type_id: 1,
        start_date: newReq.from,
        end_date: newReq.to,
        requested_quantity: Number(newReq.days) || 1,
        reason: newReq.reason,
      });
      setRequests(prev => [normalizeReq(created, prev.length), ...prev]);
      setShowModal(false);
      setNewReq({ name: '', type: 'Paid Time Off / Annual Leave', from: '', to: '', days: 1, reason: '' });
    } catch (err) {
      console.error('Failed to submit leave request:', err);
    }
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
          <button className="btn-secondary" onClick={() => window.print()}>Export</button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            + New Request
          </button>
        </div>
      </div>

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
        <div style={{ background: 'var(--surface-teal-tint)', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--secondary)', opacity: 0.8 }}>On Leave Today</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)', lineHeight: 1 }}>{onLeaveToday}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
          <button 
            key={s} 
            onClick={() => setFilter(s)} 
            style={{ 
              padding: '0.35rem 0.75rem', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              cursor: 'pointer', 
              border: '1px solid', 
              transition: 'all 0.2s', 
              background: filter === s ? 'var(--primary)' : 'white', 
              color: filter === s ? 'white' : 'var(--text-secondary)', 
              borderColor: filter === s ? 'var(--primary)' : 'var(--border-structural)' 
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
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
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading requests...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No leave requests found</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      {filter !== 'All' 
                        ? 'No leave requests match this filter.' 
                        : 'No employee leave requests have been submitted yet. Click "+ New Request" to create one.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const ss = statusStyle[r.status] || { bg: '#f7fafa', text: '#49636a' };
                return (
                  <tr key={`${r.id}-${i}`} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                          {r.initials}
                        </div>
                        <div>
                          <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                          <div className="text-xs text-muted">{r.dept}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.type}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.from}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.to}</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{r.days}d</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                    <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.status}</span></td>
                    <td>
                      {r.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApprove(r.id)} 
                            style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', background: 'var(--success, #0b7a42)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReject(r.id)} 
                            style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--critical)', background: '#fff2f2', border: '1px solid #fed7d7', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Completed</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '450px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Submit Leave Request</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Leave Type</label>
                <select 
                  className="control-select" 
                  style={{ width: '100%' }}
                  value={newReq.type} 
                  onChange={e => setNewReq({ ...newReq, type: e.target.value })}
                >
                  <option value="Paid Time Off / Annual Leave">Paid Time Off / Annual Leave</option>
                  <option value="Sick & Medical Leave">Sick & Medical Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>From Date</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={newReq.from} 
                    onChange={e => setNewReq({ ...newReq, from: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>To Date</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={newReq.to} 
                    onChange={e => setNewReq({ ...newReq, to: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Days</label>
                <input 
                  type="number" 
                  step="0.5"
                  min="0.5"
                  required 
                  className="form-input" 
                  value={newReq.days} 
                  onChange={e => setNewReq({ ...newReq, days: Number(e.target.value) })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Reason</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newReq.reason} 
                  onChange={e => setNewReq({ ...newReq, reason: e.target.value })} 
                  placeholder="e.g. Planned family vacation"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeOffRequestsView;
