import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { ROLE_LABELS } from '../utils/rbac';

const DashboardPortal = ({ onNavigate, currentUser }) => {
  const userRole = (currentUser?.role || 'ADMIN').toUpperCase();
  const displayName = currentUser?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'User');

  // Live Summary state populated directly from backend /api/v1/dashboard/summary
  const [summary, setSummary] = useState({
    netDisbursed: '₹0',
    monthlyPayrollCost: '₹0',
    headcount: 0,
    activeContracts: 0,
    expiringContracts: 0,
    draftContracts: 0,
    attendanceRate: '0%',
    alertsCount: 0,
    presentToday: 0,
    onTimeToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    openJobs: 0,
    activeDeptsCount: 0,
    salaryByDepartment: [],
    headcountByDepartment: [],
    monthlyTrend: [],
    recentLeaves: [],
    pendingActions: [],
  });

  // Employee specific interactive state
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTimestamp, setClockInTimestamp] = useState('Today, 09:00 AM');

  // HR Manager interactive pending leave approval items (live from DB)
  const [hrPendingLeaves, setHrPendingLeaves] = useState([]);

  // Payroll Specialist checklist state
  const [auditChecklist, setAuditChecklist] = useState({
    contractsChecked: true,
    overtimeReconciled: true,
    pfEsiCeilingsVerified: false,
    bankAccountsValidated: true,
    unpaidLeavesDeducted: false,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, leaveReqsRes] = await Promise.allSettled([
          apiService.getDashboardSummary(),
          apiService.getLeaveRequests(),
        ]);

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          const res = summaryRes.value;
          const data = res?.data || res;
          const cost = data.monthly_payroll_cost ?? 0;
          const formattedCost = cost >= 10000000 
            ? `₹${(cost / 10000000).toFixed(2)} Cr` 
            : `₹${(cost / 100000).toFixed(2)} L`;

          setSummary({
            netDisbursed: formattedCost,
            monthlyPayrollCost: typeof cost === 'number' ? `₹${cost.toLocaleString('en-IN')}` : '₹0',
            headcount: data.total_employees ?? 0,
            activeContracts: data.active_contracts ?? 0,
            expiringContracts: data.expiring_contracts ?? 0,
            draftContracts: data.draft_contracts ?? 0,
            attendanceRate: data.attendance_rate !== undefined ? `${data.attendance_rate}%` : '0%',
            alertsCount: data.pending_leave_requests ?? 0,
            presentToday: data.present_today ?? 0,
            onTimeToday: data.on_time_today ?? 0,
            lateToday: data.late_today ?? 0,
            onLeaveToday: data.on_leave_today ?? 0,
            openJobs: data.open_jobs ?? 0,
            activeDeptsCount: data.active_depts_count ?? 0,
            salaryByDepartment: data.salary_by_department ?? [],
            headcountByDepartment: data.headcount_by_department ?? [],
            monthlyTrend: data.monthly_trend ?? [],
            recentLeaves: data.recent_leaves ?? [],
            pendingActions: data.pending_actions ?? [],
          });
        }

        if (leaveReqsRes.status === 'fulfilled' && leaveReqsRes.value) {
          const raw = leaveReqsRes.value?.data || leaveReqsRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.items || []);
          const pending = list
            .filter(r => (r.status || '').toUpperCase() === 'PENDING')
            .map(r => ({
              id: r.id,
              name: r.employee_name || (r.employee ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}`.trim() : `Employee #${r.employee_id}`),
              dept: r.department || r.employee?.department?.name || 'General',
              type: r.time_off_type?.name || r.leave_type || 'Leave',
              days: r.requested_quantity || r.number_of_days || 1,
              date: r.start_date ? `${r.start_date}${r.end_date ? ' - ' + r.end_date : ''}` : 'Pending dates',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.employee_name || (r.employee ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}` : 'Staff'))}&background=0f4c81&color=fff`,
            }));
          setHrPendingLeaves(pending);
        }
      } catch (err) {
        console.warn('Dashboard telemetry fetch error:', err);
      }
    };
    fetchDashboardData();
  }, []);

  const handleApproveLeave = async (id) => {
    try {
      await apiService.approveLeaveRequest(id);
    } catch (err) {
      console.warn('Leave approve failed:', err);
    }
    setHrPendingLeaves(prev => prev.filter(item => item.id !== id));
    setSummary(prev => ({
      ...prev,
      alertsCount: Math.max(0, prev.alertsCount - 1),
    }));
  };

  const handleRejectLeave = async (id) => {
    try {
      await apiService.refuseLeaveRequest(id);
    } catch (err) {
      console.warn('Leave reject failed:', err);
    }
    setHrPendingLeaves(prev => prev.filter(item => item.id !== id));
    setSummary(prev => ({
      ...prev,
      alertsCount: Math.max(0, prev.alertsCount - 1),
    }));
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
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live PostgreSQL Database</span>
            </div>
            <h2>Enterprise HR & Payroll Executive Dashboard</h2>
            <p>Cross-functional telemetry aggregating real-time payroll liabilities, total workforce headcount, and statutory compliance.</p>
          </div>
          <div className="dashboard-controls">
            <button className="btn-secondary" onClick={() => onNavigate('departments')}>
              {summary.activeDeptsCount || 6} Active Departments →
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Executive Report
            </button>
          </div>
        </div>

        {/* Executive KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('payruns')} style={{ cursor: 'pointer' }} title="Click to view Payruns">
            <div className="kpi-title">Monthly Payroll Wage Commitment</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.netDisbursed}</span>
              <span className="kpi-badge positive">{summary.activeContracts} Active Contracts</span>
            </div>
            <div className="kpi-subtext">Total active salary liability · View Payruns →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('directory')} style={{ cursor: 'pointer' }} title="Click to view Directory">
            <div className="kpi-title">Active Headcount</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.headcount} Employees</span>
            </div>
            <div className="kpi-subtext">Across {summary.activeDeptsCount || 6} Active Departments · View Directory →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }} title="Click to view Attendance">
            <div className="kpi-title">Attendance Integrity</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.attendanceRate}</span>
            </div>
            <div className="kpi-subtext">{summary.presentToday} Present Today · View Attendance →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('time_off_requests')} style={{ cursor: 'pointer' }} title="Click to view Requests">
            <div className="kpi-title">Compliance & Action Queue</div>
            <div className="kpi-chip-amber">{summary.alertsCount} Pending Leaves</div>
            <div className="kpi-subtext">
              {summary.expiringContracts > 0 ? `${summary.expiringContracts} Expiring Contracts · Review →` : 'All contracts in term →'}
            </div>
          </div>
        </div>

        {/* Executive Charts */}
        <div className="charts-grid">
          <div className="card-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Monthly Net Salary Trend</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Live Payrun Batches</span>
            </div>
            <div className="chart-placeholder" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', padding: '10px 0' }}>
              {summary.monthlyTrend.length > 0 ? (
                summary.monthlyTrend.map((bar, i) => (
                  <div key={i} className="bar-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div 
                      className="bar-fill" 
                      style={{ 
                        height: bar.height || '30%', 
                        width: '32px', 
                        background: bar.status === 'PAID' ? 'var(--primary)' : 'var(--secondary)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }}
                      title={`${bar.name}: Net ${bar.formatted}`}
                    ></div>
                    <div className="bar-label" style={{ fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>{bar.month}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 'auto' }}>
                  No historical payruns computed yet
                </div>
              )}
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Salary Cost by Department</span>
              <button className="btn-ghost-purple" onClick={() => onNavigate('departments')} style={{ fontSize: '11px', padding: '2px 8px' }}>View Depts &rarr;</button>
            </div>
            <div className="breakdown-list">
              {summary.salaryByDepartment.length > 0 ? (
                summary.salaryByDepartment.map((d, i) => (
                  <div key={i} className="breakdown-item">
                    <div className="breakdown-header">
                      <span>{d.department} ({d.employee_count})</span>
                      <span className="tabular-nums">{d.formatted} ({d.percentage}%)</span>
                    </div>
                    <div className="breakdown-track">
                      <div className="breakdown-bar" style={{ width: `${d.percentage}%`, background: d.color }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading department salary metrics...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Operational Grid */}
        <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card-panel">
            <div className="panel-title">Payrun Pipeline & Status</div>
            <div className="stepper" style={{ margin: '1rem 0' }}>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Draft</div></div>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Compute</div></div>
              <div className="step active"><div className="step-indicator">3</div><div className="step-label">Review</div></div>
              <div className="step"><div className="step-indicator">4</div><div className="step-label">Validate</div></div>
              <div className="step"><div className="step-indicator">5</div><div className="step-label">Paid</div></div>
            </div>
            <button className="btn-ghost-purple" onClick={() => onNavigate('payruns')} style={{ marginTop: 'auto' }}>
              Open Payruns Manager &rarr;
            </button>
          </div>

          <div className="card-panel">
            <div className="panel-title">Attendance & Presence Health</div>
            <div className="donut-container">
              <div className="donut">
                <div className="donut-inner">
                  <div className="donut-inner-value tabular-nums">{summary.headcount}</div>
                  <div className="donut-inner-label">Total</div>
                </div>
              </div>
              <div className="donut-legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }}></div>On Time <span className="tabular-nums">{summary.onTimeToday}</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#b45309' }}></div>Late <span className="tabular-nums">{summary.lateToday}</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--secondary)' }}></div>On-Leave <span className="tabular-nums">{summary.onLeaveToday}</span></div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Executive Action Items ({summary.pendingActions.length})</div>
            <div className="action-list">
              {summary.pendingActions.length > 0 ? (
                summary.pendingActions.map(action => (
                  <div key={action.id} className="action-item">
                    <div className="action-info">
                      <h4>{action.title}</h4>
                      <p>{action.subtext}</p>
                    </div>
                    <div className="action-btns">
                      <button 
                        className={`btn-small ${action.badge_type === 'critical' ? 'primary' : ''}`}
                        onClick={() => onNavigate(action.target)}
                      >
                        {action.action}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                  All systems green. No outstanding executive alerts.
                </div>
              )}
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
              Time Off Requests ({hrPendingLeaves.length})
            </button>
          </div>
        </div>

        {/* HR Manager Workforce KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('directory')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Active Workforce</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.headcount} Personnel</span>
            </div>
            <div className="kpi-subtext">Across {summary.activeDeptsCount || 6} Active Departments · Manage Roster →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Today's Check-In Rate</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.attendanceRate}</span>
            </div>
            <div className="kpi-subtext">{summary.presentToday} Present · {summary.onLeaveToday} On-Leave · View Logs →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('time_off_requests')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Pending Leave Requests</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums" style={{ color: 'var(--color-critical, #b71c1c)' }}>{hrPendingLeaves.length} Awaiting Sign-off</span>
            </div>
            <div className="kpi-subtext">Requires HR Manager Approval · Review →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('job_positions')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Active Job Positions</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.openJobs} Active Roles</span>
            </div>
            <div className="kpi-subtext">Defined roles & organizational structure · View →</div>
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
              {summary.headcountByDepartment.length > 0 ? (
                summary.headcountByDepartment.map((d, i) => (
                  <div key={i} className="breakdown-item">
                    <div className="breakdown-header">
                      <span>{d.department}</span>
                      <span className="tabular-nums">{d.count} Employees ({d.percentage}%)</span>
                    </div>
                    <div className="breakdown-track">
                      <div className="breakdown-bar" style={{ width: `${d.percentage}%`, background: d.color }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading workforce allocation...
                </div>
              )}
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
                      <button className="btn-small" onClick={() => handleRejectLeave(leave.id)} style={{ color: 'var(--color-critical)' }}>Reject</button>
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
                  <div className="donut-inner-value tabular-nums">{summary.headcount}</div>
                  <div className="donut-inner-label">Total</div>
                </div>
              </div>
              <div className="donut-legend">
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }}></div>On Time <span className="tabular-nums">{summary.onTimeToday}</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: '#b45309' }}></div>Late <span className="tabular-nums">{summary.lateToday}</span></div>
                <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--critical)' }}></div>On-Leave <span className="tabular-nums">{summary.onLeaveToday}</span></div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Contract Milestones & Renewals</div>
            <div className="action-list">
              {summary.expiringContracts > 0 ? (
                <div className="action-item">
                  <div className="action-info">
                    <h4>{summary.expiringContracts} Contracts Expiring</h4>
                    <p>Expiring within next 30 days</p>
                  </div>
                  <button className="btn-small primary" onClick={() => onNavigate('all_contracts')}>Review</button>
                </div>
              ) : (
                <div style={{ padding: '8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  All employment contracts are in term and active.
                </div>
              )}
              {summary.draftContracts > 0 && (
                <div className="action-item">
                  <div className="action-info">
                    <h4>{summary.draftContracts} Draft Contracts</h4>
                    <p>Awaiting final review and signature</p>
                  </div>
                  <button className="btn-small" onClick={() => onNavigate('all_contracts')}>Confirm</button>
                </div>
              )}
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
              <button className="btn-secondary" onClick={() => onNavigate('attendance_records')} style={{ justifyContent: 'flex-start' }}>
                🕒 Daily Attendance Logs
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
            <button className="btn-primary" onClick={() => onNavigate('payruns')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Execute Payrun Wizard
            </button>
          </div>
        </div>

        {/* Payroll Manager KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('payruns')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Current Monthly Payroll Liability</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.netDisbursed}</span>
            </div>
            <div className="kpi-subtext">{summary.activeContracts} Active Contracts · View Payruns →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('salary_rules')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Active Salary Rules</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">6 Graded Rules</span>
            </div>
            <div className="kpi-subtext">Basic, HRA, Allowance, PF, PT, TDS · Configure →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Timesheet Payroll Readiness</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.attendanceRate}</span>
            </div>
            <div className="kpi-subtext">{summary.presentToday} Present Verified · Audit Timesheets →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('payruns')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Active Batch Status</div>
            <div className="kpi-chip-amber">Ready for Review</div>
            <div className="kpi-subtext">Current cycle awaiting validation →</div>
          </div>
        </div>

        {/* Payroll Pipelines */}
        <div className="charts-grid">
          <div className="card-panel">
            <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Payrun Pipeline Progression</span>
              <button className="btn-ghost-purple" onClick={() => onNavigate('payruns')} style={{ fontSize: '11px', padding: '2px 8px' }}>Open Batch &rarr;</button>
            </div>
            <div className="stepper" style={{ margin: '1.5rem 0' }}>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Draft</div></div>
              <div className="step done"><div className="step-indicator">✓</div><div className="step-label">Compute</div></div>
              <div className="step active"><div className="step-indicator">3</div><div className="step-label">Review</div></div>
              <div className="step"><div className="step-indicator">4</div><div className="step-label">Validate</div></div>
              <div className="step"><div className="step-indicator">5</div><div className="step-label">Paid</div></div>
            </div>
            <div style={{ background: 'var(--color-surface-neutral, #f7fafa)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-structural)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ fontWeight: 600 }}>Batch Calculation Integrity</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{summary.activeContracts} / {summary.activeContracts} Clean</span>
              </div>
              <div className="breakdown-track" style={{ height: '8px' }}>
                <div className="breakdown-bar" style={{ width: '100%', background: 'var(--primary)' }}></div>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Salary Cost Allocation by Department</div>
            <div className="breakdown-list">
              {summary.salaryByDepartment.map((d, i) => (
                <div key={i} className="breakdown-item">
                  <div className="breakdown-header">
                    <span>{d.department} ({d.employee_count})</span>
                    <span className="tabular-nums">{d.formatted} ({d.percentage}%)</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: `${d.percentage}%`, background: d.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Exceptions & Rules Grid */}
        <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card-panel">
            <div className="panel-title">Payroll Exceptions Flagged</div>
            <div className="action-list">
              {summary.pendingActions.map(action => (
                <div key={action.id} className="action-item">
                  <div className="action-info">
                    <h4>{action.title}</h4>
                    <p>{action.subtext}</p>
                  </div>
                  <button className="btn-small primary" onClick={() => onNavigate(action.target)}>{action.action}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card-panel">
            <div className="panel-title">Salary Rule Matrix</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
                <span>BASIC (Basic Pay)</span>
                <span style={{ fontWeight: 700 }}>50% of Wage</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
                <span>HRA (House Rent Allowance)</span>
                <span style={{ fontWeight: 700 }}>25% of Wage</span>
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
            <div className="panel-title">Disbursement Records</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--color-surface-neutral)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px' }}>Corporate ACH & NEFT</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Automated Batch Processing</div>
                </div>
                <span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span>
              </div>
              <button className="btn-secondary" onClick={() => onNavigate('payslips')} style={{ marginTop: '8px' }}>
                📄 Review Individual Payslips ({summary.activeContracts})
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
              Review All Payslips ({summary.activeContracts})
            </button>
            <button className="btn-primary" onClick={() => onNavigate('attendance_records')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Verify Attendance ({summary.presentToday})
            </button>
          </div>
        </div>

        {/* Specialist Audit KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => onNavigate('payslips')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Payslips in Current Batch</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.activeContracts} Slips</span>
            </div>
            <div className="kpi-subtext">Active contract payslips · Audit →</div>
          </div>

          <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
            <div className="kpi-title">Timesheets Audited</div>
            <div className="kpi-value-row">
              <span className="kpi-value tabular-nums">{summary.presentToday} / {summary.headcount}</span>
              <span className="kpi-badge positive">{summary.attendanceRate}</span>
            </div>
            <div className="kpi-subtext">{summary.lateToday} Late logs recorded →</div>
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
                  Statutory PF ceiling (₹15,000) and tax deductions verified
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
              {summary.headcountByDepartment.map((d, i) => (
                <div key={i} className="breakdown-item">
                  <div className="breakdown-header">
                    <span>{d.department} ({d.count} Slips)</span>
                    <span className="tabular-nums">100% Ready</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: '100%', background: d.color }}></div>
                  </div>
                </div>
              ))}
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
            <span className="kpi-value tabular-nums">18 Days</span>
            <span className="kpi-badge positive">Available</span>
          </div>
          <div className="kpi-subtext">2 Used of 20 Annual Quota · Apply Leave →</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('attendance_records')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">My Attendance (Current Month)</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">100%</span>
            <span className="kpi-badge positive">Present</span>
          </div>
          <div className="kpi-subtext">Zero LOP · On-time Punctuality Record →</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('payslips')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Latest Disbursed Salary</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums">Generated</span>
          </div>
          <div className="kpi-subtext">Monthly Payrun Slip · View Payslip →</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">My Shift & Schedule</div>
          <div className="kpi-value-row">
            <span className="kpi-value tabular-nums" style={{ fontSize: '1.25rem' }}>09:00 - 18:00 IST</span>
          </div>
          <div className="kpi-subtext">Standard 40h · Mon - Fri (Bengaluru Hub)</div>
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
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{isClockedIn ? '8 hrs 00 mins' : '--'}</div>
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
                SEP
              </div>
              <div className="action-info" style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>September 2026 Payrun</h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Status: Computed · Ready for Settlement</p>
              </div>
              <span className="badge badge-amber" style={{ fontSize: '10px' }}>In Review</span>
            </div>

            <div className="action-item" style={{ alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--color-success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                AUG
              </div>
              <div className="action-info" style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>August 2026 Payslip</h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Status: Paid · Disbursed via Bank Transfer</p>
              </div>
              <button className="btn-small primary" onClick={() => onNavigate('payslips')}>View Slip</button>
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
                <h4>Planned Vacation</h4>
                <p>Annual Vacation · 20 Days Balance</p>
              </div>
              <span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <div className="panel-title">Upcoming Company Holidays</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
              <span>Gandhi Jayanti</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Oct 02</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-structural)' }}>
              <span>Diwali / Deepavali</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Nov 08</span>
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
