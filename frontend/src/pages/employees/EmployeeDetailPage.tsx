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
  Briefcase,
} from 'lucide-react';

interface EmployeeDetailPageProps {
  employeeId: string;
  onBack: () => void;
}

export const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({ employeeId, onBack }) => {
  const [employee, setEmployee] = useState<EmployeeDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'work' | 'private'>('work');

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

        {/* Tabs: Work Information | Private Information */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('work')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'work' ? '2px solid var(--primary)' : '2px solid transparent',
                padding: '8px 4px',
                fontWeight: activeTab === 'work' ? 600 : 500,
                color: activeTab === 'work' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Work Information
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('private')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'private' ? '2px solid var(--primary)' : '2px solid transparent',
                padding: '8px 4px',
                fontWeight: activeTab === 'private' ? 600 : 500,
                color: activeTab === 'private' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Private Information
            </button>
          </div>

          {activeTab === 'work' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Department</span>
                <strong>{employee.department_name || 'Finance'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Job Position</span>
                <strong>{employee.job_title}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Manager</span>
                <strong>Sara Khan</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Work Location</span>
                <strong>Mumbai Headquarters</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Working Schedule</span>
                <strong>40 Hours / Week</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Status</span>
                <StatusBadge status={employee.is_active ? 'Active' : 'Inactive'} />
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Company</span>
                <strong>OXP Pvt Ltd</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Work Email</span>
                <strong>{employee.work_email}</strong>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Bank Name</span>
                <strong>{employee.bank_name || 'HDFC Bank'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Bank Account Number</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.bank_account_number || '50100492817291'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>IFSC Code</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.ifsc_code || 'HDFC0001234'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Emergency Contact</span>
                <strong>+91 98765 00000 (Spouse)</strong>
              </div>
            </div>
          )}
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
