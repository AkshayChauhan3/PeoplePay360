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
import { getAccessToken, clearTokens } from './api';

function App() {
  // Restore auth state from localStorage token on page refresh
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAccessToken());
  const [currentView, setCurrentView] = useState('dashboard');

  const handleSignIn = () => setIsAuthenticated(true);

  const handleLogout = () => {
    clearTokens();
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':           return <DashboardPortal onNavigate={setCurrentView} />;
      // Employees
      case 'directory':           return <EmployeeDirectoryView onNavigate={setCurrentView} />;
      case 'employee_profile':    return <EmployeeProfileView onNavigate={setCurrentView} />;
      case 'departments':         return <DepartmentsView onNavigate={setCurrentView} />;
      case 'job_positions':       return <JobPositionsView onNavigate={setCurrentView} />;
      // Contracts
      case 'all_contracts':       return <AllContractsView onNavigate={setCurrentView} />;
      case 'contract_detail':     return <ContractDetailView onNavigate={setCurrentView} />;
      case 'active_contracts':    return <ActiveContractsView onNavigate={setCurrentView} />;
      // Attendance
      case 'attendance_records':  return <AttendanceRecordsView onNavigate={setCurrentView} />;
      case 'monthly_overview':    return <MonthlyOverviewView onNavigate={setCurrentView} />;
      // Time Off
      case 'time_off_requests':   return <TimeOffRequestsView onNavigate={setCurrentView} />;
      case 'leave_allocations':   return <LeaveAllocationsView onNavigate={setCurrentView} />;
      case 'time_off_types':      return <TimeOffTypesView onNavigate={setCurrentView} />;
      // Payroll
      case 'payruns':             return <PayrunsView onNavigate={setCurrentView} />;
      case 'payslips':            return <PayslipsView onNavigate={setCurrentView} />;
      case 'salary_structures':   return <SalaryStructuresView onNavigate={setCurrentView} />;
      case 'salary_rules':        return <SalaryRulesView onNavigate={setCurrentView} />;
      // System
      case 'reports':             return <ReportsView onNavigate={setCurrentView} />;
      case 'settings':            return <SettingsView onNavigate={setCurrentView} />;
      default:                    return <DashboardPortal onNavigate={setCurrentView} />;
    }
  };

  return (
    <>
      {!isAuthenticated ? (
        <LoginPortal onSignIn={handleSignIn} />
      ) : (
        <MainLayout currentView={currentView} onNavigate={setCurrentView} onLogout={handleLogout}>
          {renderView()}
        </MainLayout>
      )}
    </>
  );
}

export default App;
