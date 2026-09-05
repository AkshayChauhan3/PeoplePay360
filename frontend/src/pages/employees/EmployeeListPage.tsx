import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { EmployeeListOut, DepartmentOut } from '../../types/api';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { EmployeeCreateModal } from './EmployeeCreateModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  LayoutGrid,
  List,
  Search,
  UserPlus,
  Mail,
  Building,
  ChevronRight,
} from 'lucide-react';

export const EmployeeListPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeListOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [list, depts] = await Promise.all([
        apiService.getEmployees({ search, department_id: selectedDepartment || undefined }),
        apiService.getDepartments(),
      ]);
      setEmployees(list);
      setDepartments(depts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDepartment]);

  if (selectedEmployeeId) {
    return (
      <EmployeeDetailPage
        employeeId={selectedEmployeeId}
        onBack={() => {
          setSelectedEmployeeId(null);
          fetchEmployees();
        }}
      />
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Employee Directory</h1>
          <p>Manage staff profiles, contracts, attendance history, and department mappings.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <UserPlus size={16} />
            <span>New Employee</span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 280 }}>
          <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, code, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 220 }}
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-control)', padding: 3 }}>
          <button
            type="button"
            className={`btn-icon ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
            style={{
              backgroundColor: viewMode === 'kanban' ? 'var(--bg-surface)' : 'transparent',
              boxShadow: viewMode === 'kanban' ? 'var(--elevation-tier1)' : 'none',
              borderRadius: '6px',
            }}
            title="Kanban View"
          >
            <LayoutGrid size={16} color={viewMode === 'kanban' ? 'var(--primary)' : 'var(--text-secondary)'} />
          </button>
          <button
            type="button"
            className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            style={{
              backgroundColor: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent',
              boxShadow: viewMode === 'list' ? 'var(--elevation-tier1)' : 'none',
              borderRadius: '6px',
            }}
            title="List View"
          >
            <List size={16} color={viewMode === 'list' ? 'var(--primary)' : 'var(--text-secondary)'} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : employees.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No employees matched your criteria.
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="kanban-grid">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="kanban-card"
              onClick={() => setSelectedEmployeeId(emp.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-neutral">{emp.employee_code}</span>
                <StatusBadge status={emp.status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-control)',
                    backgroundColor: 'var(--primary)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  {emp.first_name[0]}
                  {emp.last_name[0]}
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>
                    {emp.first_name} {emp.last_name}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                    {emp.job_title}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building size={13} color="var(--text-secondary)" />
                  <span>{emp.department_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} color="var(--text-secondary)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.work_email}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  View Profile <ChevronRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Job Title</th>
                <th>Department</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                >
                  <td><strong>{emp.employee_code}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: 'var(--purple-tint)',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emp.first_name[0]}
                      </div>
                      <span style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</span>
                    </div>
                  </td>
                  <td>{emp.job_title}</td>
                  <td>{emp.department_name}</td>
                  <td>{emp.work_email}</td>
                  <td><StatusBadge status={emp.status} /></td>
                  <td>
                    <button type="button" className="btn btn-neutral btn-sm">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchEmployees}
      />
    </div>
  );
};
