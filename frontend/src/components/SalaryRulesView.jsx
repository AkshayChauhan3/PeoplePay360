import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackRules = [
  { id: 'SR-001', name: 'Basic Salary', category: 'Earnings', computation: '40% of CTC / 12', taxable: true, pfApplicable: true, type: 'Fixed' },
  { id: 'SR-002', name: 'House Rent Allowance', category: 'Earnings', computation: '20% of Basic', taxable: false, pfApplicable: false, type: 'Fixed' },
  { id: 'SR-003', name: 'Transport Allowance', category: 'Earnings', computation: '5% of Basic', taxable: false, pfApplicable: false, type: 'Fixed' },
  { id: 'SR-004', name: 'Special Allowance', category: 'Earnings', computation: 'CTC - All Components', taxable: true, pfApplicable: false, type: 'Variable' },
  { id: 'SR-005', name: 'Performance Bonus', category: 'Earnings', computation: 'Based on rating (0–20% of annual CTC)', taxable: true, pfApplicable: false, type: 'Conditional' },
  { id: 'SR-006', name: 'Provident Fund (Employee)', category: 'Deductions', computation: '12% of Basic (max ₹15,000 base)', taxable: false, pfApplicable: false, type: 'Fixed' },
  { id: 'SR-007', name: 'TDS', category: 'Deductions', computation: 'As per Income Tax slab', taxable: false, pfApplicable: false, type: 'Variable' },
  { id: 'SR-008', name: 'ESI', category: 'Deductions', computation: '0.75% of Gross (if Gross ≤ ₹21,000)', taxable: false, pfApplicable: false, type: 'Conditional' },
  { id: 'SR-009', name: 'Professional Tax', category: 'Deductions', computation: 'State specific (typically ₹200/mo)', taxable: false, pfApplicable: false, type: 'Fixed' },
];

const typeStyle = { Fixed: { bg: '#eef7f7', text: '#005166' }, Variable: { bg: '#f6f0f7', text: '#3b123f' }, Conditional: { bg: '#fff7ed', text: '#b45309' } };

const normalizeRule = (r, idx) => ({
  id: r.code || r.id || `SR-00${idx + 1}`,
  name: r.name || 'Component Rule',
  category: r.category === 'DEDUCTION' ? 'Deductions' : 'Earnings',
  computation: r.formula || r.computation || 'Fixed calculation',
  taxable: r.taxable !== undefined ? r.taxable : true,
  pfApplicable: r.pf_applicable !== undefined ? r.pf_applicable : false,
  type: r.type || 'Fixed',
});

const SalaryRulesView = () => {
  const [rules, setRules] = useState(fallbackRules);
  const [showModal, setShowModal] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', category: 'Earnings', type: 'Fixed', computation: '10% of Basic', taxable: true, pfApplicable: false });

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const data = await apiService.getSalaryRules();
        if (Array.isArray(data) && data.length > 0) {
          setRules(data.map(normalizeRule));
        }
      } catch (err) {
        console.warn('Using fallback salary rules:', err);
      }
    };
    fetchRules();
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setRules(prev => [normalizeRule({ ...newRule, id: `SR-00${prev.length + 1}` }, prev.length), ...prev]);
    setShowModal(false);
    setNewRule({ name: '', category: 'Earnings', type: 'Fixed', computation: '10% of Basic', taxable: true, pfApplicable: false });
  };

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Salary Rules</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Configure earnings, deductions, and computation logic.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Rule
        </button>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Rule Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Computation</th>
              <th>Taxable</th>
              <th>PF Applicable</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => {
              const ts = typeStyle[r.type] || {};
              const isEarning = r.category === 'Earnings';
              return (
                <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{r.id}</span></td>
                  <td className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.name}</td>
                  <td><span style={{ background: isEarning ? '#eaf5ef' : '#fff2f2', color: isEarning ? '#0b7a42' : '#b71c1c', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.category}</span></td>
                  <td><span style={{ background: ts.bg, color: ts.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.type}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '220px' }}>{r.computation}</td>
                  <td><span style={{ fontSize: '0.7rem', fontWeight: 700, color: r.taxable ? '#0b7a42' : 'var(--text-secondary)' }}>{r.taxable ? '✓ Yes' : 'No'}</span></td>
                  <td><span style={{ fontSize: '0.7rem', fontWeight: 700, color: r.pfApplicable ? '#0b7a42' : 'var(--text-secondary)' }}>{r.pfApplicable ? '✓ Yes' : 'No'}</span></td>
                  <td>
                    <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Rule Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '450px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>New Salary Rule</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Rule Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newRule.name} 
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })} 
                  placeholder="e.g. Remote Work Subsidy"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                  <select 
                    className="control-select" 
                    style={{ width: '100%' }}
                    value={newRule.category} 
                    onChange={e => setNewRule({ ...newRule, category: e.target.value })}
                  >
                    <option value="Earnings">Earnings</option>
                    <option value="Deductions">Deductions</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Type</label>
                  <select 
                    className="control-select" 
                    style={{ width: '100%' }}
                    value={newRule.type} 
                    onChange={e => setNewRule({ ...newRule, type: e.target.value })}
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Variable">Variable</option>
                    <option value="Conditional">Conditional</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Formula / Computation Expression</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newRule.computation} 
                  onChange={e => setNewRule({ ...newRule, computation: e.target.value })} 
                  placeholder="e.g. 5% of Basic or Fixed 2500"
                />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newRule.taxable} 
                    onChange={e => setNewRule({ ...newRule, taxable: e.target.checked })} 
                  />
                  Subject to Income Tax
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newRule.pfApplicable} 
                    onChange={e => setNewRule({ ...newRule, pfApplicable: e.target.checked })} 
                  />
                  PF Applicable
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SalaryRulesView;
