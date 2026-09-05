import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import {
  SalaryStructureOut,
  EligibleEmployeePreview,
  PayrunCreateIn,
} from '../../types/api';
import { Modal } from '../../components/common/Modal';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface PayrunWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payrunId: string) => void;
}

export const PayrunWizardModal: React.FC<PayrunWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [structures, setStructures] = useState<SalaryStructureOut[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-10-01');
  const [periodEnd, setPeriodEnd] = useState('2026-10-31');
  const [employeeType, setEmployeeType] = useState('ALL');
  const [batchName, setBatchName] = useState('October 2026 Regular Payroll');

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eligibleEmployees, setEligibleEmployees] = useState<EligibleEmployeePreview[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      apiService.getSalaryStructures().then((list: SalaryStructureOut[]) => {
        setStructures(list);
        if (list.length > 0 && !selectedStructureId) {
          setSelectedStructureId(list[0].id);
        }
      });
      setStep(1);
    }
  }, [isOpen, selectedStructureId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const data = await apiService.previewEligibleEmployees({
        salary_structure_id: selectedStructureId,
        period_start: periodStart,
        period_end: periodEnd,
        employee_type: employeeType,
      });
      setEligibleEmployees(data);
      setSelectedIds(data.map((e: EligibleEmployeePreview) => e.employee_id));
      setStep(2);
    } catch (e: any) {
      alert(e.message || 'Failed to preview eligible employees');
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === eligibleEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleEmployees.map((e) => e.employee_id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCommitPayrun = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one employee for the payrun');
      return;
    }
    setCreating(true);
    try {
      const payload: PayrunCreateIn = {
        name: batchName,
        salary_structure_id: selectedStructureId,
        period_start: periodStart,
        period_end: periodEnd,
        selected_employee_ids: selectedIds,
      };
      const created = await apiService.createPayrun(payload);
      onCreated(created.id);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Failed to generate payrun');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'New Pay Run' : 'Select Employee Records'}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {step === 1 ? (
              <span>Participant note: this popup collects the payrun scope only. Continue should not create the Payrun yet.</span>
            ) : (
              <span>{selectedIds.length} of {eligibleEmployees.length} employees selected</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={step === 1 ? onClose : () => setStep(1)}
              disabled={loadingPreview || creating}
            >
              {step === 1 ? 'Discard' : 'Back'}
            </button>

            {step === 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={loadingPreview || !selectedStructureId}
              >
                <span>{loadingPreview ? 'Loading Scope...' : 'Continue'}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCommitPayrun}
                disabled={creating || selectedIds.length === 0}
              >
                <Sparkles size={16} />
                <span>{creating ? 'Creating...' : 'Create Payrun'}</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--teal-tint)', borderRadius: 'var(--radius-control)', border: '1px solid rgba(0,81,102,0.15)', fontSize: '13px', color: 'var(--secondary)' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <ShieldCheck size={16} /> Zero-Database-Write Preview Mode
            </div>
            Validates active employment contracts and schedules without making any database changes.
          </div>

          <div className="form-group">
            <label className="form-label">Batch Title *</label>
            <input
              type="text"
              className="form-input"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Period Start Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period End Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Salary Structure *</label>
              <select
                className="form-select"
                required
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Employee Type Scope</label>
              <select
                className="form-select"
                value={employeeType}
                onChange={(e) => setEmployeeType(e.target.value)}
              >
                <option value="ALL">All Active Employees</option>
                <option value="FULL_TIME">Full Time Only</option>
                <option value="PART_TIME">Part Time Only</option>
                <option value="CONTRACT">Contractors Only</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Found <strong>{eligibleEmployees.length}</strong> eligible employees with active contracts in this period.
            </span>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={toggleSelectAll}
            >
              {selectedIds.length === eligibleEmployees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th className="numeric">Weekly Hours</th>
                  <th className="numeric">Monthly Base Wage</th>
                </tr>
              </thead>
              <tbody>
                {eligibleEmployees.map((emp) => {
                  const isChecked = selectedIds.includes(emp.employee_id);
                  return (
                    <tr
                      key={emp.employee_id}
                      style={{ cursor: 'pointer', backgroundColor: isChecked ? 'var(--purple-tint)' : undefined }}
                      onClick={() => toggleSelectOne(emp.employee_id)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                      </td>
                      <td><strong>{emp.employee_name}</strong></td>
                      <td>{emp.department_name || 'Finance & Operations'}</td>
                      <td className="numeric">{emp.working_hours_per_week} hrs</td>
                      <td className="numeric"><strong>₹{emp.wage.toLocaleString('en-IN')}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};
