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
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import { apiService } from './services/apiService';

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

  const renderView = () => {
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
      case 'reports':             return <ReportsView onNavigate={setCurrentView} currentUser={currentUser} />;
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
        >
          {renderView()}
        </MainLayout>
      )}
    </>
  );
}

export default App;

