import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const LeaveAllocationsView = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllocations = async () => {
      setLoading(true);
      try {
        const data = await apiService.getAllocations();
        setAllocations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Error fetching leave allocations:', err);
        setAllocations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllocations();
  }, []);

  const totalCount = allocations.length;
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.allocated_quantity || 0), 0);
  const totalUsed = allocations.reduce((sum, a) => sum + Number(a.used_quantity || 0), 0);
  const totalRemaining = allocations.reduce((sum, a) => sum + Number(a.remaining_quantity || 0), 0);

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Leave Allocations</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Track and manage leave allowances and balances per employee directly from the database.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-title">Active Allocations</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalCount}</span>
          </div>
          <div className="kpi-subtext">Total grant records</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Allocated</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalAllocated}d</span>
          </div>
          <div className="kpi-subtext">Across workforce</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Used</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalUsed}d</span>
          </div>
          <div className="kpi-subtext">Leaves approved YTD</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Remaining</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{totalRemaining}d</span>
          </div>
          <div className="kpi-subtext">Available balance</div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Allocated</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>Loading leave allocations from database...</span>
                  </div>
                </td>
              </tr>
            ) : allocations.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏖️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No Leave Allocations Found</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No employee leave allowances have been granted in the database yet.</div>
                </td>
              </tr>
            ) : (
              allocations.map(a => {
                const empName = a.employee?.full_name || (a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : `Employee #${a.employee_id}`);
                const typeName = a.time_off_type?.name || 'Leave';
                return (
                  <tr key={a.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td>
                      <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{empName}</div>
                    </td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>{typeName}</td>
                    <td className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.allocated_quantity}d</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>{a.used_quantity || 0}d</td>
                    <td className="text-xs font-bold" style={{ color: 'var(--success)' }}>{a.remaining_quantity || 0}d</td>
                    <td>
                      <span style={{ background: '#eaf5ef', color: '#0b7a42', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {a.status || 'APPROVED'}
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

export default LeaveAllocationsView;
