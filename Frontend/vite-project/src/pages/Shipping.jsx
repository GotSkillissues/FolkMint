import { Link } from 'react-router-dom';

const Shipping = () => {
  return (
    <div className="ship-page">

      {/* ── HERO ── */}
      <section className="ship-hero">
        <div className="ship-hero-text">
          <p className="ship-eyebrow">Policies</p>
          <h1 className="ship-title">Shipping & Returns</h1>
          <p className="ship-intro">
            We want your order to reach you quickly, safely, and exactly as described.
            Here is everything you need to know.
          </p>
        </div>
        <div className="ship-hero-art" aria-hidden="true">
          <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* truck body */}
            <rect x="20" y="100" width="220" height="110" rx="6"
              fill="#1a2235" stroke="#C4922A" strokeWidth="1.2"/>
            {/* cab */}
            <path d="M240 140 L240 210 L330 210 L330 160 L290 140 Z"
              fill="#1a2235" stroke="#C4922A" strokeWidth="1.2"/>
            {/* cab window */}
            <path d="M248 148 L248 175 L320 175 L320 162 L286 148 Z"
              fill="#C4922A" opacity=".18"/>
            {/* wheels */}
            <circle cx="80"  cy="218" r="22" fill="#0d0d0d" stroke="#C4922A" strokeWidth="1.5"/>
            <circle cx="80"  cy="218" r="10" fill="#1a2235" stroke="#C4922A" strokeWidth="1"/>
            <circle cx="190" cy="218" r="22" fill="#0d0d0d" stroke="#C4922A" strokeWidth="1.5"/>
            <circle cx="190" cy="218" r="10" fill="#1a2235" stroke="#C4922A" strokeWidth="1"/>
            <circle cx="295" cy="218" r="22" fill="#0d0d0d" stroke="#C4922A" strokeWidth="1.5"/>
            <circle cx="295" cy="218" r="10" fill="#1a2235" stroke="#C4922A" strokeWidth="1"/>
            {/* road */}
            <line x1="0" y1="240" x2="380" y2="240" stroke="#C4922A" strokeWidth=".6" opacity=".3"/>
            <line x1="40"  y1="240" x2="80"  y2="240" stroke="#C4922A" strokeWidth="2" opacity=".2" strokeDasharray="20 12"/>
            <line x1="140" y1="240" x2="240" y2="240" stroke="#C4922A" strokeWidth="2" opacity=".2" strokeDasharray="20 12"/>
            {/* package on truck */}
            <rect x="60" y="65" width="60" height="55" rx="3"
              fill="#C4922A" opacity=".15" stroke="#C4922A" strokeWidth="1"/>
            <line x1="90" y1="65" x2="90" y2="120" stroke="#C4922A" strokeWidth=".8" opacity=".5"/>
            <line x1="60" y1="92" x2="120" y2="92" stroke="#C4922A" strokeWidth=".8" opacity=".5"/>
            {/* speed lines */}
            <line x1="0"  y1="155" x2="18" y2="155" stroke="#C4922A" strokeWidth="1.2" opacity=".35"/>
            <line x1="0"  y1="168" x2="12" y2="168" stroke="#C4922A" strokeWidth="1"   opacity=".25"/>
            <line x1="0"  y1="181" x2="20" y2="181" stroke="#C4922A" strokeWidth=".8"  opacity=".2"/>
            {/* map pin top right */}
            <circle cx="348" cy="36" r="14" fill="#C4922A" opacity=".15" stroke="#C4922A" strokeWidth="1"/>
            <circle cx="348" cy="33" r="5"  fill="#C4922A" opacity=".7"/>
            <line   x1="348" y1="38" x2="348" y2="50" stroke="#C4922A" strokeWidth="1.2" opacity=".5"/>
            {/* decorative dots */}
            <circle cx="355" cy="80"  r="2" fill="#C4922A" opacity=".3"/>
            <circle cx="365" cy="95"  r="1.5" fill="#C4922A" opacity=".2"/>
            <circle cx="340" cy="90"  r="1" fill="#C4922A" opacity=".2"/>
          </svg>
        </div>
      </section>

      {/* ── QUICK STATS ── */}
      <div className="ship-stats">
        {[
          { num: '3–7',  unit: 'days',   label: 'Standard delivery' },
          { num: '৳999', unit: '+',      label: 'Free shipping from' },
          { num: '7',    unit: 'days',   label: 'Return window' },
          { num: '64',   unit: 'districts', label: 'We deliver to' },
        ].map(({ num, unit, label }) => (
          <div className="ship-stat" key={label}>
            <div className="ship-stat-num">
              {num}<span className="ship-stat-unit">{unit}</span>
            </div>
            <span className="ship-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── SHIPPING ── */}
      <section className="ship-section">
        <div className="ship-section-inner">
          <div className="ship-section-head">
            <p className="ship-section-eyebrow">Getting it to you</p>
            <h2 className="ship-section-title">Delivery</h2>
          </div>
          <div className="ship-cards">

            <div className="ship-card">
              <div className="ship-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Delivery Times</h3>
              <p>
                Standard delivery takes <strong>3–7 business days</strong> from dispatch.
                Orders placed before 2pm on a business day ship the same day.
                Remote or rural areas may take an additional 1–3 days.
              </p>
            </div>

            <div className="ship-card">
              <div className="ship-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Shipping Fees</h3>
              <p>
                <strong>Free shipping</strong> on all orders above ৳999.
                Below that: ৳80 within Dhaka, ৳120 outside Dhaka.
                Fees are shown at checkout — no surprises after.
              </p>
            </div>

            <div className="ship-card">
              <div className="ship-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <h3>Coverage</h3>
              <p>
                We deliver to all <strong>64 districts</strong> of Bangladesh.
                International shipping is not available yet — but it is coming soon.
                Email us if you are based abroad and we will try to help.
              </p>
            </div>

            <div className="ship-card">
              <div className="ship-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3>Order Tracking</h3>
              <p>
                Once dispatched, you get a tracking number by email.
                You can also check your order status anytime from your
                <strong> account page</strong> under Orders.
              </p>
            </div>

            <div className="ship-card">
              <div className="ship-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <h3>Cash on Delivery</h3>
              <p>
                COD is available across all of Bangladesh. Please have the
                <strong> exact amount</strong> ready — our delivery partners
                may not always carry change. Repeated COD refusals may
                disable the option on your account.
              </p>
            </div>

            <div className="ship-card">
              <div className="ship-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </div>
              <h3>Failed Deliveries</h3>
              <p>
                If a delivery fails, we try again the next business day.
                After two attempts, the order is held for 3 days before
                returning to us. Contact us to rearrange — additional
                delivery charges may apply.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="ship-divider">
        <div className="ship-divider-gem" />
      </div>

      {/* ── RETURNS ── */}
      <section className="ship-section ship-section-alt">
        <div className="ship-section-inner">
          <div className="ship-section-head">
            <p className="ship-section-eyebrow">Something not right?</p>
            <h2 className="ship-section-title">Returns & Refunds</h2>
          </div>

          {/* What we accept / don't accept */}
          <div className="ship-accept-grid">
            <div className="ship-accept ship-accept-yes">
              <div className="ship-accept-head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                We accept returns for
              </div>
              <ul>
                <li>Items that arrived damaged or defective</li>
                <li>Items significantly different from their description</li>
                <li>Wrong item sent in your order</li>
              </ul>
            </div>
            <div className="ship-accept ship-accept-no">
              <div className="ship-accept-head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                We do not accept returns for
              </div>
              <ul>
                <li>Change of mind on handmade items</li>
                <li>Jewellery or accessories that have been worn</li>
                <li>Gift cards (non-refundable)</li>
                <li>Items reported after 7 days of delivery</li>
              </ul>
            </div>
          </div>

          {/* Process steps */}
          <h3 className="ship-steps-title">How to Return an Item</h3>
          <div className="ship-steps">
            {[
              {
                n: '01',
                title: 'Contact Us',
                body: 'Email hello@folkmint.com with your order number, the item you want to return, and photos if the item is damaged. Do this within 7 days of receiving your order.',
              },
              {
                n: '02',
                title: 'We Review',
                body: 'We will confirm whether the return is approved within 2 business days. If approved, we arrange collection — you do not need to drop it off anywhere.',
              },
              {
                n: '03',
                title: 'Item Collected',
                body: 'Our delivery partner collects the item from you at no cost. Please keep the original packaging if possible.',
              },
              {
                n: '04',
                title: 'Refund Issued',
                body: 'Once we receive and inspect the item, your refund or replacement is processed within 3–5 business days. You will get an email confirmation.',
              },
            ].map(step => (
              <div className="ship-step" key={step.n}>
                <div className="ship-step-num">{step.n}</div>
                <div className="ship-step-body">
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Refund methods */}
          <div className="ship-refund-box">
            <h3>Refund Timelines</h3>
            <div className="ship-refund-grid">
              {[
                { method: 'bKash', time: '24–48 hours' },
                { method: 'Visa / Mastercard / Amex', time: '3–7 business days' },
                { method: 'Cash on Delivery orders', time: 'Via bKash or bank transfer' },
              ].map(r => (
                <div className="ship-refund-row" key={r.method}>
                  <span className="ship-refund-method">{r.method}</span>
                  <span className="ship-refund-time">{r.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ship-cta-section">
        <div className="ship-cta-inner">
          <h2>Still have questions?</h2>
          <p>Our team is available Saturday – Thursday, 10am – 6pm and replies to every message within one business day.</p>
          <div className="ship-cta-btns">
            <Link to="/help" className="cta-primary">
              Contact Support
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <a href="mailto:hello@folkmint.com" className="cta-outline">
              hello@folkmint.com
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .ship-page {
          width: 100%;
          overflow-x: hidden;
          background: var(--bg);
        }

        /* ── HERO ── */
        .ship-hero {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 60px;
          align-items: center;
          padding: 80px 80px 72px;
          background: radial-gradient(circle at 20% 50%, #fdfdfc 0%, var(--bg-alt) 100%);
          border-bottom: 1px solid var(--border);
        }
        .ship-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
        }
        .ship-title {
          font-family: var(--legal-title-font);
          font-size: clamp(38px, 5vw, 62px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }
        .ship-intro {
          font-size: 15px;
          line-height: 1.8;
          color: var(--muted);
          max-width: 480px;
        }
        .ship-hero-art {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: .75;
        }
        .ship-hero-art svg {
          width: 100%;
          max-width: 380px;
          height: auto;
        }

        /* ── STATS ── */
        .ship-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: var(--dark);
        }
        .ship-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 40px 24px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,.08);
        }
        .ship-stat:last-child { border-right: none; }
        .ship-stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 700;
          color: var(--gold);
          line-height: 1;
        }
        .ship-stat-unit {
          font-size: 18px;
          margin-left: 2px;
        }
        .ship-stat-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: rgba(255,255,255,.45);
        }

        /* ── SECTIONS ── */
        .ship-section {
          padding: 72px 0;
          background: var(--bg);
        }
        .ship-section-alt {
          background: radial-gradient(circle at center 20%, #fdfdfc 0%, var(--bg-alt) 100%);
        }
        .ship-section-inner {
          padding: 0 80px;
        }
        .ship-section-head {
          margin-bottom: 40px;
        }
        .ship-section-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 8px;
        }
        .ship-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.15;
        }

        /* ── DELIVERY CARDS ── */
        .ship-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .ship-card {
          background: var(--bg-card);
          padding: 32px 28px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          transition: background .25s;
        }
        .ship-card:nth-child(3n) { border-right: none; }
        .ship-card:nth-child(4),
        .ship-card:nth-child(5),
        .ship-card:nth-child(6) { border-bottom: none; }
        .ship-card:hover { background: var(--bg); }
        .ship-card-icon {
          color: var(--gold);
          margin-bottom: 16px;
        }
        .ship-card h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 10px;
        }
        .ship-card p {
          font-size: 13.5px;
          line-height: 1.75;
          color: var(--muted);
        }
        .ship-card strong { color: var(--dark); font-weight: 600; }

        /* ── DIVIDER ── */
        .ship-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: var(--bg);
        }
        .ship-divider-gem {
          width: 10px;
          height: 10px;
          background: var(--gold);
          transform: rotate(45deg);
          opacity: .5;
        }

        /* ── ACCEPT GRID ── */
        .ship-accept-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 56px;
        }
        .ship-accept {
          border-radius: var(--r);
          padding: 28px 28px 28px 24px;
          border: 1px solid;
        }
        .ship-accept-yes {
          background: #f0faf3;
          border-color: #a7f3c0;
        }
        .ship-accept-no {
          background: #fff8f0;
          border-color: #fcd9a0;
        }
        .ship-accept-head {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .ship-accept-yes .ship-accept-head { color: #15803d; }
        .ship-accept-no  .ship-accept-head { color: #b45309; }
        .ship-accept ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ship-accept li {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text);
          padding-left: 16px;
          position: relative;
        }
        .ship-accept-yes li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #16a34a;
          font-weight: 700;
        }
        .ship-accept-no li::before {
          content: '×';
          position: absolute;
          left: 0;
          color: #b45309;
          font-weight: 700;
        }

        /* ── STEPS ── */
        .ship-steps-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 24px;
        }
        .ship-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          margin-bottom: 40px;
        }
        .ship-step {
          background: var(--bg-card);
          padding: 28px 24px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ship-step:last-child { border-right: none; }
        .ship-step-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--gold);
          opacity: .5;
          line-height: 1;
        }
        .ship-step-body h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 8px;
        }
        .ship-step-body p {
          font-size: 13px;
          line-height: 1.7;
          color: var(--muted);
        }

        /* ── REFUND BOX ── */
        .ship-refund-box {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 32px;
        }
        .ship-refund-box h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 20px;
        }
        .ship-refund-grid {
          display: flex;
          flex-direction: column;
          gap: 1px;
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
        }
        .ship-refund-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          gap: 16px;
        }
        .ship-refund-row:last-child { border-bottom: none; }
        .ship-refund-method {
          font-size: 14px;
          font-weight: 600;
          color: var(--dark);
        }
        .ship-refund-time {
          font-size: 13px;
          color: #16a34a;
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── CTA ── */
        .ship-cta-section {
          background: var(--dark);
          padding: 80px 0;
        }
        .ship-cta-inner {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
          padding: 0 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .ship-cta-inner h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: #f5f1eb;
          line-height: 1.15;
        }
        .ship-cta-inner p {
          font-size: 14px;
          line-height: 1.75;
          color: #888;
        }
        .ship-cta-btns {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }
        .ship-cta-section .cta-outline {
          background: transparent;
          border-color: #444;
          color: #ccc;
        }
        .ship-cta-section .cta-outline:hover {
          border-color: var(--gold);
          color: var(--gold);
          background: transparent;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .ship-hero { grid-template-columns: 1fr; padding: 64px 40px 56px; }
          .ship-hero-art { display: none; }
          .ship-section-inner { padding: 0 40px; }
          .ship-cards { grid-template-columns: 1fr 1fr; }
          .ship-card:nth-child(3n) { border-right: 1px solid var(--border); }
          .ship-card:nth-child(2n) { border-right: none; }
          .ship-card:nth-child(4),
          .ship-card:nth-child(5) { border-bottom: 1px solid var(--border); }
          .ship-card:nth-child(6) { border-bottom: none; border-right: none; }
          .ship-steps { grid-template-columns: 1fr 1fr; }
          .ship-step:nth-child(2) { border-right: none; }
          .ship-step:nth-child(1),
          .ship-step:nth-child(2) { border-bottom: 1px solid var(--border); }
          .ship-stats { grid-template-columns: 1fr 1fr; }
          .ship-stat { border-bottom: 1px solid rgba(255,255,255,.08); }
          .ship-stat:nth-child(2) { border-right: none; }
          .ship-stat:nth-child(3),
          .ship-stat:nth-child(4) { border-bottom: none; }
        }

        @media (max-width: 720px) {
          .ship-hero { padding: 48px 24px 40px; }
          .ship-section-inner { padding: 0 24px; }
          .ship-cards { grid-template-columns: 1fr; }
          .ship-card { border-right: none; border-bottom: 1px solid var(--border); }
          .ship-card:last-child { border-bottom: none; }
          .ship-accept-grid { grid-template-columns: 1fr; }
          .ship-steps { grid-template-columns: 1fr; }
          .ship-step { border-right: none; border-bottom: 1px solid var(--border); }
          .ship-step:last-child { border-bottom: none; }
          .ship-stats { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 480px) {
          .ship-stats { grid-template-columns: 1fr; }
          .ship-stat { border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); }
          .ship-stat:last-child { border-bottom: none; }
        }
      `}</style>

    </div>
  );
};

export default Shipping;