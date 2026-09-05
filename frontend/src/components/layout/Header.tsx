import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { UserRole } from '../../types/api';
import { Clock, Play, Square, User, Shield, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';

export const Header: React.FC = () => {
  const { user, switchRole, isMockMode, toggleMockMode, logout } = useAuth();
  const { hasActiveSession, elapsedSeconds, checkIn, checkOut, isPunching, checkInTime } = useAttendance();
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const formatTime = (secs: number) => {
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

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Live Attendance Session Quick Widget */}
        <button
          type="button"
          className={`session-widget-btn ${hasActiveSession ? 'session-active' : ''}`}
          onClick={() => setIsPunchModalOpen(true)}
          title="Click to Punch In / Punch Out"
        >
          <div className="session-indicator-dot" />
          <Clock size={15} color="var(--secondary)" />
          <span className="session-timer-text tabular-nums">
            {hasActiveSession ? formatTime(elapsedSeconds) : '00:00:00 (Idle)'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {hasActiveSession ? 'Check-out' : 'Check-in'}
          </span>
        </button>
      </div>

      <div className="header-right">
        {/* Backend Mode Pill */}
        <button
          type="button"
          className={`backend-mode-pill ${isMockMode ? 'mock' : 'live'}`}
          onClick={toggleMockMode}
          title="Toggle between Live FastAPI Backend and Schema-Compliant Mock Mode"
        >
          {isMockMode ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          <span>{isMockMode ? 'Mode: Mock Fallback' : 'Mode: Live Backend'}</span>
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
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: user?.role === r.role ? 'var(--purple-tint)' : 'transparent',
                    color: user?.role === r.role ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: user?.role === r.role ? 600 : 400,
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    switchRole(r.role);
                    setIsRoleMenuOpen(false);
                  }}
                >
                  <span>{r.label}</span>
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border-hairline)', margin: '4px 0' }} />
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#B71C1C',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => {
                  logout();
                  setIsRoleMenuOpen(false);
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* User profile avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--purple-tint)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {user?.email ? user.email.slice(0, 2).toUpperCase() : <User size={14} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{user?.email?.split('@')[0]}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Attendance Quick Punch Modal */}
      <Modal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        title="Attendance Punch Station"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div
            className="tabular-nums"
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: hasActiveSession ? 'var(--secondary)' : 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            {hasActiveSession ? formatTime(elapsedSeconds) : '00:00:00'}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '1.5rem' }}>
            {hasActiveSession
              ? `Active Session started at ${checkInTime ? new Date(checkInTime).toLocaleTimeString() : 'earlier today'}`
              : 'You have no open session. Ready to check in for work?'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {hasActiveSession ? (
              <button
                type="button"
                className="btn btn-danger btn-lg"
                disabled={isPunching}
                onClick={async () => {
                  await checkOut();
                  setIsPunchModalOpen(false);
                }}
              >
                <Square size={16} />
                <span>Check Out & End Day</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                disabled={isPunching}
                onClick={async () => {
                  await checkIn();
                  setIsPunchModalOpen(false);
                }}
              >
                <Play size={16} />
                <span>Check In Now</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </header>
  );
};
