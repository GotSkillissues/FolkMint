import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content:
      'By accessing or using FolkMint through our website, mobile application, or related services, you agree to these Terms and Conditions. If you do not agree, please do not use the platform. We may revise these terms from time to time, and continued use after updates means you accept the revised terms.'
  },
  {
    id: 'accounts',
    title: 'Your Account',
    content:
      'To place orders or access certain features, you must create an account with accurate information. You are responsible for keeping your credentials secure and for activity under your account. We may suspend or terminate accounts involved in fraud, false information, or violations of these terms. You must be at least 18 years old to create an account.'
  },
  {
    id: 'products',
    title: 'Products and Listings',
    content:
      'FolkMint features handmade products from artisans across Bangladesh. We work to keep descriptions, images, and prices accurate, but slight differences in color, size, and finish are normal with handmade items and are not defects. Prices are listed in Bangladeshi Taka (BDT) and include applicable taxes unless otherwise stated. Listings may be updated or removed at any time.'
  },
  {
    id: 'orders',
    title: 'Orders and Payment',
    content:
      'Submitting an order is an offer to purchase. We may decline orders when products become unavailable or if suspicious activity is detected. Payment is required at checkout. If a paid order cannot be fulfilled, a full refund is issued within 3 to 5 business days.'
  },
  {
    id: 'shipping',
    title: 'Shipping and Delivery',
    content:
      'We deliver across Bangladesh. Standard delivery usually takes 3 to 7 business days from dispatch. Delivery windows are estimates and may be affected by weather, public holidays, and courier conditions. Shipping fees, when applicable, are shown at checkout.'
  },
  {
    id: 'returns',
    title: 'Returns and Refunds',
    content:
      'If an item arrives damaged, defective, or significantly different from its listing, contact us within 7 days of delivery with photos and your order details. We will provide a replacement, exchange, or full refund where appropriate. Returns for change of mind may be limited for handmade and limited-quantity items.'
  },
  {
    id: 'conduct',
    title: 'Acceptable Use',
    content:
      'You may not use FolkMint for unlawful activity or in ways that disrupt the platform. Prohibited actions include fraudulent orders, unauthorized access attempts, data scraping, impersonation, and posting misleading content. Violations can result in account suspension and legal action where required.'
  },
  {
    id: 'reviews',
    title: 'Reviews and User Content',
    content:
      'Verified buyers may submit product reviews. By submitting content, you grant FolkMint a non-exclusive, royalty-free license to display it on the platform. Reviews must be honest, relevant, and respectful. We may remove content that violates community and trust standards.'
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    content:
      'All text, images, branding, and design elements on FolkMint are protected by applicable intellectual property laws and belong to FolkMint or the respective rights holders. Content may not be copied, redistributed, or reused without permission.'
  },
  {
    id: 'privacy',
    title: 'Privacy',
    content:
      'Your use of FolkMint is also governed by our Privacy Policy. By using the platform, you consent to our handling of personal information as described there.'
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content:
      'To the maximum extent permitted by law, FolkMint is not liable for indirect or consequential damages arising from your use of the platform. Our total liability for a claim will not exceed the amount paid for the order connected to that claim, except where law requires otherwise.'
  },
  {
    id: 'governing',
    title: 'Governing Law',
    content:
      'These Terms are governed by the laws of the People\'s Republic of Bangladesh. Disputes are subject to the exclusive jurisdiction of courts in Dhaka. If any clause is held unenforceable, the remaining terms stay in effect.'
  },
  {
    id: 'contact',
    title: 'Contact',
    content:
      'If you have questions about these Terms, email hello@folkmint.com or reach us through the Help page. We aim to respond within one business day.'
  }
];

