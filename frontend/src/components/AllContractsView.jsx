import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import EntityCombobox from './EntityCombobox';

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
    rawId: c.id,
    employeeId: c.employee_id || c.employee?.id ? Number(c.employee_id || c.employee?.id) : null,
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

const AllContractsView = ({ onNavigate, filterEmployeeId, onClearFilter }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [structures, setStructures] = useState([]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [newContract, setNewContract] = useState({
    employeeId: '',
    contractNumber: '',
    wage: 150000,
    departmentId: '',
    jobPositionId: '',
    structureId: '',
    status: 'DRAFT',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contractsData, empsData, structuresData, deptsData, posData] = await Promise.allSettled([
        apiService.getContracts(),
        apiService.getEmployees({ limit: 500 }),
        apiService.getSalaryStructures({ limit: 100 }),
        apiService.getDepartments(),
        apiService.getJobPositions(),
      ]);
      if (contractsData.status === 'fulfilled') {
        const raw = contractsData.value?.items || contractsData.value?.data || (Array.isArray(contractsData.value) ? contractsData.value : []);
        setContracts(raw.map(normalizeContract));
      }
      if (empsData.status === 'fulfilled') {
        const rawEmps = empsData.value?.items || (Array.isArray(empsData.value) ? empsData.value : []);
        setEmployees(rawEmps);
      }
      if (structuresData.status === 'fulfilled') {
        const rawStructs = structuresData.value?.items || (Array.isArray(structuresData.value) ? structuresData.value : []);
        setStructures(rawStructs);
      }
      if (deptsData.status === 'fulfilled') {
        const rawDepts = Array.isArray(deptsData.value) ? deptsData.value : (deptsData.value?.items || []);
        setDepartments(rawDepts);
      }
      if (posData.status === 'fulfilled') {
        const rawPos = Array.isArray(posData.value) ? posData.value : (posData.value?.items || []);
        setJobPositions(rawPos);
      }
    } catch (err) {
      console.error('Failed to fetch contracts data:', err);
      setError(err.message || 'Unable to load contracts from database.');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleOpenCreateModal = () => {
    const nextNum = `CNT-2026-${String(Date.now()).slice(-4)}`;
    const defaultEmpId = filterEmployeeId || (employees.length > 0 ? employees[0].id : '');
    const defaultEmp = employees.find(e => String(e.id) === String(defaultEmpId));
    setNewContract({
      employeeId: defaultEmpId,
      contractNumber: nextNum,
      wage: 150000,
      departmentId: defaultEmp?.department_id ? String(defaultEmp.department_id) : '',
      jobPositionId: defaultEmp?.job_position_id ? String(defaultEmp.job_position_id) : '',
      structureId: structures.length > 0 ? String(structures[0].id) : '',
      status: 'DRAFT',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setCreateError('');
    setShowModal(true);
  };

  const handleSelectEmployee = (empId) => {
    const foundEmp = employees.find(e => String(e.id) === String(empId));
    setNewContract(prev => ({
      ...prev,
      employeeId: empId ?? '',
      departmentId: foundEmp?.department_id ? String(foundEmp.department_id) : prev.departmentId,
      jobPositionId: foundEmp?.job_position_id ? String(foundEmp.job_position_id) : prev.jobPositionId,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setCreateError('');
    try {
      const empId = newContract.employeeId;
      if (!empId) {
        throw new Error('Please select an employee.');
      }
      const contractNum = newContract.contractNumber?.trim()
        ? newContract.contractNumber.trim().toUpperCase()
        : `CNT-2026-${String(Date.now()).slice(-4)}`;
      const startDate = newContract.startDate || new Date().toISOString().split('T')[0];
      const endDate = newContract.endDate ? newContract.endDate : null;
      const wageVal = Number(newContract.wage) || 150000;
      const structId = newContract.structureId ? Number(newContract.structureId) : null;
      const deptId = newContract.departmentId ? Number(newContract.departmentId) : null;
      const posId = newContract.jobPositionId ? Number(newContract.jobPositionId) : null;
      const contractStatus = newContract.status || 'DRAFT';

      const res = await apiService.createContract({
        employee_id: Number(empId),
        contract_number: contractNum,
        start_date: startDate,
        end_date: endDate,
        wage: wageVal,
        department_id: deptId,
        job_position_id: posId,
        salary_structure_id: structId,
        status: contractStatus,
      });

      setShowModal(false);
      showToast(`✓ Contract ${res.contract_number || contractNum} created successfully in database!`);
      await fetchContracts();
    } catch (err) {
      console.error('Failed to create contract:', err);
      let msg = err.message || 'Failed to generate contract';
      if (err?.data?.detail) {
        msg = typeof err.data.detail === 'string' ? err.data.detail : JSON.stringify(err.data.detail);
      }
      setCreateError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (contracts.length === 0) {
      alert('No contracts to export.');
      return;
    }
    const headers = ['Contract ID', 'Employee', 'Employee Code', 'Role', 'Department', 'Start Date', 'End Date', 'Monthly Wage', 'Status', 'Structure'];
    const rows = filteredContracts.map(c => [
      `"${c.id}"`,
      `"${c.employee}"`,
      `"${c.empId}"`,
      `"${c.role}"`,
      `"${c.department}"`,
      `"${c.start}"`,
      `"${c.end}"`,
      c.rawWage,
      `"${c.status}"`,
      `"${c.structure}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Contracts_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const baseContracts = filterEmployeeId
    ? contracts.filter(c => c.employeeId === Number(filterEmployeeId))
    : contracts;

  const filteredContracts = baseContracts.filter(c => {
    const matchesSearch = c.employee.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'EXPIRING' 
        ? c.expiring 
        : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEmp = filterEmployeeId ? employees.find(e => e.id === Number(filterEmployeeId)) : null;

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)' }}>WORKFORCE AGREEMENTS • Live Database</div>
          <h2>Contracts</h2>
          <p>Manage employee contracts, tenure terms, and recurring wage commitments.</p>
        </div>
        <div className="dashboard-controls">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export Register
          </button>
          <button className="btn-primary" onClick={handleOpenCreateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Create Contract
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      {filterEmployeeId && (
        <div style={{ 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '8px', 
          padding: '10px 16px', 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e40af' }}>
            <span style={{ fontSize: '16px' }}>📄</span>
            <span>
              Showing contracts filtered for{' '}
              <strong>{filteredEmp ? `${filteredEmp.first_name} ${filteredEmp.last_name} (${filteredEmp.employee_code})` : `Employee #${filterEmployeeId}`}</strong>
            </span>
            <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {baseContracts.length} contracts found
            </span>
          </div>
          {onClearFilter && (
            <button 
              onClick={onClearFilter} 
              className="btn-secondary" 
              style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', background: 'white' }}
            >
              ✕ Clear Filter (Show All)
            </button>
          )}
        </div>
      )}

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
                <tr key={contract.id} className="cursor-pointer hover:bg-gray-50 transition-colors group" onClick={() => onNavigate('contract_detail', contract.rawId || contract.id)}>
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
      {showModal && (() => {
        const selectedEmployee = employees.find(e => String(e.id) === String(newContract.employeeId));
        const hasExistingRunningContract = contracts.find(c =>
          (String(c.employeeId) === String(newContract.employeeId) || (selectedEmployee && String(c.empId) === String(selectedEmployee.employee_code))) &&
          c.status === 'RUNNING'
        );
        const selectedStructure = structures.find(s => String(s.id) === String(newContract.structureId));

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: '14px', width: '640px', maxWidth: '100%', padding: '24px 28px', boxShadow: '0 24px 40px rgba(0,0,0,0.18)', marginBottom: '24px' }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>📄 New Employment Contract</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Set up contract terms, organizational details, and allocate compensation salary structure.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {createError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px', marginBottom: '16px', lineHeight: 1.4, fontWeight: 500 }}>
                  ⚠️ {createError}
                </div>
              )}

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* ── SECTION 1: CONTRACT & EMPLOYEE INFO ──────────────────────── */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋</span> 1. Contract & Employee Information
                  </div>

                  {/* Employee Selection */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Select Employee *</label>
                    <EntityCombobox
                      value={newContract.employeeId}
                      onChange={handleSelectEmployee}
                      options={employees.map(emp => ({
                        id: emp.id,
                        label: `${emp.first_name} ${emp.last_name}`,
                        sublabel: `${emp.employee_code} · ${emp.department?.name || 'Dept'} · ${emp.job_position?.name || emp.job_title || 'Staff'}`
                      }))}
                      placeholder="Search employee by name, code, or ID…"
                      required
                    />
                    
                    {/* Selected Employee Summary Badge */}
                    {selectedEmployee && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>👤 {selectedEmployee.first_name} {selectedEmployee.last_name}</span>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>{selectedEmployee.employee_code}</span>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ color: '#0f766e', fontWeight: 600 }}>{selectedEmployee.department?.name || 'Department Unassigned'}</span>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ color: '#64748b' }}>{selectedEmployee.job_position?.name || selectedEmployee.job_title || 'Staff'}</span>
                      </div>
                    )}

                    {/* Running Contract Warning */}
                    {hasExistingRunningContract && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span>⚠️</span>
                        <span>
                          <strong>Existing Contract Conflict Warning:</strong> Employee already has an active RUNNING contract (<strong>{hasExistingRunningContract.id}</strong>). Setting this contract's initial status to <strong>DRAFT</strong> is recommended to prevent date overlap conflicts.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contract Number & Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Contract Reference / Number *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={newContract.contractNumber}
                        onChange={e => setNewContract({ ...newContract, contractNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. CNT-2026-0045"
                        style={{ width: '100%', height: '38px', borderRadius: '8px', padding: '0 10px', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Initial Status *</label>
                      <select
                        className="control-select"
                        style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                        value={newContract.status}
                        onChange={e => setNewContract({ ...newContract, status: e.target.value })}
                      >
                        <option value="DRAFT">DRAFT (Pending Activation)</option>
                        <option value="RUNNING">RUNNING (Active Immediately)</option>
                      </select>
                    </div>
                  </div>

                  {/* Start Date & End Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Effective Start Date *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={newContract.startDate}
                        onChange={e => setNewContract({ ...newContract, startDate: e.target.value })}
                        style={{ width: '100%', height: '38px', borderRadius: '8px', padding: '0 10px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>End Date (Permanent if blank)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={newContract.endDate}
                        onChange={e => setNewContract({ ...newContract, endDate: e.target.value })}
                        style={{ width: '100%', height: '38px', borderRadius: '8px', padding: '0 10px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Department & Job Position Overrides */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Department (Contract Org)</label>
                      <select
                        className="control-select"
                        style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                        value={newContract.departmentId || ''}
                        onChange={e => setNewContract({ ...newContract, departmentId: e.target.value })}
                      >
                        <option value="">— Employee Default Department —</option>
                        {departments.map(d => (
                          <option key={d.id} value={String(d.id)}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>Job Position (Contract Role)</label>
                      <select
                        className="control-select"
                        style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                        value={newContract.jobPositionId || ''}
                        onChange={e => setNewContract({ ...newContract, jobPositionId: e.target.value })}
                      >
                        <option value="">— Employee Default Position —</option>
                        {jobPositions.map(p => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Monthly Wage */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Gross Wage (₹) *</label>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669' }}>
                        ₹{Number(newContract.wage || 0).toLocaleString('en-IN')} / month
                      </span>
                    </div>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      className="form-input" 
                      value={newContract.wage} 
                      onChange={e => setNewContract({ ...newContract, wage: Number(e.target.value) })} 
                      style={{ width: '100%', height: '38px', borderRadius: '8px', padding: '0 10px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* ── SECTION 2: SALARY STRUCTURE ALLOCATION VIA ID ──────────── */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🏢</span> 2. Salary Structure Allocation
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        Assign compensation rules via Structure ID or select from registered salary structures
                      </p>
                    </div>
                    {newContract.structureId && (
                      <button
                        type="button"
                        onClick={() => setNewContract(prev => ({ ...prev, structureId: '' }))}
                        style={{ fontSize: '11.5px', color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Clear Structure
                      </button>
                    )}
                  </div>

                  {/* Quick Pick Chips of registered structures */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Quick Select:</span>
                    {structures.map(s => {
                      const isSelected = String(s.id) === String(newContract.structureId);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setNewContract(prev => ({ ...prev, structureId: isSelected ? '' : String(s.id) }))}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: isSelected ? '1.5px solid #059669' : '1px solid #cbd5e1',
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            color: isSelected ? '#065f46' : '#334155',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{s.id}</span>
                          <span>{s.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ID Input and Selector side-by-side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                        Structure ID #
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 966"
                        value={newContract.structureId || ''}
                        onChange={e => setNewContract(prev => ({ ...prev, structureId: e.target.value }))}
                        style={{ width: '100%', height: '38px', borderRadius: '8px', padding: '0 10px', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                        Select by Name & Code
                      </label>
                      <select
                        className="control-select"
                        value={newContract.structureId || ''}
                        onChange={e => setNewContract(prev => ({ ...prev, structureId: e.target.value }))}
                        style={{ width: '100%', height: '38px', borderRadius: '8px' }}
                      >
                        <option value="">— No Salary Structure (Optional) —</option>
                        {structures.map(s => (
                          <option key={s.id} value={String(s.id)}>
                            [ID: #{s.id}] {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selected Structure Confirmation Card */}
                  {selectedStructure ? (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px', color: '#059669' }}>✓</span>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#065f46' }}>
                            [ID #{selectedStructure.id}] {selectedStructure.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                            System Code: <strong style={{ fontFamily: 'monospace' }}>{selectedStructure.code}</strong> · Lifecycle: {selectedStructure.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, background: '#a7f3d0', color: '#065f46', padding: '2px 8px', borderRadius: '4px' }}>
                        Ready to Link
                      </span>
                    </div>
                  ) : newContract.structureId ? (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                      ℹ️ Structure ID #{newContract.structureId} entered. It will be verified against the salary rules engine upon saving.
                    </div>
                  ) : null}
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving} style={{ fontSize: '13px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    {saving ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Saving to Database...
                      </>
                    ) : (
                      'Generate Contract'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default AllContractsView;
