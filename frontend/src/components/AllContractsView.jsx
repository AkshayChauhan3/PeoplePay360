import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackContracts = [
  { id: 'CNT-2024-0891', employee: 'Arvind Swaminathan', empId: 'EMP-1049', role: 'Product Engineering', avatar: 'https://i.pravatar.cc/150?u=a', start: '01 Aug 2023', end: '31 Jul 2026', wage: '₹2,85,000', structure: 'Executive Grade 7', expiring: false },
  { id: 'CNT-2023-0412', employee: 'Meera Nambiar', empId: 'EMP-0833', role: 'Corporate Finance', avatar: 'https://i.pravatar.cc/150?u=b', start: '15 Sep 2022', end: '14 Sep 2024', wage: '₹2,10,000', structure: 'Senior Tech Tier', expiring: true, daysLeft: 18 },
  { id: 'CNT-2024-1102', employee: 'Rohit Kulkarni', empId: 'EMP-1205', role: 'Global Sales', initials: 'RK', bg: 'var(--surface-purple-tint)', color: 'var(--primary)', start: '01 Oct 2024', end: '30 Sep 2026', wage: '₹1,65,000', structure: 'Sales Performance Tier', expiring: false },
  { id: 'CNT-2021-0118', employee: 'Devika Chawla', empId: 'EMP-0419', role: 'Human Resources', avatar: 'https://i.pravatar.cc/150?u=d', start: '15 Jan 2021', end: 'Permanent / Indefinite', wage: '₹1,95,000', structure: 'Standard Fixed Band', expiring: false },
  { id: 'CNT-2022-0988', employee: 'Tariq Patel', empId: 'EMP-0762', role: 'Legal Counsel', initials: 'TP', bg: '#f1f5f9', color: '#475569', start: '01 Aug 2022', end: '31 Jul 2024', wage: '₹1,75,000', structure: 'Standard Fixed Band', expiring: false },
  { id: 'CNT-2023-1420', employee: 'Shweta Nair', empId: 'EMP-0941', role: 'Cloud Architecture', initials: 'SN', bg: 'var(--surface-teal-tint)', color: 'var(--secondary)', start: '10 Nov 2023', end: '09 Nov 2026', wage: '₹3,15,000', structure: 'Executive Grade 7', expiring: false },
  { id: 'CNT-2024-1189', employee: 'Karan Banerjee', empId: 'EMP-1314', role: 'Data Platform', initials: 'KB', bg: 'var(--surface-purple-tint)', color: 'var(--primary)', start: '15 Sep 2024', end: '14 Sep 2027', wage: '₹2,40,000', structure: 'Senior Tech Tier', expiring: false },
  { id: 'CNT-2023-0850', employee: 'Ananya Prabhu', empId: 'EMP-0677', role: 'Brand & Communications', initials: 'AP', bg: 'var(--surface-teal-tint)', color: 'var(--secondary)', start: '01 Jun 2023', end: '31 May 2025', wage: '₹1,45,000', structure: 'Standard Fixed Band', expiring: false },
];

const normalizeContract = (c, i) => ({
  id: c.contract_reference || c.id || `CNT-2024-${1000 + i}`,
  employee: c.employee_name || c.employee || 'Employee',
  empId: c.employee_id || c.empId || `EMP-${1000 + i}`,
  role: c.job_title || c.role || 'Specialist',
  avatar: c.avatar || null,
  initials: c.initials || (c.employee ? c.employee.split(' ').map(n=>n[0]).join('') : 'EM'),
  start: c.date_start || c.start || '01 Jan 2024',
  end: c.date_end || c.end || 'Permanent',
  wage: c.wage ? (typeof c.wage === 'number' ? `₹${c.wage.toLocaleString('en-IN')}` : c.wage) : '₹1,50,000',
  structure: c.salary_structure?.name || c.structure || 'Standard Fixed Band',
  expiring: !!c.expiring,
  daysLeft: c.daysLeft || 0,
});

