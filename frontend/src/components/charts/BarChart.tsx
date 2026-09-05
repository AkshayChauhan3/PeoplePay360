import React from 'react';
import { DepartmentSalaryCostChart } from '../../types/api';

interface BarChartProps {
  data: DepartmentSalaryCostChart[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) return <div>No data available</div>;

  const maxVal = Math.max(...data.map((d) => d.total_salary), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
      {data.map((item) => {
        const pct = Math.round((item.total_salary / maxVal) * 100);
        return (
          <div key={item.department} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.department}</span>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                ₹{item.total_salary.toLocaleString('en-IN')}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 8,
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-pill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: 'var(--secondary)',
                  borderRadius: 'var(--radius-pill)',
                  transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
