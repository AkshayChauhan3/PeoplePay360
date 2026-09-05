import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import {
  EmployeeDetailOut,
  ContractOut,
  AttendanceOut,
  LeaveRequestOut,
} from '../../types/api';
import { SmartButton } from '../../components/common/SmartButton';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  FileText,
  Clock,
  Calendar,
  Mail,
  Building,
  CreditCard,
  Briefcase,
} from 'lucide-react';

interface EmployeeDetailPageProps {
  employeeId: string;
  onBack: () => void;
}

export const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({ employeeId, onBack }) => {
  const [employee, setEmployee] = useState<EmployeeDetailOut | null>(null);
  const [loading, setLoading] = useState(true);

  // Smart Button Modals
  const [contractsModalOpen, setContractsModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);

  const [contracts, setContracts] = useState<ContractOut[]>([]);
  const [attendance, setAttendance] = useState<AttendanceOut[]>([]);
  const [timeOff, setTimeOff] = useState<LeaveRequestOut[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const emp = await apiService.getEmployeeById(employeeId);
        setEmployee(emp);
        const [c, a, t] = await Promise.all([
          apiService.getEmployeeContracts(employeeId),
          apiService.getEmployeeAttendance(employeeId),
          apiService.getEmployeeTimeOff(employeeId),
        ]);
        setContracts(c);
        setAttendance(a);
        setTimeOff(t);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [employeeId]);

  if (loading || !employee) {
    return (
      <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Top action row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-neutral btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Employee Directory</span>
        </button>

        {/* 3 Odoo-Style Smart Action Counter Buttons */}
        <div className="smart-button-group">
          <SmartButton
            icon={<FileText size={18} />}
            count={employee.smart_button_counts?.contracts ?? contracts.length}
            label="Contracts"
            onClick={() => setContractsModalOpen(true)}
          />
          <SmartButton
            icon={<Clock size={18} />}
            count={employee.smart_button_counts?.attendance ?? attendance.length}
            label="Attendance"
            onClick={() => setAttendanceModalOpen(true)}
          />
          <SmartButton
            icon={<Calendar size={18} />}
            count={employee.smart_button_counts?.timeoff ?? timeOff.length}
            label="Time Off"
            onClick={() => setTimeOffModalOpen(true)}
          />
        </div>
      </div>

      {/* Main Employee Card Header */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              fontSize: '22px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {employee.first_name[0]}
            {employee.last_name[0]}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>
                {employee.first_name} {employee.last_name}
              </h2>
              <StatusBadge status={employee.is_active ? 'Active' : 'Inactive'} />
              <span className="badge badge-neutral">{employee.employee_code}</span>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '13px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Briefcase size={14} color="var(--primary)" />
                {employee.job_title}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building size={14} color="var(--primary)" />
                {employee.department_name || 'General Operations'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={14} color="var(--primary)" />
                {employee.work_email}
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-hairline)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>Employment Details</h4>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Employee Type: </span>
                <strong>{employee.employee_type}</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Join Date: </span>
                <strong>{new Date(employee.join_date).toLocaleDateString()}</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Contact Phone: </span>
                <strong>{employee.phone || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>Bank & Disbursal</h4>
              <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={15} color="var(--text-secondary)" />
                <span style={{ color: 'var(--text-secondary)' }}>Bank Name: </span>
                <strong>{employee.bank_name || 'Not provided'}</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Account No: </span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.bank_account_number || '—'}</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>IFSC Code: </span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.ifsc_code || '—'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Contracts Modal */}
      <Modal
        isOpen={contractsModalOpen}
        onClose={() => setContractsModalOpen(false)}
        title={`Contracts — ${employee.first_name} ${employee.last_name}`}
        size="lg"
      >
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Working Schedule</th>
                <th>Salary Structure</th>
                <th>Start Date</th>
                <th className="numeric">Monthly Wage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No contracts recorded
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.reference}</strong></td>
                    <td>{c.schedule_name || 'Standard 40 Hours/Week'}</td>
                    <td>{c.salary_structure_name || 'Regular Structure'}</td>
                    <td>{c.start_date}</td>
                    <td className="numeric"><strong>₹{c.wage.toLocaleString('en-IN')}</strong></td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* 2. Attendance Modal */}
      <Modal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title={`Attendance Logs — ${employee.first_name} ${employee.last_name}`}
        size="lg"
      >
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th className="numeric">Work Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendance.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.date}</strong></td>
                    <td>{new Date(a.check_in).toLocaleTimeString()}</td>
                    <td>{a.check_out ? new Date(a.check_out).toLocaleTimeString() : 'In Progress'}</td>
                    <td className="numeric">{a.net_hours ? `${a.net_hours} hrs` : '—'}</td>
                    <td><StatusBadge status={a.status} isException={a.is_exception} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* 3. Time Off Modal */}
      <Modal
        isOpen={timeOffModalOpen}
        onClose={() => setTimeOffModalOpen(false)}
        title={`Time Off Requests — ${employee.first_name} ${employee.last_name}`}
        size="lg"
      >
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Period</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {timeOff.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No time off requests found
                  </td>
                </tr>
              ) : (
                timeOff.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.leave_type_name}</strong></td>
                    <td>{t.start_date} to {t.end_date}</td>
                    <td>{t.duration_days} day(s)</td>
                    <td>{t.reason || '—'}</td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};
