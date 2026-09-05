import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const fallbackEmployees = [
  { id: 'PP-1042', name: 'Ananya Sharma', email: 'a.sharma@peoplepay360.internal', initials: 'AS', dept: 'Engineering', position: 'Lead Staff Architect', lead: 'Elena Vance', location: 'Bengaluru Hub', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 'PP-1089', name: 'Marcus Brody', email: 'm.brody@peoplepay360.internal', initials: 'MB', dept: 'Product & UX', position: 'Senior UX Designer', lead: 'Ananya Sharma', location: 'London Office', avatar: null, bg: 'var(--surface-purple-tint)', color: 'var(--primary)' },
  { id: 'PP-0914', name: 'Elena Vance', email: 'e.vance@peoplepay360.internal', initials: 'EV', dept: 'People Ops', position: 'Chief People Officer', lead: 'Board of Directors', location: 'Mumbai HQ', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
  { id: 'PP-1104', name: 'Vikram Sen', email: 'v.sen@peoplepay360.internal', initials: 'VS', dept: 'Sales & Growth', position: 'VP Global Enterprise', lead: 'Elena Vance', location: 'Singapore', avatar: null, bg: 'var(--surface-teal-tint)', color: 'var(--secondary)' },
  { id: 'PP-1188', name: 'Priya Patel', email: 'p.patel@peoplepay360.internal', initials: 'PP', dept: 'Engineering', position: 'Senior DevOps Engineer', lead: 'Ananya Sharma', location: 'Bengaluru Hub', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 'PP-1021', name: 'David Miller', email: 'd.miller@peoplepay360.internal', initials: 'DM', dept: 'Operations', position: 'Head of Infrastructure', lead: 'Elena Vance', location: 'Mumbai HQ', avatar: null, bg: '#F1F4F4', color: 'var(--text-secondary)' },
  { id: 'PP-1205', name: 'Aisha Al-Mansoor', email: 'a.mansoor@peoplepay360.internal', initials: 'AA', dept: 'People Ops', position: 'Payroll Specialist', lead: 'Elena Vance', location: 'Dubai Hub', avatar: null, bg: 'var(--surface-purple-tint)', color: 'var(--primary)' },
];

const normalizeEmployee = (emp, idx) => ({
  id: emp.employee_id || emp.id || `PP-${1000 + idx}`,
  name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee',
  email: emp.work_email || emp.email || 'emp@peoplepay360.internal',
  initials: emp.initials || (emp.name ? emp.name.split(' ').map(n=>n[0]).join('') : `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}` || 'EM'),
  dept: emp.department?.name || emp.department || emp.dept || 'Engineering',
  position: emp.job_title || emp.job_position || emp.position || 'Staff',
  lead: emp.manager_name || emp.manager || emp.lead || 'Elena Vance',
  location: emp.work_location || emp.location || 'Mumbai HQ',
  avatar: emp.avatar || null,
  bg: emp.bg || 'var(--surface-purple-tint)',
  color: emp.color || 'var(--primary)',
});

const EmployeeDirectoryView = ({ onNavigate }) => {
  const [employees, setEmployees] = useState(fallbackEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', dept: 'Engineering', position: '', location: 'Mumbai HQ' });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await apiService.getEmployees();
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data.map(normalizeEmployee));
        }
      } catch (err) {
        console.warn('Using fallback employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const created = await apiService.createEmployee({
        first_name: newEmp.name.split(' ')[0] || newEmp.name,
        last_name: newEmp.name.split(' ').slice(1).join(' ') || '',
        work_email: newEmp.email,
        department: newEmp.dept,
        job_position: newEmp.position,
        location: newEmp.location,
      });
      setEmployees(prev => [normalizeEmployee(created, prev.length + 1), ...prev]);
      setShowAddModal(false);
      setNewEmp({ name: '', email: '', dept: 'Engineering', position: '', location: 'Mumbai HQ' });
    } catch (err) {
      console.error('Failed to create employee:', err);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || emp.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)' }}>WORKFORCE CORE • Q3 Roster Cycle</div>
          <h2>Employees</h2>
          <p>Manage and organize your workforce from one central place.</p>
        </div>
        <div className="dashboard-controls">
          <button className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export CSV / Excel
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      <div className="kpi-grid mb-6">
        <div className="kpi-card relative">
          <div className="kpi-title">TOTAL WORKFORCE</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">{employees.length}</span>
            <span className="text-sm ml-1 text-muted">Headcount</span>
          </div>
          <div className="kpi-subtext mt-3 flex items-center gap-2">
            <span className="status-pill structural">{employees.length} Full-time</span>
            <span className="status-pill active">0 Contractors</span>
          </div>
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-structural)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">ACTIVE & PRESENT TODAY</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">212</span>
            <span className="text-sm ml-1 font-semibold" style={{ color: 'var(--secondary)' }}>85.5% rate</span>
          </div>
          <div className="kpi-subtext mt-3 font-medium" style={{ color: 'var(--secondary)' }}>
            • 196 Onsite / 16 Hub
          </div>
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-teal-tint)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">ON LEAVE / AWAY</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">14</span>
            <span className="text-sm ml-1 text-muted">members</span>
          </div>
          <div className="kpi-subtext mt-3 flex items-center gap-2">
            <span className="status-pill highlight">8 Paid Leave</span>
            <span className="status-pill structural">6 Remote Flex</span>
          </div>
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-purple-tint)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary)' }}><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="m19.07 4.93-14.14 14.14"/></svg>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title">NEW JOINERS (THIS MONTH)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">+9</span>
            <span className="text-sm ml-1 font-semibold" style={{ color: 'var(--secondary)' }}>+3.8% delta</span>
          </div>
          <div className="kpi-subtext mt-3 font-medium" style={{ color: 'var(--secondary)' }}>
            All onboarded successfully
          </div>
          <div className="absolute top-4 right-4 p-2 rounded-full" style={{ background: 'var(--surface-teal-tint)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="p-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-structural)', background: 'var(--surface-structural)' }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: '400px', background: 'var(--surface-base)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              type="text" 
              placeholder="Search employees by name, ID, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-shortcut">⌘F</span>
          </div>
          
          <select 
            className="control-select" 
            style={{ background: 'var(--surface-base)' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product & UX">Product & UX</option>
            <option value="People Ops">People Ops</option>
            <option value="Sales & Growth">Sales & Growth</option>
            <option value="Operations">Operations</option>
          </select>

          <div className="ml-auto flex items-center bg-white rounded-md border border-gray-200">
            <button className="p-2 border-r border-gray-200 bg-gray-50 text-gray-800"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            <button className="p-2 text-gray-400 hover:text-gray-800"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>EMPLOYEE ID</th>
              <th>DEPARTMENT</th>
              <th>JOB POSITION</th>
              <th>REPORTING LEAD</th>
              <th>WORK LOCATION</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onNavigate('employee_profile')}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: emp.bg || '#eee', color: emp.color || '#333' }}>
                      {emp.avatar ? <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" /> : emp.initials}
                    </div>
                    <div>
                      <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{emp.name}</div>
                      <div className="text-xs text-muted">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold">{emp.id}</span></td>
                <td>
                  <span className={`status-pill ${emp.dept === 'Engineering' ? 'active' : emp.dept === 'Product & UX' ? 'highlight' : emp.dept === 'People Ops' ? 'highlight' : emp.dept === 'Sales & Growth' ? 'structural' : 'structural'}`}>
                    {emp.dept}
                  </span>
                </td>
                <td className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{emp.position}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--primary)' }}>
                      {emp.lead ? emp.lead.split(' ').map(n=>n[0]).join('') : 'EV'}
                    </div>
                    <span className="text-sm font-medium">{emp.lead}</span>
                  </div>
                </td>
                <td className="text-sm text-muted">
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--secondary)' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {emp.location}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-muted">Showing <span className="font-semibold text-gray-800">1-{filteredEmployees.length}</span> of <span className="font-semibold text-gray-800">{employees.length}</span> employees · <span style={{ color: 'var(--secondary)' }}>FastAPI Live Sync</span></div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg></button>
            <button className="w-8 h-8 flex items-center justify-center rounded text-white font-medium text-sm" style={{ background: 'var(--primary)' }}>1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-sm">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded text-gray-800 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newEmp.name} 
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} 
                  placeholder="e.g. Ramesh Chandra"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Work Email</label>
                <input 
                  type="email" 
                  required 
                  className="form-input" 
                  value={newEmp.email} 
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} 
                  placeholder="r.chandra@peoplepay360.internal"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department</label>
                <select 
                  className="control-select" 
                  style={{ width: '100%' }}
                  value={newEmp.dept} 
                  onChange={e => setNewEmp({ ...newEmp, dept: e.target.value })}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product & UX">Product & UX</option>
                  <option value="People Ops">People Ops</option>
                  <option value="Sales & Growth">Sales & Growth</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Job Position</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={newEmp.position} 
                  onChange={e => setNewEmp({ ...newEmp, position: e.target.value })} 
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Location</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newEmp.location} 
                  onChange={e => setNewEmp({ ...newEmp, location: e.target.value })} 
                  placeholder="e.g. Bengaluru Hub"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeDirectoryView;
