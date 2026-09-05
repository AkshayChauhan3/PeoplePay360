import React, { useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, Printer, AlertTriangle, FileText } from 'lucide-react';
import { PayslipDetailModal } from './PayslipDetailModal';

export const PayslipListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('Feb 2026');
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);

  // Excalidraw Flow 4 payslip roster
  const payslips = [
    {
      id: 'ps-feb-1',
      employee: 'Aarav Mehta',
      warning: null,
      period: '01-Feb — 28-Feb',
      basic: 50000,
      gross: 80000,
      net: 75000,
      structure: 'Regular Salary',
      status: 'Done',
    },
    {
      id: 'ps-feb-2',
      employee: 'Sara Khan',
      warning: 'A/C missing',
      period: '01-Feb — 28-Feb',
      basic: 60000,
      gross: 96000,
      net: 88000,
      structure: 'Regular Salary',
      status: 'Done',
    },
    {
      id: 'ps-feb-3',
      employee: 'John Dsouza',
      warning: 'Duplicate',
      period: '01-Feb — 28-Feb',
      basic: 45000,
      gross: 72000,
      net: 66000,
      structure: 'Regular Salary',
      status: 'Draft',
    },
    {
      id: 'ps-feb-4',
      employee: 'Neha Patel',
      warning: null,
      period: '01-Feb — 28-Feb',
      basic: 40000,
      gross: 64000,
      net: 59000,
      structure: 'Regular Salary',
      status: 'Done',
    },
  ];

  const filtered = payslips.filter((p) =>
    (p.employee + ' ' + p.structure + ' ' + (p.warning || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Payslips</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            List view of employee payslips with earnings, deductions, and warnings
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search payslips…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <div style={{ width: '180px' }}>
          <select
            className="input-field"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="Feb 2026">Period: Feb 2026</option>
            <option value="Jan 2026">Period: Jan 2026</option>
            <option value="Mar 2026">Period: Mar 2026</option>
          </select>
        </div>
      </div>

      <div className="card table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Warning</th>
              <th>Period</th>
              <th>Basic</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Structure</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedPayslipId(p.id)}
                style={{ cursor: 'pointer' }}
                title="Click to view full salary calculation and AST rule lines"
              >
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={15} color="var(--secondary)" />
                    {p.employee}
                  </div>
                </td>
                <td>
                  {p.warning ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'rgba(186, 26, 26, 0.12)',
                      color: 'var(--danger)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      <AlertTriangle size={12} />
                      {p.warning}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>—</span>
                  )}
                </td>
                <td>{p.period}</td>
                <td className="tabular-nums">₹{p.basic.toLocaleString()}</td>
                <td className="tabular-nums" style={{ fontWeight: 600 }}>₹{p.gross.toLocaleString()}</td>
                <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--secondary)' }}>₹{p.net.toLocaleString()}</td>
                <td>{p.structure}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); setSelectedPayslipId(p.id); }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    title="Print Payslip PDF"
                    style={{ padding: '4px 8px' }}
                  >
                    <Printer size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPayslipId && (
        <PayslipDetailModal
          payslipId={selectedPayslipId}
          onClose={() => setSelectedPayslipId(null)}
        />
      )}
    </div>
  );
};
