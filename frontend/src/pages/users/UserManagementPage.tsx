import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { UserResponse, UserRole } from '../../types/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { UserCheck, Search } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await apiService.getUsers(search, roleFilter);
      setUsers(list);
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

  const roles: UserRole[] = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>User Accounts & RBAC Governance</h1>
          <p>Assign system access credentials, role permissions, and active operational status.</p>
        </div>
      </div>

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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 280 }}>
          <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search users by email..."
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
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Showing <strong>{users.length}</strong> login accounts
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User Email</th>
                <th>Role Assignment</th>
                <th>Status</th>
                <th>Linked Employee</th>
                <th>Registered On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserCheck size={16} color="var(--primary)" />
                      <strong>{u.email}</strong>
                    </div>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ height: 32, fontSize: '12px', width: 200 }}
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
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {u.emp_id || 'System User'}
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-neutral btn-sm"
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
