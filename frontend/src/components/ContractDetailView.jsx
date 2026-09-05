import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const ContractDetailView = ({ contractId, onNavigate }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchContract = async () => {
    setLoading(true);
    try {
      let data = null;
      if (contractId) {
        data = await apiService.getContractById(contractId);
      } else {
        const list = await apiService.getContracts();
        const items = list?.items || (Array.isArray(list) ? list : []);
        if (items.length > 0) {
          data = items[0];
        }
      }
      setContract(data);
    } catch (err) {
      console.warn('Error fetching contract detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractId]);

  const handleActivate = async () => {
    if (!contract?.id) return;
    if (!window.confirm(`Activate contract #${contract.contract_number}? This will set status to RUNNING and enforce active payroll computation.`)) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const updated = await apiService.activateContract(contract.id);
      setContract(updated);
      setFeedback({ type: 'success', message: `Contract ${updated.contract_number || updated.id} is now RUNNING and active.` });
    } catch (err) {
      console.error('Failed to activate contract:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to activate contract.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!contract?.id) return;
    if (!window.confirm(`Are you sure you want to cancel contract #${contract.contract_number}? This transitions it to CANCELLED state.`)) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const updated = await apiService.cancelContract(contract.id);
      setContract(updated);
      setFeedback({ type: 'success', message: `Contract ${updated.contract_number || updated.id} has been CANCELLED.` });
    } catch (err) {
      console.error('Failed to cancel contract:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel contract.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span>Loading contract details from PostgreSQL database...</span>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>No Contract Record Found</h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>There are currently no contract records registered in the database to display details.</p>
        <button className="btn-primary" onClick={() => onNavigate('all_contracts')}>
          Go to All Contracts
        </button>
      </div>
    );
  }

  const contractNumber = contract.contract_number || `#CNT-${contract.id}`;
  const empName = contract.employee?.full_name || (contract.employee ? `${contract.employee.first_name} ${contract.employee.last_name}` : 'Staff Member');
  const deptName = contract.department?.name || 'General Operations';
  const positionName = contract.job_position?.name || 'Position';
  const monthlyWage = Number(contract.wage || 0);
  const annualCtc = monthlyWage * 12;
  const status = (contract.status || 'DRAFT').toUpperCase();

  return (
    <>
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 600,
          background: feedback.type === 'success' ? '#ecfdf5' : '#fff2f2',
          border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#fca5a5'}`,
          color: feedback.type === 'success' ? '#065f46' : '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className="dashboard-header-strip mb-6 rounded-lg shadow-sm" style={{ padding: '1.5rem', background: 'var(--surface-base)' }}>
        <div className="flex justify-between items-start w-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`status-pill ${status === 'RUNNING' ? 'active' : status === 'CANCELLED' ? 'cancelled' : 'draft'}`} style={{ display: 'flex', gap: '4px', alignItems: 'center', textTransform: 'uppercase' }}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'RUNNING' ? 'bg-teal-500' : status === 'CANCELLED' ? 'bg-red-500' : 'bg-purple-500'}`}></span>
                {status}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">
                {contract.salary_structure?.name || 'Standard Structure'}
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-1" style={{ color: 'var(--primary)' }}>Contract {contractNumber}</h2>
            <div className="text-sm font-semibold" style={{ color: 'var(--secondary)' }}>
              Employment Agreement · {empName}
            </div>
            <div className="text-xs text-muted flex items-center gap-1 mt-1">
              Start Date: <span className="font-bold text-gray-800">{contract.start_date}</span> · Valid until: <span className="font-bold text-gray-800">{contract.end_date || 'Indefinite / Permanent'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500 tracking-wider">ANNUALIZED VALUE</div>
              <div className="text-4xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                ₹{annualCtc.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-teal-600 font-medium">
                ₹{monthlyWage.toLocaleString('en-IN')} Monthly Base
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status === 'DRAFT' && (
                <button 
                  className="btn-primary text-xs py-1.5 px-3" 
                  onClick={handleActivate}
                  disabled={actionLoading}
                  style={{ background: 'var(--success, #0b7a42)' }}
                >
                  {actionLoading ? 'Activating...' : '⚡ Activate Contract'}
                </button>
              )}
              {status === 'RUNNING' && (
                <button 
                  className="btn-secondary text-xs py-1.5 px-3" 
                  onClick={handleCancel}
                  disabled={actionLoading}
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  {actionLoading ? 'Cancelling...' : '🛑 Cancel Contract'}
                </button>
              )}
              <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => onNavigate('all_contracts')}>
                Back to Contracts
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: '1.5rem' }}>
        <h3 className="font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">Contract & Employee Association</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-[11px] text-gray-500 uppercase font-semibold mb-1">CONTRACTED EMPLOYEE</div>
            <div className="text-base font-bold text-gray-900">{empName}</div>
            <div className="text-xs text-gray-500 mt-1">{contract.employee?.email || 'No email'}</div>
            <div className="text-xs text-gray-400 mt-0.5">Code: {contract.employee?.employee_code || `EMP-${contract.employee_id}`}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-[11px] text-gray-500 uppercase font-semibold mb-1">DEPARTMENT & POSITION</div>
            <div className="text-base font-bold text-gray-900">{positionName}</div>
            <div className="text-xs text-teal-600 font-medium mt-1">{deptName}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-[11px] text-gray-500 uppercase font-semibold mb-1">WAGE / SALARY BASIS</div>
            <div className="text-base font-bold text-gray-900">₹{monthlyWage.toLocaleString('en-IN')} / month</div>
            <div className="text-xs text-gray-500 mt-1">Status: {contract.status}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="text-[11px] text-gray-500 uppercase font-semibold mb-1">TENURE WINDOW</div>
            <div className="text-base font-bold text-gray-900">{contract.start_date} → {contract.end_date || 'Open-ended'}</div>
            <div className="text-xs text-gray-500 mt-1">Created: {contract.created_at ? contract.created_at.slice(0, 10) : 'Live DB'}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContractDetailView;
