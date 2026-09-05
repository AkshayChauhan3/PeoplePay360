import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import {
  DashboardSummaryOut,
  AttendanceOverviewOut,
  TimeOffOverviewOut,
  DepartmentSalaryCostChart,
  MonthlyNetSalaryTrendChart,
} from '../../types/api';
import { BarChart } from '../../components/charts/BarChart';
import { TrendLine } from '../../components/charts/TrendLine';
import {
  Banknote,
  FileText,
  DollarSign,
  CalendarCheck,
  Activity,
  AlertTriangle,
  UserCheck,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummaryOut | null>(null);
  const [attendance, setAttendance] = useState<AttendanceOverviewOut | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOffOverviewOut[]>([]);
  const [salaryCost, setSalaryCost] = useState<DepartmentSalaryCostChart[]>([]);
  const [salaryTrend, setSalaryTrend] = useState<MonthlyNetSalaryTrendChart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sum, att, to, cost, trend] = await Promise.all([
          apiService.getDashboardSummary(),
          apiService.getAttendanceOverview(),
          apiService.getTimeOffOverview(),
          apiService.getSalaryCostByDepartment(),
          apiService.getMonthlyNetSalaryTrend(),
        ]);
        setSummary(sum);
        setAttendance(att);
        setTimeOff(to);
        setSalaryCost(cost);
        setSalaryTrend(trend);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Payroll & Workforce Dashboard</h1>
          <p>Real-time analytics across payroll cycles, attendance logs, and workforce cost allocations.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('payroll')}>
            <Banknote size={16} />
            <span>Open Payrun Wizard</span>
          </button>
        </div>
      </div>

      {/* Top 5 KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="stat-card">
          <div>
            <div className="label-md">Total Net Salary Paid</div>
            <div className="metric-kpi" style={{ marginTop: '4px' }}>
              ₹{(summary?.total_net_salary_paid ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={14} /> Last cycle closed
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--purple-tint)', color: 'var(--primary)' }}>
            <Banknote size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="label-md">Payslips Generated</div>
            <div className="metric-kpi" style={{ marginTop: '4px' }}>
              {summary?.payslips_generated}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Across all departments
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--teal-tint)', color: 'var(--secondary)' }}>
            <FileText size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="label-md">Average Salary / Emp</div>
            <div className="metric-kpi" style={{ marginTop: '4px' }}>
              ₹{(summary?.avg_salary_per_employee ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Competitive enterprise baseline
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--purple-tint)', color: 'var(--primary)' }}>
            <DollarSign size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="label-md">Approved Time Off</div>
            <div className="metric-kpi" style={{ marginTop: '4px' }}>
              {summary?.approved_time_off_days} Days
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Current billing month
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--teal-tint)', color: 'var(--secondary)' }}>
            <CalendarCheck size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="label-md">Attendance Health</div>
            <div className="metric-kpi" style={{ marginTop: '4px', color: 'var(--secondary)' }}>
              {summary?.attendance_health}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '4px' }}>
              High punctuality rate
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--teal-tint)', color: 'var(--secondary)' }}>
            <Activity size={20} />
          </div>
        </div>
      </div>

      {/* Main Visuals Grid: Monthly Net Salary Trend & Department Cost Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Monthly Net Salary Trend</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
                Net disbursement trajectory over the last 6 cycles
              </p>
            </div>
          </div>
          <div className="card-body">
            <TrendLine data={salaryTrend} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Salary Cost by Department</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
                Gross payroll allocation by business vertical
              </p>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={salaryCost} />
          </div>
        </div>
      </div>

      {/* Bottom Row: Attendance Breakdown & Time Off Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Attendance & Exceptions</h3>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => onNavigate('attendance')}>
              View Logs
            </button>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--teal-tint)', borderRadius: 'var(--radius-control)', textAlign: 'center' }}>
              <UserCheck size={18} color="var(--secondary)" style={{ margin: '0 auto 4px' }} />
              <div className="metric-kpi" style={{ fontSize: '20px', color: 'var(--secondary)' }}>{attendance?.present}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary)' }}>PRESENT</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--purple-tint)', borderRadius: 'var(--radius-control)', textAlign: 'center' }}>
              <Clock size={18} color="var(--primary)" style={{ margin: '0 auto 4px' }} />
              <div className="metric-kpi" style={{ fontSize: '20px', color: 'var(--primary)' }}>{attendance?.late}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>LATE</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--error-tint)', borderRadius: 'var(--radius-control)', textAlign: 'center' }}>
              <AlertTriangle size={18} color="#B71C1C" style={{ margin: '0 auto 4px' }} />
              <div className="metric-kpi" style={{ fontSize: '20px', color: '#B71C1C' }}>{attendance?.absent}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#B71C1C' }}>ABSENT</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--teal-tint)', borderRadius: 'var(--radius-control)', textAlign: 'center' }}>
              <Clock size={18} color="var(--secondary)" style={{ margin: '0 auto 4px' }} />
              <div className="metric-kpi" style={{ fontSize: '20px', color: 'var(--secondary)' }}>{attendance?.overtime}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary)' }}>OVERTIME</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Time Off Utilization</h3>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => onNavigate('timeoff')}>
              Manage Leaves
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {timeOff.map((to) => (
                <div
                  key={to.leave_type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-control)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{to.leave_type}</span>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '12px' }}>
                    <span>Approved: <strong>{to.approved_days}d</strong></span>
                    <span style={{ color: to.pending_requests > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      Pending: <strong>{to.pending_requests}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
