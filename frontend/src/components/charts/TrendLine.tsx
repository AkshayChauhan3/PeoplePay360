import React from 'react';
import { MonthlyNetSalaryTrendChart } from '../../types/api';

interface TrendLineProps {
  data: MonthlyNetSalaryTrendChart[];
}

export const TrendLine: React.FC<TrendLineProps> = ({ data }) => {
  if (!data || data.length === 0) return <div>No data available</div>;

  const width = 500;
  const height = 180;
  const padding = 30;

  const maxVal = Math.max(...data.map((d) => d.net_amount), 1);
  const minVal = Math.min(...data.map((d) => d.net_amount), 0) * 0.9;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.net_amount - minVal) / (maxVal - minVal)) * (height - padding * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#005166" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#005166" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-hairline)" strokeDasharray="3 3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-hairline)" strokeDasharray="3 3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-hairline)" />

        {/* Gradient fill */}
        <path d={areaD} fill="url(#trendGradient)" />

        {/* Line stroke */}
        <path d={pathD} fill="none" stroke="#005166" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((pt, idx) => (
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" stroke="#005166" strokeWidth="2" />
            <text
              x={pt.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-secondary)"
              fontWeight="500"
            >
              {pt.month.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
