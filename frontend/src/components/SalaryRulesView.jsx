import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import EntityCombobox from './EntityCombobox';

const typeStyle = { 
  PERCENTAGE: { bg: '#eef7f7', text: '#005166' }, 
  FORMULA: { bg: '#f6f0f7', text: '#3b123f' }, 
  FIXED: { bg: '#fff7ed', text: '#b45309' },
  Fixed: { bg: '#fff7ed', text: '#b45309' },
  Variable: { bg: '#eef7f7', text: '#005166' },
};

const normalizeRule = (r, idx) => {
  const compType = r.computation_type || r.type || 'FIXED';
  let compDesc = 'System calculated';
  if (compType === 'PERCENTAGE') {
    compDesc = `${r.percentage}% of ${r.percentage_base || 'Wage'}`;
  } else if (compType === 'FORMULA') {
    compDesc = r.formula || 'Formula rule';
  } else if (r.fixed_amount !== null && r.fixed_amount !== undefined) {
    compDesc = `₹${Number(r.fixed_amount).toLocaleString('en-IN')} flat`;
  } else if (r.computation) {
    compDesc = r.computation;
  }

  const category = (r.category || 'ALLOWANCE').toUpperCase();
  const isDeduction = category === 'DEDUCTION';

  return {
    id: r.code || `SR-${String(r.id || idx + 1).padStart(3, '0')}`,
    rawId: r.id,
    structureId: r.salary_structure_id,
    name: r.name || 'Component Rule',
    category: isDeduction ? 'Deduction' : (category === 'GROSS' ? 'Gross Aggregator' : (category === 'NET' ? 'Net Disbursed' : 'Earnings')),
    rawCategory: category,
    computation: compDesc,
    fixedAmount: r.fixed_amount,
    percentage: r.percentage,
    percentageBase: r.percentage_base,
    formula: r.formula,
    taxable: r.taxable !== undefined ? r.taxable : !isDeduction,
    pfApplicable: r.pf_applicable !== undefined ? r.pf_applicable : (r.code === 'PF' || r.code === 'BASIC'),
    type: compType,
    isActive: r.is_active !== undefined ? r.is_active : true,
    sequence: r.sequence || idx + 1,
  };
};

