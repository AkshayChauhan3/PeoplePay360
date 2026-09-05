import React from 'react';
import { PayrunStatus } from '../../types/api';
import { Check } from 'lucide-react';

interface LifecycleStepperProps {
  currentStatus: PayrunStatus;
}

const STEPS: PayrunStatus[] = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'];

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({ currentStatus }) => {
  const currentIndex = STEPS.indexOf(currentStatus);

  return (
    <div className="lifecycle-stepper">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        let className = 'lifecycle-step';
        if (isCompleted) className += ' completed';
        if (isActive) className += ' active';

        return (
          <div key={step} className={className} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {isCompleted && <Check size={12} strokeWidth={3} />}
            <span>{step}</span>
          </div>
        );
      })}
    </div>
  );
};
