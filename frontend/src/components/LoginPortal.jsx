import React from 'react';
import Logo from './Logo';

const LoginPortal = ({ onSignIn }) => {
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

          <button className="btn-sso" onClick={onSignIn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            Authenticate via Corporate SSO (SAML 2.0)
          </button>

          <div className="divider">OR CREDENTIALS</div>

          <form onSubmit={(e) => { e.preventDefault(); onSignIn(); }}>
            <div className="form-group">
              <label className="form-label">WORK EMAIL</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input type="email" className="form-input" placeholder="name@company.com" required />
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
                <input type="password" className="form-input" placeholder="••••••••" required />
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
              <div>Accounts are created by an administrator. After sign-in, show only the modules and actions allowed by your assigned role.</div>
            </div>

            <button type="submit" className="btn-primary">
              Sign In
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </form>

          <div className="trust-badges">
            <div className="trust-badge-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              OAuth 2.0 Ready
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
          <div className="trust-badges" style={{ marginTop: '0.5rem' }}>
            <div className="trust-badge-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              SOC 2 Type II
            </div>
          </div>
        </div>

        <div className="support-link-wrapper">
          Need access to this portal? <a href="#">Contact your HR Administrator</a>
        </div>
      </main>

      <footer className="login-footer">
        <div>&copy; 2025 PeoplePay 360 Inc. All rights reserved. Enterprise Payroll & HRMS.</div>
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
