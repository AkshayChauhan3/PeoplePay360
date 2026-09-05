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
  Plus,
  Check,
  X,
  ArrowLeft,
  Calendar,
  Layers,
  Award,
  Search,
} from 'lucide-react';

export const TimeOffPage: React.FC<{ initialTab?: 'requests' | 'allocations' | 'types' }> = ({
  initialTab = 'requests',
}) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'allocations' | 'types'>(initialTab);
  const [types, setTypes] = useState<LeaveTypeOut[]>([]);
  const [allocations, setAllocations] = useState<AllocationOut[]>([]);
  const [requests, setRequests] = useState<LeaveRequestOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState('');

  // Form views
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestOut | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationOut | null>(null);
  const [selectedType, setSelectedType] = useState<LeaveTypeOut | null>(null);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reqForm, setReqForm] = useState<LeaveRequestIn>({
    leave_type_id: '',
    start_date: '2026-09-12',
    end_date: '2026-09-14',
    reason: 'Family vacation',
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

  const handleAction = async (requestId: string, action: 'approve' | 'refuse') => {
    try {
      if (action === 'approve') {
        await apiService.approveLeaveRequest(requestId);
      } else {
        await apiService.refuseLeaveRequest(requestId);
      }
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest((prev) => (prev ? { ...prev, status: action === 'approve' ? 'APPROVED' : 'REFUSED' } : null));
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  // ----------------------------------------------------
  // Form View 1: Time Off Request Form View
  // ----------------------------------------------------
  if (selectedRequest) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setSelectedRequest(null)}
          >
            <ArrowLeft size={16} /> Back to Requests
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
            Time Off Request / {selectedRequest.employee_name || 'Aarav Mehta'}
          </h2>
          <StatusBadge status={selectedRequest.status} />

          {isManager && selectedRequest.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                className="btn btn-primary btn-compact"
                onClick={() => handleAction(selectedRequest.id, 'approve')}
              >
                <Check size={14} /> Approve
              </button>
              <button
                type="button"
                className="btn btn-danger btn-compact"
                onClick={() => handleAction(selectedRequest.id, 'refuse')}
              >
                <X size={14} /> Refuse
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Employee</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedRequest.employee_name || 'Aarav Mehta'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Duration</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }} className="tabular-nums">{selectedRequest.duration_days} Days</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Time Off Type</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRequest.leave_type_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</div>
              <StatusBadge status={selectedRequest.status} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Date</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRequest.start_date}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Approver</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Sara Khan</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>End Date</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRequest.end_date}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Allocation Used</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Paid Time Off 2026</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Reason</h4>
            <div style={{ padding: '12px', background: 'var(--neutral-tint-teal)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
              {selectedRequest.reason || 'Family vacation'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Form View 2: Allocation Form View
  // ----------------------------------------------------
  if (selectedAllocation) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setSelectedAllocation(null)}
          >
            <ArrowLeft size={16} /> Back to Allocations
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
            Allocation / {selectedAllocation.employee_name || 'Aarav Mehta'}
          </h2>
          <StatusBadge status={selectedAllocation.status} />
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Employee</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedAllocation.employee_name || 'Aarav Mehta'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Taken</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }} className="tabular-nums">{selectedAllocation.taken_days} Days</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Time Off Type</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedAllocation.leave_type_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Remaining</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }} className="tabular-nums">
                {selectedAllocation.remaining_days} Days
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Allocated</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }} className="tabular-nums">{selectedAllocation.allocated_days} Days</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Approver</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Sara Khan</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</div>
              <StatusBadge status={selectedAllocation.status} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Validity</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>2026 Annual Balance</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Description</h4>
            <div style={{ padding: '12px', background: 'var(--neutral-tint-purple)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--primary)' }}>
              Annual leave balance granted at start of policy year. Approved allocation is what creates available leave balance for the employee.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Form View 3: Time Off Type Form View
  // ----------------------------------------------------
  if (selectedType) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setSelectedType(null)}
          >
            <ArrowLeft size={16} /> Back to Time Off Types
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
            Time Off Type / {selectedType.name}
          </h2>
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Type Name</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedType.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Approval</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Manager</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Unit</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedType.unit}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Payroll / Work Entry</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Leave Work Entry</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Requires Allocation</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: selectedType.requires_allocation ? 'var(--secondary)' : 'var(--text-secondary)' }}>
                {selectedType.requires_allocation ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Display Color</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedType.display_color || 'var(--secondary)' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{selectedType.display_color || 'Blue'}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>True</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Configuration Notes</h4>
            <div style={{ padding: '12px', background: 'var(--neutral-tint-teal)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Standard policy configuration. Time Off Type drives approval behavior and whether a request needs an allocation.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Main Sub-Tab Views: Requests | Allocations | Types
  // ----------------------------------------------------
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            {activeSubTab === 'requests' ? 'Time Off Requests' : activeSubTab === 'allocations' ? 'Allocations' : 'Time Off Types'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {activeSubTab === 'requests'
              ? 'List view opened from Time Off ▼ → Requests'
              : activeSubTab === 'allocations'
              ? 'List view opened from Time Off ▼ → Allocations'
              : 'List view opened from Time Off ▼ → Time Off Types'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeSubTab === 'requests' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsRequestModalOpen(true)}
            >
              <Plus size={16} /> NEW
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => { setActiveSubTab('requests'); setSearch(''); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'requests' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '8px 4px',
            fontWeight: activeSubTab === 'requests' ? 600 : 500,
            color: activeSubTab === 'requests' ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Calendar size={15} /> Time Off Requests
        </button>
        <button
          type="button"
          onClick={() => { setActiveSubTab('allocations'); setSearch(''); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'allocations' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '8px 4px',
            fontWeight: activeSubTab === 'allocations' ? 600 : 500,
            color: activeSubTab === 'allocations' ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Award size={15} /> Allocations
        </button>
        <button
          type="button"
          onClick={() => { setActiveSubTab('types'); setSearch(''); }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'types' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '8px 4px',
            fontWeight: activeSubTab === 'types' ? 600 : 500,
            color: activeSubTab === 'types' ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Layers size={15} /> Time Off Types
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder={
              activeSubTab === 'requests'
                ? 'Search requests…'
                : activeSubTab === 'allocations'
                ? 'Search allocations…'
                : 'Search time off types…'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      {/* View 1: Requests Table */}
      {activeSubTab === 'requests' && (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Status</th>
                {isManager && <th style={{ textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests
                .filter((r) => (r.employee_name || 'Aarav Mehta').toLowerCase().includes(search.toLowerCase()) || r.leave_type_name.toLowerCase().includes(search.toLowerCase()))
                .map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view Request Form"
                  >
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.employee_name || 'Aarav Mehta'}</td>
                    <td>{r.leave_type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>{r.duration_days} Days</td>
                    <td><StatusBadge status={r.status} /></td>
                    {isManager && (
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {r.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-compact"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleAction(r.id, 'approve')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-compact"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleAction(r.id, 'refuse')}
                            >
                              Refuse
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: Allocations Table */}
      {activeSubTab === 'allocations' && (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Allocated</th>
                <th>Taken</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations
                .filter((a) => (a.employee_name || 'Aarav Mehta').toLowerCase().includes(search.toLowerCase()) || a.leave_type_name.toLowerCase().includes(search.toLowerCase()))
                .map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedAllocation(a)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view Allocation Form"
                  >
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{a.employee_name || 'Aarav Mehta'}</td>
                    <td>{a.leave_type_name}</td>
                    <td className="tabular-nums">{a.allocated_days} days</td>
                    <td className="tabular-nums">{a.taken_days} days</td>
                    <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                      {a.remaining_days} days
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View 3: Time Off Types Table */}
      {activeSubTab === 'types' && (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Unit</th>
                <th>Allocation</th>
                <th>Approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {types
                .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
                .map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedType(t)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view Time Off Type Form"
                  >
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.display_color || 'var(--secondary)' }} />
                        {t.name}
                      </div>
                    </td>
                    <td>{t.unit}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: t.requires_allocation ? 'var(--neutral-tint-teal)' : '#f5f5f5',
                        color: t.requires_allocation ? 'var(--secondary)' : 'var(--text-secondary)',
                      }}>
                        {t.requires_allocation ? 'Required' : 'No'}
                      </span>
                    </td>
                    <td>Manager</td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 600, background: 'rgba(56, 106, 33, 0.12)', color: 'var(--success)' }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="New Time Off Request"
      >
        <form onSubmit={handleCreateRequest}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Time Off Type *</label>
              <select
                className="input-field"
                value={reqForm.leave_type_id}
                onChange={(e) => setReqForm({ ...reqForm, leave_type_id: e.target.value })}
                required
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.unit})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Start Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={reqForm.start_date}
                  onChange={(e) => setReqForm({ ...reqForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>End Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={reqForm.end_date}
                  onChange={(e) => setReqForm({ ...reqForm, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Reason *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="State the reason for this time off..."
                value={reqForm.reason || ''}
                onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
