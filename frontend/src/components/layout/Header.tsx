import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { UserRole } from '../../types/api';
import {
  Clock,
  Play,
  Square,
  Shield,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface HeaderProps {
  currentTab?: string;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab = 'dashboard', onNavigate }) => {
  const { user, switchRole, isMockMode, toggleMockMode, logout } = useAuth();
  const { hasActiveSession, elapsedSeconds, checkIn, checkOut, isPunching, checkInTime } = useAttendance();
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  // Dropdown open states for Excalidraw Odoo top navbar
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const formatHMS = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const roles: { role: UserRole; label: string }[] = [
    { role: 'ADMIN', label: 'Admin (Full Access)' },
    { role: 'HR_MANAGER', label: 'HR Manager' },
    { role: 'HR_PAYROLL_MANAGER', label: 'Payroll Manager' },
    { role: 'HR_PAYROLL_USER', label: 'Payroll Specialist' },
    { role: 'EMPLOYEE', label: 'Employee Self-Service' },
  ];

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
    setOpenDropdown(null);
  };

  const userName = user?.email ? user.email.split('@')[0].replace('.', ' ') : 'Aarav Mehta';
  const formattedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
      {/* Left: Odoo-Style Top Navigation Menus matching Excalidraw */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          onClick={() => handleNav('dashboard')}
          style={{
            fontWeight: 800,
            fontSize: '15px',
            color: 'var(--primary)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>HR</span>
        </div>

        {/* Employees Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            style={{
              fontWeight: ['employees', 'contracts', 'departments', 'schedules'].includes(currentTab) ? 700 : 500,
              color: ['employees', 'contracts', 'departments', 'schedules'].includes(currentTab) ? 'var(--primary)' : 'inherit',
              gap: '4px',
            }}
            onClick={() => setOpenDropdown(openDropdown === 'employees' ? null : 'employees')}
          >
            <span>Employees</span>
            <ChevronDown size={13} />
          </button>

          {openDropdown === 'employees' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--elevation-tier2)',
                zIndex: 150,
                padding: '4px',
              }}
            >
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('employees')}
              >
                Employees
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('contracts')}
              >
                Contracts
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('departments')}
              >
                Departments
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('schedules')}
              >
                Working Schedule
              </div>
            </div>
          )}
        </div>

        {/* Contracts Direct Link */}
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          style={{
            fontWeight: currentTab === 'contracts' ? 700 : 500,
            color: currentTab === 'contracts' ? 'var(--primary)' : 'inherit',
          }}
          onClick={() => handleNav('contracts')}
        >
          Contracts
        </button>

        {/* Attendance Direct Link */}
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          style={{
            fontWeight: currentTab === 'attendance' ? 700 : 500,
            color: currentTab === 'attendance' ? 'var(--primary)' : 'inherit',
          }}
          onClick={() => handleNav('attendance')}
        >
          Attendance
        </button>

        {/* Time Off Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            style={{
              fontWeight: currentTab.startsWith('timeoff') ? 700 : 500,
              color: currentTab.startsWith('timeoff') ? 'var(--primary)' : 'inherit',
              gap: '4px',
            }}
            onClick={() => setOpenDropdown(openDropdown === 'timeoff' ? null : 'timeoff')}
          >
            <span>Time Off</span>
            <ChevronDown size={13} />
          </button>

          {openDropdown === 'timeoff' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--elevation-tier2)',
                zIndex: 150,
                padding: '4px',
              }}
            >
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('dashboard')}
              >
                Dashboard
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('timeoff-requests')}
              >
                Time Off Requests
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('timeoff-types')}
              >
                Time Off Types
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('timeoff-allocations')}
              >
                Allocations
              </div>
            </div>
          )}
        </div>

        {/* Payroll Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            style={{
              fontWeight: ['payroll', 'payslips', 'salary', 'rules'].includes(currentTab) ? 700 : 500,
              color: ['payroll', 'payslips', 'salary', 'rules'].includes(currentTab) ? 'var(--primary)' : 'inherit',
              gap: '4px',
            }}
            onClick={() => setOpenDropdown(openDropdown === 'payroll' ? null : 'payroll')}
          >
            <span>Payroll</span>
            <ChevronDown size={13} />
          </button>

          {openDropdown === 'payroll' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--elevation-tier2)',
                zIndex: 150,
                padding: '4px',
              }}
            >
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('dashboard')}
              >
                Dashboard
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('payroll')}
              >
                Payruns
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('payslips')}
              >
                Payslips
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('salary')}
              >
                Structures
              </div>
              <div
                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                className="dropdown-nav-item"
                onClick={() => handleNav('rules')}
              >
                Rules
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Attendance Widget, Mode Pill, Role Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Excalidraw Flow 2 Attendance Widget Icon with indicator */}
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          onClick={() => setIsPunchModalOpen(true)}
          title="Clicking the attendance icon opens the Check In / Check Out popup"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: hasActiveSession ? '1px solid rgba(56, 106, 33, 0.4)' : '1px solid rgba(186, 26, 26, 0.3)',
            backgroundColor: hasActiveSession ? 'rgba(56, 106, 33, 0.08)' : 'rgba(186, 26, 26, 0.05)',
          }}
        >
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: hasActiveSession ? 'var(--success)' : 'var(--danger)',
              boxShadow: hasActiveSession ? '0 0 6px rgba(56, 106, 33, 0.6)' : undefined,
            }}
          />
          <Clock size={14} color={hasActiveSession ? 'var(--success)' : 'var(--danger)'} />
          <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
            {hasActiveSession ? formatHMS(elapsedSeconds) : 'Punch Station'}
          </span>
        </button>

        {/* Backend Mode Pill */}
        <button
          type="button"
          className={`backend-mode-pill ${isMockMode ? 'mock' : 'live'}`}
          onClick={toggleMockMode}
          title="Toggle between Live FastAPI Backend and Schema-Compliant Mock Mode"
        >
          {isMockMode ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          <span>{isMockMode ? 'Mode: Mock' : 'Mode: Live'}</span>
        </button>

        {/* Demo Role / Persona Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            style={{ gap: '0.35rem' }}
          >
            <Shield size={14} color="var(--primary)" />
            <span style={{ fontWeight: 600 }}>{user?.role || 'Switch Role'}</span>
            <ChevronDown size={14} />
          </button>

          {isRoleMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '210px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--elevation-tier2)',
                zIndex: 100,
                padding: '6px',
              }}
            >
              <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Hackathon Persona Switcher
              </div>
              {roles.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '12px',
                    fontWeight: user?.role === r.role ? 700 : 500,
                    color: user?.role === r.role ? 'var(--primary)' : 'var(--text-primary)',
                    backgroundColor: user?.role === r.role ? 'var(--neutral-tint-purple)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => {
                    switchRole(r.role);
                    setIsRoleMenuOpen(false);
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User profile avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title={`Signed in as ${user?.email || 'admin@peoplepay360.com'}`}
          onClick={logout}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Excalidraw Flow 2 Attendance Widget Popup Modal */}
      <Modal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        title="Attendance Widget ⏱"
        size="md"
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Welcome back</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', margin: '4px 0 16px 0' }}>
            {formattedUserName}!
          </h2>

          <div
            style={{
              background: 'var(--neutral-tint-purple)',
              padding: '16px',
              borderRadius: 'var(--radius-control)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 600 }}>
              <span>{checkInTime ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '9:48 AM'} — Now</span>
              <span className="tabular-nums" style={{ color: 'var(--secondary)' }}>
                {hasActiveSession ? formatTime(elapsedSeconds) : '6h56'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', marginTop: '10px', color: 'var(--text-secondary)' }}>
              <span>Today</span>
              <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {hasActiveSession ? formatTime(elapsedSeconds) : '6h56'}
              </span>
            </div>
          </div>

          {hasActiveSession ? (
            <button
              type="button"
              className="btn btn-danger"
              style={{ width: '100%', height: '46px', fontSize: '15px', fontWeight: 700 }}
              disabled={isPunching}
              onClick={async () => {
                await checkOut();
                setIsPunchModalOpen(false);
              }}
            >
              <Square size={16} /> Check Out
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', height: '46px', fontSize: '15px', fontWeight: 700 }}
              disabled={isPunching}
              onClick={async () => {
                await checkIn();
                setIsPunchModalOpen(false);
              }}
            >
              <Play size={16} /> Check In
            </button>
          )}

          <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            • If there is no active session, show <strong>Check In</strong>.<br />
            • If the user is already checked in, show <strong>Check Out</strong>.<br />
            • After successful Check In, the status indicator changes to <strong>green</strong>.
          </div>
        </div>
      </Modal>
    </header>
  );
};
