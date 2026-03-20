import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'overview',  label: '01 · Overview' },
  { id: 'collect',   label: '02 · What We Collect' },
  { id: 'use',       label: '03 · How We Use It' },
  { id: 'sharing',   label: '04 · Who We Share With' },
  { id: 'cookies',   label: '05 · Cookies' },
  { id: 'retention', label: '06 · Retention' },
  { id: 'security',  label: '07 · Security' },
  { id: 'rights',    label: '08 · Your Rights' },
  { id: 'children',  label: '09 · Children' },
  { id: 'changes',   label: '10 · Changes' },
];

const Privacy = () => {
  return (
    <div className="priv-page">

      {/* ── HERO ── */}
      <section className="priv-hero">
        <div className="priv-hero-text">
          <p className="priv-eyebrow">Legal</p>
          <h1 className="priv-title">Privacy Policy</h1>
          <p className="priv-meta">
            Last updated: <strong>March 2025</strong> &nbsp;·&nbsp; Effective immediately
          </p>
          <p className="priv-intro">
            We believe privacy is a right, not a setting buried in a menu. This policy
            explains clearly what we collect, what we do with it, and what you can do
            about it. No jargon, no surprises.
          </p>
        </div>
        <div className="priv-hero-art" aria-hidden="true">
          <svg viewBox="0 0 320 360" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 20 L290 70 L290 190 C290 270 160 340 160 340 C160 340 30 270 30 190 L30 70 Z"
              fill="#1a2235" stroke="#C4922A" strokeWidth="1.4"/>
            <path d="M160 52 L258 92 L258 188 C258 250 160 308 160 308 C160 308 62 250 62 188 L62 92 Z"
              fill="none" stroke="#C4922A" strokeWidth=".8" opacity=".4"/>
            <rect x="130" y="175" width="60" height="50" rx="6"
              fill="#C4922A" opacity=".2" stroke="#C4922A" strokeWidth="1.2"/>
            <path d="M145 175 L145 158 C145 140 175 140 175 158 L175 175"
              fill="none" stroke="#C4922A" strokeWidth="1.5"/>
            <circle cx="160" cy="197" r="7" fill="#C4922A" opacity=".7"/>
            <rect x="157" y="200" width="6" height="12" rx="2" fill="#C4922A" opacity=".7"/>
            <circle cx="160" cy="38"  r="4" fill="#C4922A" opacity=".6"/>
            <circle cx="274" cy="78"  r="3" fill="#C4922A" opacity=".4"/>
            <circle cx="46"  cy="78"  r="3" fill="#C4922A" opacity=".4"/>
            <line x1="295" y1="30" x2="305" y2="20" stroke="#C4922A" strokeWidth="1" opacity=".3"/>
            <line x1="300" y1="25" x2="300" y2="10" stroke="#C4922A" strokeWidth="1" opacity=".2"/>
            <line x1="295" y1="25" x2="310" y2="25" stroke="#C4922A" strokeWidth="1" opacity=".2"/>
            <line x1="25"  y1="30" x2="15"  y2="20" stroke="#C4922A" strokeWidth="1" opacity=".3"/>
            <line x1="20"  y1="25" x2="20"  y2="10" stroke="#C4922A" strokeWidth="1" opacity=".2"/>
            <line x1="25"  y1="25" x2="10"  y2="25" stroke="#C4922A" strokeWidth="1" opacity=".2"/>
          </svg>
        </div>
      </section>

      {/* ── COMMITMENT CARDS ── */}
      <div className="priv-commits">
        {[
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            ),
            title: 'We never sell your data',
            body: 'Your personal information is never sold to advertisers or third parties. Full stop.',
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ),
            title: 'Passwords are hashed',
            body: 'We never store your password in plain text. It is hashed with bcrypt before it touches our database.',
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            ),
            title: 'You can delete your data',
            body: 'Request account deletion anytime. We remove your personal information within 30 days.',
          },
          {
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ),
            title: 'No ad tracking',
            body: 'We do not use third-party advertising cookies or sell your browsing data to anyone.',
          },
        ].map(c => (
          <div className="priv-commit" key={c.title}>
            <div className="priv-commit-icon">{c.icon}</div>
            <div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── OUTER LAYOUT ── */}
      <div className="priv-outer">

        {/* Sidebar */}
        <aside className="priv-nav">
          <p className="priv-nav-label">On this page</p>
          <ul className="priv-nav-list">
            {NAV_ITEMS.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="priv-nav-link">{item.label}</a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Sections */}
        <div className="priv-body">

          <section className="priv-section" id="overview">
            <div className="priv-section-label">01</div>
            <div className="priv-section-content">
              <h2>Overview</h2>
              <p>FolkMint is committed to protecting your personal information. This Privacy Policy explains what data we collect, why we collect it, how we use it, and what rights you have over it. By using FolkMint, you agree to the practices described here. If you do not agree, please do not use our platform.</p>
            </div>
          </section>

          <section className="priv-section" id="collect">
            <div className="priv-section-label">02</div>
            <div className="priv-section-content">
              <h2>What We Collect</h2>
              <p>We collect information you give us directly — your name, email address, phone number, and delivery address when you register or place an order. Payment details are handled securely by our payment partners and we do not store full card numbers.</p>
              <p>When you use our platform, we automatically collect certain technical data: IP address, browser type, device information, pages visited, and time spent on the site. If you submit a product review, we store its content alongside your account information.</p>
              <div className="priv-data-table">
                {[
                  { type: 'Data type',            examples: 'Examples',                                  why: 'Why we collect it',               header: true },
                  { type: 'Account information',  examples: 'Name, email, password hash',                why: 'Creating and managing your account' },
                  { type: 'Order information',    examples: 'Address, items purchased, payment method',  why: 'Processing and delivering your orders' },
                  { type: 'Technical data',       examples: 'IP address, browser, device',               why: 'Security and platform improvement' },
                  { type: 'Review content',       examples: 'Rating, written review',                    why: 'Displaying verified reviews' },
                ].map((r, i) => (
                  <div className={`priv-data-row${r.header ? ' priv-data-header' : ''}`} key={i}>
                    <span className="priv-data-type">{r.type}</span>
                    <span className="priv-data-examples">{r.examples}</span>
                    <span className="priv-data-why">{r.why}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="priv-section" id="use">
            <div className="priv-section-label">03</div>
            <div className="priv-section-content">
              <h2>How We Use Your Information</h2>
              <p>We use your data only for what is necessary to run FolkMint well:</p>
              <ul className="priv-list">
                <li>Processing and fulfilling your orders</li>
                <li>Sending order confirmations and shipping updates</li>
                <li>Responding to your questions and support requests</li>
                <li>Personalising your shopping experience and recommendations</li>
                <li>Detecting and preventing fraud or misuse</li>
                <li>Improving the platform through usage analytics</li>
                <li>Sending promotional emails — only if you have opted in</li>
              </ul>
              <p>We do not use your data for automated decision-making that produces legal or similarly significant effects on you.</p>
            </div>
          </section>

          <section className="priv-section" id="sharing">
            <div className="priv-section-label">04</div>
            <div className="priv-section-content">
              <h2>Who We Share It With</h2>
              <p>We do not sell your personal data. We share your information only where strictly necessary:</p>
              <div className="priv-share-grid">
                {[
                  { who: 'Delivery partners',       what: 'Your name, address, and phone number to complete your order' },
                  { who: 'Payment processors',      what: 'Transaction data to handle payment security' },
                  { who: 'Cloud & hosting providers', what: 'Encrypted data storage to run the platform' },
                  { who: 'Law enforcement',         what: 'Only when legally required — we do not volunteer data' },
                ].map(s => (
                  <div className="priv-share-card" key={s.who}>
                    <h4>{s.who}</h4>
                    <p>{s.what}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="priv-section" id="cookies">
            <div className="priv-section-label">05</div>
            <div className="priv-section-content">
              <h2>Cookies</h2>
              <p>We use cookies and similar technologies to keep you logged in, remember your cart, and understand how people use the site.</p>
              <div className="priv-cookie-grid">
                <div className="priv-cookie priv-cookie-required">
                  <div className="priv-cookie-badge">Required</div>
                  <h4>Essential Cookies</h4>
                  <p>Keep you logged in, maintain your cart, and make the platform function. Cannot be disabled.</p>
                </div>
                <div className="priv-cookie priv-cookie-optional">
                  <div className="priv-cookie-badge priv-cookie-badge-opt">Optional</div>
                  <h4>Analytics Cookies</h4>
                  <p>Help us understand traffic and improve the experience. Can be disabled in your browser settings.</p>
                </div>
              </div>
              <p>We do not use advertising cookies. We do not share cookie data with advertisers.</p>
            </div>
          </section>

          <section className="priv-section" id="retention">
            <div className="priv-section-label">06</div>
            <div className="priv-section-content">
              <h2>How Long We Keep Your Data</h2>
              <div className="priv-retention-list">
                {[
                  { period: 'While account is active',    data: 'Account and profile information' },
                  { period: '7 years',                    data: 'Order records (legal and tax compliance)' },
                  { period: '30 days after deletion',     data: 'Personal information after account deletion' },
                  { period: 'Indefinitely (anonymised)',  data: 'Review content may be retained without identifying information' },
                ].map(r => (
                  <div className="priv-retention-row" key={r.data}>
                    <span className="priv-retention-period">{r.period}</span>
                    <span className="priv-retention-data">{r.data}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="priv-section" id="security">
            <div className="priv-section-label">07</div>
            <div className="priv-section-content">
              <h2>Security</h2>
              <p>We take the security of your data seriously. Passwords are hashed using bcrypt before storage and are never stored in plain text. All data is transmitted over HTTPS. Access to personal data within our team is restricted to those who need it to do their jobs.</p>
              <p>Despite these measures, no system is completely secure. If you suspect your account has been compromised, contact us immediately at <a href="mailto:hello@folkmint.com" className="priv-link">hello@folkmint.com</a>.</p>
            </div>
          </section>

          <section className="priv-section" id="rights">
            <div className="priv-section-label">08</div>
            <div className="priv-section-content">
              <h2>Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="priv-list">
                <li>Access the personal data we hold about you</li>
                <li>Correct any inaccurate information</li>
                <li>Request deletion of your account and associated data</li>
                <li>Withdraw consent for marketing communications at any time</li>
                <li>Request a copy of your data in a portable format</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:hello@folkmint.com" className="priv-link">hello@folkmint.com</a>. We will respond within 7 business days.</p>
            </div>
          </section>

          <section className="priv-section" id="children">
            <div className="priv-section-label">09</div>
            <div className="priv-section-content">
              <h2>Children's Privacy</h2>
              <p>FolkMint is not intended for use by anyone under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has created an account or submitted personal information, please contact us and we will delete it promptly.</p>
            </div>
          </section>

          <section className="priv-section" id="changes">
            <div className="priv-section-label">10</div>
            <div className="priv-section-content">
              <h2>Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. For significant changes, we will notify you by email or with a prominent notice on the platform. Your continued use of FolkMint after changes are posted means you accept the updated policy.</p>
            </div>
          </section>

          {/* ── FOOTER NOTE ── */}
          <div className="priv-footer-note">
            <div className="priv-footer-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4"/>
                <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
                <circle cx="20" cy="20" r="2.4" fill="#0d0d0d"/>
                <circle cx="20" cy="8"  r="1.8" fill="#C4922A"/>
                <circle cx="32" cy="20" r="1.8" fill="#C4922A"/>
                <circle cx="20" cy="32" r="1.8" fill="#C4922A"/>
                <circle cx="8"  cy="20" r="1.8" fill="#C4922A"/>
              </svg>
            </div>
            <p>
              Questions about your data? Visit our{' '}
              <Link to="/help" className="priv-link">Help & Contact page</Link>
              {' '}or email{' '}
              <a href="mailto:hello@folkmint.com" className="priv-link">hello@folkmint.com</a>.
            </p>
            <p>
              See also:{' '}
              <Link to="/terms" className="priv-link">Terms & Conditions</Link>
              {' '}·{' '}
              <Link to="/shipping" className="priv-link">Shipping & Returns</Link>
            </p>
          </div>

        </div>{/* end priv-body */}
      </div>{/* end priv-outer */}

      <style>{`
        .priv-page {
          width: 100%;
          overflow-x: hidden;
          background: var(--bg);
        }

        /* ── HERO ── */
        .priv-hero {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 60px;
          align-items: center;
          padding: 80px 80px 72px;
          background: radial-gradient(circle at 20% 50%, #fdfdfc 0%, var(--bg-alt) 100%);
          border-bottom: 1px solid var(--border);
        }
        .priv-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
        }
        .priv-title {
          font-family: var(--legal-title-font);
          font-size: clamp(38px, 5vw, 62px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
        }
        .priv-meta {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 20px;
        }
        .priv-intro {
          font-size: 15px;
          line-height: 1.8;
          color: var(--muted);
          max-width: 520px;
        }
        .priv-hero-art {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: .8;
        }
        .priv-hero-art svg {
          width: 100%;
          max-width: 280px;
          height: auto;
        }

        /* ── COMMITMENT CARDS ── */
        .priv-commits {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: var(--dark);
        }
        .priv-commit {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 36px 28px;
          border-right: 1px solid rgba(255,255,255,.08);
        }
        .priv-commit:last-child { border-right: none; }
        .priv-commit-icon { color: var(--gold); flex-shrink: 0; }
        .priv-commit h3 {
          font-size: 14px;
          font-weight: 700;
          color: #f5f1eb;
          line-height: 1.3;
        }
        .priv-commit p {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255,255,255,.45);
        }

        /* ── OUTER LAYOUT ── */
        .priv-outer {
          display: grid;
          grid-template-columns: 240px 1fr;
          align-items: start;
          padding: 0;
          margin: 0 80px;
        }

        /* ── SIDEBAR ── */
        .priv-nav {
          position: sticky;
          top: var(--header-total-height);
          align-self: start;
          padding: 48px 24px 48px 0;
          border-right: 1px solid var(--border);
          max-height: calc(100vh - var(--header-total-height));
          overflow-y: auto;
          scrollbar-width: none;
        }
        .priv-nav::-webkit-scrollbar { display: none; }
        .priv-nav-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 14px;
        }
        .priv-nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .priv-nav-link {
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
        .priv-nav-link:hover {
          color: var(--gold);
          border-left-color: var(--gold);
        }

        /* ── BODY ── */
        .priv-body {
          padding: 0 0 80px 56px;
        }

        /* ── SECTIONS ── */
        .priv-section {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 32px;
          padding: 52px 0;
          border-bottom: 1px solid var(--border);
          align-items: start;
          scroll-margin-top: 88px;
        }
        .priv-section:last-of-type { border-bottom: none; }
        .priv-section-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 700;
          color: var(--gold);
          opacity: .25;
          line-height: 1;
          padding-top: 4px;
          text-align: right;
        }
        .priv-section-content h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .priv-section-content p {
          font-size: 14.5px;
          line-height: 1.85;
          color: var(--muted);
          margin-bottom: 16px;
          max-width: 640px;
        }
        .priv-section-content p:last-child { margin-bottom: 0; }

        /* ── LIST ── */
        .priv-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 4px 0 16px;
        }
        .priv-list li {
          font-size: 14px;
          line-height: 1.65;
          color: var(--muted);
          padding-left: 20px;
          position: relative;
        }
        .priv-list li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--gold);
          font-size: 12px;
        }

        /* ── DATA TABLE ── */
        .priv-data-table {
          margin: 20px 0 8px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .priv-data-row {
          display: grid;
          grid-template-columns: 200px 1fr 1fr;
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
        }
        .priv-data-row:last-child { border-bottom: none; }
        .priv-data-header {
          background: var(--dark);
        }
        .priv-data-type,
        .priv-data-examples,
        .priv-data-why {
          padding: 13px 16px;
          font-size: 13px;
          color: var(--muted);
          border-right: 1px solid var(--border);
          line-height: 1.55;
        }
        .priv-data-type { font-weight: 600; color: var(--dark); }
        .priv-data-why  { border-right: none; }
        .priv-data-header .priv-data-type,
        .priv-data-header .priv-data-examples,
        .priv-data-header .priv-data-why {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: rgba(255,255,255,.5);
          border-color: rgba(255,255,255,.08);
        }

        /* ── SHARE GRID ── */
        .priv-share-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          margin: 16px 0 8px;
        }
        .priv-share-card {
          background: var(--bg-card);
          padding: 22px 20px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          transition: background .2s;
        }
        .priv-share-card:nth-child(2n) { border-right: none; }
        .priv-share-card:nth-child(3),
        .priv-share-card:nth-child(4) { border-bottom: none; }
        .priv-share-card:hover { background: var(--bg); }
        .priv-share-card h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 7px;
        }
        .priv-share-card p {
          font-size: 13px;
          line-height: 1.65;
          color: var(--muted);
          margin: 0;
          max-width: none;
        }

        /* ── COOKIE GRID ── */
        .priv-cookie-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 16px 0;
        }
        .priv-cookie {
          border-radius: var(--r);
          padding: 22px;
          border: 1px solid;
        }
        .priv-cookie-required { background: #f0faf3; border-color: #a7f3c0; }
        .priv-cookie-optional { background: #fff8f0; border-color: #fcd9a0; }
        .priv-cookie-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 99px;
          background: #15803d;
          color: #fff;
          margin-bottom: 10px;
        }
        .priv-cookie-badge-opt { background: #b45309; }
        .priv-cookie h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 7px;
        }
        .priv-cookie p {
          font-size: 13px;
          line-height: 1.65;
          color: var(--muted);
          margin: 0;
          max-width: none;
        }

        /* ── RETENTION ── */
        .priv-retention-list {
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          margin: 8px 0;
        }
        .priv-retention-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 15px 20px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
        }
        .priv-retention-row:last-child { border-bottom: none; }
        .priv-retention-period {
          font-size: 13px;
          font-weight: 700;
          color: var(--gold);
          white-space: nowrap;
          min-width: 180px;
        }
        .priv-retention-data {
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.5;
        }

        /* ── LINK ── */
        .priv-link {
          color: var(--gold);
          text-decoration: none;
          font-weight: 600;
          transition: color .2s;
        }
        .priv-link:hover { color: var(--dark); }

        /* ── FOOTER NOTE ── */
        .priv-footer-note {
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
        .priv-footer-icon { margin-bottom: 8px; }
        .priv-footer-note p {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255,255,255,.5);
          margin: 0;
        }
        .priv-footer-note .priv-link { color: var(--gold); }
        .priv-footer-note .priv-link:hover { color: #f5f1eb; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .priv-hero { grid-template-columns: 1fr; padding: 64px 40px 56px; }
          .priv-hero-art { display: none; }
          .priv-outer { margin: 0 40px; grid-template-columns: 200px 1fr; }
          .priv-body { padding: 0 0 64px 40px; }
          .priv-commits { grid-template-columns: 1fr 1fr; }
          .priv-commit:nth-child(2) { border-right: none; }
          .priv-commit:nth-child(1),
          .priv-commit:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,.08); }
        }

        @media (max-width: 768px) {
          .priv-hero { padding: 48px 24px 40px; }
          .priv-outer { margin: 0 24px; grid-template-columns: 1fr; }
          .priv-nav { display: none; }
          .priv-body { padding: 0 0 56px; }
          .priv-section { grid-template-columns: 1fr; gap: 8px; }
          .priv-section-label { font-size: 28px; text-align: left; opacity: .2; }
          .priv-commits { grid-template-columns: 1fr; }
          .priv-commit { border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); }
          .priv-commit:last-child { border-bottom: none; }
          .priv-share-grid { grid-template-columns: 1fr; }
          .priv-share-card { border-right: none; }
          .priv-share-card:nth-child(3),
          .priv-share-card:nth-child(4) { border-bottom: 1px solid var(--border); }
          .priv-share-card:last-child { border-bottom: none; }
          .priv-cookie-grid { grid-template-columns: 1fr; }
          .priv-data-table { overflow-x: auto; }
          .priv-data-row { min-width: 480px; }
          .priv-retention-row { flex-direction: column; align-items: flex-start; gap: 4px; }
          .priv-retention-period { min-width: unset; }
          .priv-footer-note { padding: 28px 24px; }
        }
      `}</style>

    </div>
  );
};

export default Privacy;