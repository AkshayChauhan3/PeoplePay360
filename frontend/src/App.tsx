import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeeListPage } from './pages/employees/EmployeeListPage';
import { AttendanceListPage } from './pages/attendance/AttendanceListPage';
import { TimeOffPage } from './pages/timeoff/TimeOffPage';
import { PayrunListPage } from './pages/payroll/PayrunListPage';
import { SalaryStructuresPage } from './pages/salary/SalaryStructuresPage';
import { DepartmentListPage } from './pages/departments/DepartmentListPage';
import { ScheduleListPage } from './pages/schedules/ScheduleListPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

const MainApp: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setCurrentTab('dashboard')} />;
  }

  return (
    <div className="app-shell">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="app-main">
        <Header />

        {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
        {currentTab === 'employees' && <EmployeeListPage />}
        {currentTab === 'attendance' && <AttendanceListPage />}
        {currentTab === 'timeoff' && <TimeOffPage />}
        {currentTab === 'payroll' && <PayrunListPage />}
        {currentTab === 'salary' && <SalaryStructuresPage />}
        {currentTab === 'departments' && <DepartmentListPage />}
        {currentTab === 'schedules' && <ScheduleListPage />}
        {currentTab === 'users' && <UserManagementPage />}
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
