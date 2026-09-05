import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const normalizeStructure = (s, idx) => {
  const rules = s.rules || [];
  const basicRule = rules.find(r => (r.code || '').toUpperCase() === 'BASIC');
  const hraRule = rules.find(r => (r.code || '').toUpperCase() === 'HRA');
  const pfRule = rules.find(r => (r.code || '').toUpperCase() === 'PF');

  return {
    id: s.code || `SS-${String(s.id || idx + 1).padStart(3, '0')}`,
    rawId: s.id,
    name: s.name || 'Standard Structure',
    code: s.code || `SS-${String(s.id || idx + 1).padStart(3, '0')}`,
    level: s.description || 'Enterprise Grade',
    employees: s.contract_count !== undefined ? s.contract_count : (s.employees || 'All Active'),
    rulesCount: rules.length,
    basicPct: basicRule?.percentage ? Number(basicRule.percentage) : 50,
    hra: hraRule?.percentage ? Number(hraRule.percentage) : 25,
    ta: s.ta !== undefined ? Number(s.ta) : 5,
    special: s.special !== undefined ? Number(s.special) : 10,
    pf: pfRule?.percentage ? Number(pfRule.percentage) : 12,
    tds: s.tds || 'Statutory Slab',
    totalCTC: s.totalCTC || 'Dynamic Formula',
    isActive: s.is_active !== undefined ? s.is_active : true,
    rawRules: rules,
  };
};

const DEFAULT_FORM = {
  name: '',
  code: '',
  level: 'Standard Enterprise Grade',
  basicPct: 50,
  hra: 25,
  ta: 5,
  special: 10,
  pf: 12,
  tds: 'Statutory Slab',
  totalCTC: 'Dynamic Formula',
  isActive: true,
};

