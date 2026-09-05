import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackStructures = [
  { id: 'SS-001', name: 'Executive Grade', level: 'C-Suite / VP', employees: 8, basicPct: 40, hra: 20, ta: 5, special: 25, pf: 12, tds: 'As applicable', totalCTC: '₹50–120 LPA' },
  { id: 'SS-002', name: 'Senior Tech Band', level: 'L6–L7', employees: 22, basicPct: 40, hra: 20, ta: 5, special: 20, pf: 12, tds: '30%', totalCTC: '₹22–40 LPA' },
  { id: 'SS-003', name: 'Mid Tech Band', level: 'L4–L5', employees: 64, basicPct: 40, hra: 20, ta: 5, special: 15, pf: 12, tds: '20%', totalCTC: '₹12–22 LPA' },
  { id: 'SS-004', name: 'Junior Tech Band', level: 'L1–L3', employees: 38, basicPct: 40, hra: 20, ta: 5, special: 10, pf: 12, tds: '10%', totalCTC: '₹4–12 LPA' },
  { id: 'SS-005', name: 'Sales & Growth Band', level: 'All Sales Roles', employees: 31, basicPct: 35, hra: 15, ta: 5, special: 20, pf: 12, tds: 'Variable', totalCTC: '₹8–55 LPA' },
];

const normalizeStructure = (s, idx) => ({
  id: s.code || s.id || `SS-00${idx + 1}`,
  name: s.name || 'Standard Structure',
  level: s.level || 'All Employees',
  employees: s.contract_count !== undefined ? s.contract_count : (s.employees || 25),
  basicPct: s.basicPct || 40,
  hra: s.hra || 20,
  ta: s.ta || 5,
  special: s.special || 20,
  pf: s.pf || 12,
  tds: s.tds || 'Variable',
  totalCTC: s.totalCTC || 'Market Standard',
});

const SalaryStructuresView = () => {
  const [structures, setStructures] = useState(fallbackStructures);
  const [showModal, setShowModal] = useState(false);
  const [newStruct, setNewStruct] = useState({ name: '', level: 'Mid Level', basicPct: 40, hra: 20, pf: 12, totalCTC: '₹15–25 LPA' });

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const data = await apiService.getSalaryStructures();
        if (Array.isArray(data) && data.length > 0) {
          setStructures(data.map(normalizeStructure));
        }
      } catch (err) {
        console.warn('Using fallback salary structures:', err);
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
            {structures.map(s => (
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
            ))}
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
