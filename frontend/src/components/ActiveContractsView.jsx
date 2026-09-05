import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const ActiveContractsView = ({ onNavigate }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveContracts = async () => {
      setLoading(true);
      try {
        const res = await apiService.getContracts({ status: 'RUNNING' });
        const items = res?.items || (Array.isArray(res) ? res : []);
        setContracts(items);
      } catch (err) {
        console.warn('Error fetching active contracts:', err);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveContracts();
  }, []);

  const totalActive = contracts.length;
  const now = new Date();
  const expiringSoon = contracts.filter(c => {
    if (!c.end_date) return false;
    const diffDays = Math.ceil((new Date(c.end_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  }).length;

  const avgWage = totalActive > 0
    ? contracts.reduce((acc, c) => acc + Number(c.wage || 0), 0) / totalActive
    : 0;

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONTRACTS</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Active Contracts</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>All currently running employment agreements fetched directly from database.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => onNavigate('all_contracts')}>View All Agreements</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Total Active</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalActive}</span>
          </div>
          <div className="kpi-subtext">Fully running contracts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Expiring Soon</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{expiringSoon}</span>
          </div>
          <div className="kpi-subtext">Within 60 days</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg. Contract Value</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">
              {avgWage > 0 ? `₹${Math.round(avgWage).toLocaleString('en-IN')}/mo` : '₹0/mo'}
            </span>
          </div>
          <div className="kpi-subtext">Monthly gross basis</div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Contract ID</th>
              <th>Department</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Days Left</th>
              <th>Monthly Wage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>Loading active contracts from database...</span>
                  </div>
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No Active Contracts in Database</div>
                  <div style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>There are currently no active or running contracts registered in the database.</div>
                  <button className="btn-primary" onClick={() => onNavigate('all_contracts')}>Go to Contract Management</button>
                </td>
              </tr>
            ) : (
              contracts.map(c => {
                const empName = c.employee?.full_name || (c.employee ? `${c.employee.first_name} ${c.employee.last_name}` : 'Staff Member');
                const deptName = c.department?.name || 'General';
                const daysLeft = c.end_date
                  ? Math.max(0, Math.ceil((new Date(c.end_date) - now) / (1000 * 60 * 60 * 24)))
                  : 'N/A';
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('contract_detail', c.id)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                          {empName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{empName}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{deptName}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{c.contract_number || `#CNT-${c.id}`}</span></td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{deptName}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.start_date}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.end_date || 'Indefinite'}</td>
                    <td className="text-xs font-bold" style={{ color: typeof daysLeft === 'number' && daysLeft < 60 ? '#b45309' : 'var(--secondary)' }}>
                      {typeof daysLeft === 'number' ? `${daysLeft}d` : daysLeft}
                    </td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ₹{Number(c.wage || 0).toLocaleString('en-IN')}/mo
                    </td>
                    <td>
                      <span style={{ background: '#eaf5ef', color: '#0b7a42', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {c.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ActiveContractsView;
