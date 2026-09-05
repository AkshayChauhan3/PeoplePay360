import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { PayrunDetailOut, PayslipSummaryOut } from '../../types/api';
import { LifecycleStepper } from '../../components/common/LifecycleStepper';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PayslipDetailModal } from './PayslipDetailModal';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Zap,
  Lock,
  CreditCard,
  Mail,
  AlertTriangle,
} from 'lucide-react';

interface PayrunDetailPageProps {
  payrunId: string;
  onBack: () => void;
}

export const PayrunDetailPage: React.FC<PayrunDetailPageProps> = ({ payrunId, onBack }) => {
  const [payrun, setPayrun] = useState<PayrunDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);

  // Mark Paid Modal State
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [paymentRef, setPaymentRef] = useState('HDFC-NEFT-BATCH-9021');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await apiService.getPayrunById(payrunId);
      setPayrun(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [payrunId]);

  const handleCompute = async () => {
    setActionLoading(true);
    try {
      await apiService.computePayrun(payrunId);
      fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Compute failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    try {
      await apiService.validatePayrun(payrunId);
      fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPaid = async () => {
    setActionLoading(true);
    try {
      await apiService.markPayrunPaid(payrunId, paymentRef);
      setIsMarkPaidModalOpen(false);
      fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Failed to mark as paid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPayslips = async () => {
    setActionLoading(true);
    try {
      const res = await apiService.sendPayslips(payrunId);
      alert(`Successfully dispatched ${res.total_dispatched} payslips to employee work emails!`);
      fetchDetail();
    } catch (e: any) {
      alert(e.message || 'Failed to send payslips');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !payrun) {
    return (
      <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button type="button" className="btn btn-neutral btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to All Payruns</span>
        </button>

        <LifecycleStepper currentStatus={payrun.status} />
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>{payrun.name}</h2>
              <StatusBadge status={payrun.status} />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Structure: <strong>{payrun.salary_structure_name}</strong> • Period: {payrun.period_start} to {payrun.period_end}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {payrun.status === 'DRAFT' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCompute}
                disabled={actionLoading}
              >
                <Zap size={16} />
                <span>Compute Payrun</span>
              </button>
            )}

            {payrun.status === 'COMPUTED' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleValidate}
                disabled={actionLoading}
              >
                <Lock size={16} />
                <span>Validate & Lock Batch</span>
              </button>
            )}

            {payrun.status === 'VALIDATED' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsMarkPaidModalOpen(true)}
                disabled={actionLoading}
              >
                <CreditCard size={16} />
                <span>Mark as Paid</span>
              </button>
            )}

            {payrun.status === 'PAID' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSendPayslips}
                disabled={actionLoading}
              >
                <Mail size={16} />
                <span>Send Payslips via Email</span>
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Employees in Batch
            </div>
            <div className="metric-kpi" style={{ fontSize: '22px', marginTop: 2 }}>
              {payrun.employee_count}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Gross Payroll
            </div>
            <div className="metric-kpi amount" style={{ fontSize: '22px', marginTop: 2 }}>
              ₹{(payrun.total_gross ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#B71C1C', fontWeight: 600 }}>
              Total Deductions
            </div>
            <div className="metric-kpi amount" style={{ fontSize: '22px', color: '#B71C1C', marginTop: 2 }}>
              -₹{(payrun.total_deductions ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--secondary)', fontWeight: 600 }}>
              Total Net Disbursal
            </div>
            <div className="metric-kpi amount" style={{ fontSize: '22px', color: 'var(--secondary)', marginTop: 2 }}>
              ₹{(payrun.total_net ?? 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Compliance Warnings
            </div>
            <div className="metric-kpi" style={{ fontSize: '22px', color: payrun.warning_count > 0 ? 'var(--primary)' : 'var(--secondary)', marginTop: 2 }}>
              {payrun.warning_count}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="nav-section-title" style={{ paddingLeft: 0, marginBottom: '6px' }}>
          Batch Payslips List (Click to inspect rule breakdown)
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th className="numeric">Worked Days</th>
                <th className="numeric">Basic Pay</th>
                <th className="numeric">Gross Pay</th>
                <th className="numeric">Net Pay</th>
                <th>Status</th>
                <th>Warnings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payrun.payslips.map((ps: PayslipSummaryOut) => (
                <tr
                  key={ps.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPayslipId(ps.id)}
                >
                  <td><strong>{ps.employee_name}</strong></td>
                  <td className="numeric">{ps.worked_days}d</td>
                  <td className="numeric">₹{ps.basic.toLocaleString('en-IN')}</td>
                  <td className="numeric">₹{ps.gross.toLocaleString('en-IN')}</td>
                  <td className="numeric"><strong style={{ color: 'var(--secondary)' }}>₹{ps.net.toLocaleString('en-IN')}</strong></td>
                  <td><StatusBadge status={ps.status} /></td>
                  <td>
                    {ps.has_warning ? (
                      <span className="badge badge-warning" title={ps.warning_reason || 'Compliance check flag'}>
                        <AlertTriangle size={12} />
                        <span>Warning</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Clean</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="btn btn-neutral btn-sm">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PayslipDetailModal
        payslipId={selectedPayslipId}
        onClose={() => setSelectedPayslipId(null)}
      />

      <Modal
        isOpen={isMarkPaidModalOpen}
        onClose={() => setIsMarkPaidModalOpen(false)}
        title="Mark Payrun as Paid"
        footer={
          <>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() => setIsMarkPaidModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmPaid}
              disabled={actionLoading || !paymentRef}
            >
              {actionLoading ? 'Recording...' : 'Confirm Disbursal Record'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            According to the PeoplePay360 contract, this updates batch status and locks payment records without initiating live bank transactions.
          </p>

          <div className="form-group">
            <label className="form-label">Payment NEFT / Batch Reference *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. HDFC-NEFT-BATCH-9021"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
