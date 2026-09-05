import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const TimeOffTypesView = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      setLoading(true);
      try {
        const data = await apiService.getTimeOffTypes();
        setTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Error loading time off types:', err);
        setTypes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME OFF</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Time Off Types</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Configured leave policies and entitlement rules loaded from database.</p>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Leave Type</th>
              <th>Code</th>
              <th>Unit</th>
              <th>Allocation Mode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>Loading time off types from database...</span>
                  </div>
                </td>
              </tr>
            ) : types.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏖️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No Time Off Types Found</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No leave types have been configured in the database yet.</div>
                </td>
              </tr>
            ) : (
              types.map(t => (
                <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = '#f7fafa'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', background: '#f7fafa', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>#{t.id}</span></td>
                  <td className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
                  <td className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>{t.code}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.unit || 'DAYS'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.allocation_mode || 'STANDARD'}</td>
                  <td>
                    <span style={{ background: t.is_active !== false ? '#eaf5ef' : '#fff2f2', color: t.is_active !== false ? 'var(--success)' : 'var(--critical)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {t.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TimeOffTypesView;
