import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { DepartmentOut, DepartmentIn } from '../../types/api';
import { Modal } from '../../components/common/Modal';
import { Building2, Plus } from 'lucide-react';

export const DepartmentListPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<DepartmentIn>({ name: '', code: '' });

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const list = await apiService.getDepartments();
      setDepartments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createDepartment(form);
      setIsModalOpen(false);
      setForm({ name: '', code: '' });
      fetchDepts();
    } catch (e: any) {
      alert(e.message || 'Failed to create department');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Departments & Business Units</h1>
          <p>Organizational departments, hierarchy mapping, and cost center codes.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>New Department</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {departments.map((dept) => (
            <div key={dept.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-neutral">{dept.code}</span>
                <Building2 size={20} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '16px', marginTop: '12px' }}>{dept.name}</h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Department Head: <strong>{dept.manager_name || 'Designated Manager'}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Organizational Department"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreate}>Add Department</button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Legal & Compliance"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Department Code *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. LEG"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
