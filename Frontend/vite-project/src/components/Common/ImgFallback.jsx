import React from 'react';

const ImgFallback = ({ className = '', size = 24 }) => (
  <div className={`img-fallback ${className}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-alt)', color: 'var(--muted)' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
    <style>{`
      .img-fallback {
        background: linear-gradient(135deg, var(--bg-alt), var(--bg));
        position: absolute;
        inset: 0;
      }
    `}</style>
  </div>
);

export default ImgFallback;
