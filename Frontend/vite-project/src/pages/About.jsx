import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="about-page">

      {/* ── HERO ── */}
      <section className="ab-hero">
        <div className="ab-hero-inner">
          <p className="ab-eyebrow">Our Story</p>
          <h1 className="ab-hero-title">
            Crafted with Heart,<br />
            <em>Rooted in Bangladesh</em>
          </h1>
          <p className="ab-hero-sub">
            FolkMint was born from a simple belief — that the hands shaping clay
            in Rajshahi, weaving Jamdani in Narayanganj, and stitching Nakshi Kantha
            in Jessore deserve a stage as wide as the world.
          </p>
        </div>
        <div className="ab-hero-art" aria-hidden="true">
          <svg viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg" fill="none">
            {/* large diamond */}
            <polygon points="260,20 500,160 260,300 20,160"
              stroke="#C4922A" strokeWidth="1" opacity=".25" />
            {/* inner diamond */}
            <polygon points="260,70 430,160 260,250 90,160"
              stroke="#C4922A" strokeWidth=".8" opacity=".2" />
            {/* cross lines */}
            <line x1="260" y1="20" x2="260" y2="300" stroke="#C4922A" strokeWidth=".5" opacity=".15" />
            <line x1="20" y1="160" x2="500" y2="160" stroke="#C4922A" strokeWidth=".5" opacity=".15" />
            {/* corner dots */}
            <circle cx="260" cy="20" r="4" fill="#C4922A" opacity=".5" />
            <circle cx="500" cy="160" r="4" fill="#C4922A" opacity=".5" />
            <circle cx="260" cy="300" r="4" fill="#C4922A" opacity=".5" />
            <circle cx="20" cy="160" r="4" fill="#C4922A" opacity=".5" />
            {/* centre bloom */}
            <g transform="translate(260,160)">
              <ellipse rx="8" ry="34" cy="-28" fill="#C4922A" opacity=".35" />
              <ellipse rx="8" ry="34" cy="-28" fill="#C4922A" opacity=".35" transform="rotate(60)" />
              <ellipse rx="8" ry="34" cy="-28" fill="#C4922A" opacity=".35" transform="rotate(120)" />
              <ellipse rx="8" ry="34" cy="-28" fill="#C4922A" opacity=".35" transform="rotate(180)" />
              <ellipse rx="8" ry="34" cy="-28" fill="#C4922A" opacity=".35" transform="rotate(240)" />
              <ellipse rx="8" ry="34" cy="-28" fill="#C4922A" opacity=".35" transform="rotate(300)" />
              <circle r="18" fill="#C4922A" opacity=".7" />
              <circle r="9" fill="none" stroke="#f5f1eb" strokeWidth="1.5" />
              <circle r="4" fill="#f5f1eb" />
            </g>
          </svg>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="ab-section ab-mission">
        <div className="ab-section-inner ab-two-col">
          <div className="ab-col-text">
            <p className="ab-label">What We Do</p>
            <h2 className="ab-section-title">A Marketplace Built for Artisans</h2>
            <p className="ab-body">
              Bangladesh has one of the richest craft traditions on earth. Jamdani weaving is
              a UNESCO-recognised intangible cultural heritage. Nakshi Kantha embroidery tells
              stories in thread that have been passed from grandmother to granddaughter for
              centuries. Terracotta from Rajshahi carries the memory of the Indus Valley.
            </p>
            <p className="ab-body">
              Yet most of these artisans sell through middlemen, at local haats, or not at all.
              FolkMint exists to change that — by connecting them directly with people who
              appreciate what they make.
            </p>
          </div>
          <div className="ab-col-stats">
            <div className="ab-stat">
              <span className="ab-stat-number">100+</span>
              <span className="ab-stat-label">Artisan Families</span>
            </div>
            <div className="ab-stat">
              <span className="ab-stat-number">18</span>
              <span className="ab-stat-label">Districts Represented</span>
            </div>
            <div className="ab-stat">
              <span className="ab-stat-number">6</span>
              <span className="ab-stat-label">Craft Categories</span>
            </div>
            <div className="ab-stat">
              <span className="ab-stat-number">৳0</span>
              <span className="ab-stat-label">Listing Fees for Artisans</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="ab-section ab-values-section">
        <div className="ab-section-inner">
          <p className="ab-label">What We Stand For</p>
          <h2 className="ab-section-title">Our Values</h2>
          <div className="ab-values-grid">

            <div className="ab-value-card">
              <div className="ab-value-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h3 className="ab-value-title">Artisan First</h3>
              <p className="ab-value-body">
                Every decision we make starts with one question: does this help the maker?
                Fair pricing, prompt payment, and honest representation — always.
              </p>
            </div>

            <div className="ab-value-card">
              <div className="ab-value-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3 className="ab-value-title">Authenticity</h3>
              <p className="ab-value-body">
                No mass-produced imitations. Every product on FolkMint is handmade,
                hand-verified, and honestly described. If it is not genuine, it is not here.
              </p>
            </div>

            <div className="ab-value-card">
              <div className="ab-value-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="ab-value-title">Trust & Transparency</h3>
              <p className="ab-value-body">
                Clear pricing. Honest product descriptions. No hidden fees.
                We believe trust is not a feature — it is the foundation.
              </p>
            </div>

            <div className="ab-value-card">
              <div className="ab-value-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="ab-value-title">Community</h3>
              <p className="ab-value-body">
                FolkMint is not just a shop. It is a community of makers and appreciators —
                people who believe that buying handmade is an act of cultural preservation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── CRAFT TRADITIONS ── */}
      <section className="ab-section ab-crafts-section">
        <div className="ab-section-inner">
          <p className="ab-label">The Traditions We Carry</p>
          <h2 className="ab-section-title">Bangladesh's Living Heritage</h2>
          <div className="ab-crafts-list">

            <div className="ab-craft">
              <div className="ab-craft-num">01</div>
              <div className="ab-craft-body">
                <h3>Jamdani Weaving</h3>
                <p>
                  Woven on handlooms in Narayanganj, Jamdani is recognised by UNESCO as
                  intangible cultural heritage. Each saree takes days to weeks and carries
                  geometric and floral motifs that have not changed in 700 years.
                </p>
              </div>
            </div>

            <div className="ab-craft">
              <div className="ab-craft-num">02</div>
              <div className="ab-craft-body">
                <h3>Nakshi Kantha</h3>
                <p>
                  Embroidered quilts from rural Bengal, each one a personal narrative
                  stitched in thread. No two are the same. They document lives, dreams,
                  and the landscape of the delta in colour and pattern.
                </p>
              </div>
            </div>

            <div className="ab-craft">
              <div className="ab-craft-num">03</div>
              <div className="ab-craft-body">
                <h3>Terracotta & Pottery</h3>
                <p>
                  Clay shaped by hand in Rajshahi and Dinajpur into animals, figurines,
                  and vessels. The tradition descends from the Pala period and has survived
                  a thousand years of history.
                </p>
              </div>
            </div>

            <div className="ab-craft">
              <div className="ab-craft-num">04</div>
              <div className="ab-craft-body">
                <h3>Muslin & Cotton Weaving</h3>
                <p>
                  Dhaka Muslin was once called "woven air" — so fine it could pass through
                  a ring. Modern weavers carry that tradition forward in cotton and silk
                  that remains among the finest in the world.
                </p>
              </div>
            </div>

            <div className="ab-craft">
              <div className="ab-craft-num">05</div>
              <div className="ab-craft-body">
                <h3>Bamboo & Cane Craft</h3>
                <p>
                  From the hill districts of Chittagong and Sylhet, woven bamboo and cane
                  produce baskets, furniture, and decorative pieces that are functional,
                  beautiful, and entirely sustainable.
                </p>
              </div>
            </div>

            <div className="ab-craft">
              <div className="ab-craft-num">06</div>
              <div className="ab-craft-body">
                <h3>Jute Craft</h3>
                <p>
                  Bangladesh is the world's largest producer of jute. Artisans turn this
                  "golden fibre" into bags, wall art, rugs, and jewellery — proving that
                  sustainable can also be beautiful.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── PROMISE ── */}
      <section className="ab-section ab-promise-section">
        <div className="ab-section-inner ab-promise-inner">
          <div className="ab-promise-mark" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4" />
              <path d="M20 9 L31 20 L20 31 L9 20 Z" fill="#C4922A" opacity=".18" />
              <circle cx="20" cy="20" r="5.5" fill="#C4922A" />
              <circle cx="20" cy="20" r="2.4" fill="#0d0d0d" />
              <circle cx="20" cy="8" r="1.8" fill="#C4922A" />
              <circle cx="32" cy="20" r="1.8" fill="#C4922A" />
              <circle cx="20" cy="32" r="1.8" fill="#C4922A" />
              <circle cx="8" cy="20" r="1.8" fill="#C4922A" />
            </svg>
          </div>
          <h2 className="ab-promise-title">The FolkMint Promise</h2>
          <p className="ab-promise-body">
            At FolkMint, every piece is a celebration of heritage, craftsmanship, and meaning. Thoughtfully handmade by artisans in real communities, each creation reflects techniques and traditions refined across generations. By choosing FolkMint, you are investing in more than beauty — you are supporting authentic makers, preserving cultural artistry, and keeping the spirit of handmade tradition alive.
          </p>
          <div className="ab-promise-ctas">
            <Link to="/products" className="cta-primary">
              Shop the Collection
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link to="/help" className="cta-outline">Get in Touch</Link>
          </div>
        </div>
      </section>

      <style>{`
        /* ── PAGE ── */
        .about-page {
          width: 100%;
          overflow-x: hidden;
        }

        /* ── HERO ── */
        .ab-hero {
          display: grid;
          grid-template-columns: 1fr 480px;
          gap: 60px;
          align-items: center;
          padding: 20px 80px 80px;
          background: radial-gradient(circle at 20% 50%, #fdfdfc 0%, var(--bg-alt) 100%);
          border-bottom: 1px solid var(--border);
        }
        .ab-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 20px;
        }
        .ab-hero-title {
          font-family: var(--legal-title-font);
          font-size: clamp(44px, 5.5vw, 72px);
          font-weight: 600;
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--dark);
          margin-bottom: 24px;
        }
        .ab-hero-title em {
          font-style: normal;
          color: var(--gold);
        }
        .ab-hero-sub {
          font-size: 15px;
          line-height: 1.8;
          color: var(--muted);
          max-width: 520px;
        }
        .ab-hero-art {
          opacity: .6;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ab-hero-art svg {
          width: 100%;
          max-width: 480px;
          height: auto;
        }

        /* ── SHARED SECTION ── */
        .ab-section {
          padding: 80px 0;
        }
        .ab-section-inner {
          max-width: none;
          width: 100%;
          padding: 0 80px;
        }
        .ab-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 10px;
        }
        .ab-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.15;
          margin-bottom: 40px;
        }
        .ab-body {
          font-size: 15px;
          line-height: 1.85;
          color: var(--muted);
          margin-bottom: 18px;
          max-width: 580px;
        }

        /* ── MISSION ── */
        .ab-mission { background: var(--bg); }
        .ab-two-col {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 80px;
          align-items: start;
        }
        .ab-col-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          margin-top: 12px;
        }
        .ab-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: var(--bg-card);
          text-align: center;
          gap: 8px;
        }
        .ab-stat:nth-child(odd) { border-right: 1px solid var(--border); }
        .ab-stat:nth-child(1), .ab-stat:nth-child(2) { border-bottom: 1px solid var(--border); }
        .ab-stat-number {
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px;
          font-weight: 700;
          color: var(--gold);
          line-height: 1;
        }
        .ab-stat-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        /* ── VALUES ── */
        .ab-values-section {
          background: radial-gradient(circle at center 20%, #fdfdfc 0%, var(--bg-alt) 100%);
        }
        .ab-values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .ab-value-card {
          background: var(--bg-card);
          padding: 36px 28px;
          border-right: 1px solid var(--border);
          transition: background .25s;
        }
        .ab-value-card:last-child { border-right: none; }
        .ab-value-card:hover { background: var(--bg); }
        .ab-value-icon {
          color: var(--gold);
          margin-bottom: 18px;
        }
        .ab-value-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 12px;
        }
        .ab-value-body {
          font-size: 13.5px;
          line-height: 1.75;
          color: var(--muted);
        }

        /* ── CRAFTS ── */
        .ab-crafts-section { background: var(--bg); }
        .ab-crafts-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .ab-craft {
          display: flex;
          gap: 24px;
          padding: 36px 32px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          transition: background .25s;
        }
        .ab-craft:nth-child(even) { border-right: none; }
        .ab-craft:nth-child(5), .ab-craft:nth-child(6) { border-bottom: none; }
        .ab-craft:hover { background: var(--bg); }
        .ab-craft-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 700;
          color: var(--gold);
          opacity: .4;
          line-height: 1;
          flex-shrink: 0;
          width: 40px;
        }
        .ab-craft-body h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin-bottom: 10px;
        }
        .ab-craft-body p {
          font-size: 13.5px;
          line-height: 1.75;
          color: var(--muted);
        }

        /* ── PROMISE ── */
        .ab-promise-section {
          background: var(--dark);
          padding: 100px 0;
        }
        .ab-promise-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 24px;
        }
        .ab-promise-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 4.5vw, 52px);
          font-weight: 600;
          color: #f5f1eb;
          line-height: 1.15;
        }
        .ab-promise-body {
          font-size: 15px;
          line-height: 1.85;
          color: #888;
          max-width: 600px;
        }
        .ab-promise-ctas {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }
        .ab-promise-section .cta-outline {
          background: transparent;
          border-color: #444;
          color: #ccc;
        }
        .ab-promise-section .cta-outline:hover {
          border-color: var(--gold);
          color: var(--gold);
          background: transparent;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .ab-hero { grid-template-columns: 1fr; padding: 72px 40px 56px; }
          .ab-hero-art { display: none; }
          .ab-two-col { grid-template-columns: 1fr; gap: 40px; }
          .ab-values-grid { grid-template-columns: 1fr 1fr; }
          .ab-value-card:nth-child(2) { border-right: none; }
          .ab-value-card:nth-child(1),
          .ab-value-card:nth-child(2) { border-bottom: 1px solid var(--border); }
          .ab-section-inner { padding: 0 40px; }
        }

        @media (max-width: 720px) {
          .ab-hero { padding: 56px 24px 48px; }
          .ab-section-inner { padding: 0 24px; }
          .ab-section { padding: 56px 0; }
          .ab-values-grid { grid-template-columns: 1fr; }
          .ab-value-card { border-right: none; border-bottom: 1px solid var(--border); }
          .ab-value-card:last-child { border-bottom: none; }
          .ab-crafts-list { grid-template-columns: 1fr; }
          .ab-craft { border-right: none; }
          .ab-craft:nth-child(5) { border-bottom: 1px solid var(--border); }
          .ab-col-stats { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

    </div>
  );
};

export default About;