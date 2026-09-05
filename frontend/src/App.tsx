import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeeListPage } from './pages/employees/EmployeeListPage';
import { ContractListPage } from './pages/contracts/ContractListPage';
import { AttendanceListPage } from './pages/attendance/AttendanceListPage';
import { TimeOffPage } from './pages/timeoff/TimeOffPage';
import { PayrunListPage } from './pages/payroll/PayrunListPage';
import { PayslipListPage } from './pages/payroll/PayslipListPage';
import { SalaryStructuresPage } from './pages/salary/SalaryStructuresPage';
import { SalaryRulesPage } from './pages/salary/SalaryRulesPage';
import { DepartmentListPage } from './pages/departments/DepartmentListPage';
import { ScheduleListPage } from './pages/schedules/ScheduleListPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { canAccessTab, getDefaultTabForRole } from './utils/rbac';
import { ShieldAlert } from 'lucide-react';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Enforce RBAC: when role changes, verify if tab is allowed
  useEffect(() => {
    if (user?.role && !canAccessTab(user.role, currentTab)) {
      setCurrentTab(getDefaultTabForRole(user.role));
    }
  }, [user?.role, currentTab]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setCurrentTab(getDefaultTabForRole(user?.role))} />;
  }

  const isAllowed = canAccessTab(user?.role, currentTab);

  return (
    <div className="app-shell">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="app-main">
        <Header currentTab={currentTab} onNavigate={setCurrentTab} />

        {!isAllowed ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '60px auto' }} className="card fade-in">
            <ShieldAlert size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              Access Restricted
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Your current role (<strong>{user?.role}</strong>) does not have authorization to view the <code>{currentTab}</code> module.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrentTab(getDefaultTabForRole(user?.role))}
            >
              Return to Allowed Workspace
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
            {currentTab === 'employees' && <EmployeeListPage />}
            {currentTab === 'contracts' && <ContractListPage />}
            {currentTab === 'attendance' && <AttendanceListPage />}
            {currentTab === 'timeoff' && <TimeOffPage initialTab="requests" />}
            {currentTab === 'timeoff-requests' && <TimeOffPage initialTab="requests" />}
            {currentTab === 'timeoff-allocations' && <TimeOffPage initialTab="allocations" />}
            {currentTab === 'timeoff-types' && <TimeOffPage initialTab="types" />}
            {currentTab === 'payroll' && <PayrunListPage />}
            {currentTab === 'payslips' && <PayslipListPage />}
            {currentTab === 'salary' && <SalaryStructuresPage />}
            {currentTab === 'rules' && <SalaryRulesPage />}
            {currentTab === 'departments' && <DepartmentListPage />}
            {currentTab === 'schedules' && <ScheduleListPage />}
            {currentTab === 'users' && <UserManagementPage />}
          </>
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AttendanceProvider>
        <MainApp />
      </AttendanceProvider>
    </AuthProvider>
  );
}

export default App;
