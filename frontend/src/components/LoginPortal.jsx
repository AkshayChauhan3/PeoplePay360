import React, { useState } from 'react';
import Logo from './Logo';
import { apiService } from '../services/apiService';

const LoginPortal = ({ onSignIn }) => {
  const [email, setEmail] = useState('admin@peoplepay360.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.login(email, password);
      onSignIn(res.user || { email, role: 'ADMIN' });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemo = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Admin@123');
  };

  return (
    <div className="login-wrapper">
      <nav className="login-nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Logo />
          <span className="portal-badge">HR PORTAL</span>
        </div>
        <div className="security-indicators">
          <div className="security-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            TLS 1.3 Encrypted Session
          </div>
          <div className="status-pill">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            Systems Operational
          </div>
        </div>
      </nav>

      <main className="login-main">
        <div className="auth-card">
          <div className="text-center">
            <div className="auth-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Enterprise Gateway
            </div>
          </div>

          <div className="auth-header text-center">
            <h1>Welcome back</h1>
            <p>Sign in to continue to your workspace.</p>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-critical-bg)',
                border: '1px solid var(--color-critical-border)',
                borderRadius: '8px',
                color: 'var(--color-critical)',
                fontSize: '12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            className="btn-sso"
            onClick={() => onSignIn({ email: 'admin@peoplepay360.com', role: 'ADMIN' })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            Authenticate via Corporate SSO (SAML 2.0)
          </button>

          <div className="divider">OR CREDENTIALS</div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">WORK EMAIL</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">
                PASSWORD
                <a href="#" className="form-link">Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <svg className="input-icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            </div>

            <div className="info-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <div>Connected to FastAPI backend (<code>POST /api/v1/auth/login</code>). Enter your credentials to log in.</div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </form>

          {/* Quick Persona Demo Selector */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-structural)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'center' }}>
              Quick Demo Personas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className="control-select"
                style={{ textAlign: 'center', fontSize: '11px', padding: '6px', cursor: 'pointer' }}
                onClick={() => setDemo('admin@peoplepay360.com', 'ADMIN')}
              >
                Admin (All Access)
              </button>
              <button
                type="button"
                className="control-select"
                style={{ textAlign: 'center', fontSize: '11px', padding: '6px', cursor: 'pointer' }}
                onClick={() => setDemo('maya@peoplepay360.com', 'HR_MANAGER')}
              >
                HR Manager
              </button>
              <button
                type="button"
                className="control-select"
                style={{ textAlign: 'center', fontSize: '11px', padding: '6px', cursor: 'pointer' }}
                onClick={() => setDemo('nisha@peoplepay360.com', 'HR_PAYROLL_MANAGER')}
              >
                Payroll Manager
              </button>
              <button
                type="button"
                className="control-select"
                style={{ textAlign: 'center', fontSize: '11px', padding: '6px', cursor: 'pointer' }}
                onClick={() => setDemo('rohan@peoplepay360.com', 'EMPLOYEE')}
              >
                Employee (Rohan)
              </button>
            </div>
          </div>

          <div className="trust-badges" style={{ marginTop: '1rem' }}>
            <div className="trust-badge-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              FastAPI / JWT Ready
            </div>
            <div className="trust-dot"></div>
            <div className="trust-badge-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <path d="M12 18h.01" />
              </svg>
              2FA Prompt Required
            </div>
          </div>
        </div>

        <div className="support-link-wrapper">
          Need access to this portal? <a href="#">Contact your HR Administrator</a>
        </div>
      </main>

      <footer className="login-footer">
        <div>&copy; 2026 PeoplePay 360 Inc. All rights reserved. Enterprise Payroll & HRMS.</div>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Security Whitepaper</a>
        </div>
      </footer>
    </div>
  );
};

export default LoginPortal;
