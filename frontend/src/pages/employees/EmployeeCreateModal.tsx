import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { DepartmentOut, EmployeeCreateIn } from '../../types/api';
import { Modal } from '../../components/common/Modal';

interface EmployeeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const EmployeeCreateModal: React.FC<EmployeeCreateModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EmployeeCreateIn>({
    employee_code: 'EMP0042',
    first_name: '',
    last_name: '',
    work_email: '',
    job_title: '',
    department_id: '',
    employee_type: 'FULL_TIME',
    join_date: new Date().toISOString().split('T')[0],
    bank_name: 'HDFC Bank',
    bank_account_number: '',
    ifsc_code: 'HDFC0001234',
  });

  useEffect(() => {
    if (isOpen) {
      apiService.getDepartments().then(setDepartments).catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.createEmployee(formData);
      onCreated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Employee"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Employee'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employee Code *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Employee Type</label>
            <select
              className="form-select"
              value={formData.employee_type}
              onChange={(e) => setFormData({ ...formData, employee_type: e.target.value as any })}
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
              <option value="PROBATION">Probation</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Work Email *</label>
            <input
              type="email"
              className="form-input"
              required
              value={formData.work_email}
              onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={formData.department_id || ''}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value || null })}
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Join Date *</label>
            <input
              type="date"
              className="form-input"
              required
              value={formData.join_date}
              onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-hairline)', margin: '0.5rem 0', paddingTop: '0.75rem' }}>
          <h4 style={{ fontSize: '13px', marginBottom: '0.5rem', fontWeight: 600 }}>Bank & Disbursal Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.bank_name || ''}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.bank_account_number || ''}
                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.ifsc_code || ''}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
