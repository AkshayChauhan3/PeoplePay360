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
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummaryOut | null>(null);
  const [attendance, setAttendance] = useState<AttendanceOverviewOut | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOffOverviewOut[]>([]);
  const [salaryCost, setSalaryCost] = useState<DepartmentSalaryCostChart[]>([]);
  const [salaryTrend, setSalaryTrend] = useState<MonthlyNetSalaryTrendChart[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state matching Excalidraw Flow 6
  const [period, setPeriod] = useState('Sep 2026');
  const [department, setDepartment] = useState('All Departments');
  const [employeeType, setEmployeeType] = useState('All Types');
  const [company, setCompany] = useState('OXP Pvt Ltd');

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Title and Description */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Payroll Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Combine Payroll with HR data from multiple models to understand payments, staffing impact, and attendance quality.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate('payruns')}
        >
          View Payruns
        </button>
      </div>

      {/* Excalidraw Flow 6 Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={15} /> Filters:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Period</label>
          <select
            className="input-field"
            style={{ height: '36px', minWidth: '130px', fontSize: '13px' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="Sep 2026">Sep 2026</option>
            <option value="Aug 2026">Aug 2026</option>
            <option value="Jul 2026">Jul 2026</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Department</label>
          <select
            className="input-field"
            style={{ height: '36px', minWidth: '150px', fontSize: '13px' }}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="All Departments">All Departments</option>
            <option value="IT">IT</option>
            <option value="Sales">Sales</option>
            <option value="Finance">Finance</option>
            <option value="HR">HR</option>
            <option value="Support">Support</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Employee Type</label>
          <select
            className="input-field"
            style={{ height: '36px', minWidth: '130px', fontSize: '13px' }}
            value={employeeType}
            onChange={(e) => setEmployeeType(e.target.value)}
          >
            <option value="All Types">All Types</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contract">Contract</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Company</label>
          <select
            className="input-field"
            style={{ height: '36px', minWidth: '140px', fontSize: '13px' }}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option value="OXP Pvt Ltd">OXP Pvt Ltd</option>
            <option value="My Company">My Company</option>
          </select>
        </div>
      </div>

      {/* 5 KPI Cards matching Excalidraw Flow 6 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Net Salary Paid</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--neutral-tint-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={16} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }} className="tabular-nums">
            ₹ 18.4L
          </div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>
            +8.5% vs previous month
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Payslips Generated</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--neutral-tint-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} color="var(--secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }} className="tabular-nums">
            {summary?.payslips_generated || 148}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            142 paid, 6 pending
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Salary / Employee</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--neutral-tint-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="var(--secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }} className="tabular-nums">
            ₹ 12,432
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Based on current payrun
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Time Off</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--neutral-tint-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={16} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }} className="tabular-nums">
            34 Days
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across selected period
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Attendance Health</span>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 106, 33, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }} className="tabular-nums">
            94%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Present / reviewed records
          </div>
        </div>
      </div>

      {/* 3 Main Panels: Department Cost, Monthly Net Salary Trend, Payslip Status & Payroll Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Panel 1: Salary Cost by Department */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                Salary Cost by Department
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Source: Payslips + Employee Department
              </p>
            </div>
          </div>
          <BarChart data={salaryCost} />
        </div>

        {/* Panel 2: Monthly Net Salary Trend */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                Monthly Net Salary Trend
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Source: historical Payslips / Payruns
              </p>
            </div>
          </div>
          <TrendLine data={salaryTrend} />
        </div>

        {/* Panel 3: Payslip Status & Payroll Alerts */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
              Payslip Status & Alerts
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Source: Payrun + Payslip validation
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(56, 106, 33, 0.12)', color: 'var(--success)', fontWeight: 600 }}>
              Paid: 142
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--neutral-tint-teal)', color: 'var(--secondary)', fontWeight: 600 }}>
              Done: 24
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: '#fff3e0', color: '#e65100', fontWeight: 600 }}>
              Pending: 6
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--danger)' }}>
              <AlertTriangle size={14} />
              <span>2 employees missing bank account</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--danger)' }}>
              <AlertTriangle size={14} />
              <span>1 duplicate payslip warning</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#e65100' }}>
              <Clock size={14} />
              <span>4 drafts still not validated</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} />
              <span>3 contracts expiring this month</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Bottom Insight Panels: Attendance Overview, Time Off Overview, Department Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Panel 1: Attendance Overview */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
              Attendance Overview
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Source: Attendance records
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ padding: '10px 4px', background: 'rgba(56, 106, 33, 0.08)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>{attendance?.present || 94}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Present</div>
            </div>
            <div style={{ padding: '10px 4px', background: '#fff8e1', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f57f17' }}>{attendance?.late || 18}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Late</div>
            </div>
            <div style={{ padding: '10px 4px', background: 'rgba(186, 26, 26, 0.08)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--danger)' }}>{attendance?.absent || 9}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Absent</div>
            </div>
            <div style={{ padding: '10px 4px', background: 'var(--neutral-tint-purple)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{attendance?.overtime || 22}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Overtime</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <div>• Missing check-outs: <strong>5</strong></div>
            <div>• Manual attendance edits: <strong>7</strong></div>
            <div>• Attendance coverage: <strong>94%</strong></div>
          </div>
        </div>

        {/* Panel 2: Time Off Overview */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
              Time Off Overview
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Source: Time Off Requests + Allocations
            </p>
          </div>

          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ paddingBottom: '8px' }}>Type</th>
                <th style={{ paddingBottom: '8px', textAlign: 'center' }}>Approved</th>
                <th style={{ paddingBottom: '8px', textAlign: 'center' }}>Pending</th>
                <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {timeOff.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>{item.leave_type}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }} className="tabular-nums">{item.approved_days}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }} className="tabular-nums">{item.pending_requests}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {item.remaining_balance !== null ? `${item.remaining_balance} Days` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Panel 3: Department Overview */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
              Department Overview
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Source: Employee + Contract + Payslip totals
            </p>
          </div>

          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ paddingBottom: '8px' }}>Department</th>
                <th style={{ paddingBottom: '8px', textAlign: 'center' }}>Headcount</th>
                <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Monthly Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>IT</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }} className="tabular-nums">18</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }} className="tabular-nums">₹ 4.2L</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>Sales</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }} className="tabular-nums">22</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }} className="tabular-nums">₹ 5.7L</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>HR</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }} className="tabular-nums">8</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }} className="tabular-nums">₹ 1.9L</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>Support</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }} className="tabular-nums">14</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }} className="tabular-nums">₹ 3.1L</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
