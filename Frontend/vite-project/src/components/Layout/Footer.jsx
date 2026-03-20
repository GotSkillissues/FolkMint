import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">

        {/* Brand */}
        <div>
          <div className="ft-brand">
            <svg width="28" height="28" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4"/>
              <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
              <circle cx="20" cy="20" r="2.4" fill="#0d0d0d"/>
              <circle cx="20" cy="8"  r="1.6" fill="#C4922A"/>
              <circle cx="32" cy="20" r="1.6" fill="#C4922A"/>
              <circle cx="20" cy="32" r="1.6" fill="#C4922A"/>
              <circle cx="8"  cy="20" r="1.6" fill="#C4922A"/>
            </svg>
            <span className="ft-brand-name">Folk<b>Mint</b></span>
          </div>
          <p className="ft-about">Celebrating Bangladeshi artisans and their timeless craft traditions. Every piece tells a story.</p>
        </div>

        {/* Contact */}
        <div className="ft-col">
          <h4>Contact Us</h4>
          <div className="contact-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <a href="mailto:hello@folkmint.com">hello@folkmint.com</a>
          </div>
          <div className="contact-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 12a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006.07 6.07l1.27-1.27a2 2 0 012.11-.45c.908.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <span>+880 1700-000000</span>
          </div>
        </div>

        {/* Socials */}
        <div className="ft-col">
          <h4>Socials</h4>
          <a href="https://facebook.com" target="_blank" rel="noopener" className="social-link" aria-label="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener" className="social-link" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </a>
        </div>

        {/* Legal */}
        <div className="ft-col">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/shipping">Shipping &amp; Returns</Link></li>
            <li><Link to="/help">Help Center</Link></li>
          </ul>
        </div>

      </div>

      {/* Payment logos */}
      <div className="ft-payments">
        <div className="pay-logo" title="Visa">
          <svg width="56" height="36" viewBox="0 0 56 36" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
            <rect width="56" height="36" rx="5" fill="#1A1F71"/>
            <text x="28" y="24" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontStyle="italic" fontSize="17" fontWeight="900" letterSpacing="1.5">VISA</text>
          </svg>
        </div>
        <div className="pay-logo" title="Mastercard">
          <svg width="56" height="36" viewBox="0 0 56 36" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
            <rect width="56" height="36" rx="5" fill="#1A1A1A"/>
            <circle cx="21" cy="18" r="11" fill="#EB001B"/>
            <circle cx="35" cy="18" r="11" fill="#F79E1B"/>
            <path d="M28 9.9a11 11 0 010 16.2A11 11 0 0128 9.9z" fill="#FF5F00"/>
          </svg>
        </div>
        <div className="pay-logo" title="American Express">
          <svg width="56" height="36" viewBox="0 0 56 36" xmlns="http://www.w3.org/2000/svg" aria-label="American Express">
            <rect width="56" height="36" rx="5" fill="#1B9AD7"/>
            <rect x="4" y="7" width="48" height="22" rx="2" fill="none" stroke="#ffffff" strokeWidth="1.5"/>
            <rect x="8" y="11" width="40" height="14" rx="1.5" fill="#ffffff" opacity="0.13"/>
            <text x="28" y="18" textAnchor="middle" fill="#ffffff" fontFamily="Arial,sans-serif" fontSize="6.6" fontWeight="900" letterSpacing="1">AMERICAN</text>
            <text x="28" y="24.8" textAnchor="middle" fill="#ffffff" fontFamily="Arial,sans-serif" fontSize="7.2" fontWeight="900" letterSpacing="1.2">EXPRESS</text>
          </svg>
        </div>
        <div className="pay-logo bkash-logo" title="bKash">
          <svg width="66" height="36" viewBox="0 0 66 36" xmlns="http://www.w3.org/2000/svg" aria-label="bKash">
            <rect width="66" height="36" rx="5" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1"/>
            <text x="9" y="24" fill="#111111" fontFamily="Arial,sans-serif" fontSize="14.5" fontWeight="900">
              <tspan fill="#E2136E" fontSize="16.5">b</tspan>
              <tspan dx="1">Kash</tspan>
            </text>
          </svg>
        </div>
      </div>

      <div className="ft-bottom">
        <span className="ft-copy">&copy; 2026 FolkMint. All rights reserved.</span>
        <span className="ft-craft">Celebrating the art &amp; craft of Bangladesh</span>
      </div>
    </footer>
  );
};

export default Footer;
