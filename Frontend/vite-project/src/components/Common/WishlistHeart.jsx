import { useState } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const WishlistHeart = ({ productId, className = '' }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  // Check state
  const active = isInWishlist(productId);

  const handleClick = async (e) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent card click event

    if (!isAuthenticated) {
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('auth:login_required'));
      }
      navigate('/login');
      return;
    }

    setIsAnimating(true);
    await toggleWishlist(productId);
    setTimeout(() => setIsAnimating(false), 450);
  };

  return (
    <button 
      type="button"
      className={`wish-heart-btn ${active ? 'active' : ''} ${isAnimating ? 'pulse' : ''} ${className}`}
      onClick={handleClick}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg 
        width="18" height="18" 
        viewBox="0 0 24 24" 
        fill={active ? '#e53e3e' : 'none'} 
        stroke={active ? '#e53e3e' : 'currentColor'} 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>

      <style>{`
        .wish-heart-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 50;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 50%;
          cursor: pointer;
          color: #64748b;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 0;
          outline: none;
        }

        .wish-heart-btn:hover {
          transform: scale(1.15) translateY(-1px);
          background: #ffffff;
          color: #e53e3e;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .wish-heart-btn.active {
          color: #e53e3e;
          background: #ffffff;
          box-shadow: 0 4px 14px rgba(229, 62, 62, 0.2);
        }

        @keyframes heartPulse {
          0% { transform: scale(1.15); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1.15); }
        }

        .wish-heart-btn.pulse svg {
          animation: heartPulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        [data-theme='dark'] .wish-heart-btn {
          background: rgba(15, 23, 42, 0.75);
          border-color: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        [data-theme='dark'] .wish-heart-btn:hover,
        [data-theme='dark'] .wish-heart-btn.active {
          background: #1e293b;
          border-color: #334155;
        }
      `}</style>
    </button>
  );
};

export default WishlistHeart;
