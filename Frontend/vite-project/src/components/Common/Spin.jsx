import React from 'react';

const Spin = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: '16px',
    md: '24px',
    lg: '36px'
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`fm-spin ${className}`} style={{ width: s, height: s }}>
      <svg className="spin-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.12"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.8"></path>
      </svg>
      <style>{`
        .fm-spin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
        }
        .spin-svg {
          animation: fm-rotate 1s linear infinite;
          width: 100%;
          height: 100%;
        }
        @keyframes fm-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Spin;
