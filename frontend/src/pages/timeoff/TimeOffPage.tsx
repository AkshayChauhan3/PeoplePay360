import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import {
  LeaveTypeOut,
  AllocationOut,
  LeaveRequestOut,
  LeaveRequestIn,
} from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  CalendarPlus,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';

export const TimeOffPage: React.FC = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState<LeaveTypeOut[]>([]);
  const [allocations, setAllocations] = useState<AllocationOut[]>([]);
  const [requests, setRequests] = useState<LeaveRequestOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Leave Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reqForm, setReqForm] = useState<LeaveRequestIn>({
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const isManager = user?.role === 'ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_PAYROLL_MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, a, r] = await Promise.all([
        apiService.getTimeOffTypes(),
        apiService.getAllocations(),
        apiService.getLeaveRequests(),
      ]);
      setTypes(t);
      setAllocations(a);
      setRequests(r);
      if (t.length > 0 && !reqForm.leave_type_id) {
        setReqForm((prev: LeaveRequestIn) => ({ ...prev, leave_type_id: t[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.submitLeaveRequest(reqForm);
      setIsRequestModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiService.approveLeaveRequest(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve request');
    }
  };

  const handleRefuse = async (id: string) => {
    try {
      await apiService.refuseLeaveRequest(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to refuse request');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Time Off & Leave Balances</h1>
          <p>Request vacation or sick leave, inspect allocated quotas, and review team approval queues.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <CalendarPlus size={16} />
            <span>Request Time Off</span>
          </button>
        </div>
      </div>

      <div>
        <div className="nav-section-title" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
          Leave Allocation & Quotas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {allocations.map((alloc) => (
            <div key={alloc.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {alloc.leave_type_name}
                </span>
                <span className="badge badge-success">Allocated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span className="metric-kpi" style={{ fontSize: '26px', color: 'var(--secondary)' }}>
                  {alloc.remaining_days}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>days left</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
                <span>Granted: <strong>{alloc.allocated_days}d</strong></span>
                <span>Taken: <strong>{alloc.taken_days}d</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="nav-section-title" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
          Leave Requests & Approvals
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Date Period</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isManager && <th>Manager Decision</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.employee_name || 'Aarav Mehta'}</div>
                    </td>
                    <td>{r.leave_type_name}</td>
                    <td>{r.start_date} to {r.end_date}</td>
                    <td><strong>{r.duration_days} day(s)</strong></td>
                    <td>{r.reason || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    {isManager && (
                      <td>
                        {r.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleApprove(r.id)}
                              title="Approve & Atomically Deduct Quota"
                            >
                              <CheckCircle size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-neutral btn-sm"
                              onClick={() => handleRefuse(r.id)}
                              title="Refuse Leave Request"
                            >
                              <XCircle size={14} />
                              <span>Refuse</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Decided</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Time Off Request"
        footer={
          <>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateRequest}
              disabled={submitting || !reqForm.leave_type_id}
            >
              <Send size={15} />
              <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Leave Type *</label>
            <select
              className="form-select"
              required
              value={reqForm.leave_type_id}
              onChange={(e) => setReqForm({ ...reqForm, leave_type_id: e.target.value })}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={reqForm.start_date}
                onChange={(e) => setReqForm({ ...reqForm, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={reqForm.end_date}
                onChange={(e) => setReqForm({ ...reqForm, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Provide reason for time off..."
              value={reqForm.reason || ''}
              onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