const SalaryRulesView = () => {
  const [rules, setRules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [selectedStructureId, setSelectedStructureId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [formData, setFormData] = useState({
    structureId: 1,
    name: '',
    code: '',
    category: 'ALLOWANCE',
    sequence: 10,
    type: 'PERCENTAGE',
    percentage: '40',
    percentageBase: 'BASIC',
    fixedAmount: '5000',
    formula: 'BASIC * 0.4',
    isActive: true,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, structuresRes] = await Promise.allSettled([
        apiService.getSalaryRules(),
        apiService.getSalaryStructures(),
      ]);

      if (rulesRes.status === 'fulfilled') {
        const data = rulesRes.value;
        const items = data?.items || (Array.isArray(data) ? data : []);
        setRules(items.map(normalizeRule));
      }

      if (structuresRes.status === 'fulfilled') {
        const sData = structuresRes.value;
        const sList = sData?.items || (Array.isArray(sData) ? sData : []);
        setStructures(sList);
        if (sList.length > 0) {
          setFormData(f => ({ ...f, structureId: sList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch salary data:', err);
      setError(err.message || 'Unable to load salary rules.');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const openNew = () => {
    setEditRule(null);
    setFormData({
      structureId: structures[0]?.id || 1,
      name: '',
      code: '',
      category: 'ALLOWANCE',
      sequence: (rules.length + 1) * 10,
      type: 'PERCENTAGE',
      percentage: '40',
      percentageBase: 'BASIC',
      fixedAmount: '5000',
      formula: 'BASIC * 0.4',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditRule(r);
    setFormData({
      structureId: r.structureId || structures[0]?.id || 1,
      name: r.name,
      code: r.id,
      category: r.rawCategory || 'ALLOWANCE',
      sequence: r.sequence,
      type: r.type,
      percentage: r.percentage !== null && r.percentage !== undefined ? String(r.percentage) : '40',
      percentageBase: r.percentageBase || 'BASIC',
      fixedAmount: r.fixedAmount !== null && r.fixedAmount !== undefined ? String(r.fixedAmount) : '5000',
      formula: r.formula || 'BASIC * 0.4',
      isActive: r.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const codeClean = formData.code.trim().toUpperCase() || formData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);
      
      let computationPayload = {};
      if (formData.type === 'PERCENTAGE') {
        computationPayload = {
          percentage: Number(formData.percentage) || 0,
          percentage_base: formData.percentageBase.trim().toUpperCase() || 'BASIC',
          fixed_amount: null,
          formula: null,
        };
      } else if (formData.type === 'FIXED') {
        computationPayload = {
          fixed_amount: Number(formData.fixedAmount) || 0,
          percentage: null,
          percentage_base: null,
          formula: null,
        };
      } else if (formData.type === 'FORMULA') {
        computationPayload = {
          formula: formData.formula.trim(),
          fixed_amount: null,
          percentage: null,
          percentage_base: null,
        };
      }

      if (editRule && editRule.rawId) {
        // Update rule
        const updatePayload = {
          name: formData.name.trim(),
          code: codeClean,
          category: formData.category,
          sequence: Number(formData.sequence) || 10,
          computation_type: formData.type,
          ...computationPayload,
          is_active: formData.isActive,
        };
        await apiService.updateSalaryRule(editRule.rawId, updatePayload);
        showToast(`Rule ${codeClean} updated successfully!`);
      } else {
        // Create rule
        const createPayload = {
          salary_structure_id: Number(formData.structureId) || (structures[0]?.id || 1),
          name: formData.name.trim(),
          code: codeClean,
          category: formData.category,
          sequence: Number(formData.sequence) || 10,
          computation_type: formData.type,
          ...computationPayload,
          is_active: formData.isActive,
        };
        await apiService.createSalaryRule(createPayload);
        showToast(`Salary rule ${codeClean} created successfully!`);
      }

      setShowModal(false);
      // Refresh list
      const fresh = await apiService.getSalaryRules();
      const freshItems = fresh?.items || (Array.isArray(fresh) ? fresh : []);
      setRules(freshItems.map(normalizeRule));
    } catch (err) {
      console.error('Failed to save salary rule:', err);
      alert(`Error saving rule: ${err.message || 'Validation failed'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r) => {
    if (!r.rawId) return;
    if (!window.confirm(`Are you sure you want to delete salary rule "${r.name}" (${r.id})?`)) {
      return;
    }
    try {
      await apiService.deleteSalaryRule(r.rawId);
      showToast(`Rule ${r.id} deleted successfully.`);
      setRules(prev => prev.filter(item => item.rawId !== r.rawId));
    } catch (err) {
      console.error('Failed to delete salary rule:', err);
      alert(`Failed to delete rule: ${err.message || 'Cannot delete rule with active dependencies.'}`);
    }
  };

  const handleExportCSV = () => {
    if (rules.length === 0) {
      alert('No salary rules to export.');
      return;
    }
    const headers = ['Rule ID', 'Rule Name', 'Category', 'Type', 'Computation', 'Sequence', 'Status'];
    const rows = filteredRules.map(r => [
      `"${r.id}"`,
      `"${r.name}"`,
      `"${r.category}"`,
      `"${r.type}"`,
      `"${r.computation.replace(/"/g, '""')}"`,
      r.sequence,
      r.isActive ? 'Active' : 'Inactive'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_Rules_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRules = selectedStructureId === 'ALL'
    ? rules
    : rules.filter(r => String(r.structureId) === String(selectedStructureId));

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL • LIVE DATABASE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Salary Rules</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Configure earnings, deductions, and computation logic across structures.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {structures.length > 0 && (
            <select
              className="control-select"
              style={{ height: '38px', borderRadius: '6px', fontSize: '0.85rem' }}
              value={selectedStructureId}
              onChange={e => setSelectedStructureId(e.target.value)}
            >
              <option value="ALL">All Salary Structures ({structures.length})</option>
              {structures.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
          <button 
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button 
            onClick={openNew}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Rule
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Sequence</th>
              <th>Rule ID</th>
              <th>Rule Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Computation</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading salary rules...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRules.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No salary rules found</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      No salary computation rules configured yet for this structure. Click "+ New Rule" above to create basic, HRA, allowance or deduction rules.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRules.map(r => {
                const ts = typeStyle[r.type] || {};
                const isEarning = r.category === 'Earnings' || r.rawCategory === 'BASIC' || r.rawCategory === 'ALLOWANCE';
                return (
                  <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td className="font-mono text-xs font-semibold">{r.sequence}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, background: '#f0f4f8', color: '#1e3a8a', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.id}</span></td>
                    <td className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.name}</td>
                    <td><span style={{ background: isEarning ? '#eaf5ef' : '#fff2f2', color: isEarning ? '#0b7a42' : '#b71c1c', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.category}</span></td>
                    <td><span style={{ background: ts.bg, color: ts.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.type}</span></td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '240px' }}>{r.computation}</td>
                    <td>
                      <span className={`badge ${r.isActive ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEdit(r)}
                          style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          style={{ fontSize: '0.7rem', fontWeight: 600, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontFamily: 'inherit' }}
                          title="Delete rule"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New / Edit Rule Modal */}
      {showModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(3px)' }}
        >
          <div style={{ background: '#fff', borderRadius: '14px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'modalPop 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border-structural)', background: 'var(--surface-structural, #f7fafa)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SALARY RULE CONFIGURATION</div>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {editRule ? `Edit Rule — ${editRule.name}` : 'New Salary Rule'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border-structural)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              
              {!editRule && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Parent Salary Structure *</label>
                  <EntityCombobox
                    options={structures.map(s => ({ id: s.id, label: s.name, sublabel: s.code }))}
                    value={formData.structureId}
                    onChange={(val) => setFormData(f => ({ ...f, structureId: val ? Number(val) : '' }))}
                    placeholder="Search or select salary structure..."
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rule Name *</label>
                  <input
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. House Rent Allowance"
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Code (Unique) *</label>
                  <input
                    type="text" required
                    value={formData.code}
                    onChange={e => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. HRA"
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category *</label>
                  <select className="control-select" style={{ width: '100%', height: 38 }} value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}>
                    <option value="BASIC">BASIC</option>
                    <option value="ALLOWANCE">ALLOWANCE</option>
                    <option value="GROSS">GROSS</option>
                    <option value="DEDUCTION">DEDUCTION</option>
                    <option value="NET">NET</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Computation Type *</label>
                  <select className="control-select" style={{ width: '100%', height: 38 }} value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                    <option value="FIXED">FIXED</option>
                    <option value="FORMULA">FORMULA</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sequence *</label>
                  <input
                    type="number" required min="1" max="9999"
                    value={formData.sequence}
                    onChange={e => setFormData(f => ({ ...f, sequence: e.target.value }))}
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Dynamic Inputs Based on Computation Type */}
              {formData.type === 'PERCENTAGE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)' }}>Percentage Rate (%) *</label>
                    <input
                      type="number" required min="0" max="100" step="0.01"
                      value={formData.percentage}
                      onChange={e => setFormData(f => ({ ...f, percentage: e.target.value }))}
                      placeholder="40.0"
                      style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)' }}>Percentage Base Code *</label>
                    <input
                      type="text" required
                      value={formData.percentageBase}
                      onChange={e => setFormData(f => ({ ...f, percentageBase: e.target.value.toUpperCase() }))}
                      placeholder="e.g. BASIC"
                      style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {formData.type === 'FIXED' && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)' }}>Fixed Flat Amount (₹) *</label>
                  <input
                    type="number" required min="0" step="0.01"
                    value={formData.fixedAmount}
                    onChange={e => setFormData(f => ({ ...f, fixedAmount: e.target.value }))}
                    placeholder="5000.00"
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {formData.type === 'FORMULA' && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary)' }}>Formula Expression *</label>
                  <input
                    type="text" required
                    value={formData.formula}
                    onChange={e => setFormData(f => ({ ...f, formula: e.target.value }))}
                    placeholder="e.g. BASIC * 0.4 + HRA"
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border-structural)', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(f => ({ ...f, isActive: e.target.checked }))} />
                  Rule is Active
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, height: 38, borderRadius: '8px', border: '1px solid var(--border-structural)', background: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-secondary)' }}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ flex: 2, height: 38, borderRadius: '8px', border: 'none', background: 'var(--primary, #0f4c81)', color: '#fff', cursor: submitting ? 'wait' : 'pointer', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit' }}
                >
                  {submitting ? 'Saving to Database...' : (editRule ? 'Save Changes' : 'Create Salary Rule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SalaryRulesView;
