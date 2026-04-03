import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist, useAuth } from '../../context';

const CardActions = ({ productId, className = '' }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  // Check state
  const isWish = isInWishlist(productId);

  const handleWish = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsAnimating(true);
    await toggleWishlist(productId);
    setTimeout(() => setIsAnimating(false), 450);
  };

  const handleView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products/${productId}`);
  };

  return (
    <div className={`fm-card-actions ${className}`}>
      {/* View/Cart Icon */}
      <button 
        type="button" 
        className="fm-card-act-btn act-view" 
        onClick={handleView}
        aria-label="View product details"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      </button>

      {/* Love/Wishlist Icon */}
      <button 
        type="button" 
        className={`fm-card-act-btn act-wish ${isWish ? 'active' : ''} ${isAnimating ? 'pulse' : ''}`} 
        onClick={handleWish}
        aria-label={isWish ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg 
          width="18" height="18" 
          viewBox="0 0 24 24" 
          fill={isWish ? '#ef4444' : 'none'} 
          stroke={isWish ? '#ef4444' : 'currentColor'} 
          strokeWidth="2.4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      <style>{`
        .fm-card-actions {
          position: absolute;
          top: 14px;
          right: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 100; /* Ensure high visibility above all overlays */
          transition: all 0.4s var(--ease);
          pointer-events: auto;
        }

        .fm-card-act-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          color: #1e293b;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
          outline: none;
        }

        /* Responsive Visibility - staggred slide on hover */
        .fm-card-act-btn {
          transform: translateX(15px);
          opacity: 0;
        }

        /* Persistent visibility for active items */
        .fm-card-act-btn.active {
          opacity: 0.85;
          transform: translateX(0);
        }

        .prod-card:hover .fm-card-act-btn,
        .pr-card:hover .fm-card-act-btn {
          transform: translateX(0);
          opacity: 1;
        }

        /* Staggered Entrance */
        .prod-card:hover .act-view, .pr-card:hover .act-view { transition-delay: 0.05s; }
        .prod-card:hover .act-wish, .pr-card:hover .act-wish { transition-delay: 0.12s; }

        .fm-card-act-btn:hover {
          transform: scale(1.18) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
          z-index: 110;
        }

        .act-view:hover {
          background: var(--gold);
          color: #ffffff;
        }

        .act-wish.active {
          background: #ffffff;
          color: #ef4444;
        }

        .act-wish.pulse svg {
          animation: act-pulse 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes act-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }

        [data-theme='dark'] .fm-card-act-btn {
          background: #0f172a;
          color: #cbd5e1;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
        }

        [data-theme='dark'] .act-wish.active {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default CardActions;
