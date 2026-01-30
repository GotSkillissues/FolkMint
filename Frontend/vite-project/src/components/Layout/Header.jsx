import { Link } from 'react-router-dom';
import { useAuth, useCart } from '../../context';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { cartCount } = useCart();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          WildBLOOM
        </Link>
        
        <nav className="nav-menu">
          <Link to="/products/mugs-cups" className="nav-link">MUGS & CUPS</Link>
          <Link to="/products/plates-bowls" className="nav-link">PLATES & BOWLS</Link>
          <Link to="/home-decor" className="nav-link">HOME DECOR</Link>
          <Link to="/classes" className="nav-link">CLASSES</Link>
        </nav>

        <div className="header-actions">
          <button className="icon-btn search-btn">
            <span className="icon">🔍</span>
          </button>
          
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="icon-btn">
                <span className="icon">👤</span>
              </Link>
              <button onClick={handleLogout} className="icon-btn">
                <span className="icon">🚪</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="icon-btn">
              <span className="icon">👤</span>
            </Link>
          )}
          
          <Link to="/cart" className="icon-btn cart-btn">
            <span className="icon">🛒</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
