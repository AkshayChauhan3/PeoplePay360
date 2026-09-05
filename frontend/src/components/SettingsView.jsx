import React, { useState } from 'react';

/* ── Toggle Switch ── */
const Toggle = ({ checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      width: 42, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
      background: checked ? 'var(--primary, #6366f1)' : 'var(--border-structural, #d1d5db)',
      transition: 'background 0.22s',
      flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: 3, left: checked ? 21 : 3,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.22s',
    }} />
  </div>
);

/* ── Field row ── */
const Field = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-structural)',
  borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit',
  color: 'var(--text-primary)', background: 'white', outline: 'none', boxSizing: 'border-box',
};

/* ── Section card wrapper ── */
const Card = ({ children, maxWidth = 640 }) => (
  <div style={{ background: 'white', border: '1px solid var(--border-structural)', borderRadius: '10px', padding: '1.5rem', maxWidth }}>
    {children}
  </div>
);

/* ── Section title ── */
const SectionTitle = ({ children }) => (
  <div className="font-bold text-sm mb-4" style={{ color: 'var(--primary)', borderBottom: '1px solid var(--border-structural)', paddingBottom: '10px', marginBottom: '16px' }}>
    {children}
  </div>
);

/* ── Save footer ── */
const SaveFooter = ({ onCancel, label = 'Save Changes' }) => (
  <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-structural)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
    {onCancel && <button className="btn-secondary" onClick={onCancel}>Cancel</button>}
    <button style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1.25rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  </div>
);

