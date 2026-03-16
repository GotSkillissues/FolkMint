import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../../context';
import FloatingCategoriesPanel from './FloatingCategoriesPanel';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [scrolled, setScrolled]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal]   = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleSearch = () => {
    setSearchOpen(prev => {
      if (!prev) setTimeout(() => searchRef.current?.focus(), 30);
      return !prev;
    });
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal('');
    }
    if (e.key === 'Escape') { setSearchOpen(false); setSearchVal(''); }
  };

  const getInitials = () => {
    if (!user) return 'U';
    const ini = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase();
    return ini || user.username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`} id="site-header">
      <div className="hdr">

        <div className="hdr-left">
          <FloatingCategoriesPanel />

          {/* Logo */}
          <Link to="/" className="logo" aria-label="FolkMint Home">
            <svg className="logo-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke="#C4922A" strokeWidth="1.4"/>
              <path d="M20 9 L31 20 L20 31 L9 20 Z" fill="#C4922A" opacity=".18"/>
              <line x1="20" y1="2"  x2="20" y2="38" stroke="#C4922A" strokeWidth=".6" opacity=".3"/>
              <line x1="2"  y1="20" x2="38" y2="20" stroke="#C4922A" strokeWidth=".6" opacity=".3"/>
              <line x1="7"  y1="7"  x2="33" y2="33" stroke="#C4922A" strokeWidth=".5" opacity=".22"/>
              <line x1="7"  y1="33" x2="33" y2="7"  stroke="#C4922A" strokeWidth=".5" opacity=".22"/>
              <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
              <circle cx="20" cy="20" r="2.4" fill="#111"/>
              <circle cx="20" cy="8"  r="1.8" fill="#C4922A"/>
              <circle cx="32" cy="20" r="1.8" fill="#C4922A"/>
              <circle cx="20" cy="32" r="1.8" fill="#C4922A"/>
              <circle cx="8"  cy="20" r="1.8" fill="#C4922A"/>
              <circle cx="11" cy="11" r="1.3" fill="#C4922A" opacity=".55"/>
              <circle cx="29" cy="11" r="1.3" fill="#C4922A" opacity=".55"/>
              <circle cx="29" cy="29" r="1.3" fill="#C4922A" opacity=".55"/>
              <circle cx="11" cy="29" r="1.3" fill="#C4922A" opacity=".55"/>
            </svg>
            <span className="logo-name">Folk<b>Mint</b></span>
          </Link>
        </div>

        {/* Actions */}
        <div className="hdr-actions">

          {/* Search */}
          <div className={`search-wrap${searchOpen ? ' open' : ''}`}>
            <input
              ref={searchRef}
              className="search-input"
              type="text"
              placeholder="Search artisan goods…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={handleSearchKey}
              aria-label="Search"
            />
            <button className="icon-btn" onClick={toggleSearch} aria-label="Toggle search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>

          {/* Auth — guest */}
          {!isAuthenticated && (
            <div className="auth-guest">
              <Link to="/login" className="btn-login">Log in</Link>
              <Link to="/register" className="btn-register">Register</Link>
            </div>
          )}

          {/* Auth — user button */}
          {isAuthenticated && (
            <Link to="/account" className="user-account-btn" aria-label="My account">
                <div className="user-avatar">{getInitials()}</div>
                <span className="user-name">My Account</span>
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart" className="cart-btn" aria-label="Shopping cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

        </div>
      </div>
    </header>
  );
};

export default Header;
