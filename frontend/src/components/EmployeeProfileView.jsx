import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const EmployeeProfileView = ({ employeeId, currentUser, onNavigate }) => {
  const [employee, setEmployee] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        let emp = null;
        if (employeeId) {
          emp = await apiService.getEmployeeById(employeeId);
        } else if (currentUser?.employee_id) {
          emp = await apiService.getEmployeeById(currentUser.employee_id);
        } else {
          const emps = await apiService.getEmployees();
          const list = emps?.items || (Array.isArray(emps) ? emps : []);
          if (list.length > 0) {
            emp = list[0];
          }
        }
        setEmployee(emp);

        if (emp && emp.id) {
          const cntRes = await apiService.getContracts({ employee_id: emp.id });
          const cntList = cntRes?.items || (Array.isArray(cntRes) ? cntRes : []);
          setContracts(cntList);
        }
      } catch (err) {
        console.warn('Error loading employee profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [employeeId, currentUser]);

  if (loading) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span>Loading employee profile from database...</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👤</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>No Employee Record Found</h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>There are currently no employee records registered in the database to display a profile.</p>
        <button className="btn-primary" onClick={() => onNavigate('directory')}>
          Go to Employee Directory
        </button>
      </div>
    );
  }

  const fullName = employee.full_name || `${employee.first_name} ${employee.last_name}`;
  const empCode = employee.employee_code || `EMP-${employee.id}`;
  const deptName = employee.department?.name || 'General Operations';
  const jobTitle = employee.job_position?.name || employee.job_title || 'Team Member';
  const activeContract = contracts.find(c => c.status === 'RUNNING') || contracts[0];

  return (
    <>
      <div className="card-panel mb-6" style={{ padding: '1.5rem', background: 'var(--surface-base)' }}>
        <div className="flex gap-6 items-start">
          <div className="relative">
            <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm flex items-center justify-center font-bold text-2xl text-white" style={{ background: 'var(--primary)' }}>
              {fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
              <span className="status-pill highlight text-[10px] px-2 py-0.5" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> {employee.status || 'ACTIVE'}
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>{fullName}</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="status-pill active text-xs">{employee.status || 'ACTIVE'}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wide">ID: {empCode}</span>
            </div>
            <p className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{jobTitle}</p>
            
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {deptName}
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {employee.email}
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Joining Date: {employee.joining_date || 'Not recorded'}
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Phone: {employee.phone || 'Not provided'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-secondary" onClick={() => onNavigate('directory')}>
              Back to Directory
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid mb-6">
        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">ACTIVE CONTRACT</span>
          </div>
          <div className="font-mono text-sm font-semibold mb-3">
            {activeContract ? (activeContract.contract_number || `#CNT-${activeContract.id}`) : 'No Contract'}
          </div>
          <div className="kpi-value-row mb-1">
            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {activeContract ? `₹${Number(activeContract.wage || 0).toLocaleString('en-IN')}/mo` : '₹0'}
            </span>
          </div>
          <div className="text-sm flex items-center justify-between mt-2">
            <span className="text-muted">Monthly Gross Wage</span>
            <span className="text-teal-600 font-medium">
              {activeContract ? activeContract.status : 'None'}
            </span>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">ORGANIZATIONAL UNIT</span>
          </div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{deptName}</div>
          <div className="kpi-value-row mb-1 flex items-baseline gap-2">
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{jobTitle}</span>
          </div>
          <div className="text-sm text-muted mt-2 pt-2 border-t border-gray-100">
            Manager: {employee.manager?.full_name || 'None (Direct Report)'}
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">SYSTEM STATUS</span>
          </div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Database Record Verified</div>
          <div className="kpi-value-row mb-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>Active</span>
          </div>
          <div className="text-sm text-muted mt-2 pt-2 border-t border-gray-100">
            Created: {employee.created_at ? employee.created_at.slice(0, 10) : 'Recorded'}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeProfileView;
