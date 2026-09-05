import React, { useState } from 'react';
import { Search, Plus, ArrowLeft, Code2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

interface SalaryRuleItem {
  id: string;
  name: string;
  code: string;
  category: 'Basic' | 'Allowance' | 'Gross' | 'Deduction' | 'Net';
  structure: string;
  sequence: number;
  computation: 'Fixed Amount' | 'Percentage of Wage' | 'Python Code';
  value: string;
  formula?: string;
}

export const SalaryRulesPage: React.FC = () => {
  const [rules, setRules] = useState<SalaryRuleItem[]>([
    { id: 'sr-1', name: 'Basic Salary', code: 'BASIC', category: 'Basic', structure: 'Regular Salary', sequence: 1, computation: 'Percentage of Wage', value: '50% of Wage' },
    { id: 'sr-2', name: 'House Rent Allowance', code: 'HRA', category: 'Allowance', structure: 'Regular Salary', sequence: 10, computation: 'Percentage of Wage', value: '40% of Basic' },
    { id: 'sr-3', name: 'Standard Allowance', code: 'STD', category: 'Allowance', structure: 'Regular Salary', sequence: 20, computation: 'Fixed Amount', value: '₹10,000' },
    { id: 'sr-4', name: 'Performance Bonus', code: 'BONUS', category: 'Allowance', structure: 'Regular Salary', sequence: 30, computation: 'Fixed Amount', value: '₹5,000' },
    { id: 'sr-5', name: 'Leave Travel Allowance', code: 'LTA', category: 'Allowance', structure: 'Regular Salary', sequence: 40, computation: 'Fixed Amount', value: '₹3,000' },
    { id: 'sr-6', name: 'Fixed Allowance', code: 'FIX', category: 'Allowance', structure: 'Regular Salary', sequence: 50, computation: 'Fixed Amount', value: '₹2,000' },
    { id: 'sr-7', name: 'Gross Salary', code: 'GROSS', category: 'Gross', structure: 'Regular Salary', sequence: 60, computation: 'Python Code', value: 'Sum of allowances', formula: 'result = categories["BASIC"] + categories["ALLOWANCE"]' },
    { id: 'sr-8', name: 'LWF fund', code: 'LWF', category: 'Deduction', structure: 'Regular Salary', sequence: 70, computation: 'Fixed Amount', value: '₹50' },
    { id: 'sr-9', name: 'Provident Fund', code: 'PF', category: 'Deduction', structure: 'Regular Salary', sequence: 80, computation: 'Percentage of Wage', value: '12% of Basic' },
    { id: 'sr-10', name: 'ESIC', code: 'ESIC', category: 'Deduction', structure: 'Regular Salary', sequence: 90, computation: 'Percentage of Wage', value: '0.75% of Gross' },
    { id: 'sr-11', name: 'Professional Tax', code: 'PT', category: 'Deduction', structure: 'Regular Salary', sequence: 100, computation: 'Fixed Amount', value: '₹200' },
    { id: 'sr-12', name: 'Net Salary', code: 'NET', category: 'Net', structure: 'Regular Salary', sequence: 110, computation: 'Python Code', value: 'Gross - Deductions', formula: 'result = categories["GROSS"] - categories["DEDUCTION"]' },
  ]);

  const [search, setSearch] = useState('');
  const [selectedRule, setSelectedRule] = useState<SalaryRuleItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New rule state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<'Basic' | 'Allowance' | 'Gross' | 'Deduction' | 'Net'>('Allowance');
  const [computation, setComputation] = useState<'Fixed Amount' | 'Percentage of Wage' | 'Python Code'>('Fixed Amount');
  const [sequence, setSequence] = useState(120);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: SalaryRuleItem = {
      id: `sr-${Date.now()}`,
      name,
      code: code.toUpperCase(),
      category,
      structure: 'Regular Salary',
      sequence: Number(sequence),
      computation,
      value: computation === 'Fixed Amount' ? '₹5,000' : 'Formula',
    };
    setRules((prev) => [...prev, newRule]);
    setIsCreateModalOpen(false);
    setName('');
    setCode('');
  };

  const filtered = rules.filter((r) =>
    (r.name + ' ' + r.code + ' ' + r.category + ' ' + r.structure).toLowerCase().includes(search.toLowerCase())
  );

  if (selectedRule) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setSelectedRule(null)}
          >
            <ArrowLeft size={16} /> Back to Salary Rules
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
            Salary Rule / {selectedRule.name}
          </h2>
        </div>

        <div className="card" style={{ padding: '24px', maxWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Rule Name</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedRule.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Salary Structure</div>
              <div style={{ fontSize: '15px', fontWeight: 500 }}>{selectedRule.structure}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Code</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>{selectedRule.code}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Computation Method</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRule.computation}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRule.category}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Sequence (Order)</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedRule.sequence}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Computation Note & Expression</h4>
            <div style={{
              background: 'var(--neutral-tint-purple)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'var(--primary)'
            }}>
              {selectedRule.formula || `result = ${selectedRule.value}`}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              • <strong>Fixed Amount:</strong> uses the exact value entered in the rule, e.g. Meal Allowance = 2,000.<br />
              • <strong>Percentage:</strong> calculates as a percentage of a selected base such as Contract Wage or Basic Salary.<br />
              • <strong>Python Code / Formula:</strong> evaluated using AST engine (e.g. <code>result = categories['BASIC']</code>).
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Salary Rules</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Ordered calculation engine rules driving employee payslips
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
            placeholder="Search salary rules…"
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
              <th>Rule Name</th>
              <th>Code</th>
              <th>Category</th>
              <th>Structure</th>
              <th>Sequence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedRule(r)}
                style={{ cursor: 'pointer' }}
                title="Click to view rule formula and computation parameters"
              >
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code2 size={15} color="var(--secondary)" />
                    {r.name}
                  </div>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{r.code}</td>
                <td>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: r.category === 'Basic' ? 'var(--neutral-tint-purple)' :
                      r.category === 'Allowance' ? 'var(--neutral-tint-teal)' :
                      r.category === 'Gross' ? '#e8f5e9' :
                      r.category === 'Deduction' ? '#ffebee' : '#ede7f6',
                    color: r.category === 'Deduction' ? 'var(--danger)' : 'var(--primary)'
                  }}>
                    {r.category}
                  </span>
                </td>
                <td>{r.structure}</td>
                <td style={{ fontWeight: 600 }} className="tabular-nums">{r.sequence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Salary Rule"
      >
        <form onSubmit={handleCreateRule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Rule Name *</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="e.g. Health Insurance Allowance"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Code *</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="e.g. MED_INS"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Category *</label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  <option value="Basic">Basic</option>
                  <option value="Allowance">Allowance</option>
                  <option value="Gross">Gross</option>
                  <option value="Deduction">Deduction</option>
                  <option value="Net">Net</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Sequence *</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  value={sequence}
                  onChange={(e) => setSequence(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Computation Method *</label>
              <select
                className="input-field"
                value={computation}
                onChange={(e) => setComputation(e.target.value as any)}
              >
                <option value="Fixed Amount">Fixed Amount</option>
                <option value="Percentage of Wage">Percentage of Wage</option>
                <option value="Python Code">Python Code (AST Formula)</option>
              </select>
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
              Create Salary Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
