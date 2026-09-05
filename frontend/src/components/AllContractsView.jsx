import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const normalizeContract = (c, i) => {
  const wageNum = typeof c.wage === 'number' ? c.wage : parseFloat(c.wage) || 0;
  const today = new Date();
  let daysLeft = null;
  let isExpiring = false;
  if (c.end_date) {
    const end = new Date(c.end_date);
    const diffTime = end - today;
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysLeft >= 0 && daysLeft <= 30) {
      isExpiring = true;
    }
  }

  const empName = c.employee
    ? `${c.employee.first_name || ''} ${c.employee.last_name || ''}`.trim()
    : (c.employee_name || 'Employee');

  return {
    id: c.contract_number || c.contract_reference || c.id || `CNT-${1000 + i}`,
    employee: empName || 'Employee',
    empId: c.employee?.employee_code || c.employee_id || c.empId || `EMP-${1000 + i}`,
    role: c.job_position?.name || c.job_title || c.role || 'Specialist',
    department: c.department?.name || c.department || '',
    avatar: null,
    initials: empName ? empName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM',
    start: c.start_date || c.date_start || c.start || '01 Jan 2024',
    end: c.end_date || c.date_end || c.end || 'Permanent',
    rawWage: wageNum,
    wage: `₹${wageNum.toLocaleString('en-IN')}`,
    status: (c.status || 'RUNNING').toUpperCase(),
    structure: c.salary_structure?.name || c.structure || 'Standard Fixed Band',
    expiring: isExpiring,
    daysLeft: daysLeft !== null ? daysLeft : 0,
  };
};

const formatCurrencyShort = (amount) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

