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
    level: s.description || 'Enterprise Grade',
    employees: s.contract_count !== undefined ? s.contract_count : (s.employees || 'All Active'),
    rulesCount: rules.length,
    basicPct: basicRule?.percentage ? Number(basicRule.percentage) : 50,
    hra: hraRule?.percentage ? Number(hraRule.percentage) : 40,
    ta: 5,
    special: 10,
    pf: pfRule?.percentage ? Number(pfRule.percentage) : 12,
    tds: 'Statutory Slab',
    totalCTC: s.totalCTC || 'Dynamic Formula',
    isActive: s.is_active !== undefined ? s.is_active : true,
  };
};

const SalaryStructuresView = () => {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newStruct, setNewStruct] = useState({ name: '', level: 'Mid Level', basicPct: 40, hra: 20, pf: 12, totalCTC: '₹15–25 LPA' });

  useEffect(() => {
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
    fetchStructures();
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setStructures(prev => [normalizeStructure({ ...newStruct, id: `SS-00${prev.length + 1}` }, prev.length), ...prev]);
    setShowModal(false);
    setNewStruct({ name: '', level: 'Mid Level', basicPct: 40, hra: 20, pf: 12, totalCTC: '₹15–25 LPA' });
  };

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYROLL</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Salary Structures</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Define compensation templates and component breakdowns.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Structure
        </button>
      </div>

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
                      <button style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--secondary)', background: 'none', border: '1px solid var(--border-structural)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Structure Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '450px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>New Salary Structure</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Structure Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newStruct.name} 
                  onChange={e => setNewStruct({ ...newStruct, name: e.target.value })} 
                  placeholder="e.g. Lead Architect Tier"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Level / Grade</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newStruct.level} 
                  onChange={e => setNewStruct({ ...newStruct, level: e.target.value })} 
                  placeholder="e.g. L7 Principal"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Basic Salary %</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newStruct.basicPct} 
                    onChange={e => setNewStruct({ ...newStruct, basicPct: Number(e.target.value) })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>HRA %</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newStruct.hra} 
                    onChange={e => setNewStruct({ ...newStruct, hra: Number(e.target.value) })} 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SalaryStructuresView;
