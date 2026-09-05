import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { ROLE_LABELS } from '../utils/rbac';

const DashboardPortal = ({ onNavigate, currentUser }) => {
  const userRole = (currentUser?.role || 'ADMIN').toUpperCase();
  const displayName = currentUser?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'User');

  // Shared / API Summary state
  const [summary, setSummary] = useState({
    netDisbursed: '₹48,50,000',
    headcount: 248,
    attendanceRate: '98.4%',
    alertsCount: 2,
  });

  // Employee specific interactive state
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTimestamp, setClockInTimestamp] = useState('Today, 09:28 AM');

  // HR Manager interactive pending leave approval items
  const [hrPendingLeaves, setHrPendingLeaves] = useState([
    { id: 1, name: 'Aarav Mehta', dept: 'Engineering', type: 'Annual Leave', days: 3, date: 'Oct 28 - Oct 30', avatar: 'https://i.pravatar.cc/150?u=12' },
    { id: 2, name: 'Sara Khan', dept: 'Marketing', type: 'Casual Leave', days: 1, date: 'Nov 02', avatar: 'https://i.pravatar.cc/150?u=24' },
    { id: 3, name: 'Vikram Sen', dept: 'Sales', type: 'Sick Leave', days: 2, date: 'Oct 24 - Oct 25', avatar: 'https://i.pravatar.cc/150?u=35' },
  ]);

  // Payroll Specialist checklist state
  const [auditChecklist, setAuditChecklist] = useState({
    contractsChecked: true,
    overtimeReconciled: true,
    pfEsiCeilingsVerified: false,
    bankAccountsValidated: true,
    unpaidLeavesDeducted: false,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await apiService.getDashboardSummary();
        if (data) {
          setSummary({
            netDisbursed: data.netDisbursed || (data.net_disbursed ? `₹${data.net_disbursed.toLocaleString('en-IN')}` : '₹48,50,000'),
            headcount: data.headcount || data.active_headcount || 248,
            attendanceRate: data.attendanceRate || (data.attendance_rate ? `${data.attendance_rate}%` : '98.4%'),
            alertsCount: data.alertsCount || data.exceptions_count || 2,
          });
        }
      } catch (err) {
        console.warn('Using default summary metrics:', err);
      }
    };
    fetchSummary();
  }, []);

  const handleApproveLeave = (id) => {
    setHrPendingLeaves(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleChecklist = (key) => {
    setAuditChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==========================================
  // 1. ADMIN DASHBOARD (Executive HR + Payroll)
  // ==========================================
  if (userRole === 'ADMIN') {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header-strip">
          <div className="dashboard-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>Executive Control Hub</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Company Overview</span>
            </div>
            <h2>Enterprise HR & Payroll Executive Dashboard</h2>
            <p>Cross-functional telemetry aggregating real-time payroll liabilities, total workforce headcount, and statutory compliance.</p>
          </div>
          <div className="dashboard-controls">
            <select className="control-select">
              <option>October 2024 Cycle</option>
              <option>November 2024 Cycle</option>
            </select>
            <select className="control-select" onChange={(e) => { if (e.target.value === 'dept') onNavigate('departments'); }}>
              <option value="all">All Departments</option>
              <option value="dept">Go to Departments →</option>
            </select>
            <button className="btn-secondary" onClick={() => onNavigate('reports')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Executive Report
            </button>
          </div>
        </div>

        {/* Executive KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('payruns')} style={{ cursor: 'pointer' }} title="Click to view Payruns">
            <div className="kpi-title">Total Net Disbursed</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.netDisbursed}</span>
              <span className="kpi-badge positive">+3.8% vs Sep</span>
            </div>
            <div className="kpi-subtext">Disbursed via HDFC Multi-ACH · View Payruns →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('directory')} style={{ cursor: 'pointer' }} title="Click to view Directory">
            <div className="kpi-title">Active Headcount</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.headcount} Employees</span>
            </div>
            <div className="kpi-subtext">100% Active Workforce Roster · View Directory →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }} title="Click to view Attendance">
            <div className="kpi-title">Attendance Integrity</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.attendanceRate}</span>
            </div>
            <div className="kpi-subtext">244 On-Time / Present · View Attendance →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('time_off_requests')} style={{ cursor: 'pointer' }} title="Click to view Requests">
            <div className="kpi-title">Compliance & Alerts</div>
            <div className="kpi-chip-amber">{summary.alertsCount} Exceptions</div>
            <div className="kpi-subtext">1 Missing Bank Account · View Requests →</div>
          </div>
        </div>

        {/* Executive Charts */}
        <div className="charts-grid">
          <div className="card-panel">
            <div className="panel-title">Monthly Net Salary Trend</div>
            <div className="chart-placeholder">
              <div className="bar-col"><div className="bar-fill" style={{ height: '40%' }}></div><div className="bar-label">Apr</div></div>
              <div className="bar-col"><div className="bar-fill" style={{ height: '50%' }}></div><div className="bar-label">May</div></div>
              <div className="bar-col"><div className="bar-fill" style={{ height: '55%' }}></div><div className="bar-label">Jun</div></div>
              <div className="bar-col"><div className="bar-fill" style={{ height: '70%' }}></div><div className="bar-label">Jul</div></div>
              <div className="bar-col"><div className="bar-fill" style={{ height: '85%' }}></div><div className="bar-label">Aug</div></div>
              <div className="bar-col"><div className="bar-fill" style={{ height: '95%' }}></div><div className="bar-label">Sep</div></div>
              <div className="bar-col"><div className="bar-fill" style={{ height: '100%' }}></div><div className="bar-label">Oct</div></div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Salary Cost by Department</div>
            <div className="breakdown-list">
              <div className="breakdown-item">
                <div className="breakdown-header"><span>IT & Infrastructure</span><span className="tabular-nums">₹17.0L (35%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '35%', background: 'var(--primary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Sales & Growth</span><span className="tabular-nums">₹15.0L (31%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '31%', background: '#623067' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Finance & Compliance</span><span className="tabular-nums">₹13.0L (27%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '27%', background: 'var(--secondary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>HR & People Ops</span><span className="tabular-nums">₹11.0L (23%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '23%', background: '#007694' }}></div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Grid */}
        <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card-panel">
            <div className="panel-title">Payrun Pipeline & Status</div>
            <div className="stepper">
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Draft</div></div>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Compute</div></div>
              <div className="step active"><div className="step-indicator">3</div><div className="step-label">Review Warnings</div></div>
              <div className="step"><div className="step-indicator">4</div><div className="step-label">Validate</div></div>
              <div className="step"><div className="step-indicator">5</div><div className="step-label">Paid</div></div>
            </div>
            <button className="btn-ghost-purple" onClick={() => onNavigate('payruns')} style={{ marginTop: 'auto' }}>
              Review Payrun PR-2024-10 &rarr;
            </button>
          </div>

          <div className="card-panel">
            <div className="panel-title">Attendance & Presence Health</div>
            <div className="donut-container">
              <div className="donut">
                <div className="donut-inner">
                  <div className="donut-inner-value tabular-nums">248</div>
                  <div className="donut-inner-label">Total</div>
                </div>
              </div>
              <div className="donut-legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }}></div>Present <span className="tabular-nums">198</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--secondary)' }}></div>Remote/WFH <span className="tabular-nums">36</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--critical)' }}></div>On-Leave <span className="tabular-nums">14</span></div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Executive Action Items</div>
            <div className="action-list">
              <div className="action-item">
                <div className="action-info">
                  <h4>Statutory PF/ESI Filing</h4>
                  <p>Quarterly return sign-off required</p>
                </div>
                <div className="action-btns"><button className="btn-small primary" onClick={() => onNavigate('reports')}>Sign Off</button></div>
              </div>
              <div className="action-item">
                <div className="action-info">
                  <h4>Salary Structure Revision</h4>
                  <p>FY25 H2 allowance revision pending</p>
                </div>
                <div className="action-btns"><button className="btn-small" onClick={() => onNavigate('salary_structures')}>Review</button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 2. HR MANAGER DASHBOARD (Workforce, Talent, Leaves, Retention)
  // [NO SALARY OR PAYROLL FINANCIAL AMOUNTS SHOWN]
  // ============================================================
  if (userRole === 'HR_MANAGER') {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header-strip">
          <div className="dashboard-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-teal" style={{ fontSize: '11px', padding: '2px 8px' }}>People Operations Hub</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Workforce & Time-Off Management</span>
            </div>
            <h2>Workforce Operations & Talent Management</h2>
            <p>Active employee roster, daily attendance check-ins, department capacity, and pending leave sign-offs.</p>
          </div>
          <div className="dashboard-controls">
            <button className="btn-secondary" onClick={() => onNavigate('directory')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              View Full Directory
            </button>
            <button className="btn-primary" onClick={() => onNavigate('time_off_requests')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Time Off Requests
            </button>
          </div>
        </div>

        {/* HR Manager Workforce KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('directory')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Active Workforce</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.headcount} Personnel</span>
              <span className="kpi-badge positive">+12 this Q</span>
            </div>
            <div className="kpi-subtext">Across 5 Active Departments · Manage Roster →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Today's Check-In Rate</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.attendanceRate}</span>
              <span className="kpi-badge positive">99.1% on-time</span>
            </div>
            <div className="kpi-subtext">244 Present · 14 On-Leave · Audit Timesheets →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('time_off_requests')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Pending Leave Requests</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums" style={{ color: 'var(--color-critical, #b71c1c)' }}>{hrPendingLeaves.length} Awaiting Sign-off</span>
            </div>
            <div className="kpi-subtext">Requires HR Manager Approval · Review →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('job_positions')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Open Job Positions</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">6 Open Roles</span>
              <span className="kpi-badge" style={{ background: 'var(--surface-purple-tint)', color: 'var(--primary)' }}>Active Hiring</span>
            </div>
            <div className="kpi-subtext">3 Engineering · 2 Sales · 1 Product · View →</div>
          </div>
        </div>

        {/* HR Panels */}
        <div className="charts-grid">
          {/* Department Headcount Allocation */}
          <div className="card-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Department Headcount & Allocation</span>
              <button className="btn-ghost-purple" onClick={() => onNavigate('departments')} style={{ fontSize: '11px', padding: '2px 8px' }}>Manage Depts &rarr;</button>
            </div>
            <div className="breakdown-list">
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Engineering & Tech</span><span className="tabular-nums">85 Employees (34%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '34%', background: 'var(--secondary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Sales & Enterprise Growth</span><span className="tabular-nums">62 Employees (25%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '25%', background: '#007694' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Product & UX Design</span><span className="tabular-nums">41 Employees (17%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '17%', background: 'var(--primary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Customer Success & Support</span><span className="tabular-nums">32 Employees (13%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '13%', background: '#623067' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>People Operations & Admin</span><span className="tabular-nums">28 Employees (11%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '11%', background: '#27a4c4' }}></div></div>
              </div>
            </div>
          </div>

          {/* Pending Leave Sign-offs with Live Approve Buttons */}
          <div className="card-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pending Leave Approvals ({hrPendingLeaves.length})</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Instant Action</span>
            </div>
            {hrPendingLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
                <p style={{ fontWeight: 600 }}>All caught up! No pending leave requests.</p>
              </div>
            ) : (
              <div className="action-list">
                {hrPendingLeaves.map(leave => (
                  <div key={leave.id} className="action-item" style={{ alignItems: 'center' }}>
                    <img src={leave.avatar} alt={leave.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div className="action-info" style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{leave.name}</h4>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--secondary)' }}>{leave.type}</strong> ({leave.days}d) · {leave.date} · {leave.dept}
                      </p>
                    </div>
                    <div className="action-btns">
                      <button className="btn-small" onClick={() => handleApproveLeave(leave.id)} style={{ color: 'var(--color-critical)' }}>Reject</button>
                      <button className="btn-small primary" onClick={() => handleApproveLeave(leave.id)}>Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workforce Presence & Contract Alerts */}
        <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card-panel">
            <div className="panel-title">Workforce Presence Today</div>
            <div className="donut-container">
              <div className="donut">
                <div className="donut-inner">
                  <div className="donut-inner-value tabular-nums">248</div>
                  <div className="donut-inner-label">Total</div>
                </div>
              </div>
              <div className="donut-legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }}></div>Present <span className="tabular-nums">198</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--secondary)' }}></div>Remote/WFH <span className="tabular-nums">36</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--critical)' }}></div>On-Leave <span className="tabular-nums">14</span></div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Contract Milestones & Renewals</div>
            <div className="action-list">
              <div className="action-item">
                <div className="action-info">
                  <h4>Marcus Brody (Senior UX)</h4>
                  <p>Probation completion in 7 days</p>
                </div>
                <button className="btn-small primary" onClick={() => onNavigate('contract_detail')}>Confirm</button>
              </div>
              <div className="action-item">
                <div className="action-info">
                  <h4>Rohit Varma (Backend Eng)</h4>
                  <p>Fixed-term renewal in 14 days</p>
                </div>
                <button className="btn-small" onClick={() => onNavigate('all_contracts')}>Review</button>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">HR Quick Launchpad</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => onNavigate('directory')} style={{ justifyContent: 'flex-start' }}>
                👥 Manage Workforce Directory
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('time_off_requests')} style={{ justifyContent: 'flex-start' }}>
                🏖️ Time Off & Leave Allocations
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('all_contracts')} style={{ justifyContent: 'flex-start' }}>
                📄 Employment Contracts
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('monthly_overview')} style={{ justifyContent: 'flex-start' }}>
                📅 Monthly Attendance Overview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // 3. HR PAYROLL MANAGER DASHBOARD (Payroll, Batches, Calculations)
  // ===============================================================
  if (userRole === 'HR_PAYROLL_MANAGER') {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header-strip">
          <div className="dashboard-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>Compensation & Disbursement</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Payroll Management Hub</span>
            </div>
            <h2>Payroll Operations & Compensation Control</h2>
            <p>Cycle payrun computation, statutory PF/ESI/TDS reconciliation, timesheet readiness, and multi-bank disbursement.</p>
          </div>
          <div className="dashboard-controls">
            <select className="control-select">
              <option>October 2024 Payrun (Draft/Review)</option>
              <option>September 2024 (Paid)</option>
            </select>
            <button className="btn-primary" onClick={() => onNavigate('payruns')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Execute Payrun Wizard
            </button>
          </div>
        </div>

        {/* Payroll Manager KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('payruns')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Current Payrun Liability</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.netDisbursed}</span>
              <span className="kpi-badge positive">+3.8% MoM</span>
            </div>
            <div className="kpi-subtext">248 Payslips Computed · October 2024 Cycle</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('salary_rules')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Statutory Deductions</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">₹9,35,000</span>
            </div>
            <div className="kpi-subtext">PF: ₹3.4L · ESI: ₹85K · TDS: ₹5.1L · Verify →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Timesheet Payroll Readiness</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">98.4% Locked</span>
            </div>
            <div className="kpi-subtext">4 Unapproved LOPs requiring sign-off →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('payruns')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Active Batch Status</div>
            <div className="kpi-chip-amber">Step 3: Review Warnings</div>
            <div className="kpi-subtext">Cycle PR-2024-10 awaiting Validation →</div>
          </div>
        </div>

        {/* Payroll Pipelines */}
        <div className="charts-grid">
          <div className="card-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Payrun Pipeline Progression (PR-2024-10)</span>
              <button className="btn-ghost-purple" onClick={() => onNavigate('payruns')} style={{ fontSize: '11px', padding: '2px 8px' }}>Open Batch &rarr;</button>
            </div>
            <div className="stepper" style={{ margin: '1.5rem 0' }}>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Draft</div></div>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Compute</div></div>
              <div className="step active"><div className="step-indicator">3</div><div className="step-label">Review Warnings</div></div>
              <div className="step"><div className="step-indicator">4</div><div className="step-label">Validate</div></div>
              <div className="step"><div className="step-indicator">5</div><div className="step-label">Paid</div></div>
            </div>
            <div style={{ background: 'var(--color-surface-neutral, #f7fafa)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-structural)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ fontWeight: 600 }}>Batch Calculation Integrity</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>246 / 248 Clean</span>
              </div>
              <div className="breakdown-track" style={{ height: '8px' }}>
                <div className="breakdown-bar" style={{ width: '99%', background: 'var(--primary)' }}></div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Salary Cost Allocation by Department</div>
            <div className="breakdown-list">
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Engineering & Tech</span><span className="tabular-nums">₹17.0L (35%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '35%', background: 'var(--primary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Sales & Growth</span><span className="tabular-nums">₹15.0L (31%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '31%', background: '#623067' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Finance & Ops</span><span className="tabular-nums">₹13.0L (27%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '27%', background: 'var(--secondary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Customer Support</span><span className="tabular-nums">₹3.5L (7%)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '7%', background: '#27a4c4' }}></div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Exceptions & Rules Grid */}
        <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card-panel">
            <div className="panel-title">Payroll Exceptions Flagged</div>
            <div className="action-list">
              <div className="action-item">
                <div className="action-info">
                  <h4>Pooja Hegde (PP-1045)</h4>
                  <p>Missing IFSC Code in Salary Structure</p>
                </div>
                <button className="btn-small primary" onClick={() => onNavigate('salary_structures')}>Fix</button>
              </div>
              <div className="action-item">
                <div className="action-info">
                  <h4>Kunal Roy (PP-1092)</h4>
                  <p>LOP adjustment exceeds 5 days</p>
                </div>
                <button className="btn-small" onClick={() => onNavigate('attendance_records')}>Verify</button>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Salary Rule Matrix</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
                <span>BASIC (Basic Pay)</span>
                <span style={{ fontWeight: 700 }}>50% of CTC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
                <span>HRA (House Rent Allowance)</span>
                <span style={{ fontWeight: 700 }}>40% of Basic</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
                <span>EPF (Employee Provident Fund)</span>
                <span style={{ fontWeight: 700, color: 'var(--critical)' }}>12% of Basic</span>
              </div>
            </div>
            <button className="btn-ghost-purple" onClick={() => onNavigate('salary_rules')} style={{ marginTop: 'auto' }}>
              Configure Salary Rules &rarr;
            </button>
          </div>

          <div className="card-panel">
            <div className="panel-title">Disbursement Gateways</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--color-surface-neutral)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px' }}>HDFC Direct ACH</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Corporate API Connected</div>
                </div>
                <span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span>
              </div>
              <button className="btn-secondary" onClick={() => onNavigate('payslips')} style={{ marginTop: '8px' }}>
                📄 Review Individual Payslips (248)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // 4. HR PAYROLL USER DASHBOARD (Payroll Specialist / Audit & Review)
  // ===============================================================
  if (userRole === 'HR_PAYROLL_USER') {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header-strip">
          <div className="dashboard-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-amber" style={{ fontSize: '11px', padding: '2px 8px' }}>Payroll Specialist Hub</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Verification & Audit Queue</span>
            </div>
            <h2>Payroll Audit & Verification Workspace</h2>
            <p>Pre-payroll verification checklist, contract compensation verification, and payslip data validation.</p>
          </div>
          <div className="dashboard-controls">
            <button className="btn-secondary" onClick={() => onNavigate('payslips')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Review All Payslips
            </button>
            <button className="btn-primary" onClick={() => onNavigate('attendance_records')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Verify Attendance
            </button>
          </div>
        </div>

        {/* Specialist Audit KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('payslips')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Payslips in Verification Queue</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">248 Drafts</span>
            </div>
            <div className="kpi-subtext">October 2024 Batch PR-2024-10 · Audit →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Timesheets Audited</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">244 / 248</span>
              <span className="kpi-badge positive">98.4%</span>
            </div>
            <div className="kpi-subtext">4 Unlocked records to confirm →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('salary_structures')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Calculations Matched</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">100% Formulas</span>
            </div>
            <div className="kpi-subtext">Zero mathematical discrepancies · Verify →</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Verification Checklist</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums" style={{ color: 'var(--color-primary)' }}>
                {Object.values(auditChecklist).filter(Boolean).length} / 5 Done
              </span>
            </div>
            <div className="kpi-subtext">Mark items complete below</div>
          </div>
        </div>

        {/* Specialist Audit Checklist & Department Matrix */}
        <div className="charts-grid">
          <div className="card-panel">
            <div className="panel-title">Pre-Disbursement Audit Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditChecklist.contractsChecked} onChange={() => handleToggleChecklist('contractsChecked')} />
                <span style={{ textDecoration: auditChecklist.contractsChecked ? 'line-through' : 'none', color: auditChecklist.contractsChecked ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  Active employment contracts verified against roster
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditChecklist.overtimeReconciled} onChange={() => handleToggleChecklist('overtimeReconciled')} />
                <span style={{ textDecoration: auditChecklist.overtimeReconciled ? 'line-through' : 'none', color: auditChecklist.overtimeReconciled ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  Overtime and holiday work hours reconciled with biometrics
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditChecklist.pfEsiCeilingsVerified} onChange={() => handleToggleChecklist('pfEsiCeilingsVerified')} />
                <span style={{ textDecoration: auditChecklist.pfEsiCeilingsVerified ? 'line-through' : 'none', color: auditChecklist.pfEsiCeilingsVerified ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  Statutory PF ceiling (₹15,000) and ESI eligibility verified
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditChecklist.bankAccountsValidated} onChange={() => handleToggleChecklist('bankAccountsValidated')} />
                <span style={{ textDecoration: auditChecklist.bankAccountsValidated ? 'line-through' : 'none', color: auditChecklist.bankAccountsValidated ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  Employee bank account & IFSC credentials validated
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditChecklist.unpaidLeavesDeducted} onChange={() => handleToggleChecklist('unpaidLeavesDeducted')} />
                <span style={{ textDecoration: auditChecklist.unpaidLeavesDeducted ? 'line-through' : 'none', color: auditChecklist.unpaidLeavesDeducted ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  Unpaid leave (LOP) days accurately deducted from basic pay
                </span>
              </label>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Batch Department Distribution</div>
            <div className="breakdown-list">
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Engineering (85 Slips)</span><span className="tabular-nums">100% Ready</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '100%', background: 'var(--success)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Sales & Growth (62 Slips)</span><span className="tabular-nums">100% Ready</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '100%', background: 'var(--success)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>Product & UX (41 Slips)</span><span className="tabular-nums">98% Ready (1 Warn)</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '98%', background: 'var(--secondary)' }}></div></div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-header"><span>People Ops & Admin (60 Slips)</span><span className="tabular-nums">100% Ready</span></div>
                <div className="breakdown-track"><div className="breakdown-bar" style={{ width: '100%', background: 'var(--success)' }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =================================================================
  // 5. EMPLOYEE DASHBOARD (Self-Service Portal - ESS)
  // [PERSONAL ONLY: NO COMPANY SALARIES, NO OTHER EMPLOYEES' DATA]
  // =================================================================
  return (
    <div className="dashboard-content">
      <div className="dashboard-header-strip">
        <div className="dashboard-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-green" style={{ fontSize: '11px', padding: '2px 8px' }}>Employee Self-Service (ESS)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Welcome, {displayName}!</span>
          </div>
          <h2>My Personal Workplace Dashboard</h2>
          <p>Access your personal attendance check-ins, leave allowances, download salary slips, and review shift schedules.</p>
        </div>
        <div className="dashboard-controls">
          <button className="btn-secondary" onClick={() => onNavigate('payslips')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            My Payslips
          </button>
          <button className="btn-primary" onClick={() => onNavigate('time_off_requests')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Request Time Off
          </button>
        </div>
      </div>

      {/* Employee Personal KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('time_off_requests')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">My Leave Balance</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">14 Days</span>
            <span className="kpi-badge positive">Available</span>
          </div>
          <div className="kpi-subtext">7 Used of 21 Annual Quota · Apply Leave →</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">My Attendance (Oct 2024)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">21 Days</span>
            <span className="kpi-badge positive">100% Present</span>
          </div>
          <div className="kpi-subtext">Zero LOP · 100% Punctuality Record →</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('payslips')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Latest Disbursed Salary</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">₹68,500</span>
          </div>
          <div className="kpi-subtext">September 2024 · Paid Oct 01 · View Payslip →</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">My Shift & Schedule</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ fontSize: '1.25rem' }}>09:30 - 18:30 IST</span>
          </div>
          <div className="kpi-subtext">General Shift · Mon - Fri (Bengaluru Hub)</div>
        </div>
      </div>

      {/* Employee Personal Cards */}
      <div className="charts-grid">
        {/* Interactive Clock In / Clock Out Attendance Tracker */}
        <div className="card-panel">
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Today's Attendance Punch</span>
            <span className={`badge ${isClockedIn ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '11px' }}>
              {isClockedIn ? '● Checked In' : '○ Checked Out'}
            </span>
          </div>

          <div style={{ padding: '1.5rem', background: 'var(--color-surface-neutral, #f7fafa)', borderRadius: '10px', marginTop: '1rem', border: '1px solid var(--border-structural)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Shift Check-In Status</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{isClockedIn ? clockInTimestamp : 'Currently Off-Duty'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today's Duration</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{isClockedIn ? '7 hrs 42 mins' : '--'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {isClockedIn ? (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={() => alert('Break logged (15 mins lunch/tea).')}
                    style={{ flex: 1 }}
                  >
                    ☕ Take a Break
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => setIsClockedIn(false)}
                    style={{ flex: 1, background: 'var(--color-critical, #b71c1c)' }}
                  >
                    ⏹️ Clock Out for Today
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setIsClockedIn(true);
                    setClockInTimestamp('Just Now');
                  }}
                  style={{ flex: 1, background: 'var(--color-success, #0b7a42)' }}
                >
                  ▶️ Clock In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* My Recent Payslips */}
        <div className="card-panel">
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>My Compensation & Payslips</span>
            <button className="btn-ghost-purple" onClick={() => onNavigate('payslips')} style={{ fontSize: '11px', padding: '2px 8px' }}>All Payslips &rarr;</button>
          </div>

          <div className="action-list" style={{ marginTop: '1rem' }}>
            <div className="action-item" style={{ alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--surface-purple-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                OCT
              </div>
              <div className="action-info" style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>October 2024 Payrun</h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Status: Processing · Scheduled Nov 01</p>
              </div>
              <span className="badge badge-amber" style={{ fontSize: '10px' }}>In Review</span>
            </div>

            <div className="action-item" style={{ alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--color-success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                SEP
              </div>
              <div className="action-info" style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>September 2024 Payslip</h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Net Paid: ₹68,500 · Disbursed via Bank Transfer</p>
              </div>
              <button className="btn-small primary" onClick={() => onNavigate('payslips')}>Download PDF</button>
            </div>

            <div className="action-item" style={{ alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--color-success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                AUG
              </div>
              <div className="action-info" style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>August 2024 Payslip</h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Net Paid: ₹68,500 · Disbursed via Bank Transfer</p>
              </div>
              <button className="btn-small" onClick={() => onNavigate('payslips')}>Download PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Leaves & Upcoming Holidays */}
      <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card-panel">
          <div className="panel-title">My Leave History & Status</div>
          <div className="action-list">
            <div className="action-item">
              <div className="action-info">
                <h4>Diwali Festival Break</h4>
                <p>Oct 28 - Oct 30 (3 days) · Annual Leave</p>
              </div>
              <span className="badge badge-green" style={{ fontSize: '10px' }}>Approved</span>
            </div>
            <div className="action-item">
              <div className="action-info">
                <h4>Personal Medical Leave</h4>
                <p>Aug 12 (1 day) · Sick Leave</p>
              </div>
              <span className="badge badge-green" style={{ fontSize: '10px' }}>Approved</span>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <div className="panel-title">Upcoming Company Holidays</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
              <span>Diwali / Deepavali</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Oct 31 - Nov 01</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
              <span>Guru Nanak Jayanti</span>
              <span style={{ fontWeight: 700 }}>Nov 15</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
              <span>Christmas Day</span>
              <span style={{ fontWeight: 700 }}>Dec 25</span>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <div className="panel-title">Self-Service Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => onNavigate('time_off_requests')} style={{ justifyContent: 'flex-start' }}>
              🏖️ Apply for Leave / Time Off
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('attendance_records')} style={{ justifyContent: 'flex-start' }}>
              🕒 View My Attendance Logs
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('payslips')} style={{ justifyContent: 'flex-start' }}>
              📄 View Tax Deduction & Payslips
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPortal;