const Terms = () => {
  return (
    <div className="terms-page">
      <section className="terms-hero">
        <div className="terms-hero-text">
          <p className="terms-eyebrow">Legal</p>
          <h1 className="terms-title">Terms & Conditions</h1>
          <p className="terms-meta">
            Last updated: <strong>March 2025</strong> &nbsp;·&nbsp; Effective immediately
          </p>
          <p className="terms-intro">
            These terms explain your rights, our responsibilities, and the rules that keep FolkMint safe and fair for both customers and artisans.
          </p>
        </div>
        <div className="terms-hero-art" aria-hidden="true">
          <svg viewBox="0 0 320 360" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M160 20 L290 70 L290 190 C290 270 160 340 160 340 C160 340 30 270 30 190 L30 70 Z"
              fill="#1a2235"
              stroke="#C4922A"
              strokeWidth="1.4"
            />
            <path
              d="M160 52 L258 92 L258 188 C258 250 160 308 160 308 C160 308 62 250 62 188 L62 92 Z"
              fill="none"
              stroke="#C4922A"
              strokeWidth=".8"
              opacity=".4"
            />
            <rect x="115" y="152" width="90" height="76" rx="8" fill="#C4922A" opacity=".18" stroke="#C4922A" strokeWidth="1.2" />
            <line x1="130" y1="176" x2="190" y2="176" stroke="#C4922A" strokeWidth="1.2" />
            <line x1="130" y1="194" x2="190" y2="194" stroke="#C4922A" strokeWidth="1.2" opacity=".8" />
            <line x1="130" y1="212" x2="172" y2="212" stroke="#C4922A" strokeWidth="1.2" opacity=".6" />
            <circle cx="160" cy="38" r="4" fill="#C4922A" opacity=".6" />
            <circle cx="274" cy="78" r="3" fill="#C4922A" opacity=".4" />
            <circle cx="46" cy="78" r="3" fill="#C4922A" opacity=".4" />
          </svg>
        </div>
      </section>

      <div className="terms-commits">
        {[
          {
            title: 'Clear obligations',
            body: 'We write terms in plain language so you can quickly understand what applies to your account.'
          },
          {
            title: 'Fair platform use',
            body: 'Rules are designed to protect buyers, artisans, and the trust built around handmade commerce.'
          },
          {
            title: 'Transparent process',
            body: 'Orders, refunds, and policy updates follow documented procedures with clear timelines.'
          },
          {
            title: 'Support when needed',
            body: 'If something is unclear, our support team is available to guide you through next steps.'
          }
        ].map((item) => (
          <div className="terms-commit" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>

      <div className="terms-outer">
        <aside className="terms-nav">
          <p className="terms-nav-label">On this page</p>
          <ul className="terms-nav-list">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="terms-nav-link">
                  {String(index + 1).padStart(2, '0')} · {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="terms-body">
          {SECTIONS.map((section, index) => (
            <section key={section.id} id={section.id} className="terms-section">
              <div className="terms-section-label">{String(index + 1).padStart(2, '0')}</div>
              <div className="terms-section-content">
                <h2>{section.title}</h2>
                <p>{section.content}</p>
              </div>
            </section>
          ))}

          <div className="terms-footer-note">
            <div className="terms-footer-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4" />
                <circle cx="20" cy="20" r="5.5" fill="#C4922A" />
                <circle cx="20" cy="20" r="2.4" fill="#0d0d0d" />
                <circle cx="20" cy="8" r="1.8" fill="#C4922A" />
                <circle cx="32" cy="20" r="1.8" fill="#C4922A" />
                <circle cx="20" cy="32" r="1.8" fill="#C4922A" />
                <circle cx="8" cy="20" r="1.8" fill="#C4922A" />
              </svg>
            </div>
            <p>
              Questions? Visit our <Link to="/help" className="terms-link">Help and Contact page</Link> or email{' '}
              <a href="mailto:hello@folkmint.com" className="terms-link">hello@folkmint.com</a>.
            </p>
            <p>
              See also: <Link to="/privacy" className="terms-link">Privacy Policy</Link> ·{' '}
              <Link to="/shipping" className="terms-link">Shipping and Returns</Link>.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .terms-page {
          width: 100%;
          overflow-x: hidden;
          background: var(--bg);
        }

        .terms-hero {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 60px;
          align-items: center;
          padding: 80px 80px 72px;
          background: radial-gradient(circle at 20% 50%, #fdfdfc 0%, var(--bg-alt) 100%);
          border-bottom: 1px solid var(--border);
        }
        .terms-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
        }
        .terms-title {
          font-family: var(--legal-title-font);
          font-size: clamp(38px, 5vw, 62px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
        }
        .terms-meta {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 20px;
        }
        .terms-intro {
          font-size: 15px;
          line-height: 1.8;
          color: var(--muted);
          max-width: 520px;
        }
        .terms-hero-art {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: .8;
        }
        .terms-hero-art svg {
          width: 100%;
          max-width: 280px;
          height: auto;
        }

        .terms-commits {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: var(--dark);
        }
        .terms-commit {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 36px 28px;
          border-right: 1px solid rgba(255,255,255,.08);
        }
        .terms-commit:last-child { border-right: none; }
        .terms-commit h3 {
          font-size: 14px;
          font-weight: 700;
          color: #f5f1eb;
          line-height: 1.3;
        }
        .terms-commit p {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255,255,255,.45);
        }

        .terms-outer {
          display: grid;
          grid-template-columns: 240px 1fr;
          align-items: start;
          padding: 0;
          margin: 0 80px;
        }

        .terms-nav {
          position: sticky;
          top: var(--header-total-height);
          align-self: start;
          padding: 48px 24px 48px 0;
          border-right: 1px solid var(--border);
          max-height: calc(100vh - var(--header-total-height));
          overflow-y: auto;
          scrollbar-width: none;
        }
        .terms-nav::-webkit-scrollbar { display: none; }
        .terms-nav-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 14px;
        }
        .terms-nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .terms-nav-link {
          font-size: 12.5px;
          color: var(--muted);
          text-decoration: none;
          padding: 6px 0 6px 12px;
          display: block;
          line-height: 1.4;
          transition: color .2s, border-color .2s;
          border-left: 2px solid transparent;
          margin-left: -10px;
        }
        .terms-nav-link:hover {
          color: var(--gold);
          border-left-color: var(--gold);
        }

        .terms-body {
          padding: 0 0 80px 56px;
        }

        .terms-section {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 32px;
          padding: 52px 0;
          border-bottom: 1px solid var(--border);
          align-items: start;
          scroll-margin-top: 88px;
        }
        .terms-section:last-of-type { border-bottom: none; }
        .terms-section-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 700;
          color: var(--gold);
          opacity: .25;
          line-height: 1;
          padding-top: 4px;
          text-align: right;
        }
        .terms-section-content h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .terms-section-content p {
          font-size: 14.5px;
          line-height: 1.85;
          color: var(--muted);
          margin-bottom: 0;
          max-width: 640px;
        }

        .terms-link {
          color: var(--gold);
          text-decoration: none;
          font-weight: 600;
          transition: color .2s;
        }
        .terms-link:hover { color: var(--dark); }

        .terms-footer-note {
          margin-top: 48px;
          padding: 36px 40px;
          background: var(--dark);
          border-radius: var(--r);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
        }
        .terms-footer-icon { margin-bottom: 8px; }
        .terms-footer-note p {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255,255,255,.5);
          margin: 0;
        }
        .terms-footer-note .terms-link { color: var(--gold); }
        .terms-footer-note .terms-link:hover { color: #f5f1eb; }

        @media (max-width: 1100px) {
          .terms-hero { grid-template-columns: 1fr; padding: 64px 40px 56px; }
          .terms-hero-art { display: none; }
          .terms-outer { margin: 0 40px; grid-template-columns: 200px 1fr; }
          .terms-body { padding: 0 0 64px 40px; }
          .terms-commits { grid-template-columns: 1fr 1fr; }
          .terms-commit:nth-child(2) { border-right: none; }
          .terms-commit:nth-child(1),
          .terms-commit:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,.08); }
        }

        @media (max-width: 768px) {
          .terms-hero { padding: 48px 24px 40px; }
          .terms-outer { margin: 0 24px; grid-template-columns: 1fr; }
          .terms-nav { display: none; }
          .terms-body { padding: 0 0 56px; }
          .terms-section { grid-template-columns: 1fr; gap: 8px; }
          .terms-section-label { font-size: 28px; text-align: left; opacity: .2; }
          .terms-commits { grid-template-columns: 1fr; }
          .terms-commit { border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); }
          .terms-commit:last-child { border-bottom: none; }
          .terms-footer-note { padding: 28px 24px; }
        }
      `}</style>
    </div>
  );
};

export default Terms;
