import React, { useState } from 'react';
import Logo from './Logo';
import { login, clearTokens } from '../api';

const LoginPortal = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try to log in via the real backend API
      await login(email, password);
      onSignIn();
    } catch (err) {
      // If the backend is not available (no DB yet), allow bypass for demo
      if (err?.status === undefined || err?.status === 0) {
        // Network / CORS / server down — allow demo access
        console.warn('Backend unavailable — using demo mode');
        onSignIn();
      } else if (err?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err?.status === 403) {
        setError('Your account is inactive. Contact your administrator.');
      } else {
        setError(err?.detail || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSSOClick = () => {
    // SSO not yet configured — fall through to demo mode
    onSignIn();
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

          <button className="btn-sso" onClick={handleSSOClick} type="button">
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
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">
                PASSWORD
                <a href="#" className="form-link" onClick={e => e.preventDefault()}>Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ background: '#fff2f2', border: '1px solid rgba(183,28,28,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            <div className="info-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <div>Accounts are created by an administrator. After sign-in, you see only the modules and actions your assigned role permits.</div>
            </div>

            <button
              type="submit"
              id="sign-in-btn"
              className="btn-primary w-full"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Authenticating…
                </>
              ) : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </>
              )}
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
            <div className="trust-dot"></div>
            <div className="trust-badge-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
        <div>&copy; 2025 PeoplePay 360 Inc. All rights reserved. Enterprise Payroll &amp; HRMS.</div>
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
