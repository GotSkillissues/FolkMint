import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">WildBLOOM</h3>
          <p className="footer-desc">
            Handcrafted ceramics inspired by nature, celebrating the beauty of the earth.
          </p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Shop</h4>
          <ul className="footer-links">
            <li><Link to="/products/mugs-cups">Mugs & Cups</Link></li>
            <li><Link to="/products/plates-bowls">Plates & Bowls</Link></li>
            <li><Link to="/home-decor">Home Decor</Link></li>
            <li><Link to="/classes">Classes</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Customer Service</h4>
          <ul className="footer-links">
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/shipping">Shipping Info</Link></li>
            <li><Link to="/returns">Returns & Exchanges</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">About</h4>
          <ul className="footer-links">
            <li><Link to="/about">Our Story</Link></li>
            <li><Link to="/artisans">Artisans</Link></li>
            <li><Link to="/sustainability">Sustainability</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 WildBLOOM. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
