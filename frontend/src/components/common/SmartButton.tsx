import React from 'react';

interface SmartButtonProps {
  icon: React.ReactNode;
  count: number | string;
  label: string;
  onClick: () => void;
}

export const SmartButton: React.FC<SmartButtonProps> = ({ icon, count, label, onClick }) => {
  return (
    <button type="button" className="smart-button" onClick={onClick}>
      <div className="smart-button-icon">{icon}</div>
      <div className="smart-button-content">
        <span className="smart-button-count">{count}</span>
        <span className="smart-button-label">{label}</span>
      </div>
    </button>
  );
};
