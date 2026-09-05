import React from 'react';

const DashboardPortal = ({ onNavigate }) => {
  return (
    <>
      {/* Dashboard Scrollable Area Content */}
          
          <div className="dashboard-header-strip">
            <div className="dashboard-title">
              <h2>Executive HR & Payroll Dashboard</h2>
              <p>Cross-module telemetry aggregating real-time payroll liabilities, personnel attendance, and statutory compliance.</p>
            </div>
            <div className="dashboard-controls">
              <select className="control-select">
                <option>October 2024 Cycle</option>
              </select>
              <select className="control-select">
                <option>All Departments</option>
              </select>
              <button className="btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Export Report (.XLSX / PDF)
              </button>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Net Disbursed</div>
              <div className="kpi-value-row">
                <span className="kpi-value tabular-nums">₹48,50,000</span>
                <span className="kpi-badge positive">+3.8% vs Sep</span>
              </div>
              <div className="kpi-subtext">Disbursed via HDFC Multi-ACH</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Active Headcount</div>
              <div className="kpi-value-row">
                <span className="kpi-value tabular-nums">248 Employees</span>
              </div>
              <div className="kpi-subtext">100% Active Workforce Roster across 5 departments</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Attendance Integrity</div>
              <div className="kpi-value-row">
                <span className="kpi-value tabular-nums">98.4%</span>
              </div>
              <div className="kpi-subtext">244 On-Time / Present, 4 Unresolved Punches</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Compliance & Alerts</div>
              <div className="kpi-chip-amber">2 Exceptions</div>
              <div className="kpi-subtext">1 Missing Bank Account • 1 Duplicate Payslip</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="card-panel">
              <div className="panel-title">Monthly Net Salary Trend</div>
              <div className="chart-placeholder">
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '40%' }}></div>
                  <div className="bar-label">Apr</div>
                </div>
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '50%' }}></div>
                  <div className="bar-label">May</div>
                </div>
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '55%' }}></div>
                  <div className="bar-label">Jun</div>
                </div>
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '70%' }}></div>
                  <div className="bar-label">Jul</div>
                </div>
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '85%' }}></div>
                  <div className="bar-label">Aug</div>
                </div>
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '95%' }}></div>
                  <div className="bar-label">Sep</div>
                </div>
                <div className="bar-col">
                  <div className="bar-fill" style={{ height: '100%' }}></div>
                  <div className="bar-label">Oct</div>
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="panel-title">Salary Cost by Department</div>
              <div className="breakdown-list">
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>IT & Infrastructure</span>
                    <span className="tabular-nums">₹17.0L (35%)</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: '35%', background: 'var(--primary)' }}></div>
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Sales & Growth</span>
                    <span className="tabular-nums">₹15.0L (31%)</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: '31%', background: '#623067' }}></div>
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Finance & Compliance</span>
                    <span className="tabular-nums">₹13.0L (27%)</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: '27%', background: 'var(--secondary)' }}></div>
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>HR & People Ops</span>
                    <span className="tabular-nums">₹11.0L (23%)</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: '23%', background: '#007694' }}></div>
                  </div>
                </div>
                <div className="breakdown-item">
                  <div className="breakdown-header">
                    <span>Customer Support</span>
                    <span className="tabular-nums">₹9.0L (18%)</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-bar" style={{ width: '18%', background: '#27a4c4' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="operational-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            
            <div className="card-panel">
              <div className="panel-title">Payrun Pipeline & Status</div>
              <div className="stepper">
                <div className="step done">
                  <div className="step-indicator"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                  <div className="step-label">Draft</div>
                </div>
                <div className="step done">
                  <div className="step-indicator"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                  <div className="step-label">Compute</div>
                </div>
                <div className="step active">
                  <div className="step-indicator">3</div>
                  <div className="step-label">Review Warnings</div>
                </div>
                <div className="step">
                  <div className="step-indicator">4</div>
                  <div className="step-label">Validate</div>
                </div>
                <div className="step">
                  <div className="step-indicator">5</div>
                  <div className="step-label">Paid</div>
                </div>
              </div>
              <button className="btn-ghost-purple" style={{ marginTop: 'auto' }}>
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
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--success)' }}></div>
                    Present <span className="tabular-nums">198</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--secondary)' }}></div>
                    Remote/WFH <span className="tabular-nums">36</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--critical)' }}></div>
                    On-Leave <span className="tabular-nums">14</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="panel-title">Pending Action Items</div>
              <div className="action-list">
                <div className="action-item">
                  <div className="action-info">
                    <h4>Aarav Mehta</h4>
                    <p>Leave Request: 3 days, Annual Leave</p>
                  </div>
                  <div className="action-btns">
                    <button className="btn-small">Review</button>
                    <button className="btn-small primary">Approve</button>
                  </div>
                </div>
                <div className="action-item">
                  <div className="action-info">
                    <h4>Sara Khan</h4>
                    <p>Tax declaration submission</p>
                  </div>
                  <div className="action-btns">
                    <button className="btn-small primary">Review</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

    </>
  );
};

export default DashboardPortal;