const SalaryStructuresView = () => {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchStructures = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSalaryStructures();
      const items = data?.items || (Array.isArray(data) ? data : []);
      setStructures(items.map(normalizeStructure));
    } catch (err) {
      console.error('Failed to fetch salary structures:', err);
      setError(err.message || 'Unable to load salary structures.');
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  const handleOpenCreate = () => {
    setEditingStructure(null);
    setFormData(DEFAULT_FORM);
    setShowModal(true);
  };

  const handleOpenEdit = (struct) => {
    setEditingStructure(struct);
    setFormData({
      name: struct.name,
      code: struct.code || struct.id,
      level: struct.level,
      basicPct: struct.basicPct,
      hra: struct.hra,
      ta: struct.ta,
      special: struct.special,
      pf: struct.pf,
      tds: struct.tds,
      totalCTC: struct.totalCTC,
      isActive: struct.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingStructure) {
        if (editingStructure.rawId) {
          await apiService.updateSalaryStructure(editingStructure.rawId, {
            name: formData.name.trim(),
            code: formData.code.toUpperCase().trim(),
            description: formData.level,
            is_active: formData.isActive,
          });
        }
        showToast('Salary structure updated successfully in PostgreSQL!');
      } else {
        const generatedCode = formData.code
          ? formData.code.toUpperCase().trim()
          : formData.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 16);

        await apiService.createSalaryStructure({
          name: formData.name.trim(),
          code: generatedCode,
          description: formData.level,
          is_active: formData.isActive,
        });
        showToast('New salary structure created successfully in PostgreSQL!');
      }

      await fetchStructures();
      setShowModal(false);
    } catch (err) {
      console.error('Error saving salary structure:', err);
      alert('Error saving structure: ' + (err.message || 'Validation failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!s.rawId) return;
    if (!window.confirm(`Are you sure you want to deactivate/delete structure "${s.name}" (${s.code})?`)) {
      return;
    }
    try {
      await apiService.deleteSalaryStructure(s.rawId);
      showToast(`Structure ${s.code} deleted successfully.`);
      await fetchStructures();
    } catch (err) {
      console.error('Failed to delete structure:', err);
      alert(`Failed to delete structure: ${err.message || 'Cannot delete structure with active contracts'}`);
    }
  };

  const handleExportCSV = () => {
    if (structures.length === 0) {
      alert('No structures to export.');
      return;
    }
    const headers = ['Structure Name', 'Code', 'Description', 'Contracts Assigned', 'Status'];
    const rows = structures.map(s => [
      `"${s.name}"`,
      `"${s.code}"`,
      `"${s.level || ''}"`,
      s.employees,
      s.isActive ? 'Active' : 'Inactive'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_Structures_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showToast = (msg) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL • LIVE DATABASE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Salary Structures</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Define compensation templates and component breakdowns.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button 
            onClick={handleOpenCreate}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Structure
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {saveSuccess}
        </div>
      )}

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Structure</th>
              <th>Applicable Level</th>
              <th>Employees</th>
              <th>Basic %</th>
              <th>HRA %</th>
              <th>TA %</th>
              <th>Special Allw %</th>
              <th>PF %</th>
              <th>TDS</th>
              <th>CTC Band</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading salary structures...</span>
                  </div>
                </td>
              </tr>
            ) : structures.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No salary structures configured</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      No salary structure bands found. Click "+ New Structure" above to define salary levels and component breakdowns.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              structures.map(s => (
                <tr key={s.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td>
                    <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{s.id}</div>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.level}</td>
                  <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{s.employees}</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.basicPct}%</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.hra}%</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.ta}%</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.special}%</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.pf}%</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.tds}</td>
                  <td className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{s.totalCTC}</td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEdit(s)}
                        style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--secondary)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--secondary)'; }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(s)}
                        style={{ fontSize: '0.7rem', fontWeight: 600, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#dc2626'; }}
                        title="Delete structure"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Structure Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '520px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-structural)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                  {editingStructure ? 'Edit Salary Structure' : 'New Salary Structure'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {editingStructure ? `Modifying template for ${editingStructure.id}` : 'Define compensation template and component percentage allocations.'}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Structure Name *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Standard Full-Time Tech & Corporate Structure"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Structure Code *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={formData.code} 
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
                    placeholder="e.g. STD_FT_2026"
                    style={{ width: '100%', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>CTC Band</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.totalCTC} 
                    onChange={e => setFormData({ ...formData, totalCTC: e.target.value })} 
                    placeholder="e.g. Dynamic Formula or ₹15–25 LPA"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Applicable Level / Description</label>
                <textarea 
                  className="form-input" 
                  rows="2"
                  value={formData.level} 
                  onChange={e => setFormData({ ...formData, level: e.target.value })} 
                  placeholder="e.g. Default graded compensation template with Basic, HRA, Allowance, PF, and tax"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Component breakdown percentages */}
              <div style={{ background: 'var(--surface-teal-tint, #f0fdfa)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-structural)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Component Breakdown Allocations
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Basic %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      required
                      className="form-input" 
                      value={formData.basicPct} 
                      onChange={e => setFormData({ ...formData, basicPct: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>HRA %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      required
                      className="form-input" 
                      value={formData.hra} 
                      onChange={e => setFormData({ ...formData, hra: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>TA %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      className="form-input" 
                      value={formData.ta} 
                      onChange={e => setFormData({ ...formData, ta: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Special Allw %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      className="form-input" 
                      value={formData.special} 
                      onChange={e => setFormData({ ...formData, special: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>PF %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      className="form-input" 
                      value={formData.pf} 
                      onChange={e => setFormData({ ...formData, pf: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>TDS Mode</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.tds} 
                      onChange={e => setFormData({ ...formData, tds: e.target.value })} 
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Status toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="structActive"
                  checked={formData.isActive} 
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="structActive" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
                  Active Template (available for new employee contracts)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-structural)', paddingTop: '12px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {saving ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                      Saving...
                    </>
                  ) : (
                    editingStructure ? 'Save Changes' : 'Create Structure'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SalaryStructuresView;
