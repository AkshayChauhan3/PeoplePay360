import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import EntityCombobox from './EntityCombobox';

/* ── level colour map ── */
const levelColors = {
  'C-Suite': { bg: '#f3e8ff', text: '#6b21a8' },
  'VP':      { bg: '#dbeafe', text: '#1d4ed8' },
  'L7':      { bg: '#f3e8ff', text: '#6b21a8' },
  'L6':      { bg: '#d1fae5', text: '#065f46' },
  'L5':      { bg: '#fef3c7', text: '#92400e' },
  'L4':      { bg: '#f1f5f9', text: '#475569' },
};

/* ── derive level from title ── */
const deriveLevel = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('vp') || n.includes('vice president') || n.includes('head of')) return 'VP';
  if (n.includes('chief') || n.includes('ceo') || n.includes('cto') || n.includes('cfo')) return 'C-Suite';
  if (n.includes('director') || n.includes('principal')) return 'L7';
  if (n.includes('senior') || n.includes('manager') || n.includes('lead')) return 'L6';
  if (n.includes('junior') || n.includes('associate')) return 'L5';
  return 'L4';
};

/* ── export positions to CSV ── */
const exportCSV = (positions) => {
  const headers = ['Code', 'Title', 'Department', 'Level', 'Type', 'Filled', 'Open', 'Location', 'Salary Band', 'Status'];
  const rows = positions.map(p => [
    p.id, p.title, p.dept, p.level, p.type, p.filled, p.openings, p.location, p.salary,
    p.openings > 0 ? 'Hiring' : 'Closed',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `job_positions_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

/* ══════════════════════════════════════════
   DETAIL DRAWER
══════════════════════════════════════════ */
function PositionDrawer({ pos, employees, onClose, onEdit }) {
  const ref = useRef(null);

  /* Close on backdrop click */
  const handleBackdrop = (e) => { if (e.target === ref.current) onClose(); };

  /* ESC key */
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const lc        = levelColors[pos.level] || { bg: '#f1f5f9', text: '#475569' };
  const posEmps   = employees.filter(e => e.job_position_id === pos.rawId);
  const statusColor = { active: '#16a34a', on_leave: '#d97706', inactive: '#9ca3af', terminated: '#dc2626' };

  const detail = [
    { label: 'Position Code',     value: pos.id },
    { label: 'Department',        value: pos.dept },
    { label: 'Seniority Level',   value: pos.level },
    { label: 'Employment Type',   value: pos.type },
    { label: 'Location',          value: pos.location },
    { label: 'Salary Band',       value: pos.salary },
    { label: 'Filled Headcount',  value: pos.filled },
    { label: 'Open Vacancies',    value: pos.openings },
    { label: 'Status',            value: pos.openings > 0 ? 'Actively Hiring' : 'Closed' },
  ];

  return (
    <div
      ref={ref}
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10000,
        display: 'flex', justifyContent: 'flex-end',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        width: '480px', maxWidth: '95vw', height: '100%',
        background: 'var(--bg-canvas, #fff)', boxShadow: '-8px 0 48px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'drawerSlideIn 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border-structural)', background: 'var(--surface-structural, #f7fafa)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Job Position
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{pos.title}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{pos.id} · {pos.dept}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border-structural)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ ...lc, padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>{pos.level}</span>
            <span style={{ background: pos.openings > 0 ? '#d1fae5' : '#f1f5f9', color: pos.openings > 0 ? '#065f46' : '#64748b', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
              {pos.openings > 0 ? `🟢 Actively Hiring (${pos.openings} open)` : '⚫ Closed'}
            </span>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>{pos.type}</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Details grid */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Position Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {detail.map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--surface-structural, #f7fafa)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-structural)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Employees in this role */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Employees in This Role ({posEmps.length})
            </div>
            {posEmps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface-structural)', borderRadius: '10px', border: '1px dashed var(--border-structural)' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🪑</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>No employees assigned yet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {pos.openings > 0 ? `${pos.openings} vacant seat(s) available` : 'Position is closed'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {posEmps.map(emp => {
                  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const sc = statusColor[emp.status] || '#9ca3af';
                  return (
                    <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--surface-structural)', borderRadius: '8px', border: '1px solid var(--border-structural)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {initials || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{emp.employee_code} · Joined {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</div>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: sc + '18', color: sc, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {emp.status?.replace('_', ' ') || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-structural)', display: 'flex', gap: '10px', background: 'var(--surface-structural, #f7fafa)' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 38, borderRadius: '8px', border: '1px solid var(--border-structural)', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
          >
            Close
          </button>
          <button
            style={{ flex: 2, height: 38, borderRadius: '8px', border: 'none', background: 'var(--primary, #6366f1)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit' }}
            onClick={() => { onClose(); onEdit(pos); }}
          >
            ✏️ Edit Position
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   NEW POSITION MODAL
══════════════════════════════════════════ */
function NewPositionModal({ departments, editPos, onClose, onSaved }) {
  const isEditing = !!editPos;
  const [form, setForm] = useState({
    name:               editPos?.title          || '',
    code:               editPos?.code           || editPos?.id || '',
    department_id:      editPos?.deptId         || (departments?.[0]?.id || ''),
    level:              editPos?.level          || 'L4',
    type:               editPos?.type           || 'Full-time',
    location:           editPos?.location       || 'Corporate HQ',
    salary:             editPos?.salary         || '₹12–24 LPA',
    expected_employees: editPos?.filled != null ? editPos.filled + editPos.openings : 1,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Position title is required';
    if (!form.code.trim()) e.code = 'Job code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setErrors({});
    try {
      const desc = `${form.level} | ${form.type} | ${form.location}`;
      const codeVal = form.code.trim().toUpperCase();
      if (isEditing && editPos) {
        if (editPos.rawId) {
          await apiService.updateJobPosition(editPos.rawId, {
            name: form.name.trim(),
            code: codeVal,
            description: desc,
          });
        }
      } else {
        await apiService.createJobPosition({
          name: form.name.trim(),
          code: codeVal,
          description: desc,
        });
      }
      onSaved();
    } catch (err) {
      console.error('Error saving job position:', err);
      let msg = 'Failed to save position. Please try again.';
      if (typeof err?.message === 'string') {
        msg = err.message;
      } else if (err?.data?.detail) {
        msg = typeof err.data.detail === 'string' ? err.data.detail : JSON.stringify(err.data.detail);
      }
      setErrors({ submit: msg });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%', height: 38, padding: '0 10px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.85rem',
    border: `1px solid ${errors[field] ? '#dc2626' : 'var(--border-structural)'}`,
    background: 'var(--bg-canvas, #fff)', color: 'var(--text-primary)', boxSizing: 'border-box',
    outline: 'none',
  });

  const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
      <div style={{ background: 'var(--bg-canvas, #fff)', borderRadius: '16px', width: '500px', maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'modalPop 0.25s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Modal header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-structural)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>WORKFORCE CORE</div>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
            {isEditing ? `Edit — ${editPos.title}` : 'New Job Position'}
          </h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-structural)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errors.submit && (
            <div style={{ background: '#fff2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', color: '#dc2626' }}>
              {errors.submit}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>Position Title *</label>
            <input
              style={inputStyle('name')}
              placeholder="e.g. Senior Backend Engineer"
              value={form.name}
              onChange={e => {
                const val = e.target.value;
                set('name', val);
                if (!isEditing && (!form.code || form.code.startsWith('POS_'))) {
                  set('code', ('POS_' + val.toUpperCase().replace(/[^A-Z0-9]/g, '_')).slice(0, 30));
                }
              }}
            />
            {errors.name && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px' }}>{errors.name}</div>}
          </div>

          {/* Code */}
          <div>
            <label style={labelStyle}>Position Code *</label>
            <input
              style={inputStyle('code')}
              placeholder="e.g. ENG_SR_BE"
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
            />
            {errors.code && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px' }}>{errors.code}</div>}
          </div>

          {/* Department */}
          <div>
            <label style={labelStyle}>Department *</label>
            <EntityCombobox
              value={form.department_id}
              onChange={(id) => set('department_id', id ?? '')}
              options={departments.map(d => ({ id: d.id, label: d.name, sublabel: d.code }))}
              placeholder="Search or enter department ID…"
              required
            />
            {errors.department_id && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px' }}>{errors.department_id}</div>}
          </div>

          {/* Level + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Seniority Level</label>
              <select style={inputStyle('level')} value={form.level} onChange={e => set('level', e.target.value)}>
                {['L4', 'L5', 'L6', 'L7', 'VP', 'C-Suite'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employment Type</label>
              <select style={inputStyle('type')} value={form.type} onChange={e => set('type', e.target.value)}>
                {['Full-time', 'Part-time', 'Contract', 'Internship'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Location + Salary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle('location')} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Corporate HQ" />
            </div>
            <div>
              <label style={labelStyle}>Salary Band</label>
              <input style={inputStyle('salary')} value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="e.g. ₹12–24 LPA" />
            </div>
          </div>

          {/* Openings */}
          <div>
            <label style={labelStyle}>Target Headcount</label>
            <input type="number" min={1} max={100} style={inputStyle('expected_employees')} value={form.expected_employees} onChange={e => set('expected_employees', e.target.value)} />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 40, borderRadius: '8px', border: '1px solid var(--border-structural)', background: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, height: 40, borderRadius: '8px', border: 'none', background: saving ? '#a5b4fc' : 'var(--primary, #6366f1)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : (isEditing ? 'Save Changes' : 'Create Position')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN VIEW
══════════════════════════════════════════ */
const JobPositionsView = () => {
  const [positions,    setPositions]    = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [selectedPos,  setSelectedPos]  = useState(null);   // drawer
  const [editPos,      setEditPos]      = useState(null);   // position being edited
  const [showNewModal, setShowNewModal] = useState(false);  // new/edit modal

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [posRes, empRes, deptRes] = await Promise.allSettled([
        apiService.getJobPositions(),
        apiService.getEmployees({ limit: 200 }),
        apiService.getDepartments(),
      ]);

      const rawPos  = posRes.status  === 'fulfilled' && Array.isArray(posRes.value)  ? posRes.value  : [];
      const rawEmps = empRes.status  === 'fulfilled'
        ? (empRes.value?.items || (Array.isArray(empRes.value) ? empRes.value : []))
        : [];
      const rawDepts = deptRes.status === 'fulfilled'
        ? (Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value?.items ?? []))
        : [];

      setEmployees(rawEmps);
      setDepartments(rawDepts);

      const normalized = rawPos.map((p, idx) => {
        const posEmps   = rawEmps.filter(e => e.job_position_id === p.id);
        const deptName  = rawDepts.find(d => d.id === p.department_id)?.name || 'General Operations';
        let parsedLevel = deriveLevel(p.name);
        let parsedType = 'Full-time';
        let parsedLocation = 'Corporate HQ';
        if (p.description && p.description.includes('|')) {
          const parts = p.description.split('|').map(s => s.trim());
          if (parts[0]) parsedLevel = parts[0];
          if (parts[1]) parsedType = parts[1];
          if (parts[2]) parsedLocation = parts[2];
        }
        return {
          id:       p.code || `JP-${String(idx + 1).padStart(3, '0')}`,
          rawId:    p.id,
          code:     p.code || '',
          title:    p.name || 'Job Position',
          dept:     deptName,
          deptId:   p.department_id,
          level:    parsedLevel,
          type:     parsedType,
          openings: Math.max(0, (p.expected_employees || 2) - posEmps.length),
          filled:   posEmps.length,
          location: parsedLocation,
          salary:   '₹12–24 LPA',
          description: p.description || '',
        };
      });
      setPositions(normalized);
    } catch (err) {
      setError(err.message || 'Unable to load job positions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = positions.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.dept.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPositions = positions.length;
  const totalOpen      = positions.reduce((a, p) => a + (Number(p.openings) || 0), 0);
  const totalFilled    = positions.reduce((a, p) => a + (Number(p.filled)   || 0), 0);

  return (
    <>
      {/* ── CSS for drawer + modal animation ── */}
      <style>{`
        @keyframes drawerSlideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes modalPop      { from { transform: scale(0.93) translateY(10px); opacity:0; } to { transform: scale(1) translateY(0); opacity:1; } }
      `}</style>

      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORKFORCE CORE</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Job Positions</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Define and manage roles, levels, and compensation bands.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => exportCSV(positions)}
            disabled={positions.length === 0}
            title="Download CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button
            onClick={() => { setEditPos(null); setShowNewModal(true); }}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Position
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Positions',  value: totalPositions },
          { label: 'Open Vacancies',   value: totalOpen },
          { label: 'Filled Headcount', value: totalFilled },
          { label: 'Avg. Salary Range', value: 'Competitive' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-title">{kpi.label}</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{kpi.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="search-bar" style={{ width: '360px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search positions, departments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', flex: 1, fontFamily: 'inherit' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)', display: 'flex' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {!loading && <span>{filtered.length} position{filtered.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Department</th>
              <th>Level</th>
              <th>Filled</th>
              <th>Open</th>
              <th>Location</th>
              <th>Salary Band</th>
              <th>Status</th>
              <th style={{ textAlign: 'right', paddingRight: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Loading job positions…</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#dc2626', fontSize: '0.85rem' }}>
                  ⚠️ {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No positions found</div>
                    <div style={{ fontSize: '13px' }}>
                      {search ? `No matches for "${search}"` : 'Click "+ New Position" to add one.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(pos => {
                const lc = levelColors[pos.level] || { bg: '#f1f5f9', text: '#475569' };
                return (
                  <tr
                    key={pos.id}
                    onClick={() => setSelectedPos(pos)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-structural, #f7fafa)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="Click to view position details"
                  >
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{pos.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{pos.id}</div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{pos.dept}</td>
                    <td>
                      <span style={{ background: lc.bg, color: lc.text, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{pos.level}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pos.filled}</td>
                    <td>
                      <span style={{ color: pos.openings > 0 ? 'var(--secondary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.82rem' }}>
                        {pos.openings}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pos.location}</td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pos.salary}</td>
                    <td>
                      <span style={{ background: pos.openings > 0 ? '#d1fae5' : '#f1f5f9', color: pos.openings > 0 ? '#065f46' : '#64748b', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                        {pos.openings > 0 ? 'Hiring' : 'Closed'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '16px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditPos(pos); setShowNewModal(true); }}
                        style={{
                          background: 'var(--surface-structural, #f1f5f9)',
                          border: '1px solid var(--border-structural)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: 'inherit'
                        }}
                        title="Edit Position"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selectedPos && (
        <PositionDrawer
          pos={selectedPos}
          employees={employees}
          onClose={() => setSelectedPos(null)}
          onEdit={(pos) => { setEditPos(pos); setShowNewModal(true); }}
        />
      )}

      {/* New / Edit Position modal */}
      {showNewModal && (
        <NewPositionModal
          departments={departments}
          editPos={editPos}
          onClose={() => { setShowNewModal(false); setEditPos(null); }}
          onSaved={() => { setShowNewModal(false); setEditPos(null); load(); }}
        />
      )}
    </>
  );
};

export default JobPositionsView;
