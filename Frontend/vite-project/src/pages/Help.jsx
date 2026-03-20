import { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 3–7 business days within Bangladesh. We will send you a confirmation with tracking details once your order ships.',
  },
  {
    q: 'Can I return or exchange a product?',
    a: 'Yes. If your item arrives damaged or is not as described, contact us within 7 days of delivery and we will sort it out — replacement, exchange, or refund.',
  },
  {
    q: 'Are all products genuinely handmade?',
    a: 'Every product listed on FolkMint is handmade by artisans we have verified. We do not list factory-produced or machine-made items.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Cash on Delivery, bKash, Nagad, Rocket, and major credit and debit cards (Visa, Mastercard, Amex).',
  },
  {
    q: 'Can I track my order?',
    a: 'Yes. Once your order is dispatched you will receive a tracking number via email. You can also check your order status from your account page.',
  },
  {
    q: 'How do I cancel an order?',
    a: 'You can cancel a pending order directly from your account page. Once an order has been confirmed and is being processed, cancellation may no longer be possible.',
  },
  {
    q: 'I received a damaged item. What do I do?',
    a: 'Take a photo of the item and contact us at hello@folkmint.com with your order number. We will arrange a replacement or refund within 2 business days.',
  },
  {
    q: 'Do you ship outside Bangladesh?',
    a: 'Not yet — but it is coming. Sign up for our newsletter or check back soon for international shipping updates.',
  },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' faq-open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span>{q}</span>
        <svg
          className="faq-chevron"
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <p className="faq-a">{a}</p>}
    </div>
  );
};

