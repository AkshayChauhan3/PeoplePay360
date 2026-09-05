import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { PayrunListOut } from '../../types/api';
import { PayrunDetailPage } from './PayrunDetailPage';
import { PayrunWizardModal } from './PayrunWizardModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Banknote, Plus, ChevronRight, AlertTriangle, Calendar } from 'lucide-react';

export const PayrunListPage: React.FC = () => {
  const [payruns, setPayruns] = useState<PayrunListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayrunId, setSelectedPayrunId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchPayruns = async () => {
    setLoading(true);
    try {
      const list = await apiService.getPayruns();
      setPayruns(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayruns();
  }, []);

  if (selectedPayrunId) {
    return (
      <PayrunDetailPage
        payrunId={selectedPayrunId}
        onBack={() => {
          setSelectedPayrunId(null);
          fetchPayruns();
        }}
      />
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Payrun Batches & Disbursals</h1>
          <p>Execute payroll computations, validate earnings & deductions, and dispatch payslips.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsWizardOpen(true)}
          >
            <Plus size={16} />
            <span>Launch Payrun Wizard</span>
          </button>
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
                <th>Payrun Name</th>
                <th>Cycle Period</th>
                <th className="numeric">Staff Count</th>
                <th>Batch Status</th>
                <th>Warnings</th>
                <th className="numeric">Total Net Payroll</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payruns.map((pr) => (
                <tr
                  key={pr.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPayrunId(pr.id)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Banknote size={18} color="var(--primary)" />
                      <strong>{pr.name}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <Calendar size={13} />
                      <span>{pr.period_start} to {pr.period_end}</span>
                    </div>
                  </td>
                  <td className="numeric"><strong>{pr.employee_count}</strong></td>
                  <td><StatusBadge status={pr.status} /></td>
                  <td>
                    {pr.warning_count > 0 ? (
                      <span className="badge badge-warning">
                        <AlertTriangle size={12} />
                        <span>{pr.warning_count} Warning</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>0 Flags</span>
                    )}
                  </td>
                  <td className="numeric">
                    <strong style={{ color: 'var(--secondary)' }}>
                      ₹{(pr.total_net ?? 0).toLocaleString('en-IN')}
                    </strong>
                  </td>
                  <td>
                    <button type="button" className="btn btn-neutral btn-sm" style={{ gap: 2 }}>
                      <span>Open Batch</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payrun 2-Step Creation Wizard Modal */}
      <PayrunWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={(newId) => {
          setSelectedPayrunId(newId);
          fetchPayruns();
        }}
      />
    </div>
  );
};
