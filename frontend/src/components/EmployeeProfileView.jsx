import React from 'react';

const EmployeeProfileView = () => {
  return (
    <>
      <div className="card-panel mb-6" style={{ padding: '1.5rem', background: 'var(--surface-base)' }}>
        <div className="flex gap-6 items-start">
          <div className="relative">
            <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm">
              <img src="https://i.pravatar.cc/150?u=1" alt="Ananya Sharma" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
              <span className="status-pill highlight text-[10px] px-2 py-0.5" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> ONLINE
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>Ananya Sharma</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="status-pill active text-xs">Active Full-Time</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wide">ID: PP-1042</span>
            </div>
            <p className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Staff Architect & Engineering Lead</p>
            
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Engineering & Infrastructure
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Bengaluru Tech Center (Hybrid)
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Tenured: 3 Years, 4 Months <span className="text-muted">(Joined Jun 2021)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download File
            </button>
            <button className="btn-secondary">
              More Actions
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Edit Employee
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid mb-6">
        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">ACTIVE AGREEMENT</span>
            <div className="p-1.5 rounded bg-teal-50 text-teal-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
          </div>
          <div className="font-mono text-sm font-semibold mb-3">#CT-2024-892</div>
          <div className="kpi-value-row mb-1">
            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>₹34.50 L</span>
          </div>
          <div className="text-sm flex items-center justify-between mt-2">
            <span className="text-muted">Annual Fixed CTC</span>
            <span className="text-teal-600 font-medium flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Renews in 184d</span>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">MONTHLY ATTENDANCE</span>
            <div className="p-1.5 rounded bg-purple-50 text-purple-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          </div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>October 2024</div>
          <div className="kpi-value-row mb-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>97.4%</span>
            <span className="text-sm font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">19/20 Present</span>
          </div>
          <div className="text-sm flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <span className="text-muted">0 Late Check-ins</span>
            <span className="font-medium">1 On-site remote</span>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">PAID TIME OFF</span>
            <div className="p-1.5 rounded bg-purple-50 text-purple-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
          </div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>CY 2024 Balance</div>
          <div className="kpi-value-row mb-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>18</span>
            <span className="text-sm text-muted">Days Available</span>
          </div>
          <div className="text-sm flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">14 Annual</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">4 Sick</span>
            <span className="text-xs text-muted ml-auto">Next: None</span>
          </div>
        </div>

        <div className="kpi-card relative">
          <div className="kpi-title mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">ALLOCATED ASSETS</span>
            <div className="p-1.5 rounded bg-teal-50 text-teal-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
          </div>
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3 Hardware Units</div>
          <div className="kpi-value-row mb-1">
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>MacBook Pro M3 Max</span>
          </div>
          <div className="text-xs text-muted mb-2 truncate">27" 4K Dell UltraSharp, YubiKey ...</div>
          <div className="text-xs flex items-center gap-1 text-teal-600 font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Security Compliance: Validated
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200" style={{ background: 'var(--surface-base)' }}>
        <div className="flex gap-8 px-6">
          <div className="py-4 border-b-2 border-primary text-primary font-semibold text-sm cursor-pointer flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal & Contact
          </div>
          <div className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium text-sm cursor-pointer flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Work Hierarchy
          </div>
          <div className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium text-sm cursor-pointer flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
            Payroll & Tax
          </div>
          <div className="py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium text-sm cursor-pointer flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Documents & Compliance
            <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">8</span>
          </div>
          <div className="ml-auto py-4 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Audit Lock: Enabled</span>
            <span>·</span>
            <span>Last updated: 14 Oct 2024 by System Admin</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="card-panel relative" style={{ padding: '1.5rem' }}>
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-purple-50 text-purple-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Personal & Contact Record</h3>
                  <p className="text-sm text-gray-500">Government-verified personnel identification ledger</p>
                </div>
              </div>
              <span className="status-pill highlight">KYC VERIFIED</span>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Full Legal Name</div>
                <div className="font-semibold text-gray-900">Ananya Sharma</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Date of Birth</div>
                <div className="font-semibold text-gray-900">14 August 1991 (33 Years)</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Gender</div>
                <div className="font-semibold text-gray-900">Female</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Marital Status</div>
                <div className="font-semibold text-gray-900">Married</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Personal Email</div>
                <div className="font-medium text-teal-600">ananya.s@gmail.com</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Corporate Email</div>
                <div className="font-bold text-gray-900">a.sharma@peoplepay360.com</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Primary Mobile</div>
                <div className="font-mono font-medium text-gray-800">+91 98450 23114</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Emergency Contact</div>
                <div className="font-semibold text-gray-900">Rajesh Sharma <span className="font-normal text-gray-500">(Spouse)</span></div>
                <div className="font-mono text-sm text-gray-600 mt-0.5">+91 98458 23115</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Residential Address</div>
              <div className="flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-600 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="font-medium text-gray-800 max-w-lg leading-relaxed">402, Magnolia Residency, 12th Main Road, Indiranagar, Bengaluru, Karnataka 560038, India</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between text-xs pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                PII Encrypted (AES-256)
              </div>
              <a href="#" className="font-semibold text-teal-600 flex items-center gap-1 hover:underline">
                Request Address Update
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-1.5 rounded bg-teal-50 text-teal-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Emergency Protocol</h3>
                <p className="text-xs text-gray-500">First-responder contact tree</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100 flex gap-3 items-start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-600 mt-0.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <div>
                <div className="text-sm font-semibold text-gray-900">Priority Contact 1: Spouse</div>
                <div className="text-xs text-gray-600 mb-1">Rajesh Sharma • +91 98450 23115</div>
                <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-medium">Local (Bengaluru)</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex gap-3 items-start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mt-0.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <div>
                <div className="text-sm font-semibold text-gray-900">Corporate Medical Helpline</div>
                <div className="font-mono text-xs text-gray-600 mb-1">+91 80 4910 8800 (Ext 4)</div>
                <div className="text-[10px] text-gray-500 font-medium">Policy: Bajaj Allianz Executive Care</div>
              </div>
            </div>
          </div>

          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider">CAMPUS ACCESS</h3>
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
            </div>
            
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 mb-4">
              <div className="p-1.5 bg-white rounded border border-gray-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Keycard #8912-A</div>
                <div className="text-xs text-gray-500">Floor 4, Core Lab, Server Room B</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
              <span className="text-gray-500">Access Expiry</span>
              <span className="font-semibold text-gray-900">31 Dec 2025</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeProfileView;
