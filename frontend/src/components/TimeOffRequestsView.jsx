import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackRequests = [
  { id: 'TOR-001', name: 'Marcus Brody', dept: 'Product & UX', type: 'Annual Leave', from: '22 Jan 2024', to: '26 Jan 2024', days: 5, status: 'Pending', reason: 'Family vacation', initials: 'MB', bg: '#005166' },
  { id: 'TOR-002', name: 'Priya Patel', dept: 'Engineering', type: 'Sick Leave', from: '15 Jan 2024', to: '16 Jan 2024', days: 2, status: 'Approved', reason: 'Medical appointment', initials: 'PP', bg: '#3b123f' },
  { id: 'TOR-003', name: 'Vikram Sen', dept: 'Sales & Growth', type: 'Comp Off', from: '18 Jan 2024', to: '18 Jan 2024', days: 1, status: 'Approved', reason: 'Weekend work compensation', initials: 'VS', bg: '#064252' },
  { id: 'TOR-004', name: 'David Miller', dept: 'Operations', type: 'Annual Leave', from: '05 Feb 2024', to: '12 Feb 2024', days: 6, status: 'Pending', reason: 'International travel', initials: 'DM', bg: '#005166' },
  { id: 'TOR-005', name: 'Aisha Al-Mansoor', dept: 'Finance', type: 'Maternity Leave', from: '01 Mar 2024', to: '31 May 2024', days: 90, status: 'Approved', reason: 'Maternity leave', initials: 'AA', bg: '#49636a' },
  { id: 'TOR-006', name: 'Ananya Sharma', dept: 'Engineering', type: 'Annual Leave', from: '10 Feb 2024', to: '14 Feb 2024', days: 5, status: 'Rejected', reason: 'Project deadline conflict', initials: 'AS', bg: '#3b123f' },
];

const statusStyle = {
  Pending: { bg: '#fff7ed', text: '#b45309' },
  Approved: { bg: '#eaf5ef', text: '#0b7a42' },
  Rejected: { bg: '#fff2f2', text: '#b71c1c' },
};

const normalizeReq = (r, idx) => ({
  id: r.id || `TOR-00${idx + 1}`,
  name: r.employee_name || r.name || 'Employee',
  dept: r.department || r.dept || 'Operations',
  type: r.leave_type_name || r.type || 'Annual Leave',
  from: r.date_from || r.from || '2024-02-01',
  to: r.date_to || r.to || '2024-02-05',
  days: r.number_of_days || r.days || 3,
  status: r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()) : 'Pending',
  reason: r.name || r.reason || 'Personal leave',
  initials: r.initials || (r.employee_name ? r.employee_name.split(' ').map(n=>n[0]).join('') : 'EM'),
  bg: idx % 2 === 0 ? '#005166' : '#3b123f',
});

const TimeOffRequestsView = () => {
  const [requests, setRequests] = useState(fallbackRequests);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newReq, setNewReq] = useState({ name: '', type: 'Annual Leave', from: '', to: '', days: 1, reason: '' });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await apiService.getLeaveRequests();
        if (Array.isArray(data) && data.length > 0) {
          setRequests(data.map(normalizeReq));
        }
      } catch (err) {
        console.warn('Using fallback leave requests:', err);
      }
    };
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      await apiService.approveLeaveRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    } catch {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    }
  };

  const handleReject = async (id) => {
    try {
      await apiService.rejectLeaveRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    } catch {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await apiService.submitLeaveRequest(newReq);
      setRequests(prev => [normalizeReq(created, prev.length), ...prev]);
      setShowModal(false);
      setNewReq({ name: '', type: 'Annual Leave', from: '', to: '', days: 1, reason: '' });
    } catch (err) {
      console.error('Failed to submit leave request:', err);
    }
  };

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Leave Requests</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Review and manage employee time-off requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">Export</button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            + New Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Approval', value: pendingCount, color: '#b45309', bg: '#fff7ed' },
          { label: 'Approved This Month', value: approvedCount, color: 'var(--success)', bg: '#eaf5ef' },
          { label: 'Rejected', value: rejectedCount, color: 'var(--critical)', bg: '#fff2f2' },
          { label: 'On Leave Today', value: '14', color: 'var(--secondary)', bg: 'var(--surface-teal-tint)' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: kpi.bg, border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.25rem' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: kpi.color, opacity: 0.8 }}>{kpi.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s', background: filter === s ? 'var(--primary)' : 'white', color: filter === s ? 'white' : 'var(--text-secondary)', borderColor: filter === s ? 'var(--primary)' : 'var(--border-structural)' }}>
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
            {filtered.map(req => {
              const ss = statusStyle[req.status] || {};
              return (
                <tr key={req.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: req.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{req.initials}</div>
                      <div>
                        <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{req.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{req.dept}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{req.type}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{req.from}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{req.to}</td>
                  <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{req.days}d</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '200px' }}>{req.reason}</td>
                  <td><span style={{ background: ss.bg, color: ss.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{req.status}</span></td>
                  <td>
                    {req.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(req.id)}
                          style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(req.id)}
                          style={{ background: '#fff2f2', color: 'var(--critical)', border: '1px solid var(--critical)', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
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
            })}
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Employee Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newReq.name} 
                  onChange={e => setNewReq({ ...newReq, name: e.target.value })} 
                  placeholder="e.g. Marcus Brody"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Leave Type</label>
                <select 
                  className="control-select" 
                  style={{ width: '100%' }}
                  value={newReq.type} 
                  onChange={e => setNewReq({ ...newReq, type: e.target.value })}
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Comp Off">Comp Off</option>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Reason</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newReq.reason} 
                  onChange={e => setNewReq({ ...newReq, reason: e.target.value })} 
                  placeholder="e.g. Urgent family matters"
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
