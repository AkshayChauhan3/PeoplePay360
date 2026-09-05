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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await apiService.getMe();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn('No active session:', err);
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
  };

  const handleSwitchRole = (newRole) => {
    const updated = { ...currentUser, role: newRole };
    setCurrentUser(updated);
    apiClient.setAuth(apiClient.getToken(), updated);
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
      case 'dashboard':           return <DashboardPortal onNavigate={setCurrentView} currentUser={currentUser} />;
      // Employees
      case 'directory':           return <EmployeeDirectoryView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'employee_profile':    return <EmployeeProfileView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'departments':         return <DepartmentsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'job_positions':       return <JobPositionsView onNavigate={setCurrentView} currentUser={currentUser} />;
      // Contracts
      case 'all_contracts':       return <AllContractsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'contract_detail':     return <ContractDetailView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'active_contracts':    return <ActiveContractsView onNavigate={setCurrentView} currentUser={currentUser} />;
      // Attendance
      case 'attendance_records':  return <AttendanceRecordsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'monthly_overview':    return <MonthlyOverviewView onNavigate={setCurrentView} currentUser={currentUser} />;
      // Time Off
      case 'time_off_requests':   return <TimeOffRequestsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'leave_allocations':   return <LeaveAllocationsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'time_off_types':      return <TimeOffTypesView onNavigate={setCurrentView} currentUser={currentUser} />;
      // Payroll
      case 'payruns':             return <PayrunsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'payslips':            return <PayslipsView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'salary_structures':   return <SalaryStructuresView onNavigate={setCurrentView} currentUser={currentUser} />;
      case 'salary_rules':        return <SalaryRulesView onNavigate={setCurrentView} currentUser={currentUser} />;
      // System
      case 'settings':            return <SettingsView onNavigate={setCurrentView} currentUser={currentUser} />;
      default:                    return <DashboardPortal onNavigate={setCurrentView} currentUser={currentUser} />;
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
          onNavigate={setCurrentView}
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


