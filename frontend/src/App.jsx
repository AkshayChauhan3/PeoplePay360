import React, { useState, useEffect } from 'react';
import LoginPortal from './components/LoginPortal';
import MainLayout from './components/MainLayout';
import DashboardPortal from './components/DashboardPortal';
import EmployeeDirectoryView from './components/EmployeeDirectoryView';
import EmployeeProfileView from './components/EmployeeProfileView';
import DepartmentsView from './components/DepartmentsView';
import JobPositionsView from './components/JobPositionsView';
import AllContractsView from './components/AllContractsView';
import ContractDetailView from './components/ContractDetailView';
import ActiveContractsView from './components/ActiveContractsView';
import AttendanceRecordsView from './components/AttendanceRecordsView';
import MonthlyOverviewView from './components/MonthlyOverviewView';
import SchedulesView from './components/SchedulesView';
import TimeOffRequestsView from './components/TimeOffRequestsView';
import LeaveAllocationsView from './components/LeaveAllocationsView';
import TimeOffTypesView from './components/TimeOffTypesView';
import PayrunsView from './components/PayrunsView';
import PayslipsView from './components/PayslipsView';
import SalaryStructuresView from './components/SalaryStructuresView';
import SalaryRulesView from './components/SalaryRulesView';
import SettingsView from './components/SettingsView';
import { apiService } from './services/apiService';
import { apiClient } from './services/apiClient';
import { isViewAllowed, ROLE_LABELS } from './utils/rbac';

const VIEW_TO_PATH = {
  dashboard: '/dashboard',
  directory: '/directory',
  employee_profile: '/profile',
  departments: '/departments',
  job_positions: '/job-positions',
  all_contracts: '/all-contracts',
  contract_detail: '/contract-detail',
  active_contracts: '/active-contracts',
  attendance_records: '/attendance',
  monthly_overview: '/monthly-overview',
  schedules: '/schedules',
  time_off_requests: '/time-off',
  leave_allocations: '/leave-allocations',
  time_off_types: '/time-off-types',
  payruns: '/payruns',
  payslips: '/payslips',
  salary_structures: '/salary-structures',
  salary_rules: '/salary-rules',
  settings: '/settings',
};

const PATH_TO_VIEW = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/directory': 'directory',
  '/employees': 'directory',
  '/employee': 'directory',
  '/profile': 'employee_profile',
  '/employee-profile': 'employee_profile',
  '/departments': 'departments',
  '/job-positions': 'job_positions',
  '/job_positions': 'job_positions',
  '/all-contracts': 'all_contracts',
  '/contracts': 'all_contracts',
  '/contract-detail': 'contract_detail',
  '/active-contracts': 'active_contracts',
  '/attendance': 'attendance_records',
  '/attendance-records': 'attendance_records',
  '/monthly-overview': 'monthly_overview',
  '/schedules': 'schedules',
  '/time-off': 'time_off_requests',
  '/timeoff': 'time_off_requests',
  '/leave-allocations': 'leave_allocations',
  '/time-off-types': 'time_off_types',
  '/payruns': 'payruns',
  '/payslips': 'payslips',
  '/salary-structures': 'salary_structures',
  '/salary-rules': 'salary_rules',
  '/settings': 'settings',
};