const AllContractsView = ({ onNavigate }) => {
  const [contracts, setContracts] = useState(fallbackContracts);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newContract, setNewContract] = useState({ employee: '', wage: 150000, structure: 'Standard Fixed Band' });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const data = await apiService.getContracts();
        if (Array.isArray(data) && data.length > 0) {
          setContracts(data.map(normalizeContract));
        }
      } catch (err) {
        console.warn('Using fallback contracts:', err);
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

  const filteredContracts = contracts.filter(c =>
    c.employee.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)' }}>WORKFORCE AGREEMENTS • Fiscal Year 2024-25</div>
          <h2>Contracts</h2>
          <p>Manage employee contracts, tenure terms, and recurring wage commitments.</p>
        </div>
        <div className="dashboard-controls">
          <button className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export Register
          </button>
          <button className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-8.27l-4.8 4.8"/></svg>
            Bulk Renewal
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
            <span className="kpi-value tabular-nums">{contracts.length}</span>
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded ml-2">↑ Live</span>
          </div>
          <div className="kpi-subtext mt-3 text-muted">
            100% synchronized with backend
          </div>
          <div className="absolute top-4 right-4 p-1.5 rounded-full bg-blue-50 text-blue-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 11-4-4v14h-4v-14l-4 4"/><path d="M2 11h8"/></svg>
          </div>
        </div>

        <div className="kpi-card relative border border-red-100" style={{ background: '#fffcfc' }}>
          <div className="kpi-title text-red-800">Expiring (Within 30 Days)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums text-red-600">1</span>
            <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded ml-4">Action Required</span>
          </div>
          <div className="kpi-subtext mt-3 text-red-600/70">
            Meera Nambiar (18D left)
          </div>
          <div className="absolute top-4 right-4 p-1.5 rounded-full bg-red-50 text-red-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">Pending Drafts</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">14</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded ml-4">Under Legal Review</span>
          </div>
          <div className="kpi-subtext mt-3 text-muted">
            Avg turnaround 2.4 days
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
            <span className="text-3xl font-bold tabular-nums">₹1.42 Cr</span>
            <div className="ml-4 flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cycle</span>
              <span className="text-xs bg-gray-100 rounded px-1 font-mono">#08/24</span>
            </div>
          </div>
          <div className="kpi-subtext mt-3 text-muted">
            Net fixed + variable allocation
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
          
          <select className="control-select" style={{ background: 'var(--surface-base)' }}>
            <option>All Statuses (Running, Expired, Draft)</option>
          </select>
          <select className="control-select" style={{ background: 'var(--surface-base)' }}>
            <option>All Structures (Executive G7, Senior Tech Tier...)</option>
          </select>

          <div className="ml-auto flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm font-medium hover:bg-red-100 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Expiring within 30 days
              <span className="bg-red-200 text-red-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold ml-1">1</span>
            </button>
            <button className="p-2 bg-gray-100 text-gray-600 rounded-md border border-gray-200 hover:bg-gray-200 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
          </div>
        </div>

        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" className="rounded text-primary focus:ring-primary" /></th>
              <th>CONTRACT NO.</th>
              <th>EMPLOYEE</th>
              <th>START DATE</th>
              <th>END DATE</th>
              <th>MONTHLY WAGE</th>
              <th>SALARY STRUCTURE</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(contract => (
              <tr key={contract.id} className="cursor-pointer hover:bg-gray-50 transition-colors group" onClick={() => onNavigate('contract_detail')}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded text-primary focus:ring-primary" /></td>
                <td><span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{contract.id}</span></td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden" style={{ background: contract.bg || '#eee', color: contract.color || '#333' }}>
                      {contract.avatar ? <img src={contract.avatar} alt={contract.employee} className="w-full h-full object-cover" /> : contract.initials}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{contract.employee}</div>
                      <div className="text-[10px] text-muted">{contract.empId} • {contract.role}</div>
                    </div>
                  </div>
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
            ))}
          </tbody>
        </table>

        <div className="p-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-muted">Showing <span className="font-semibold text-gray-800">1-{filteredContracts.length}</span> of <span className="font-semibold text-gray-800">{contracts.length}</span> records · <span style={{ color: 'var(--secondary)' }}>FastAPI Live Sync</span></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              Rows per page: 
              <select className="border border-gray-200 rounded p-1 bg-white">
                <option>10</option>
                <option>25</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded text-white font-medium text-sm" style={{ background: 'var(--primary)' }}>1</button>
            </div>
          </div>
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
                  <option value="Executive Grade 7">Executive Grade 7</option>
                  <option value="Senior Tech Tier">Senior Tech Tier</option>
                  <option value="Standard Fixed Band">Standard Fixed Band</option>
                  <option value="Sales Performance Tier">Sales Performance Tier</option>
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
