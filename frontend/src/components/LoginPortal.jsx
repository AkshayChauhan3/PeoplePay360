import React, { useState } from 'react';
import Logo from './Logo';
import { apiService } from '../services/apiService';

const DEMO_ACCOUNTS = [
  { roleLabel: 'System Admin', tag: 'ADMIN', email: 'admin@peoplepay360.com', password: 'Admin@123' },
  { roleLabel: 'HR Director', tag: 'CHRO', email: 'chro@peoplepay360.com', password: 'Hr@123456' },
  { roleLabel: 'HR Manager', tag: 'HR_MGR', email: 'hr.manager@peoplepay360.com', password: 'Hr@123456' },
  { roleLabel: 'Payroll Specialist', tag: 'PAYROLL', email: 'payroll@peoplepay360.com', password: 'Payroll@123' },
  { roleLabel: 'Employee (Priya Nair)', tag: 'EMPLOYEE', email: 'priya.nair@peoplepay360.com', password: 'Employee@123' },
];

const LoginPortal = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e, customEmail = null, customPassword = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const loginEmail = (customEmail !== null ? customEmail : email).trim();
    const loginPassword = customPassword !== null ? customPassword : password;

    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.login(loginEmail, loginPassword);
      let user = null;
      try {
        user = await apiService.getMe();
      } catch (_) {
        user = { email: loginEmail, role: 'ADMIN' };
      }
      onSignIn(user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotSent(true);
  };

  return (
    <div className="prod-login-container">
      {/* ── Left Hero Panel (Enterprise Showcase) ── */}
      <div className="prod-login-hero">
        <div className="prod-login-hero-glow-1"></div>
        <div className="prod-login-hero-glow-2"></div>
        <div className="prod-login-hero-grid"></div>

        {/* Top Brand Tagline */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'white', padding: '6px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <Logo />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', color: '#e0f2fe' }}>
              ENTERPRISE HCM & PAYROLL
            </span>
          </div>
        </div>

        {/* Center Hero Content */}
        <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 81, 102, 0.35)', border: '1px solid rgba(0, 191, 165, 0.4)', borderRadius: '20px', padding: '4px 14px', marginBottom: '1.25rem', fontSize: '12px', fontWeight: 600, color: '#5eead4' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 8px #2dd4bf' }}></span>
            Next-Gen Workforce Operating System
          </div>

          <h1 style={{ fontSize: '2.35rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 1rem 0', letterSpacing: '-0.025em', color: '#ffffff' }}>
            Unified payroll intelligence, built for modern enterprises.
          </h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.78)', margin: '0 0 2rem 0', maxWidth: '520px' }}>
            Automate multi-entity salary disbursements, statutory tax compliance, and biometric attendance telemetry with mathematical precision.
          </p>

          {/* 3 Value Proposition Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px' }}>
            <div className="prod-login-feature-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  ⚡
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Automated Payruns & Statutory Slips</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>Pre-configured PF, TDS, and statutory deduction rules with 1-click PDF generation.</div>
                </div>
              </div>
            </div>

            <div className="prod-login-feature-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  🛡️
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Zero-Trust Security & Granular RBAC</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>SOC 2 Type II certified, TLS 1.3 encrypted, with strict multi-tenant isolation.</div>
                </div>
              </div>
            </div>

            <div className="prod-login-feature-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Biometric Attendance & Leave Ledger</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>Real-time clock-in telemetry, monthly overview audits, and automatic leave accruals.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hero Trust Footer */}
        <div style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1.25rem' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>PeoplePay 360 Inc. &copy; 2026. Global Workforce & Payroll Engine.</span>
        </div>
      </div>

      {/* ── Right Auth Panel (Production Login Form) ── */}
      <div className="prod-login-form-pane">


        {/* Center Login Form Container */}
        <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto', padding: '1rem 0' }}>
          {/* Mobile Logo Only */}
          <div className="md:hidden" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <Logo />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Welcome back. Enter your organization credentials to access your PeoplePay 360 workspace.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-critical-bg, #fef2f2)',
                border: '1px solid var(--color-critical-border, #fecaca)',
                borderRadius: '8px',
                color: 'var(--color-critical, #b91c1c)',
                fontSize: '12px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Work Email */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                Work Email Address
              </label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <svg 
                  className="input-icon" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                >
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', height: '42px', paddingLeft: '38px', borderRadius: '8px', border: '1px solid var(--border-structural)', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotSent(false); setForgotEmail(email); }}
                  style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <svg 
                  className="input-icon" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', height: '42px', paddingLeft: '38px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--border-structural)', fontSize: '14px', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" x2="22" y1="2" y2="22"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <input 
                type="checkbox" 
                id="rememberDevice"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <label htmlFor="rememberDevice" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                Keep me signed in on this workstation for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading} 
              style={{ width: '100%', height: '42px', marginTop: '6px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to PeoplePay 360</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-structural)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#f59e0b' }}>⚡</span> Quick Demo Personas
              </span>
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Click to sign in instantly</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                    handleSubmit(null, acc.email, acc.password);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-structural)',
                    background: '#f8fafc',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = 'var(--secondary)';
                      e.currentTarget.style.background = '#f0fdfa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.borderColor = 'var(--border-structural)';
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                  title={`Sign in as ${acc.roleLabel} (${acc.email})`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>{acc.roleLabel}</span>
                    <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(0, 191, 165, 0.12)', color: '#0f766e', fontWeight: 600 }}>
                      {acc.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                    {acc.email}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Pass: <strong style={{ color: 'var(--text-primary)' }}>{acc.password}</strong></span>
                    <span style={{ color: 'var(--color-primary, #6366f1)', fontWeight: 600 }}>Sign In →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Footer Links */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '1.5rem', borderTop: '1px solid var(--border-structural)', width: '100%' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Need access to this portal? <a href="#" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Contact your HR Administrator</a>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
            <span>•</span>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
            <span>•</span>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Security Trust Center</a>
          </div>
          <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            &copy; 2026 PeoplePay 360 Inc. Enterprise Human Capital & Payroll Engine.
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '420px', maxWidth: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Reset Your Password</h3>
              <button onClick={() => setShowForgotModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>✕</button>
            </div>

            {!forgotSent ? (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Enter your verified work email address. We will dispatch a secure single-use recovery link to reset your corporate password.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>Corporate Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border-structural)' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowForgotModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Send Recovery Link</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '20px' }}>
                  ✓
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Recovery Email Dispatched</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  If an account exists for <strong>{forgotEmail}</strong>, instructions to reset your password have been sent.
                </p>
                <button type="button" className="btn-primary" onClick={() => setShowForgotModal(false)} style={{ width: '100%' }}>
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPortal;