const Help = () => {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent,    setSent]    = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: wire to a real email / contact API
    setSent(true);
  };

  return (
    <div className="help-page">

      {/* ── HERO ── */}
      <section className="help-hero">
        <p className="help-eyebrow">Support</p>
        <h1 className="help-title">Get in Touch</h1>
        <p className="help-sub">
          A question about an order, a product, or just want to say hello —
          we read every message and reply within one business day.
        </p>
      </section>

      {/* ── CONTACT CARDS ── */}
      <section className="help-channels">
        <div className="help-channels-inner">

          <div className="help-channel-card">
            <div className="help-channel-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3>Email Us</h3>
            <p>For orders, returns, and general queries.</p>
            <a href="mailto:hello@folkmint.com" className="help-channel-link">
              hello@folkmint.com
            </a>
          </div>

          <div className="help-channel-card">
            <div className="help-channel-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <h3>Call Us</h3>
            <p>Available Saturday – Thursday, 10am – 6pm.</p>
            <a href="tel:+8801700000000" className="help-channel-link">
              +880 1700-000000
            </a>
          </div>

          <div className="help-channel-card">
            <div className="help-channel-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h3>Response Time</h3>
            <p>We reply to every message within one business day — usually much faster.</p>
            <span className="help-channel-note">Avg. reply: under 4 hours</span>
          </div>

        </div>
      </section>

      {/* ── MAIN: FORM + FAQ ── */}
      <section className="help-body">
        <div className="help-body-inner">

          {/* Contact Form */}
          <div className="help-form-wrap">
            <h2 className="help-form-title">Send a Message</h2>
            <p className="help-form-sub">
              Fill in the form and we will get back to you at the email you provide.
            </p>

            {sent ? (
              <div className="help-sent">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>Message sent</h3>
                <p>Thanks for reaching out. We will get back to you within one business day.</p>
                <button className="help-sent-reset" onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}>
                  Send another message
                </button>
              </div>
            ) : (
              <form className="help-form" onSubmit={handleSubmit} noValidate>
                <div className="hf-row">
                  <div className="hf-group">
                    <label className="hf-label" htmlFor="hf-name">Your name</label>
                    <input
                      className="hf-input"
                      id="hf-name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hf-group">
                    <label className="hf-label" htmlFor="hf-email">Email address <span className="hf-req">*</span></label>
                    <input
                      className="hf-input"
                      id="hf-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="hf-group">
                  <label className="hf-label" htmlFor="hf-subject">Subject <span className="hf-req">*</span></label>
                  <select
                    className="hf-input"
                    id="hf-subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a topic…</option>
                    <option value="order">Order issue</option>
                    <option value="return">Return or exchange</option>
                    <option value="product">Product question</option>
                    <option value="payment">Payment issue</option>
                    <option value="artisan">Artisan inquiry</option>
                    <option value="other">Something else</option>
                  </select>
                </div>

                <div className="hf-group">
                  <label className="hf-label" htmlFor="hf-message">Message <span className="hf-req">*</span></label>
                  <textarea
                    className="hf-input hf-textarea"
                    id="hf-message"
                    placeholder="Tell us what is on your mind…"
                    rows={6}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  className="hf-submit"
                  type="submit"
                  disabled={!email || !subject || !message}
                >
                  Send Message
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* FAQ */}
          <div className="help-faq-wrap">
            <h2 className="help-form-title">Common Questions</h2>
            <p className="help-form-sub">
              Quick answers to the things people ask us most.
            </p>
            <div className="faq-list">
              {FAQS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>

        </div>
      </section>

      <style>{`
        .help-page {
          width: 100%;
          overflow-x: hidden;
        }

        /* ── HERO ── */
        .help-hero {
          padding: 80px 80px 64px;
          background: radial-gradient(circle at 20% 50%, #fdfdfc 0%, var(--bg-alt) 100%);
          border-bottom: 1px solid var(--border);
        }
        .help-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
        }
        .help-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(38px, 5vw, 60px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }
        .help-sub {
          font-size: 15px;
          line-height: 1.8;
          color: var(--muted);
          max-width: 520px;
        }

        /* ── CHANNEL CARDS ── */
        .help-channels {
          background: var(--bg);
          padding: 56px 0;
          border-bottom: 1px solid var(--border);
        }
        .help-channels-inner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          max-width: none;
          padding: 0 80px;
        }
        .help-channel-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: box-shadow .25s;
        }
        .help-channel-card:hover { box-shadow: var(--sh-md); }
        .help-channel-icon {
          color: var(--gold);
          margin-bottom: 8px;
        }
        .help-channel-card h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
        }
        .help-channel-card p {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--muted);
          flex: 1;
        }
        .help-channel-link {
          font-size: 14px;
          font-weight: 600;
          color: var(--gold);
          text-decoration: none;
          margin-top: 4px;
          transition: color .2s;
        }
        .help-channel-link:hover { color: var(--dark); }
        .help-channel-note {
          font-size: 12px;
          font-weight: 600;
          color: #16a34a;
          margin-top: 4px;
        }

        /* ── BODY ── */
        .help-body {
          padding: 72px 0 80px;
          background: var(--bg-alt);
        }
        .help-body-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          padding: 0 80px;
        }
        .help-form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 6px;
        }
        .help-form-sub {
          font-size: 13.5px;
          color: var(--muted);
          margin-bottom: 28px;
          line-height: 1.65;
        }

        /* ── FORM ── */
        .help-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .hf-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .hf-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hf-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--text);
        }
        .hf-req { color: #b91c1c; margin-left: 2px; }
        .hf-input {
          width: 100%;
          padding: 11px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          font-size: 14px;
          color: var(--dark);
          font-family: inherit;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
          appearance: none;
        }
        .hf-input::placeholder { color: #bbb4a8; }
        .hf-input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(196,146,42,.12);
        }
        .hf-textarea { resize: vertical; min-height: 140px; line-height: 1.6; }
        .hf-submit {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background .25s, opacity .2s;
          align-self: flex-start;
        }
        .hf-submit:hover:not(:disabled) { background: var(--black); }
        .hf-submit:disabled { opacity: .4; cursor: not-allowed; }

        /* ── SENT STATE ── */
        .help-sent {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          padding: 48px 32px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          color: #16a34a;
        }
        .help-sent h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
          color: var(--dark);
        }
        .help-sent p {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.65;
          max-width: 320px;
        }
        .help-sent-reset {
          font-size: 13px;
          color: var(--gold);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
          margin-top: 8px;
          text-decoration: underline;
        }

        /* ── FAQ ── */
        .faq-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .faq-item {
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          transition: background .2s;
        }
        .faq-item:last-child { border-bottom: none; }
        .faq-item.faq-open { background: var(--bg); }
        .faq-q {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
          background: none;
          border: none;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          color: var(--dark);
          cursor: pointer;
          font-family: inherit;
          transition: color .2s;
        }
        .faq-q:hover { color: var(--gold); }
        .faq-chevron {
          flex-shrink: 0;
          transition: transform .25s var(--ease);
          color: var(--muted);
        }
        .faq-open .faq-chevron { transform: rotate(180deg); }
        .faq-a {
          padding: 0 22px 18px;
          font-size: 13.5px;
          line-height: 1.75;
          color: var(--muted);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .help-hero { padding: 64px 40px 48px; }
          .help-channels-inner { padding: 0 40px; grid-template-columns: 1fr; gap: 16px; }
          .help-body-inner { padding: 0 40px; grid-template-columns: 1fr; gap: 48px; }
        }
        @media (max-width: 640px) {
          .help-hero { padding: 48px 24px 40px; }
          .help-channels-inner { padding: 0 24px; }
          .help-body-inner { padding: 0 24px; }
          .hf-row { grid-template-columns: 1fr; }
        }
      `}</style>

    </div>
  );
};

export default Help;