import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { AttendanceOut } from '../../types/api';
import { useAttendance } from '../../context/AttendanceContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  Play,
  Square,
  Edit3,
  Filter,
  ArrowLeft,
} from 'lucide-react';

export const AttendanceListPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { hasActiveSession, elapsedSeconds, checkIn, checkOut, isPunching } = useAttendance();

  const [viewingRecord, setViewingRecord] = useState<AttendanceOut | null>(null);

  // Attendance Correction Modal State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceOut | null>(null);
  const [correctCheckIn, setCorrectCheckIn] = useState('');
  const [correctCheckOut, setCorrectCheckOut] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAttendance({ status: statusFilter || undefined });
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const handleOpenCorrection = (record: AttendanceOut) => {
    setSelectedRecord(record);
    setCorrectCheckIn(record.check_in ? record.check_in.slice(0, 16) : '');
    setCorrectCheckOut(record.check_out ? record.check_out.slice(0, 16) : '');
    setCorrectReason('');
  };

  const handleSaveCorrection = async () => {
    if (!selectedRecord) return;
    setIsCorrecting(true);
    try {
      await apiService.correctAttendance(selectedRecord.id, {
        check_in: new Date(correctCheckIn).toISOString(),
        check_out: new Date(correctCheckOut).toISOString(),
        reason: correctReason || 'Authorized biometric time adjustment',
      });
      setSelectedRecord(null);
      fetchRecords();
    } catch (e: any) {
      alert(e.message || 'Failed to apply correction');
    } finally {
      setIsCorrecting(false);
    }
  };

  const formatSeconds = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (viewingRecord) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setViewingRecord(null)}
          >
            <ArrowLeft size={16} /> Back to Attendance List
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
            Attendance / {viewingRecord.employee_name || 'Aarav Mehta'} / {viewingRecord.date}
          </h2>
          <StatusBadge status={viewingRecord.status} />
          <button
            type="button"
            className="btn btn-primary btn-compact"
            style={{ marginLeft: 'auto' }}
            onClick={() => handleOpenCorrection(viewingRecord)}
          >
            <Edit3 size={14} /> EDIT
          </button>
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Employee</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{viewingRecord.employee_name || 'Aarav Mehta'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</div>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>Finance</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check In</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{viewingRecord.check_in ? new Date(viewingRecord.check_in).toLocaleString() : '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Manager</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Sara Khan</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check Out</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{viewingRecord.check_out ? new Date(viewingRecord.check_out).toLocaleString() : '— (Open Session)'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</div>
              <StatusBadge status={viewingRecord.status} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Worked Hours</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }} className="tabular-nums">
                {viewingRecord.elapsed_hours || viewingRecord.net_hours || '9.08'} hrs
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Overtime</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }} className="tabular-nums">0.50 hrs</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Notes</h4>
            <div style={{ padding: '12px', background: 'var(--neutral-tint-teal)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              System-generated from check in/out or manually corrected by an authorized user.
            </div>
          </div>
        </div>

        {selectedRecord && (
          <Modal
            isOpen={!!selectedRecord}
            onClose={() => setSelectedRecord(null)}
            title={`Manual Attendance Correction — ${selectedRecord?.employee_name || ''}`}
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={() => setSelectedRecord(null)}
                  disabled={isCorrecting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveCorrection}
                  disabled={isCorrecting || !correctReason}
                >
                  {isCorrecting ? 'Saving...' : 'Save Audit Correction'}
                </button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--neutral-tint-purple)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--primary)' }}>
                ⚠️ This action will write an immutable audit log entry according to enterprise HRMS compliance rules.
              </div>
              <div className="form-group">
                <label className="form-label">Check In Time *</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={correctCheckIn}
                  onChange={(e) => setCorrectCheckIn(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check Out Time *</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={correctCheckOut}
                  onChange={(e) => setCorrectCheckOut(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Audit Correction Reason *</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Provide justification..."
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                />
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Attendance & Daily Sessions</h1>
          <p>Live employee attendance punches, shift duration tracking, and exception corrections.</p>
        </div>

        <div className="page-actions">
          {hasActiveSession ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={isPunching}
              onClick={checkOut}
            >
              <Square size={16} />
              <span>Check Out ({formatSeconds(elapsedSeconds)})</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isPunching}
              onClick={checkIn}
            >
              <Play size={16} />
              <span>Punch In Now</span>
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-hairline)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Filter by Status:</span>
          <select
            className="form-select"
            style={{ width: 220 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Attendance Records</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late Arrivals</option>
            <option value="OVERTIME">Overtime</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
            <option value="HALF_DAY">Half Day</option>
          </select>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Showing <strong>{records.length}</strong> attendance entries
        </div>
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
                <th>Date</th>
                <th>Employee Name</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th className="numeric">Work Hours</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} onClick={() => setViewingRecord(r)} style={{ cursor: 'pointer' }} title="Click to open Attendance Form view">
                  <td><strong>{r.date}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} color="var(--text-secondary)" />
                      <span style={{ fontWeight: 600 }}>{r.employee_name || 'Aarav Mehta'}</span>
                    </div>
                  </td>
                  <td>{new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td>
                    {r.check_out
                      ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Open Session</span>}
                  </td>
                  <td className="numeric">{r.net_hours != null ? `${r.net_hours} hrs` : 'In Progress'}</td>
                  <td>
                    <StatusBadge status={r.status} isException={r.is_exception} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-neutral btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCorrection(r);
                      }}
                      title="Adjust punch time with audit log"
                    >
                      <Edit3 size={13} />
                      <span>Correct</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Correction Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={`Manual Attendance Correction — ${selectedRecord?.employee_name || ''}`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() => setSelectedRecord(null)}
              disabled={isCorrecting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveCorrection}
              disabled={isCorrecting || !correctReason}
            >
              {isCorrecting ? 'Saving...' : 'Save Audit Correction'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--purple-tint)', borderRadius: 'var(--radius-control)', fontSize: '12px', color: 'var(--primary)', border: '1px solid rgba(59,18,63,0.15)' }}>
            ⚠️ This action will write an immutable audit log entry according to enterprise HRMS compliance rules.
          </div>

          <div className="form-group">
            <label className="form-label">Check In Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={correctCheckIn}
              onChange={(e) => setCorrectCheckIn(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Check Out Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={correctCheckOut}
              onChange={(e) => setCorrectCheckOut(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Audit Correction Reason *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Provide justification (e.g. Biometric device offline, authorized client visit, forgot to punch)..."
              value={correctReason}
              onChange={(e) => setCorrectReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