/* ══════════════════════════════════════════
   NOTIFICATIONS TAB
══════════════════════════════════════════ */
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    emailLeave:     true,
    emailPayroll:   true,
    emailAttendance: false,
    emailReports:   true,
    pushLeave:      true,
    pushPayroll:    false,
    pushAttendance: true,
    pushReports:    false,
    digestFreq:     'daily',
    digestTime:     '09:00',
  });
  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const row = (label, key, desc) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-structural)' }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 640 }}>
      <Card>
        <SectionTitle>📧 Email Notifications</SectionTitle>
        {row('Leave Request Updates', 'emailLeave', 'When a leave request is submitted, approved, or rejected')}
        {row('Payroll Events',        'emailPayroll',    'Payrun confirmed, payslips published')}
        {row('Attendance Alerts',     'emailAttendance', 'Late arrivals, early departures, missed check-ins')}
        {row('Weekly Reports',        'emailReports',    'Summary digest every Monday morning')}
        <SaveFooter label="Save Email Preferences" />
      </Card>

      <Card>
        <SectionTitle>🔔 In-App Push Notifications</SectionTitle>
        {row('Leave Approvals',   'pushLeave',      'Real-time alerts for pending leave actions')}
        {row('Payroll Updates',   'pushPayroll',    'Payrun status changes')}
        {row('Attendance Events', 'pushAttendance', 'Check-in / check-out reminders')}
        {row('Report Ready',      'pushReports',    'When a scheduled report is generated')}
        <SaveFooter label="Save Push Preferences" />
      </Card>

      <Card>
        <SectionTitle>📋 Digest Settings</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Digest Frequency">
            <select className="control-select" style={{ width: '100%', height: 38 }} value={prefs.digestFreq} onChange={e => setPrefs(p => ({ ...p, digestFreq: e.target.value }))}>
              <option value="realtime">Real-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>
          <Field label="Send Time">
            <input type="time" style={inputStyle} value={prefs.digestTime} onChange={e => setPrefs(p => ({ ...p, digestTime: e.target.value }))} />
          </Field>
        </div>
        <SaveFooter label="Save Digest Settings" />
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   SECURITY TAB
══════════════════════════════════════════ */
function SecurityTab() {
  const [mfa, setMfa]   = useState(false);
  const [sess, setSess] = useState('8');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [saved, setSaved]   = useState(false);

  const handlePwSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setPwForm({ current: '', newPw: '', confirm: '' });
  };

  const activityLog = [
    { action: 'Login',          ip: '103.21.58.xxx', device: 'Chrome · Windows',  time: '2 min ago',  ok: true },
    { action: 'Password Change', ip: '103.21.58.xxx', device: 'Chrome · Windows',  time: '3 days ago', ok: true },
    { action: 'Failed Login',    ip: '45.33.32.xxx',  device: 'Unknown Device',    time: '5 days ago', ok: false },
    { action: 'Login',          ip: '103.21.58.xxx', device: 'Mobile Safari',     time: '1 week ago', ok: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 640 }}>

      {/* Password */}
      <Card>
        <SectionTitle>🔑 Change Password</SectionTitle>
        {saved && (
          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#065f46', marginBottom: '14px', fontWeight: 600 }}>
            ✅ Password updated successfully
          </div>
        )}
        <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Field label="Current Password">
            <input type="password" style={inputStyle} value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
          </Field>
          <Field label="New Password">
            <input type="password" style={inputStyle} value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="Minimum 8 characters" />
          </Field>
          <Field label="Confirm New Password">
            <input type="password" style={inputStyle} value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1.25rem', height: '38px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Update Password
            </button>
          </div>
        </form>
      </Card>

      {/* MFA */}
      <Card>
        <SectionTitle>🛡️ Two-Factor Authentication (2FA)</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Authenticator App (TOTP)</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {mfa ? '🟢 Active — using Google / Microsoft Authenticator' : 'Not configured — adds an extra layer of protection'}
            </div>
          </div>
          <Toggle checked={mfa} onChange={setMfa} />
        </div>
        {mfa && (
          <div style={{ background: 'var(--surface-structural)', borderRadius: '8px', padding: '12px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            📱 Scan the QR code in your authenticator app or enter the secret key manually. Re-login required to activate.
          </div>
        )}
      </Card>

      {/* Session */}
      <Card>
        <SectionTitle>⏱️ Session Policy</SectionTitle>
        <Field label="Auto-logout after inactivity">
          <select className="control-select" style={{ width: '100%', height: 38 }} value={sess} onChange={e => setSess(e.target.value)}>
            {['1', '2', '4', '8', '12', '24'].map(h => <option key={h} value={h}>{h} hour{h !== '1' ? 's' : ''}</option>)}
          </select>
        </Field>
        <SaveFooter label="Save Session Policy" />
      </Card>

      {/* Activity log */}
      <Card>
        <SectionTitle>📋 Recent Account Activity</SectionTitle>
        <div>
          {activityLog.map((log, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < activityLog.length - 1 ? '1px solid var(--border-structural)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: log.ok ? '#d1fae5' : '#fff2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                {log.ok ? '✅' : '❌'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.device} · {log.ip}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{log.time}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   INTEGRATIONS TAB
══════════════════════════════════════════ */
function IntegrationsTab() {
  const integrations = [
    { name: 'Slack', desc: 'Send HR notifications to Slack channels', icon: '💬', connected: false },
    { name: 'Google Workspace', desc: 'Sync employee directory with Google', icon: '🟢', connected: true },
    { name: 'Razorpay Payroll', desc: 'Direct bank transfer for salaries', icon: '💳', connected: false },
    { name: 'Zoho People', desc: 'Import/export employee records', icon: '🔄', connected: false },
    { name: 'AWS S3', desc: 'Document storage for contracts & payslips', icon: '☁️', connected: true },
  ];
  return (
    <Card maxWidth={640}>
      <SectionTitle>🔗 Connected Integrations</SectionTitle>
      {integrations.map((ig, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < integrations.length - 1 ? '1px solid var(--border-structural)' : 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--surface-structural)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{ig.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ig.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{ig.desc}</div>
          </div>
          <button style={{ height: 32, padding: '0 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: ig.connected ? '1px solid #fca5a5' : '1px solid var(--border-structural)', background: ig.connected ? '#fff2f2' : 'var(--surface-structural)', color: ig.connected ? '#dc2626' : 'var(--text-secondary)', fontFamily: 'inherit' }}>
            {ig.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      ))}
    </Card>
  );
}

/* ══════════════════════════════════════════
   MAIN SETTINGS VIEW
══════════════════════════════════════════ */
const SettingsView = () => {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company',       label: 'Company' },
    { id: 'payroll',       label: 'Payroll' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security',      label: 'Security' },
    { id: 'integrations',  label: 'Integrations' },
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
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.2s', marginBottom: '-1px', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <Card>
          <SectionTitle>Company Information</SectionTitle>
          {[
            { label: 'Company Name',      defaultValue: 'Acme Corp Global' },
            { label: 'Registered Entity', defaultValue: 'Acme Technologies Pvt. Ltd.', readOnly: true },
            { label: 'GSTIN',             defaultValue: '27AABCA1234B1ZV',          readOnly: true },
            { label: 'Headquarters',      defaultValue: 'Mumbai, Maharashtra, India' },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              <input type="text" defaultValue={f.defaultValue} readOnly={f.readOnly}
                style={{ ...inputStyle, background: f.readOnly ? 'var(--surface-neutral, #f5f7fa)' : 'white' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {[
              { label: 'Default Timezone',  options: ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Europe/London'] },
              { label: 'Currency',          options: ['INR', 'USD', 'EUR', 'AED'] },
              { label: 'Fiscal Year Start', options: ['April', 'January', 'July', 'October'] },
              { label: 'Working Days',      options: ['Monday–Friday', 'Monday–Saturday'] },
            ].map((sel, i) => (
              <div key={i}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sel.label}</label>
                <select className="control-select" style={{ width: '100%', height: 38 }}>
                  {sel.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <SaveFooter onCancel={() => {}} />
        </Card>
      )}

      {activeTab === 'payroll' && (
        <Card>
          <SectionTitle>Payroll Configuration</SectionTitle>
          {[
            { label: 'Payroll Processing Day', value: '25th of every month' },
            { label: 'PF Registration No.',    value: 'MH/BAN/0099234' },
            { label: 'ESI Registration No.',   value: '31-00-123456-000-0001' },
            { label: 'TAN',                    value: 'MUMM12345A' },
            { label: 'LWF State',              value: 'Maharashtra' },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              <input type="text" defaultValue={f.value} style={inputStyle} />
            </div>
          ))}
          <SaveFooter />
        </Card>
      )}

      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security'      && <SecurityTab />}
      {activeTab === 'integrations'  && <IntegrationsTab />}
    </>
  );
};

export default SettingsView;
