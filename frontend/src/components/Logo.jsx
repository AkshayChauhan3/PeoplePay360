import React from 'react';

const Logo = ({ className = '' }) => (
  <div className={`brand-logo ${className}`}>
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill="#3B123F"/>
      {/* C shape: arc open on the right */}
      <path
        d="M22 12.5C20.5 11.5 18.8 11 17 11C13.1 11 10 14.1 10 18C10 21.9 13.1 25 17 25C18.8 25 20.5 24.5 22 23.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Teal dot inside the C */}
      <circle cx="19" cy="18" r="3" fill="#005166"/>
    </svg>
    <div className="logo-text">
      <span style={{ color: '#3B123F' }}>PeoplePay</span><span style={{ color: '#005166' }}>360</span>
    </div>
  </div>
);

export default Logo;
