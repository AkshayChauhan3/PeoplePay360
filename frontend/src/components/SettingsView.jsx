import React, { useState } from 'react';

const SettingsView = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [companyName, setCompanyName] = useState('Acme Corp Global');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [fiscalStart, setFiscalStart] = useState('April');

  const tabs = [
    { id: 'company', label: 'Company' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'integrations', label: 'Integrations' },
  ];

  return (
    <>
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYSTEM</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Settings</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Configure your organisation preferences and system settings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-structural)', marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.2s', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.5rem', maxWidth: '640px' }}>
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--primary)' }}>Company Information</div>
          {[
            { label: 'Company Name', value: companyName, onChange: setCompanyName, type: 'text' },
            { label: 'Registered Entity', value: 'Acme Technologies Pvt. Ltd.', type: 'text', readOnly: true },
            { label: 'GSTIN', value: '27AABCA1234B1ZV', type: 'text', readOnly: true },
            { label: 'Headquarters', value: 'Mumbai, Maharashtra, India', type: 'text' },
          ].map((field, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{field.label}</label>
              <input type={field.type || 'text'} defaultValue={field.value} readOnly={field.readOnly} onChange={field.onChange ? e => field.onChange(e.target.value) : undefined}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-structural)', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: field.readOnly ? 'var(--surface-neutral)' : 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {[
              { label: 'Default Timezone', options: ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Europe/London'] },
              { label: 'Currency', options: ['INR', 'USD', 'EUR', 'AED'] },
              { label: 'Fiscal Year Start', options: ['April', 'January', 'July', 'October'] },
              { label: 'Working Days', options: ['Monday–Friday', 'Monday–Saturday'] },
            ].map((sel, i) => (
              <div key={i}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sel.label}</label>
                <select className="control-select" style={{ width: '100%', height: '38px' }}>
                  {sel.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-structural)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn-secondary">Cancel</button>
            <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1.25rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.5rem', maxWidth: '640px' }}>
          <div className="font-bold text-sm mb-4" style={{ color: 'var(--primary)' }}>Payroll Configuration</div>
          {[
            { label: 'Payroll Processing Day', value: '25th of every month' },
            { label: 'PF Registration No.', value: 'MH/BAN/0099234' },
            { label: 'ESI Registration No.', value: '31-00-123456-000-0001' },
            { label: 'TAN', value: 'MUMM12345A' },
            { label: 'LWF State', value: 'Maharashtra' },
          ].map((field, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{field.label}</label>
              <input type="text" defaultValue={field.value} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-structural)', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-structural)', display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1.25rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Save Changes</button>
          </div>
        </div>
      )}

      {(activeTab === 'notifications' || activeTab === 'security' || activeTab === 'integrations') && (
        <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '3rem', textAlign: 'center', maxWidth: '640px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔧</div>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>{tabs.find(t => t.id === activeTab)?.label} Settings</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>This section is coming soon.</div>
        </div>
      )}
    </>
  );
};

export default SettingsView;
