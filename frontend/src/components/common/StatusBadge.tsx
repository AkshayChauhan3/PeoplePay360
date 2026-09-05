import React from 'react';

interface StatusBadgeProps {
  status: string;
  isException?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isException }) => {
  const norm = status.toUpperCase();

  let className = 'badge badge-neutral';

  if (norm === 'RUNNING' || norm === 'PRESENT' || norm === 'APPROVED' || norm === 'PAID' || norm === 'ACTIVE' || norm === 'DONE') {
    className = 'badge badge-success';
  } else if (norm === 'PENDING' || norm === 'LATE' || norm === 'COMPUTED' || norm === 'HALF_DAY') {
    className = 'badge badge-warning';
  } else if (norm === 'CANCELLED' || norm === 'EXPIRED' || norm === 'REFUSED' || norm === 'REJECTED' || norm === 'MISSING_CHECKOUT' || norm === 'INACTIVE') {
    className = 'badge badge-danger';
  } else if (norm === 'OVERTIME' || norm === 'VALIDATED') {
    className = 'badge badge-purple';
  } else if (norm === 'DRAFT') {
    className = 'badge badge-info';
  }

  return (
    <span className={className}>
      {isException && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {status}
    </span>
  );
};
