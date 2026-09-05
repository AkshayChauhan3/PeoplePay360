import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight } from 'lucide-react';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('Str0ng!Pass');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Str0ng!Pass');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          boxShadow: 'var(--elevation-tier2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '20px',
              marginBottom: '12px',
            }}
          >
            P
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>PeoplePay360</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Executive HR & Payroll Management System
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--error-tint)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--status-danger-text)',
              fontSize: '12px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Corporate Email</label>
            <input
              type="email"
              className="form-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Secure Password</label>
            <input
              type="password"
              className="form-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: '0.5rem', width: '100%' }}
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-hairline)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
            Fast Sign-In by Role Persona
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={() => setDemoUser('admin@company.com')}
            >
              Admin (All Access)
            </button>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={() => setDemoUser('maya@company.com')}
            >
              HR Manager
            </button>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={() => setDemoUser('nisha@company.com')}
            >
              Payroll Manager
            </button>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={() => setDemoUser('aarav@company.com')}
            >
              Payroll Specialist
            </button>
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              style={{ gridColumn: 'span 2' }}
              onClick={() => setDemoUser('rohan@company.com')}
            >
              Employee Self-Service (Rohan)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
