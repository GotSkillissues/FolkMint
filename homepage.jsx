import React, { useEffect, useMemo, useState } from "react";

/**
 * HomePage (Vite + React)
 * - Minimal royal: off-white background, gold accent, soft shadows
 * - Category titles are NOT clickable; only subcategory image cards are clickable
 * - Popular + Top Rated product cards are clickable
 */
export default function HomePage() {
  // In a real app, you'd get these from auth state/context:
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Demo product data (replace with API calls)
  const [popularProducts, setPopularProducts] = useState([]);
  const [topRatedProducts, setTopRatedProducts] = useState([]);

  // Categories + subcategories (you can wire these to DB later)
  const categories = useMemo(
    () => [
      {
        name: "MENSWEAR",
        subcategories: [
          { name: "Shirt", slug: "mens-shirt", img: placeholderImg("Mens Shirt") },
          { name: "Panjabi", slug: "mens-panjabi", img: placeholderImg("Panjabi") },
          { name: "Denims", slug: "mens-denims", img: placeholderImg("Denims") },
          { name: "Jeans", slug: "mens-jeans", img: placeholderImg("Jeans") },
        ],
      },
      {
        name: "WOMENSWEAR",
        subcategories: [
          { name: "Saree", slug: "women-saree", img: placeholderImg("Saree") },
          { name: "Salwar Kameez", slug: "women-salwar", img: placeholderImg("Salwar") },
          { name: "Kurti", slug: "women-kurti", img: placeholderImg("Kurti") },
          { name: "Dupatta", slug: "women-dupatta", img: placeholderImg("Dupatta") },
          { name: "Jewelry", slug: "women-jewelry", img: placeholderImg("Jewelry") },
        ],
      },
      // Two “wise” categories for Folkmint vibe:
      {
        name: "HANDICRAFTS",
        subcategories: [
          { name: "Nakshi Kantha", slug: "craft-kantha", img: placeholderImg("Kantha") },
          { name: "Terracotta", slug: "craft-terracotta", img: placeholderImg("Terracotta") },
          { name: "Bamboo Craft", slug: "craft-bamboo", img: placeholderImg("Bamboo") },
          { name: "Wood Craft", slug: "craft-wood", img: placeholderImg("Wood Craft") },
        ],
      },
      {
        name: "HOME DÉCOR",
        subcategories: [
          { name: "Showpieces", slug: "decor-showpieces", img: placeholderImg("Showpiece") },
          { name: "Cushions", slug: "decor-cushions", img: placeholderImg("Cushion") },
          { name: "Wall Art", slug: "decor-wallart", img: placeholderImg("Wall Art") },
          { name: "Tableware", slug: "decor-tableware", img: placeholderImg("Tableware") },
        ],
      },
    ],
    []
  );

  // Replace these with real API calls later:
  useEffect(() => {
    // Popular: most ordered in last 30 days
    setPopularProducts([
      demoProduct("Jamdani Panjabi", 1890, 4.6, 128),
      demoProduct("Nakshi Kantha Cushion", 990, 4.8, 96),
      demoProduct("Terracotta Vase", 780, 4.4, 72),
      demoProduct("Handloom Saree", 2650, 4.7, 61),
    ]);

    // Top rated: rating >= 4.2 and min orders 10
    setTopRatedProducts([
      demoProduct("Jute Tote Bag", 520, 4.9, 18),
      demoProduct("Brass Showpiece", 1450, 4.6, 25),
      demoProduct("Printed Kurti", 1150, 4.3, 14),
      demoProduct("Wood Carving Decor", 2100, 4.7, 11),
    ]);
  }, []);

  function goTo(path) {
    // Replace with react-router navigate() later
    console.log("navigate:", path);
    alert(`Navigate to: ${path}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgDoodles} />
      <div style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.brand} onClick={() => goTo("/")}>
            <FolkmintLogo />
            <div style={{ lineHeight: 1.05 }}>
              <div style={styles.brandName}>Folkmint</div>
              <div style={styles.brandTag}>cultural finds • minimal • premium</div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.searchWrap}>
              <SearchIcon />
              <input
                style={styles.searchInput}
                placeholder="Search jamdani, panjabi, terracotta..."
              />
            </div>

            {!isLoggedIn ? (
              <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => goTo("/login")}>
                Login
              </button>
            ) : (
              <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => goTo("/account")}>
                <UserIcon /> Account
              </button>
            )}

            <button style={{ ...styles.btn, ...styles.btnGold }} onClick={() => goTo("/cart")}>
              <BagIcon /> <span style={{ fontWeight: 800 }}>Bag</span>
              <span style={styles.badge}>0</span>
            </button>

            {/* Demo toggle for you */}
            <button
              style={{ ...styles.btn, ...styles.btnTiny }}
              onClick={() => setIsLoggedIn((s) => !s)}
              title="Demo toggle"
            >
              {isLoggedIn ? "Logout-demo" : "Login-demo"}
            </button>
          </div>
        </header>

        {/* WELCOME / HEADSUP */}
        <section style={styles.welcome}>
          <div style={styles.welcomeLeft}>
            <div style={styles.kicker}>
              <span style={styles.kickerDot} />
              Welcome to Folkmint
            </div>
            <h1 style={styles.h1}>
              A minimal marketplace with a touch of <span style={{ color: "var(--gold)" }}>royal</span>.
            </h1>
            <p style={styles.sub}>
              Browse popular picks, top-rated items, and shop by categories inspired by Bangladeshi culture.
            </p>
            <div style={styles.actions}>
              <button style={{ ...styles.btn, ...styles.btnGold }} onClick={() => goTo("/shop")}>
                Shop Now
              </button>
              <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={() => goTo("/categories")}>
                Browse Categories
              </button>
            </div>
          </div>

          <div style={styles.welcomeCard}>
            <div style={styles.statRow}>
              <div style={styles.statTitle}>Fast Delivery</div>
              <div style={styles.pill}>Inside Dhaka</div>
            </div>
            <div style={styles.statRow}>
              <div style={styles.statTitle}>Trusted Picks</div>
              <div style={styles.pill}>Curated</div>
            </div>
            <div style={styles.statRow}>
              <div style={styles.statTitle}>Secure Checkout</div>
              <div style={styles.pill}>Safe</div>
            </div>
          </div>
        </section>

        {/* PRODUCT SECTIONS */}
        <Section
          title="Popular Products"
          subtitle="Most ordered in the last 30 days"
          rightHint="View all →"
          onRightHint={() => goTo("/products/popular")}
        >
          <ProductGrid products={popularProducts} onClick={(p) => goTo(`/product/${p.slug}`)} />
        </Section>

        <Section
          title="Top Rated"
          subtitle="Rating ≥ 4.2 and minimum 10 orders"
          rightHint="View all →"
          onRightHint={() => goTo("/products/top-rated")}
        >
          <ProductGrid products={topRatedProducts} onClick={(p) => goTo(`/product/${p.slug}`)} />
        </Section>

        {/* CATEGORY SECTIONS */}
        {categories.map((cat) => (
          <section key={cat.name} style={{ marginTop: 22 }}>
            {/* Category name = black block letters, NOT clickable */}
            <div style={styles.categoryTitleRow}>
              <div style={styles.categoryTitle}>{cat.name}</div>
              <div style={styles.categoryLine} />
            </div>

            <div style={styles.subcatGrid}>
              {cat.subcategories.map((s) => (
                <button
                  key={s.slug}
                  style={styles.subcatCard}
                  onClick={() => goTo(`/category/${s.slug}`)}
                  className="subcatCard"
                >
                  <div style={{ ...styles.subcatImg, backgroundImage: `url(${s.img})` }} />
                  <div style={styles.subcatLabel}>{s.name}</div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* FOOTER */}
        <footer style={styles.footer}>
          <div style={styles.footerGrid}>
            <div>
              <div style={styles.footerHead}>About</div>
              <a style={styles.footerLink} href="#about" onClick={(e) => e.preventDefault()}>
                About Us (content later)
              </a>
            </div>

            <div>
              <div style={styles.footerHead}>Contact</div>
              <div style={styles.footerText}>Email: support@folkmint.com</div>
              <div style={styles.footerText}>Phone: +880 1XXXXXXXXX</div>
            </div>

            <div>
              <div style={styles.footerHead}>Socials</div>
              <div style={styles.socialRow}>
                <a style={styles.socialBtn} href="#" onClick={(e) => e.preventDefault()}>
                  <FacebookIcon /> Facebook
                </a>
                <a style={styles.socialBtn} href="#" onClick={(e) => e.preventDefault()}>
                  <InstagramIcon /> Instagram
                </a>
              </div>
            </div>

            <div>
              <div style={styles.footerHead}>Legal</div>
              <a style={styles.footerLink} href="#" onClick={(e) => e.preventDefault()}>
                Terms & Conditions
              </a>
              <a style={styles.footerLink} href="#" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
              <a style={styles.footerLink} href="#" onClick={(e) => e.preventDefault()}>
                Shipping & Returns
              </a>
              <a style={styles.footerLink} href="#" onClick={(e) => e.preventDefault()}>
                Help Center
              </a>
            </div>
          </div>

          <div style={styles.footerBottom}>
            <div>© {new Date().getFullYear()} Folkmint. All rights reserved.</div>
            <div style={{ opacity: 0.75 }}>Minimal • Cultural • Premium</div>
          </div>
        </footer>
      </div>

      {/* Subtle hover CSS (inline <style> so you don’t need extra files) */}
      <style>{`
        .productCard:hover { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(17,17,17,0.10); }
        .subcatCard:hover { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(17,17,17,0.10); }
        .subcatCard:active, .productCard:active { transform: translateY(0px); }
      `}</style>
    </div>
  );
}

/* ---------------- Components ---------------- */

function Section({ title, subtitle, rightHint, onRightHint, children }) {
  return (
    <section style={{ marginTop: 22 }}>
      <div style={styles.sectionHead}>
        <div>
          <div style={styles.sectionTitle}>{title}</div>
          <div style={styles.sectionSub}>{subtitle}</div>
        </div>
        {rightHint ? (
          <button style={styles.linkBtn} onClick={onRightHint}>
            {rightHint}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ProductGrid({ products, onClick }) {
  return (
    <div style={styles.productGrid}>
      {products.map((p) => (
        <button
          key={p.slug}
          className="productCard"
          style={styles.productCard}
          onClick={() => onClick(p)}
        >
          <div style={{ ...styles.productThumb, backgroundImage: `url(${p.img})` }} />
          <div style={styles.productName}>{p.name}</div>
          <div style={styles.productMeta}>
            <div style={styles.price}>৳ {p.price}</div>
            <div style={styles.rating}>
              ⭐ {p.rating.toFixed(1)} <span style={{ opacity: 0.65 }}>({p.orders})</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Demo helpers ---------------- */

function demoProduct(name, price, rating, orders) {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return {
    name,
    slug,
    price,
    rating,
    orders,
    img: placeholderImg(name),
  };
}

// A simple inline “image” placeholder (so it looks aesthetic immediately)
function placeholderImg(label) {
  const safe = encodeURIComponent(label);
  // Soft off-white + gold gradient “card” image (data URL SVG)
  return `data:image/svg+xml;charset=utf-8,
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#e9d7a3" stop-opacity="0.75"/>
      </linearGradient>
      <radialGradient id="r" cx="30%" cy="35%" r="60%">
        <stop offset="0" stop-color="#b88a2a" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#b88a2a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="270" cy="220" r="220" fill="url(#r)"/>
    <circle cx="680" cy="410" r="240" fill="url(#r)"/>
    <path d="M120 140c60-60 140-60 200 0" fill="none" stroke="#b88a2a" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round"/>
    <path d="M620 150c-60 60-60 140 0 200" fill="none" stroke="#b88a2a" stroke-opacity="0.28" stroke-width="6" stroke-linecap="round"/>
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto"
      font-size="44" font-weight="800" fill="#1f1f1f" opacity="0.85">${safe}</text>
  </svg>`.replace(/\n/g, "");
}

/* ---------------- Icons & Logo (SVG) ---------------- */

function FolkmintLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b88a2a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e7c46a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="14" fill="rgba(255,255,255,0.85)" stroke="rgba(184,138,42,0.30)" />
      <path
        d="M14 28c3-7 7-12 14-12 2 0 4 .5 6 1.6-3.2 0-6 1.3-7.8 3.2C24 23 22 26 20.8 29.6c-2.2.2-4.6-.3-6.8-1.6z"
        fill="url(#gold)"
        opacity="0.95"
      />
      <path
        d="M16 16c2.5 2.5 5.5 3.8 9 4 3.5-.2 6.5-1.5 9-4"
        fill="none"
        stroke="rgba(184,138,42,0.55)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="30" cy="14.5" r="2" fill="rgba(184,138,42,0.65)" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8A7.5 7.5 0 0 1 10.5 18z"
        fill="none"
        stroke="rgba(31,31,31,0.75)"
        strokeWidth="2"
      />
      <path
        d="M16.3 16.3 21 21"
        fill="none"
        stroke="rgba(31,31,31,0.75)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 8V7a5 5 0 0 1 10 0v1"
        fill="none"
        stroke="rgba(27,20,6,0.9)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 8h12l1 13H5L6 8z"
        fill="none"
        stroke="rgba(27,20,6,0.9)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
        fill="none"
        stroke="rgba(31,31,31,0.75)"
        strokeWidth="2"
      />
      <path
        d="M4 20a8 8 0 0 1 16 0"
        fill="none"
        stroke="rgba(31,31,31,0.75)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v3H7v3h3v6h3v-6h3l1-3h-4v-3c0-.6.4-1 1-1z"
        fill="rgba(31,31,31,0.75)"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3z"
        fill="rgba(31,31,31,0.75)"
      />
      <path
        d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z"
        fill="rgba(31,31,31,0.75)"
      />
      <circle cx="17.5" cy="6.5" r="1" fill="rgba(31,31,31,0.75)" />
    </svg>
  );
}

/* ---------------- Styles ---------------- */

const styles = {
  page: {
    "--bg": "#fbf7ee",
    "--gold": "#b88a2a",
    "--ink": "#1f1f1f",
    "--muted": "rgba(31,31,31,0.70)",
    background: "var(--bg)",
    minHeight: "100vh",
    position: "relative",
    overflowX: "hidden",
  },
  bgDoodles: {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    backgroundImage: `
      radial-gradient(1200px 600px at 20% 10%, rgba(184,138,42,0.08), transparent 60%),
      radial-gradient(1000px 600px at 90% 25%, rgba(184,138,42,0.06), transparent 55%),
      radial-gradient(900px 600px at 60% 95%, rgba(184,138,42,0.05), transparent 55%),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'%3E%3Cg fill='none' stroke='%23b88a2a' stroke-opacity='0.26' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M56 70c20-18 44-16 62 6'/%3E%3Cpath d='M320 84c-18 14-17 40 2 54'/%3E%3Cpath d='M92 300c18-18 46-16 64 4'/%3E%3Cpath d='M286 308c22-18 47-12 58 14'/%3E%3Cpath d='M210 60c10 12 10 28 0 40c-10-12-10-28 0-40z'/%3E%3Cpath d='M210 320c12 8 18 22 14 36c-12-8-18-22-14-36z'/%3E%3Cpath d='M64 196c18-8 34 2 40 18c-18 8-34-2-40-18z'/%3E%3Cpath d='M356 214c-18 8-34-2-40-18c18-8 34 2 40 18z'/%3E%3C/g%3E%3C/svg%3E")
    `,
    backgroundRepeat: "no-repeat, no-repeat, no-repeat, repeat",
    backgroundSize: "auto, auto, auto, 420px 420px",
    opacity: 0.95,
  },
  container: { maxWidth: 1120, margin: "0 auto", padding: "18px 18px 40px" },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "14px 0",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(10px)",
    background: "rgba(251,247,238,0.78)",
    borderBottom: "1px solid rgba(184,138,42,0.14)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  brandName: { fontWeight: 900, letterSpacing: 0.2, fontSize: 18, color: "var(--ink)" },
  brandTag: { fontWeight: 700, fontSize: 12, color: "var(--muted)" },

  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },

  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(184,138,42,0.20)",
    minWidth: 320,
  },
  searchInput: { border: 0, outline: 0, width: "100%", background: "transparent", color: "var(--ink)", fontSize: 14 },

  btn: {
    border: 0,
    cursor: "pointer",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "transform .10s ease, box-shadow .20s ease",
  },
  btnGhost: { background: "rgba(255,255,255,0.65)", border: "1px solid rgba(184,138,42,0.18)", color: "var(--ink)" },
  btnGold: {
    background: "linear-gradient(135deg, rgba(184,138,42,0.95), rgba(228,188,96,0.95))",
    color: "#1b1406",
    boxShadow: "0 16px 34px rgba(184,138,42,0.22)",
  },
  btnTiny: { padding: "10px 12px", background: "transparent", border: "1px dashed rgba(184,138,42,0.22)", color: "rgba(31,31,31,0.65)" },
  badge: { marginLeft: 4, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(27,20,6,0.18)", borderRadius: 999, padding: "2px 8px", fontWeight: 900, fontSize: 12 },

  welcome: {
    marginTop: 16,
    borderRadius: 22,
    background: "linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.40))",
    border: "1px solid rgba(184,138,42,0.16)",
    boxShadow: "0 18px 40px rgba(17,17,17,0.08)",
    padding: 20,
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 16,
  },
  welcomeLeft: { padding: 6 },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(184,138,42,0.10)",
    border: "1px solid rgba(184,138,42,0.18)",
    color: "rgba(68,46,6,0.95)",
    fontWeight: 800,
    fontSize: 13,
    width: "fit-content",
  },
  kickerDot: { width: 8, height: 8, borderRadius: 99, background: "var(--gold)", boxShadow: "0 0 0 6px rgba(184,138,42,0.12)" },
  h1: { margin: "12px 0 8px", fontSize: 40, lineHeight: 1.05, letterSpacing: -0.6, color: "var(--ink)" },
  sub: { margin: 0, color: "var(--muted)", fontSize: 16, lineHeight: 1.5, maxWidth: 560 },
  actions: { marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" },

  welcomeCard: {
    borderRadius: 18,
    background: "rgba(255,255,255,0.74)",
    border: "1px solid rgba(184,138,42,0.16)",
    boxShadow: "0 14px 30px rgba(17,17,17,0.06)",
    padding: 14,
    display: "grid",
    gap: 10,
    alignContent: "start",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(184,138,42,0.07)",
    border: "1px dashed rgba(184,138,42,0.22)",
    fontWeight: 800,
  },
  statTitle: { color: "rgba(68,46,6,0.95)" },
  pill: { padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(184,138,42,0.18)", fontSize: 12, color: "rgba(31,31,31,0.75)" },

  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 900, letterSpacing: -0.2, color: "var(--ink)" },
  sectionSub: { fontSize: 13, fontWeight: 700, color: "var(--muted)", marginTop: 4 },
  linkBtn: { border: 0, background: "transparent", cursor: "pointer", color: "rgba(68,46,6,0.90)", fontWeight: 900 },

  productGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  productCard: {
    textAlign: "left",
    borderRadius: 18,
    background: "rgba(255,255,255,0.80)",
    border: "1px solid rgba(184,138,42,0.14)",
    boxShadow: "0 14px 30px rgba(17,17,17,0.06)",
    padding: 12,
    cursor: "pointer",
    transition: "transform .12s ease, box-shadow .22s ease",
  },
  productThumb: {
    height: 130,
    borderRadius: 16,
    backgroundSize: "cover",
    backgroundPosition: "center",
    border: "1px solid rgba(184,138,42,0.16)",
    marginBottom: 10,
  },
  productName: { fontWeight: 900, letterSpacing: -0.2, marginBottom: 6, color: "var(--ink)" },
  productMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, color: "var(--muted)", fontWeight: 800, fontSize: 13 },
  price: { color: "rgba(68,46,6,0.95)", fontWeight: 900 },
  rating: { whiteSpace: "nowrap" },

  categoryTitleRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  categoryTitle: {
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 1.6,
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
  },
  categoryLine: { height: 1, flex: 1, background: "rgba(184,138,42,0.18)" },

  subcatGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  subcatCard: {
    border: 0,
    padding: 0,
    background: "transparent",
    cursor: "pointer",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 14px 30px rgba(17,17,17,0.06)",
    border: "1px solid rgba(184,138,42,0.14)",
    transition: "transform .12s ease, box-shadow .22s ease",
  },
  subcatImg: { height: 150, backgroundSize: "cover", backgroundPosition: "center" },
  subcatLabel: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 12,
    background: "rgba(0,0,0,0.72)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 0.6,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
  },

  footer: { marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(184,138,42,0.14)" },
  footerGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  footerHead: { fontWeight: 900, marginBottom: 10, color: "rgba(68,46,6,0.95)" },
  footerLink: { display: "block", color: "rgba(31,31,31,0.75)", textDecoration: "none", fontWeight: 700, marginBottom: 8 },
  footerText: { color: "rgba(31,31,31,0.75)", fontWeight: 700, marginBottom: 8 },
  socialRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  socialBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.70)",
    border: "1px solid rgba(184,138,42,0.16)",
    color: "rgba(31,31,31,0.75)",
    fontWeight: 800,
    textDecoration: "none",
  },
  footerBottom: { marginTop: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "rgba(31,31,31,0.68)", fontWeight: 700 },
};

/* Responsive tweaks (simple) */
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(max-width: 980px)");
  // Not perfect, but okay for quick drop-in. Later you can use CSS properly.
  if (mq.matches) {
    styles.welcome.gridTemplateColumns = "1fr";
    styles.productGrid.gridTemplateColumns = "repeat(2, 1fr)";
    styles.subcatGrid.gridTemplateColumns = "repeat(2, 1fr)";
    styles.searchWrap.minWidth = 240;
    styles.h1.fontSize = 34;
    styles.footerGrid.gridTemplateColumns = "repeat(2, 1fr)";
  }
  const mq2 = window.matchMedia("(max-width: 560px)");
  if (mq2.matches) {
    styles.productGrid.gridTemplateColumns = "1fr";
    styles.subcatGrid.gridTemplateColumns = "1fr";
    styles.footerGrid.gridTemplateColumns = "1fr";
    styles.searchWrap.minWidth = "unset";
  }
}