const AllContractsView = ({ onNavigate }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [newContract, setNewContract] = useState({ employee: '', wage: 150000, structure: 'Standard Fixed Band' });

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getContracts();
        const raw = data?.items || data?.data || (Array.isArray(data) ? data : []);
        setContracts(raw.map(normalizeContract));
      } catch (err) {
        console.error('Failed to fetch contracts:', err);
        setError(err.message || 'Unable to load contracts from database.');
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await apiService.createContract(newContract);
      setContracts(prev => [normalizeContract(created, prev.length), ...prev]);
      setShowModal(false);
      setNewContract({ employee: '', wage: 150000, structure: 'Standard Fixed Band' });
    } catch (err) {
      console.error('Failed to create contract:', err);
    }
  };

  // Dynamic KPI computations
  const runningContracts = contracts.filter(c => c.status === 'RUNNING' || c.status === 'ACTIVE');
  const activeCount = runningContracts.length;
  const expiringContracts = contracts.filter(c => c.expiring);
  const expiringCount = expiringContracts.length;
  const firstExpiring = expiringContracts[0];

  const draftContracts = contracts.filter(c => c.status === 'DRAFT');
  const draftCount = draftContracts.length;

  const totalWageCommitment = runningContracts.reduce((acc, c) => acc + (c.rawWage || 0), 0);
  const currentCycle = `#${new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}`;

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.employee.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'EXPIRING' 
        ? c.expiring 
        : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)' }}>WORKFORCE AGREEMENTS • Live Database</div>
          <h2>Contracts</h2>
          <p>Manage employee contracts, tenure terms, and recurring wage commitments.</p>
        </div>
        <div className="dashboard-controls">
          <button className="btn-secondary" onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export Register
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Create Contract
          </button>
        </div>
      </div>

      <div className="kpi-grid mb-6">
        <div className="kpi-card relative">
          <div className="kpi-title">Active Running Contracts</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{activeCount}</span>
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded ml-2">↑ Live</span>
          </div>
          <div className="kpi-subtext mt-3 text-muted">
            100% synchronized with PostgreSQL
          </div>
          <div className="absolute top-4 right-4 p-1.5 rounded-full bg-blue-50 text-blue-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 11-4-4v14h-4v-14l-4 4"/><path d="M2 11h8"/></svg>
          </div>
        </div>

        <div className="kpi-card relative border border-red-100" style={{ background: '#fffcfc' }}>
          <div className="kpi-title text-red-800">Expiring (Within 30 Days)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums text-red-600">{expiringCount}</span>
            {expiringCount > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded ml-4">Action Required</span>
            )}
          </div>
          <div className="kpi-subtext mt-3 text-red-600/70">
            {firstExpiring ? `${firstExpiring.employee} (${firstExpiring.daysLeft}D left)` : 'All contracts active & in term'}
          </div>
          <div className="absolute top-4 right-4 p-1.5 rounded-full bg-red-50 text-red-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">Pending Drafts</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{draftCount}</span>
            {draftCount > 0 && (
              <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded ml-4">Under Review</span>
            )}
          </div>
          <div className="kpi-subtext mt-3 text-muted">
            {draftCount > 0 ? `${draftCount} pending onboarding documents` : 'No pending drafts'}
          </div>
          <div className="absolute top-4 right-4 p-1.5 rounded-full bg-purple-50 text-purple-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title flex items-center justify-between">
            <span>Monthly Wage Commitment</span>
            <div className="p-1.5 rounded bg-teal-50 text-teal-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
          </div>
          <div className="kpi-value-row mt-2">
            <span className="text-3xl font-bold tabular-nums">{formatCurrencyShort(totalWageCommitment)}</span>
            <div className="ml-4 flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cycle</span>
              <span className="text-xs bg-gray-100 rounded px-1 font-mono">{currentCycle}</span>
            </div>
          </div>
          <div className="kpi-subtext mt-3 text-muted">
            Monthly active wage commitment
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="p-4 flex flex-wrap items-center gap-4" style={{ borderBottom: '1px solid var(--border-structural)', background: 'var(--surface-structural)' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '300px', background: 'var(--surface-base)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              type="text" 
              placeholder="Search by contract #, employee name, ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="control-select" 
            style={{ background: 'var(--surface-base)' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses ({contracts.length})</option>
            <option value="RUNNING">Running ({activeCount})</option>
            <option value="EXPIRING">Expiring Soon ({expiringCount})</option>
            <option value="DRAFT">Draft ({draftCount})</option>
          </select>

          {expiringCount > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <button 
                onClick={() => setStatusFilter(statusFilter === 'EXPIRING' ? 'ALL' : 'EXPIRING')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Expiring within 30 days
                <span className="bg-red-200 text-red-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold ml-1">{expiringCount}</span>
              </button>
            </div>
          )}
        </div>

        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" className="rounded text-primary focus:ring-primary" /></th>
              <th>CONTRACT NO.</th>
              <th>EMPLOYEE</th>
              <th>STATUS</th>
              <th>START DATE</th>
              <th>END DATE</th>
              <th>MONTHLY WAGE</th>
              <th>SALARY STRUCTURE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-structural)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Connecting to PostgreSQL & loading contracts...</span>
                  </div>
                </td>
              </tr>
            ) : filteredContracts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>No contracts found in database</div>
                    <div style={{ fontSize: '13px', maxWidth: '360px' }}>
                      {search 
                        ? 'No contracts matched your search.' 
                        : 'No contracts currently exist. Click "+ New Contract" above to generate your first employee employment agreement.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredContracts.map(contract => (
                <tr key={contract.id} className="cursor-pointer hover:bg-gray-50 transition-colors group" onClick={() => onNavigate('contract_detail')}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded text-primary focus:ring-primary" /></td>
                  <td><span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{contract.id}</span></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden" style={{ background: 'var(--surface-purple-tint)', color: 'var(--primary)' }}>
                        {contract.initials}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{contract.employee}</div>
                        <div className="text-[10px] text-muted">{contract.empId} • {contract.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      contract.status === 'RUNNING' ? 'badge-green' : contract.status === 'DRAFT' ? 'badge-purple' : 'badge-amber'
                    }`} style={{ fontSize: '10px' }}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">{contract.start}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${contract.expiring ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>{contract.end}</span>
                      {contract.expiring && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">{contract.daysLeft}D LEFT</span>}
                    </div>
                  </td>
                  <td className="font-mono font-bold text-sm">{contract.wage}</td>
                  <td>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                      {contract.structure}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="p-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-muted">Showing <span className="font-semibold text-gray-800">1-{filteredContracts.length}</span> of <span className="font-semibold text-gray-800">{contracts.length}</span> records · <span style={{ color: 'var(--secondary)' }}>FastAPI Live Sync</span></div>
        </div>
      </div>

      {/* Create Contract Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '450px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>New Employment Contract</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Employee Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newContract.employee} 
                  onChange={e => setNewContract({ ...newContract, employee: e.target.value })} 
                  placeholder="e.g. Ramesh Chandra"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Monthly Wage (₹)</label>
                <input 
                  type="number" 
                  required 
                  className="form-input" 
                  value={newContract.wage} 
                  onChange={e => setNewContract({ ...newContract, wage: Number(e.target.value) })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Salary Structure</label>
                <select 
                  className="control-select" 
                  style={{ width: '100%' }}
                  value={newContract.structure} 
                  onChange={e => setNewContract({ ...newContract, structure: e.target.value })}
                >
                  <option value="Standard Full-Time Tech & Corporate Structure">Standard Full-Time Tech & Corporate Structure</option>
                  <option value="Executive Remuneration Model">Executive Remuneration Model</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AllContractsView;
