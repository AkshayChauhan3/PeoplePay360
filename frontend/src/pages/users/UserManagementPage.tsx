import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { UserResponse, UserRole, EmployeeListOut } from '../../types/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Search, Plus, Shield } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [employees, setEmployees] = useState<EmployeeListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);

  // Form state for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Str0ng!Pass');
  const [newUserRole, setNewUserRole] = useState<UserRole>('EMPLOYEE');
  const [newUserEmpId, setNewUserEmpId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [userList, empList] = await Promise.all([
        apiService.getUsers(search, roleFilter),
        apiService.getEmployees(),
      ]);
      setUsers(userList);
      setEmployees(empList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await apiService.updateUser(userId, { role: newRole });
      fetchUsers();
    } catch (e: any) {
      alert(e.message || 'Failed to update role');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await apiService.updateUser(userId, { is_active: !currentStatus });
      fetchUsers();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiService.register({
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        emp_id: newUserEmpId || undefined,
      });
      setIsCreateModalOpen(false);
      setNewUserEmail('');
      setNewUserEmpId('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user account');
    } finally {
      setCreating(false);
    }
  };

  const roles: UserRole[] = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

  const getEmployeeName = (empId?: string | null) => {
    if (!empId) return 'System User';
    const found = employees.find((e) => e.id === empId);
    return found ? `${found.first_name} ${found.last_name}` : empId;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0 }}>User Management</h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                backgroundColor: 'rgba(59, 18, 63, 0.12)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius-pill)',
                letterSpacing: '0.04em',
              }}
            >
              ADMIN ONLY
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Administrators create user accounts and assign access roles. Roles control available modules, records, and actions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setShowMatrix(!showMatrix)}
          >
            <Shield size={14} />
            <span>{showMatrix ? 'Hide Role Matrix' : 'View Role Matrix'}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-compact"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={15} />
            <span>+ New User</span>
          </button>
        </div>
      </div>

      {/* Role Access Matrix Guide */}
      {showMatrix && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            backgroundColor: 'var(--neutral-tint-purple)',
            border: '1px solid rgba(59, 18, 63, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} />
              <span>Role-Based Access Control (RBAC) Governance Matrix</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Flow 0: After sign-in, only modules and actions permitted by role are accessible
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
              <strong style={{ color: 'var(--primary)' }}>ADMIN</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                All 7 flows: Workforce, Attendance, Time Off approvals, Payrun validation, AST rules, User accounts.
              </div>
            </div>
            <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
              <strong style={{ color: 'var(--primary)' }}>HR_MANAGER</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Workforce, Contracts, Schedules, Attendance, Time Off Requests & Allocations (Approve/Refuse).
              </div>
            </div>
            <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
              <strong style={{ color: 'var(--secondary)' }}>HR_PAYROLL_MANAGER</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Contracts, Payrun Wizard, Payrun Validation, Mark Paid, Salary Rules (AST) and Structures.
              </div>
            </div>
            <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
              <strong style={{ color: 'var(--secondary)' }}>HR_PAYROLL_USER</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Attendance records, Payrun review, Payslip computation view, Salary structures list.
              </div>
            </div>
            <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
              <strong style={{ color: '#555' }}>EMPLOYEE</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Self-service Attendance Punch Widget & logs, Time Off request submission, My Payslips.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-hairline)',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 280 }}>
          <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search users, employees or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 220 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Role Filter: All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Showing <strong>{users.length}</strong> active login credentials
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="card table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Linked Employee</th>
                <th>Role Assignment</th>
                <th>Status</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const empName = getEmployeeName(u.emp_id);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{u.email}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{empName}</strong>
                    </td>
                    <td>
                      <select
                        className="input-field"
                        style={{ height: 32, fontSize: '12px', width: 190 }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <StatusBadge status={u.is_active ? 'Active' : 'Inactive'} />
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create User (Flow 0) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create User Account"
      >
        <form onSubmit={handleCreateUser}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Employee *
              </label>
              <select
                className="input-field"
                value={newUserEmpId}
                onChange={(e) => {
                  setNewUserEmpId(e.target.value);
                  const emp = employees.find((emp) => emp.id === e.target.value);
                  if (emp && !newUserEmail) {
                    setNewUserEmail(emp.work_email);
                  }
                }}
              >
                <option value="">-- Link to Employee (Optional) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Work Email *
              </label>
              <input
                type="email"
                className="input-field"
                required
                placeholder="employee@company.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Role Assignment *
              </label>
              <select
                className="input-field"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Initial Password *
              </label>
              <input
                type="password"
                className="input-field"
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || !newUserEmail}>
              {creating ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
