import React from 'react';

const ContractDetailView = () => {
  return (
    <>
      <div className="dashboard-header-strip mb-6 rounded-lg shadow-sm" style={{ padding: '1.5rem', background: 'var(--surface-base)' }}>
        <div className="flex justify-between items-start w-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-pill active" style={{ display: 'flex', gap: '4px', alignItems: 'center', textTransform: 'uppercase' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> ACTIVE / RUNNING
              </span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide">Executive Grade 7 (Tech Tier A)</span>
              <span className="text-gray-500 text-[10px] font-medium flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                Fiduciary Cryptographic Ledger Linked
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-1" style={{ color: 'var(--primary)' }}>Contract #CNT-2024-0891</h2>
            <div className="text-sm font-semibold" style={{ color: 'var(--secondary)' }}>Standard Executive Employment Agreement • Master Services Ledger</div>
            <div className="text-xs text-muted flex items-center gap-1 mt-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Valid until <span className="font-bold text-gray-800">30 Jun 2025</span> • Scheduled renewal in <span className="text-teal-600 font-bold">184 days</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500 tracking-wider">CONTRACTED ANNUAL CTC</div>
              <div className="text-4xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>₹34,50,000</div>
              <div className="text-xs text-teal-600 font-medium">₹2,45,000 Monthly Fixed Base</div>
              <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded mt-1 border border-gray-100 flex items-center gap-1 inline-flex">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                HASH: 9b2d...f41a
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-xs py-1.5 px-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                SHA-256 PDF
              </button>
              <button className="btn-secondary text-xs py-1.5 px-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Amend
              </button>
              <button className="btn-secondary text-xs py-1.5 px-3" style={{ color: 'var(--critical)', borderColor: 'var(--critical-light)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Terminate
              </button>
              <button className="btn-primary text-xs py-1.5 px-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-8.27l-4.8 4.8"/></svg>
                Renew / Extend Contract
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Content Panel */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="card-panel relative" style={{ padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-purple-50 text-purple-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Employee Information</h3>
                  <p className="text-xs text-gray-500">Primary subject & reporting hierarchy</p>
                </div>
              </div>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-bold tracking-wide">EMP ID: PP-1042</span>
            </div>

            <div className="flex gap-4 items-center mb-6">
              <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm relative">
                <img src="https://i.pravatar.cc/150?u=1" alt="Ananya Sharma" className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-teal-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h4 className="font-bold text-lg text-gray-900">Ananya Sharma <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-2">Engineering Dept</span></h4>
                <p className="text-sm font-semibold text-teal-700 mb-1">Staff Architect & Tech Lead</p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> a.sharma@peoplepay360.com</span>
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Bengaluru Tech Park Hub (Hybrid)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">DIRECT MANAGER</div>
                <div className="flex items-center gap-2 mb-1">
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Elena Vance" className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-sm font-bold text-gray-900">Elena Vance</span>
                </div>
                <div className="text-[10px] font-medium text-teal-600">Chief People & Tech Officer</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">LEGAL ENTITY</div>
                <div className="text-sm font-bold text-gray-900 mb-1">PeoplePay India Pvt. Ltd.</div>
                <div className="text-[10px] font-mono text-gray-600">CIN: U72200KA2021PTC</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">TAX RESIDENCY</div>
                <div className="text-sm font-bold text-gray-900 mb-1">Republic of India (PAN Verified)</div>
                <div className="text-[10px] font-medium text-teal-600">New Tax Regime Applicable</div>
              </div>
            </div>
          </div>

          <div className="card-panel relative" style={{ padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-blue-50 text-blue-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Contract Terms & Schedule</h3>
                  <p className="text-xs text-gray-500">Operating stipulations, term limits, and work duration commitments</p>
                </div>
              </div>
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold tracking-wide">Permanent Full-Time</span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">EFFECTIVE DATE</div>
                <div className="text-sm font-bold text-gray-900">01 Jul 2023</div>
                <div className="text-[10px] text-teal-600 mt-1 font-medium">Initial execution</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">TERM EXPIRY</div>
                <div className="text-sm font-bold text-gray-900">30 Jun 2025</div>
                <div className="text-[10px] text-teal-600 mt-1 font-medium">Renewable fixed cycle</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">NOTICE PERIOD</div>
                <div className="text-sm font-bold text-gray-900">60 Calendar Days</div>
                <div className="text-[10px] text-gray-500 mt-1 font-medium">Mutual requirement</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">PROBATION CLAUSE</div>
                <div className="text-sm font-bold text-gray-900">Confirmed</div>
                <div className="text-[10px] text-gray-500 mt-1 font-medium">Completed 01 Jan 2024</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-100">
              <div className="flex gap-3 items-start">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mt-0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <div className="text-sm font-bold text-gray-900">Standard Enterprise Working Schedule</div>
                  <div className="text-xs text-gray-600 mb-1">40 Hours / Week • Monday through Friday • Core Collaboration Window 09:30 AM - 06:30 PM IST</div>
                  <div className="text-xs text-teal-600 font-medium hover:underline cursor-pointer">Flexible arrangement permitted under Hybrid Framework Policy v3.2</div>
                </div>
              </div>
              <div className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-1 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span> 100% Compliance Recorded
              </div>
            </div>
          </div>

          <div className="card-panel relative" style={{ padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-pink-50 text-pink-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Compensation & Salary Structure</h3>
                  <p className="text-xs text-gray-500">Itemized monthly disbursement schedule & statutory allocations</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1"><span className="font-semibold text-gray-400 uppercase tracking-wider">Pay Cycle:</span> <span className="font-bold text-gray-800">Monthly (28th of Month)</span></div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-gray-50 p-3 rounded border border-gray-100 text-center">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">GROSS MONTHLY BASE</div>
                <div className="text-2xl font-bold tabular-nums text-gray-900">₹2,45,000</div>
                <div className="text-[10px] text-teal-600 font-medium">Fixed monthly commitment</div>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-100 text-center">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">ANNUALIZED BASE</div>
                <div className="text-2xl font-bold tabular-nums text-gray-900">₹29,40,000</div>
                <div className="text-[10px] text-gray-500 font-medium">12 fixed disbursements</div>
              </div>
              <div className="p-3 rounded border border-primary text-center" style={{ background: 'var(--primary)', color: 'white' }}>
                <div className="text-[10px] text-purple-200 uppercase font-bold tracking-wider mb-1">TOTAL ANNUAL CTC</div>
                <div className="text-2xl font-bold tabular-nums text-white">₹34,50,000</div>
                <div className="text-[10px] text-purple-200 font-medium">Includes ₹5.1L Performance Bonus</div>
              </div>
            </div>

            <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="text-left pb-2 w-1/3">COMPONENT NAME</th>
                  <th className="text-left pb-2 w-1/5">CATEGORY</th>
                  <th className="text-right pb-2 w-1/5">BASIS / FORMULA</th>
                  <th className="text-right pb-2">MONTHLY AMOUNT</th>
                  <th className="text-right pb-2">ANNUAL IMPACT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-bold text-gray-900 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" style={{ background: 'var(--primary)' }}></div> Basic Pay</td>
                  <td className="py-3 text-gray-600 text-xs">Core Fixed</td>
                  <td className="py-3 text-right text-gray-500 text-xs">50.0% of Gross</td>
                  <td className="py-3 text-right font-bold tabular-nums">₹1,22,500</td>
                  <td className="py-3 text-right text-gray-500 tabular-nums">₹14,70,000</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-bold text-gray-900 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-secondary" style={{ background: 'var(--secondary)' }}></div> House Rent Allowance (HRA)</td>
                  <td className="py-3 text-gray-600 text-xs">Tax Exemptable</td>
                  <td className="py-3 text-right text-gray-500 text-xs">25.0% of Gross</td>
                  <td className="py-3 text-right font-bold tabular-nums">₹61,250</td>
                  <td className="py-3 text-right text-gray-500 tabular-nums">₹7,35,000</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-bold text-gray-900 flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#7d4e7e' }}></div> Special Executive Allowance</td>
                  <td className="py-3 text-gray-600 text-xs">Flexible Pool</td>
                  <td className="py-3 text-right text-gray-500 text-xs">Residual balance</td>
                  <td className="py-3 text-right font-bold tabular-nums">₹41,250</td>
                  <td className="py-3 text-right text-gray-500 tabular-nums">₹4,95,000</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-bold text-gray-900 flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#a9e6ff' }}></div> Employer PF Contribution</td>
                  <td className="py-3 text-gray-600 text-xs">Statutory Benefit</td>
                  <td className="py-3 text-right text-gray-500 text-xs">12% on Basic</td>
                  <td className="py-3 text-right font-bold tabular-nums">₹14,700</td>
                  <td className="py-3 text-right text-gray-500 tabular-nums">₹1,76,400</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-bold text-gray-900 flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#e0e3e3' }}></div> Medical & Telecom Reimbursement</td>
                  <td className="py-3 text-gray-600 text-xs">Perquisite</td>
                  <td className="py-3 text-right text-gray-500 text-xs">Flat standard allowance</td>
                  <td className="py-3 text-right font-bold tabular-nums">₹5,300</td>
                  <td className="py-3 text-right text-gray-500 tabular-nums">₹63,600</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 font-bold text-gray-900 px-2 rounded-l">Total Gross Monthly Disbursement</td>
                  <td colSpan="2" className="py-3"></td>
                  <td className="py-3 text-right font-bold tabular-nums">₹2,45,000</td>
                  <td className="py-3 text-right font-bold text-teal-700 tabular-nums px-2 rounded-r">₹29,40,000</td>
                </tr>
              </tbody>
            </table>

            <div>
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                <span>Component Ratio Distribution</span>
                <span>100% Allocation Balance</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden w-full mb-3 shadow-inner">
                <div style={{ width: '50%', background: 'var(--primary)' }} title="Basic 50%"></div>
                <div style={{ width: '25%', background: 'var(--secondary)' }} title="HRA 25%"></div>
                <div style={{ width: '16.8%', background: '#7d4e7e' }} title="Special Allw 16.8%"></div>
                <div style={{ width: '6%', background: '#a9e6ff' }} title="PF 6%"></div>
                <div style={{ width: '2.2%', background: '#e0e3e3' }} title="Other 2.2%"></div>
              </div>
              <div className="flex gap-4 text-[10px] font-medium text-gray-500 items-center justify-center">
                <span className="flex gap-1 items-center"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }}></div> Basic 50%</span>
                <span className="flex gap-1 items-center"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--secondary)' }}></div> HRA 25%</span>
                <span className="flex gap-1 items-center"><div className="w-2 h-2 rounded-full" style={{ background: '#7d4e7e' }}></div> Special Allw 16.8%</span>
                <span className="flex gap-1 items-center"><div className="w-2 h-2 rounded-full" style={{ background: '#a9e6ff' }}></div> PF 6%</span>
                <span className="flex gap-1 items-center"><div className="w-2 h-2 rounded-full" style={{ background: '#e0e3e3' }}></div> Other 2.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-[340px] flex flex-col gap-6 shrink-0">
          <div className="card-panel border-t-4" style={{ padding: '1.25rem', borderColor: 'var(--secondary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" style={{ color: 'var(--secondary)' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                Document Legal Status
              </h3>
              <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded tracking-widest">EXECUTED</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Legally binding electronic agreement executed under the Information Technology Act (2000) & eIDAS Regulation.
            </p>
            
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-6 group cursor-pointer hover:border-gray-300 transition-colors">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-10 bg-white border border-gray-200 flex flex-col justify-between items-center py-1 rounded shadow-sm text-[8px] font-bold text-red-600">
                  <span className="w-4 border-t-2 border-red-200"></span>
                  PDF
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">CNT-2024-0891-Executed.pdf</div>
                  <div className="text-[10px] text-gray-500">1.8 MB • SHA-256 Verified Seal</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-primary transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </div>

            <div className="mb-4 relative pl-4 border-l-2 border-gray-100 pb-4">
              <div className="absolute -left-2 top-0 bg-white p-0.5 text-gray-300"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></div>
              <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">EMPLOYEE SIGNATORY</div>
                <div className="text-[10px] text-teal-600 flex items-center gap-1 font-medium"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> DocuSign ID: 98124</div>
              </div>
              <div className="flex gap-2 items-center mb-1">
                <img src="https://i.pravatar.cc/150?u=1" alt="Ananya" className="w-6 h-6 rounded-full" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Ananya Sharma</div>
                  <div className="text-[10px] text-gray-500">28 Jun 2023 • 11:24 AM IST</div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded inline-block">IP: 203.192.241.6 • OTP Auth Verified</div>
            </div>

            <div className="relative pl-4 border-l-2 border-gray-100">
              <div className="absolute -left-2 top-0 bg-white p-0.5 text-gray-300"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></div>
              <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AUTHORIZED EMPLOYER SIGNATORY</div>
                <div className="text-[10px] text-teal-600 flex items-center gap-1 font-medium"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Enterprise Key</div>
              </div>
              <div className="flex gap-2 items-center mb-1">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Elena" className="w-6 h-6 rounded-full" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Elena Vance</div>
                  <div className="text-[10px] text-gray-500">29 Jun 2023 • 04:15 PM IST</div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded inline-block truncate w-full">Title: CPO • Auth Token #EL-9021-E...</div>
            </div>

            <button className="w-full mt-6 py-2 border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              View Public Verification Certificate
            </button>
          </div>

          <div className="card-panel" style={{ padding: '1.25rem' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Ledger Audit History
              </h3>
              <span className="text-[10px] text-muted">3 Events</span>
            </div>

            <div className="flex flex-col gap-0 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-100 z-0"></div>
              
              <div className="relative z-10 flex gap-3 mb-5 items-start">
                <div className="w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0 mt-0.5 border-2 border-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div>
                  <div className="text-xs font-bold text-gray-900 mb-0.5">Contract Renewed (+12% Salary Adj)</div>
                  <div className="text-[10px] text-gray-600 leading-snug mb-1">Annual compensation increment linked to FY24 appraisal.</div>
                  <div className="text-[10px] text-gray-400 font-medium">01 Jul 2024 • Processed by System</div>
                </div>
              </div>

              <div className="relative z-10 flex gap-3 mb-5 items-start">
                <div className="w-4 h-4 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 border-2 border-white" style={{ background: 'var(--primary)' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                <div>
                  <div className="text-xs font-bold text-gray-900 mb-0.5">Annual Performance Review Linked</div>
                  <div className="text-[10px] text-gray-600 leading-snug mb-1">Rating: Exceptional Performance (Grade A).</div>
                  <div className="text-[10px] text-gray-400 font-medium">15 May 2024 • Elena Vance</div>
                </div>
              </div>

              <div className="relative z-10 flex gap-3 items-start">
                <div className="w-4 h-4 rounded-full bg-gray-300 text-white flex items-center justify-center shrink-0 mt-0.5 border-2 border-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                <div>
                  <div className="text-xs font-bold text-gray-900 mb-0.5">Contract Initialized & Executed</div>
                  <div className="text-[10px] text-gray-600 leading-snug mb-1">Master Executive Employment Terms finalized and stored.</div>
                  <div className="text-[10px] text-gray-400 font-medium">29 Jun 2023 • DocuSign Connector</div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="#" className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors">Export Full Immutable Audit Trail (.CSV)</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContractDetailView;
