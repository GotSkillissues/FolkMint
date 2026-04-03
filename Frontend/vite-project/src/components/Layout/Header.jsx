import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCart, useNotifications, useWishlist, useTheme } from '../../context';
import { useCategoryTree } from '../../hooks/useCategories';
import { getCategoryUrl, getCardImageUrl } from '../../utils';
import { productService } from '../../services';
import FloatingCategoriesPanel from './FloatingCategoriesPanel';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [suggestions, setSuggestions] = useState({ categories: [], products: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { tree: categoryTree, refetch: refetchCategoryTree } = useCategoryTree();

  useEffect(() => {
    window.addEventListener('folkmint:categories-updated', refetchCategoryTree);
    return () => window.removeEventListener('folkmint:categories-updated', refetchCategoryTree);
  }, [refetchCategoryTree]);

  // Live suggest
  useEffect(() => {
    if (!searchVal.trim() || searchVal.length < 2) {
      setSuggestions({ categories: [], products: [] });
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSuggestions(true);
      try {
        // Search local categories
        const searchLow = searchVal.toLowerCase();
        const cats = [];
        const findInTree = (nodes) => {
          nodes.forEach(n => {
            if (n.name.toLowerCase().includes(searchLow)) cats.push(n);
            if (n.children) findInTree(n.children);
          });
        };
        findInTree(categoryTree || []);
        
        // Search API products
        const res = await productService.searchProducts(searchVal, { limit: 5 });
        const items = res?.products ?? res?.items ?? (Array.isArray(res) ? res : []);
        
        setSuggestions({
          categories: cats.slice(0, 3),
          products: items.slice(0, 5)
        });
        setShowSuggestions(true);
      } catch (err) {
        console.error("Suggest error", err);
      } finally {
        setSearchingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchVal, categoryTree]);

  // Close suggestions on click-outside
  useEffect(() => {
    const clickOut = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
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

  const query = new URLSearchParams(location.search);
  const activeCategoryId = query.get('category_id') || query.get('parent_id') || '';
  const activeCategorySlug = query.get('category');
  const pathParts = location.pathname.split('/');
  const activeCategoryRouteId = pathParts[1] === 'categories' ? pathParts[2] : '';

  const rootCategories = Array.isArray(categoryTree)
    ? categoryTree.filter((node) => !node?.parent_category)
    : [];

  const dynamicNavItems = rootCategories
    .filter((node) => node?.category_slug && !node.name.toLowerCase().includes('jewel'))
    .map((node) => ({
      key: node.category_id,
      label: node.name,
      to: getCategoryUrl(node),
      active: location.pathname === getCategoryUrl(node) || location.pathname.startsWith(`${getCategoryUrl(node)}/`),
      children: Array.isArray(node.children) ? node.children : []
    }));

  const navItems = [
    { key: 'home', label: 'Home', to: '/', active: location.pathname === '/' },
    ...dynamicNavItems
  ];

  const { unreadCount } = useNotifications();
  const { wishlistProductIds } = useWishlist();
  const wishlistCount = wishlistProductIds.size;

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`} id="site-header">
      <div className="hdr">

        <div className="hdr-left">
          <FloatingCategoriesPanel />

          {/* Logo */}
          <Link to="/" className="logo" aria-label="FolkMint Home">
            <svg className="logo-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke="#C4922A" strokeWidth="1.4" />
              <path d="M20 9 L31 20 L20 31 L9 20 Z" fill="#C4922A" opacity=".18" />
              <line x1="20" y1="2" x2="20" y2="38" stroke="#C4922A" strokeWidth=".6" opacity=".3" />
              <line x1="2" y1="20" x2="38" y2="20" stroke="#C4922A" strokeWidth=".6" opacity=".3" />
              <line x1="7" y1="7" x2="33" y2="33" stroke="#C4922A" strokeWidth=".5" opacity=".22" />
              <line x1="7" y1="33" x2="33" y2="7" stroke="#C4922A" strokeWidth=".5" opacity=".22" />
              <circle cx="20" cy="20" r="5.5" fill="#C4922A" />
              <circle cx="20" cy="20" r="2.4" fill="#111" />
              <circle cx="20" cy="8" r="1.8" fill="#C4922A" />
              <circle cx="32" cy="20" r="1.8" fill="#C4922A" />
              <circle cx="20" cy="32" r="1.8" fill="#C4922A" />
              <circle cx="8" cy="20" r="1.8" fill="#C4922A" />
              <circle cx="11" cy="11" r="1.3" fill="#C4922A" opacity=".55" />
              <circle cx="29" cy="11" r="1.3" fill="#C4922A" opacity=".55" />
              <circle cx="29" cy="29" r="1.3" fill="#C4922A" opacity=".55" />
              <circle cx="11" cy="29" r="1.3" fill="#C4922A" opacity=".55" />
            </svg>
            <span className="logo-name">Folk<b>Mint</b></span>
          </Link>
        </div>

        <nav className="hdr-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const children = item.children || [];

            return (
              <div key={item.key} className={`hdr-nav-item${children.length > 0 ? ' has-dropdown' : ''}`}>
                <Link
                  to={item.to}
                  className={`hdr-nav-link${item.active ? ' active' : ''}`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                  {children.length > 0 && (
                    <svg className="dropdown-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </Link>
                {children.length > 0 && (
                  <div className="hdr-dropdown">
                    <div className="hdr-dropdown-inner">
                      {children.map(child => (
                        <Link 
                          key={child.category_id} 
                          to={getCategoryUrl(child)}
                          className="hdr-dropdown-link"
                        >
                          <span className="hdr-dropdown-link-name">{child.name}</span>
                          {child.product_count !== undefined && (
                            <span className="hdr-dropdown-link-count">{child.product_count}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

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
              onFocus={() => searchVal.length >= 2 && setShowSuggestions(true)}
              aria-label="Search"
            />
            <button className="icon-btn" onClick={toggleSearch} aria-label="Toggle search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* LIVE SUGGESTIONS DROPDOWN */}
            {searchOpen && showSuggestions && (searchVal.length >= 2) && (
              <div className="search-suggestions" ref={suggestionsRef}>
                {searchingSuggestions && <div className="suggest-loading">Searching…</div>}
                
                {!searchingSuggestions && suggestions.categories.length === 0 && suggestions.products.length === 0 && (
                  <div className="suggest-empty">No quick results for "{searchVal}"</div>
                )}

                {/* Categories */}
                {suggestions.categories.length > 0 && (
                  <div className="suggest-group">
                    <p className="suggest-label">Categories</p>
                    {suggestions.categories.map(c => (
                      <Link 
                        key={c.category_id} 
                        to={getCategoryUrl(c)} 
                        className="suggest-item suggest-cat"
                        onClick={() => { setShowSuggestions(false); setSearchVal(''); setSearchOpen(false); }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, opacity: 0.6 }}>
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Products */}
                {suggestions.products.length > 0 && (
                  <div className="suggest-group">
                    <p className="suggest-label">Products</p>
                    {suggestions.products.map(p => {
                      const img = getCardImageUrl(p, { width: 80, height: 80 });
                      return (
                        <Link 
                          key={p.product_id} 
                          to={`/products/${p.product_id}`} 
                          className="suggest-item suggest-prod"
                          onClick={() => { setShowSuggestions(false); setSearchVal(''); setSearchOpen(false); }}
                        >
                          <div className="suggest-prod-img">
                            {img ? <img src={img} alt="" /> : <div className="suggest-prod-placeholder" />}
                          </div>
                          <div className="suggest-prod-info">
                            <p className="suggest-prod-name">{p.name}</p>
                            <p className="suggest-prod-price">৳{Number(p.price || 0).toLocaleString()}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <button 
                  className="suggest-view-all" 
                  onClick={() => {
                    navigate(`/products?q=${encodeURIComponent(searchVal.trim())}`);
                    setShowSuggestions(false);
                    setSearchVal('');
                    setSearchOpen(false);
                  }}
                >
                  View all results for "{searchVal}" →
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* Auth — guest */}
          {!isAuthenticated && (
            <div className="auth-guest">
              <NavLink to="/login" className="btn-login">Log in</NavLink>
              <NavLink to="/register" className="btn-register">Register</NavLink>
            </div>
          )}

          {/* Auth — user button */}
          {isAuthenticated && (
            <>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className="admin-btn" aria-label="Admin dashboard">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
                    <path d="M9.5 12.5l1.8 1.8 3.2-3.2" />
                  </svg>
                </NavLink>
              )}
              <NavLink to="/account" state={{ defaultSection: 'details' }} className="user-account-btn" aria-label="My account">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </NavLink>

              <NavLink to="/notifications" className="notif-btn" aria-label="Notifications">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </NavLink>

              <NavLink to="/wishlist" className="wishlist-btn" aria-label="Wishlist">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.8 4.6a5.1 5.1 0 0 0-7.2 0L12 6.2l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2l1.6 1.6L12 20.6l7.2-7.2 1.6-1.6a5.1 5.1 0 0 0 0-7.2z" />
                </svg>
                {wishlistCount > 0 && <span className="wishlist-badge-dot" />}
              </NavLink>
            </>
          )}

          {/* Cart */}
          <NavLink to="/cart" className="cart-btn" aria-label="Shopping cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </NavLink>

        </div>
      </div>
    </header>
  );
};

export default Header;