const getViewFromPath = (pathname) => {
  if (!pathname) return 'dashboard';
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return PATH_TO_VIEW[clean] || 'dashboard';
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState(() => {
    return typeof window !== 'undefined' ? getViewFromPath(window.location.pathname) : 'dashboard';
  });
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [filterEmployeeId, setFilterEmployeeId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const handleNavigate = (view, paramId = null) => {
    let targetView = view;
    if (targetView === 'contract_detail') {
      setSelectedContractId(paramId);
    } else if (targetView === 'employee_profile') {
      setSelectedEmployeeId(paramId);
    } else if (['all_contracts', 'attendance_records', 'time_off_requests', 'leave_allocations'].includes(targetView)) {
      setFilterEmployeeId(paramId);
    } else {
      setFilterEmployeeId(null);
    }

    setCurrentView(targetView);
    const targetPath = VIEW_TO_PATH[targetView] || '/dashboard';
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ view: targetView, paramId }, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const v = getViewFromPath(window.location.pathname);
      setCurrentView(v);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('Session expired or unauthorized. Resetting to login portal.');
      apiService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = apiClient.getAccessToken();
        if (!token) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }
        const user = await apiService.getMe();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('No active session:', err);
        apiService.logout();
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoadingSession(false);
      }
    };
    initAuth();
  }, []);

  const handleSignIn = (userData) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    apiService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleSwitchRole = (newRole) => {
    const updated = { ...currentUser, role: newRole };
    setCurrentUser(updated);
    apiClient.setStoredUser(updated);
    if (!isViewAllowed(newRole, currentView)) {
      setCurrentView('dashboard');
    }
  };

  const renderView = () => {
    const userRole = (currentUser?.role || 'ADMIN').toUpperCase();

    // Enforce Role-Based Access Control (RBAC)
    if (!isViewAllowed(userRole, currentView)) {
      return (
        <div className="card-panel" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '600px', margin: '3rem auto' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-critical-bg, #fff2f2)',
            color: 'var(--color-critical, #b71c1c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Access Restricted (RBAC Policy)
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 auto 1.5rem auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Your active role <strong style={{ color: 'var(--primary)' }}>{ROLE_LABELS[userRole] || userRole}</strong> does not have permission to view or execute operations in the <code>{currentView}</code> module.
          </p>
          <button 
            className="btn-primary" 
            onClick={() => setCurrentView('dashboard')}
            style={{ margin: '0 auto' }}
          >
            Return to Authorized Dashboard
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':           return <DashboardPortal onNavigate={handleNavigate} currentUser={currentUser} />;
      // Employees
      case 'directory':           return <EmployeeDirectoryView onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'employee_profile':    return <EmployeeProfileView employeeId={selectedEmployeeId} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'departments':         return <DepartmentsView onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'job_positions':       return <JobPositionsView onNavigate={handleNavigate} currentUser={currentUser} />;
      // Contracts
      case 'all_contracts':       return <AllContractsView filterEmployeeId={filterEmployeeId} onClearFilter={() => setFilterEmployeeId(null)} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'contract_detail':     return <ContractDetailView contractId={selectedContractId} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'active_contracts':    return <ActiveContractsView onNavigate={handleNavigate} currentUser={currentUser} />;
      // Attendance
      case 'attendance_records':  return <AttendanceRecordsView filterEmployeeId={filterEmployeeId} onClearFilter={() => setFilterEmployeeId(null)} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'monthly_overview':    return <MonthlyOverviewView onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'schedules':           return <SchedulesView onNavigate={handleNavigate} currentUser={currentUser} />;
      // Time Off
      case 'time_off_requests':   return <TimeOffRequestsView filterEmployeeId={filterEmployeeId} onClearFilter={() => setFilterEmployeeId(null)} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'leave_allocations':   return <LeaveAllocationsView filterEmployeeId={filterEmployeeId} onClearFilter={() => setFilterEmployeeId(null)} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'time_off_types':      return <TimeOffTypesView onNavigate={handleNavigate} currentUser={currentUser} />;
      // Payroll
      case 'payruns':             return <PayrunsView onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'payslips':            return <PayslipsView onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'salary_structures':   return <SalaryStructuresView onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'salary_rules':        return <SalaryRulesView onNavigate={handleNavigate} currentUser={currentUser} />;
      // System
      case 'settings':            return <SettingsView onNavigate={handleNavigate} currentUser={currentUser} />;
      default:                    return <DashboardPortal onNavigate={handleNavigate} currentUser={currentUser} />;
    }
  };

  if (loadingSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--border-structural)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span>Initializing PeoplePay 360...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        <LoginPortal onSignIn={handleSignIn} />
      ) : (
        <MainLayout 
          currentView={currentView} 
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={handleSignOut}
          onSwitchRole={handleSwitchRole}
        >
          {renderView()}
        </MainLayout>
      )}
    </>
  );
}

export default App;


