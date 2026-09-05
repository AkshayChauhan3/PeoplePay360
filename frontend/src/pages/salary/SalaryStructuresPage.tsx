import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { SalaryStructureOut, SalaryRuleOut, SalaryStructureIn, SalaryRuleIn } from '../../types/api';
import { Modal } from '../../components/common/Modal';
import { Plus, Sliders } from 'lucide-react';

export const SalaryStructuresPage: React.FC = () => {
  const [structures, setStructures] = useState<SalaryStructureOut[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [rules, setRules] = useState<SalaryRuleOut[]>([]);

  // New Structure Modal
  const [isNewStructOpen, setIsNewStructOpen] = useState(false);
  const [structForm, setStructForm] = useState<SalaryStructureIn>({ name: '', code: '', description: '' });

  // New Rule Modal
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<SalaryRuleIn>({
    sequence: 10,
    name: '',
    code: '',
    category: 'ALLOWANCE',
    computation_method: 'PERCENTAGE',
    percentage: 10,
    percentage_base_code: 'BASIC',
  });

  const fetchStructures = async () => {
    try {
      const list = await apiService.getSalaryStructures();
      setStructures(list);
      if (list.length > 0) {
        const active = selectedId || list[0].id;
        setSelectedId(active);
        const r = await apiService.getSalaryRules(active);
        setRules(r);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  const handleSelectStructure = async (id: string) => {
    setSelectedId(id);
    const r = await apiService.getSalaryRules(id);
    setRules(r);
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiService.createSalaryStructure(structForm);
      setIsNewStructOpen(false);
      setStructForm({ name: '', code: '', description: '' });
      setSelectedId(created.id);
      fetchStructures();
    } catch (err: any) {
      alert(err.message || 'Failed to create structure');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createSalaryRule(selectedId, ruleForm);
      setIsNewRuleOpen(false);
      setRuleForm({
        sequence: 10,
        name: '',
        code: '',
        category: 'ALLOWANCE',
        computation_method: 'PERCENTAGE',
        percentage: 10,
        percentage_base_code: 'BASIC',
      });
      const r = await apiService.getSalaryRules(selectedId);
      setRules(r);
    } catch (err: any) {
      alert(err.message || 'Failed to add rule');
    }
  };

  const currentStruct = structures.find((s) => s.id === selectedId);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Salary Structures & AST Engine</h1>
          <p>Define enterprise salary frameworks, allowance formulas, and mathematical deduction trees.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => setIsNewStructOpen(true)}
          >
            <Plus size={16} />
            <span>New Structure</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsNewRuleOpen(true)}
            disabled={!selectedId}
          >
            <Sliders size={16} />
            <span>Add Salary Rule</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div className="nav-section-title" style={{ padding: '0 0 10px 0' }}>Available Structures</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {structures.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectStructure(s.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-control)',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: s.id === selectedId ? 'var(--primary)' : 'var(--border-hairline)',
                  backgroundColor: s.id === selectedId ? 'var(--purple-tint)' : 'var(--bg-surface)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', color: s.id === selectedId ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {s.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Code: {s.code}</span>
                  <span>{s.rule_count || rules.length} Rules</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2>{currentStruct?.name || 'Salary Structure Rules'}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: 2 }}>
                  {currentStruct?.description || 'Standard corporate earnings and deduction computation rules.'}
                </p>
              </div>
              <span className="badge badge-success">AST Parser Active</span>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Seq</th>
                  <th>Rule Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Computation Method</th>
                  <th>Specification / Formula</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><strong>{rule.sequence}</strong></td>
                    <td>{rule.name}</td>
                    <td><span className="badge badge-neutral">{rule.code}</span></td>
                    <td>
                      <span
                        className={`badge ${
                          rule.category === 'BASIC'
                            ? 'badge-neutral'
                            : rule.category === 'ALLOWANCE'
                            ? 'badge-success'
                            : rule.category === 'DEDUCTION'
                            ? 'badge-danger'
                            : rule.category === 'GROSS'
                            ? 'badge-purple'
                            : 'badge-success'
                        }`}
                      >
                        {rule.category}
                      </span>
                    </td>
                    <td>{rule.computation_method}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {rule.computation_method === 'FIXED' && `Fixed: ₹${rule.amount?.toLocaleString('en-IN')}`}
                      {rule.computation_method === 'PERCENTAGE' && `${rule.percentage}% of [${rule.percentage_base_code}]`}
                      {rule.computation_method === 'FORMULA' && <span style={{ color: 'var(--primary)' }}>{rule.formula_expression}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isNewStructOpen}
        onClose={() => setIsNewStructOpen(false)}
        title="Create Salary Structure"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={() => setIsNewStructOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreateStructure}>Create Structure</button>
          </>
        }
      >
        <form onSubmit={handleCreateStructure} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Structure Title *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Executive Director Structure"
              value={structForm.name}
              onChange={(e) => setStructForm({ ...structForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Structure Code *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. EXEC_DIR_2026"
              value={structForm.code}
              onChange={(e) => setStructForm({ ...structForm, code: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Provide context on this salary structure..."
              value={structForm.description || ''}
              onChange={(e) => setStructForm({ ...structForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isNewRuleOpen}
        onClose={() => setIsNewRuleOpen(false)}
        title="Add Salary Rule"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={() => setIsNewRuleOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreateRule}>Add Rule</button>
          </>
        }
      >
        <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sequence *</label>
              <input
                type="number"
                className="form-input"
                required
                value={ruleForm.sequence}
                onChange={(e) => setRuleForm({ ...ruleForm, sequence: parseInt(e.target.value, 10) || 10 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={ruleForm.category}
                onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value as any })}
              >
                <option value="BASIC">Basic</option>
                <option value="ALLOWANCE">Allowance</option>
                <option value="GROSS">Gross</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="NET">Net</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rule Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Dearness Allowance"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rule Code *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. DA"
                value={ruleForm.code}
                onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Computation Method *</label>
            <select
              className="form-select"
              value={ruleForm.computation_method}
              onChange={(e) => setRuleForm({ ...ruleForm, computation_method: e.target.value as any })}
            >
              <option value="FIXED">Fixed Amount</option>
              <option value="PERCENTAGE">Percentage of Base Code</option>
              <option value="FORMULA">Safe Python AST Formula Expression</option>
            </select>
          </div>

          {ruleForm.computation_method === 'FIXED' && (
            <div className="form-group">
              <label className="form-label">Fixed Amount (₹) *</label>
              <input
                type="number"
                className="form-input"
                required
                value={ruleForm.amount || 0}
                onChange={(e) => setRuleForm({ ...ruleForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          {ruleForm.computation_method === 'PERCENTAGE' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Percentage (%) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={ruleForm.percentage || 0}
                  onChange={(e) => setRuleForm({ ...ruleForm, percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Base Code *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. BASIC or WAGE"
                  value={ruleForm.percentage_base_code || 'BASIC'}
                  onChange={(e) => setRuleForm({ ...ruleForm, percentage_base_code: e.target.value })}
                />
              </div>
            </div>
          )}

          {ruleForm.computation_method === 'FORMULA' && (
            <div className="form-group">
              <label className="form-label">AST Formula Expression *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. BASIC + HRA + CONV - PF"
                value={ruleForm.formula_expression || ''}
                onChange={(e) => setRuleForm({ ...ruleForm, formula_expression: e.target.value })}
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
