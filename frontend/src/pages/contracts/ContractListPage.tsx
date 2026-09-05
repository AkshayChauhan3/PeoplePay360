import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { ContractOut } from '../../types/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, Plus, ArrowLeft, FileText } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const ContractListPage: React.FC = () => {
  const [contracts, setContracts] = useState<ContractOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<ContractOut | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New contract form state
  const [newRef, setNewRef] = useState('CON/2026/0048');
  const [newEmpId, setNewEmpId] = useState('emp-1');
  const [newWage, setNewWage] = useState(85000);
  const [newStartDate, setNewStartDate] = useState('2026-01-01');

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getContracts();
      setContracts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createContract({
        reference: newRef,
        employee_id: newEmpId,
        schedule_id: 'sched-1',
        salary_structure_id: 'struct-1',
        start_date: newStartDate,
        wage: Number(newWage),
        status: 'RUNNING',
      });
      setIsCreateModalOpen(false);
      loadContracts();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = contracts.filter((c) =>
    (c.reference + ' ' + (c.employee_name || '')).toLowerCase().includes(search.toLowerCase())
  );

  if (selectedContract) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setSelectedContract(null)}
          >
            <ArrowLeft size={16} /> Back to Contracts
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
            Contract / {selectedContract.reference}
          </h2>
          <StatusBadge status={selectedContract.status} />
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '900px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Employee</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedContract.employee_name || 'Aarav Mehta'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</div>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>Finance</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Date</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedContract.start_date}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Job Position</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Payroll Specialist</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>End Date</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedContract.end_date || '— (Permanent)'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Wage / Month</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }} className="tabular-nums">
                ₹{selectedContract.wage.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</div>
              <StatusBadge status={selectedContract.status} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Working Schedule</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedContract.schedule_name || '40 Hours / Week'}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Salary Structure / Notes</h4>
            <div style={{ padding: '12px', background: 'var(--neutral-tint-teal)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
              <strong>Structure Type:</strong> {selectedContract.salary_structure_name || 'Regular Salary'}
              <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                This running contract is the source for payroll calculation in the active period.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Contracts</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            List view of employee contracts and wage baselines
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={16} /> NEW
        </button>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search contracts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      <div className="card table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Employee</th>
              <th>Start</th>
              <th>End</th>
              <th>Wage / Month</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>Loading contracts…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>No contracts found.</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContract(c)}
                  style={{ cursor: 'pointer' }}
                  title="Click to open Contract Form view"
                >
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} color="var(--secondary)" />
                      {c.reference}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.employee_name || 'Aarav Mehta'}</td>
                  <td>{c.start_date}</td>
                  <td>{c.end_date || '—'}</td>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    ₹{c.wage.toLocaleString()}
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Contract Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Contract"
      >
        <form onSubmit={handleCreateContract}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Contract Reference *</label>
              <input
                type="text"
                className="input-field"
                required
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Employee *</label>
              <select
                className="input-field"
                value={newEmpId}
                onChange={(e) => setNewEmpId(e.target.value)}
              >
                <option value="emp-1">Aarav Mehta (Finance)</option>
                <option value="emp-2">Sara Khan (HR)</option>
                <option value="emp-3">John Dsouza (IT)</option>
                <option value="emp-4">Neha Patel (HR)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Wage / Month (₹) *</label>
              <input
                type="number"
                className="input-field"
                required
                value={newWage}
                onChange={(e) => setNewWage(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Start Date *</label>
              <input
                type="date"
                className="input-field"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Contract
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
