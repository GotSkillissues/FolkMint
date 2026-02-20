import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productService } from '../services';
import './Home.css';

/* ── helpers ── */
function fmt(n) { return '৳' + Number(n).toLocaleString('en-BD'); }

function getImg(p) {
  if (p.image_url) return p.image_url;
  if (p.variants) {
    for (const v of p.variants) {
      const imgs = v.images || [];
      const pri = imgs.find(i => i.is_primary);
      if (pri) return pri.image_url;
      if (imgs[0]) return imgs[0].image_url;
    }
  }
  return null;
}

/* ── carousel hook ── */
function useCarousel(trackRef) {
  const [prevDis, setPrevDis] = useState(true);
  const [nextDis, setNextDis] = useState(false);

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    setPrevDis(t.scrollLeft <= 1);
    setNextDis(t.scrollLeft + t.clientWidth >= t.scrollWidth - 2);
  }, [trackRef]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    update();
    t.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      t.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [trackRef, update]);

  const scrollAmt = () => {
    const t = trackRef.current;
    if (!t || !t.firstElementChild) return 320;
    const gap = parseFloat(getComputedStyle(t).gap) || 0;
    return (t.firstElementChild.offsetWidth + gap) * 2;
  };

  const prev = () => trackRef.current?.scrollBy({ left: -scrollAmt(), behavior: 'smooth' });
  const next = () => trackRef.current?.scrollBy({ left:  scrollAmt(), behavior: 'smooth' });

  return { prev, next, prevDis, nextDis, update };
}

/* ── Arrow buttons ── */
const ArrBtn = ({ id, disabled, onClick, dir }) => (
  <button className="arr-btn" id={id} disabled={disabled} onClick={onClick}
    aria-label={dir === 'prev' ? 'Previous' : 'Next'}>
    {dir === 'prev'
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    }
  </button>
);

/* ── Skeleton card ── */
const Skel = () => (
  <div className="skel">
    <div className="skel-img"><div className="skel-line" /></div>
    <div className="skel-body">
      <div className="skel-line" />
      <div className="skel-line w60" />
      <div className="skel-line w40" />
    </div>
  </div>
);

/* ── Product card ── */
const ProdCard = ({ p, showRating }) => {
  const img = getImg(p);
  const price = fmt(p.price ?? p.base_price);
  const cat = p.category_name ?? p.category?.name ?? '';
  const rating = showRating && p.avg_rating && parseFloat(p.avg_rating) > 0;

  return (
    <Link to={`/products/${p.product_id}`} className="prod-card">
      <div className="card-img">
        {img
          ? <img src={img} alt={p.name} loading="lazy" />
          : <div className="card-placeholder">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="card-placeholder-text">No image yet</span>
            </div>
        }
        <div className="card-view-layer"><span className="card-view-pill">View Product</span></div>
      </div>
      <div className="card-body">
        <p className="card-cat">{cat}</p>
        <h3 className="card-name">{p.name}</h3>
        <div className="card-foot">
          <span className="card-price">{price}</span>
          {rating && (
            <div className="card-rating">
              <span className="stars">{'★'.repeat(Math.min(5, Math.round(parseFloat(p.avg_rating))))}</span>
              <span className="rating-num">{p.avg_rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

/* ── Empty state ── */
const EmptyMsg = ({ msg }) => (
  <div className="empty-msg">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <p>{msg}</p>
  </div>
);

/* ═══════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();
  const [popular,    setPopular]    = useState([]);
  const [topRated,   setTopRated]   = useState([]);
  const [popLoad,    setPopLoad]    = useState(true);
  const [ratedLoad,  setRatedLoad]  = useState(true);

  const popularRef  = useRef(null);
  const ratedRef    = useRef(null);
  const mensRef     = useRef(null);
  const womensRef   = useRef(null);
  const decorRef    = useRef(null);
  const jewRef      = useRef(null);

  const pop   = useCarousel(popularRef);
  const rated = useCarousel(ratedRef);
  const mens   = useCarousel(mensRef);
  const womens = useCarousel(womensRef);
  const decor  = useCarousel(decorRef);
  const jew    = useCarousel(jewRef);

  /* load products */
  useEffect(() => {
    // Popular
    productService.getPopularProducts(10, 30)
      .then(d => setPopular(d.products || []))
      .catch(() =>
        productService.getFeaturedProducts(10)
          .then(d => setPopular(d.products || []))
          .catch(() => setPopular([]))
      )
      .finally(() => { setPopLoad(false); setTimeout(() => pop.update(), 50); });

    // Top rated
    productService.getTopRatedProducts(10, 4.2, 1)
      .then(d => setTopRated(d.products || []))
      .catch(() =>
        productService.getFeaturedProducts(10)
          .then(d => setTopRated(d.products || []))
          .catch(() => setTopRated([]))
      )
      .finally(() => { setRatedLoad(false); setTimeout(() => rated.update(), 50); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toProducts = (q) => navigate(q);

  return (
    <div className="home-page">

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <p className="hero-eyebrow">Handcrafted in Bangladesh</p>
            <h1>Where Folk <em>Art</em><br />Meets Modern Living</h1>
            <p className="hero-sub">
              Discover authentic handwoven textiles, terracotta crafts, and traditional jewelry
              from skilled artisans across Bangladesh. Every piece is a story passed down through generations.
            </p>
            <div className="hero-ctas">
              <Link to="/products" className="cta-primary">
                Explore Collection
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link to="/about" className="cta-outline">Our Story</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round">
              <rect x="18" y="18" width="364" height="364" strokeWidth="1"/>
              <polygon points="200,20 380,200 200,380 20,200" strokeWidth="1.2"/>
              <polygon points="200,58 342,200 200,342 58,200" strokeWidth=".9"/>
              <polygon points="200,100 300,200 200,300 100,200" strokeWidth=".7"/>
              <polygon points="200,136 264,200 200,264 136,200" strokeWidth=".6"/>
              <line x1="200" y1="18" x2="200" y2="382" strokeWidth=".5" opacity=".6"/>
              <line x1="18" y1="200" x2="382" y2="200" strokeWidth=".5" opacity=".6"/>
              <line x1="18" y1="18" x2="382" y2="382" strokeWidth=".4" opacity=".4"/>
              <line x1="18" y1="382" x2="382" y2="18" strokeWidth=".4" opacity=".4"/>
              <circle cx="200" cy="20"  r="5" fill="currentColor"/>
              <circle cx="380" cy="200" r="5" fill="currentColor"/>
              <circle cx="200" cy="380" r="5" fill="currentColor"/>
              <circle cx="20"  cy="200" r="5" fill="currentColor"/>
              <g transform="translate(200,200)">
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(45)"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(90)"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(135)"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(180)"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(225)"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(270)"/>
                <ellipse rx="9" ry="38" cy="-32" fill="currentColor" opacity=".65" transform="rotate(315)"/>
                <circle r="20" fill="currentColor" opacity=".9"/>
                <circle r="10" fill="none" strokeWidth="2" stroke="#f5f1eb"/>
                <circle r="5" fill="#f5f1eb"/>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ── POPULAR PRODUCTS ── */}
      <section className="prod-section">
        <div className="sec-inner">
          <div className="sec-header">
            <div className="sec-header-text">
              <p className="sec-eyebrow">Trending Now</p>
              <h2 className="sec-title">Most Loved This Month</h2>
            </div>
            <div className="arr-group">
              <ArrBtn dir="prev" disabled={pop.prevDis} onClick={pop.prev} />
              <ArrBtn dir="next" disabled={pop.nextDis} onClick={pop.next} />
            </div>
          </div>
          <div className="prod-carousel-track" ref={popularRef}>
            {popLoad
              ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
              : popular.length
                ? popular.map(p => <ProdCard key={p.product_id} p={p} />)
                : <EmptyMsg msg="No popular products yet. Check back soon." />
            }
          </div>
        </div>
      </section>

      {/* ornament */}
      <div className="ornament">
        <div className="ornament-gem" />
      </div>

      {/* ── TOP RATED ── */}
      <section className="prod-section prod-section-alt">
        <div className="sec-inner">
          <div className="sec-header">
            <div className="sec-header-text">
              <p className="sec-eyebrow">Customer Favourites</p>
              <h2 className="sec-title">Top Rated</h2>
            </div>
            <div className="arr-group">
              <ArrBtn dir="prev" disabled={rated.prevDis} onClick={rated.prev} />
              <ArrBtn dir="next" disabled={rated.nextDis} onClick={rated.next} />
            </div>
          </div>
          <div className="prod-carousel-track" ref={ratedRef}>
            {ratedLoad
              ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
              : topRated.length
                ? topRated.map(p => <ProdCard key={p.product_id} p={p} showRating />)
                : <EmptyMsg msg="No highly-rated products yet. Be the first to review!" />
            }
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}

      {/* MENSWEAR */}
      <div className="cat-block">
        <div className="cat-block-inner">
          <div className="sec-header">
            <div className="sec-header-text"><h2 className="sec-title">Menswear</h2></div>
            <div className="arr-group">
              <ArrBtn dir="prev" disabled={mens.prevDis} onClick={mens.prev} />
              <ArrBtn dir="next" disabled={mens.nextDis} onClick={mens.next} />
            </div>
          </div>
          <div className="sc-carousel-track" ref={mensRef}>
            {[
              { slug:'panjabi', cls:'t-panjabi', label:'Panjabi' },
              { slug:'shirt',   cls:'t-shirt',   label:'Shirt' },
              { slug:'denim',   cls:'t-denim',   label:'Denim' },
              { slug:'lungi',   cls:'t-lungi',   label:'Lungi & Dhoti' },
              { slug:'kurta',   cls:'t-wallart', label:'Kurta' },
            ].map(({ slug, cls, label }) => (
              <Link key={slug} to={`/products?category=${slug}`} className="sc-tile">
                <div className={`sc-bg ${cls}`} /><div className="sc-pattern" />
                <span className="sc-label">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* WOMENSWEAR */}
      <div className="cat-block cat-block-alt">
        <div className="cat-block-inner">
          <div className="sec-header">
            <div className="sec-header-text"><h2 className="sec-title">Womenswear</h2></div>
            <div className="arr-group">
              <ArrBtn dir="prev" disabled={womens.prevDis} onClick={womens.prev} />
              <ArrBtn dir="next" disabled={womens.nextDis} onClick={womens.next} />
            </div>
          </div>
          <div className="sc-carousel-track" ref={womensRef}>
            {[
              { slug:'saree',  cls:'t-saree',  label:'Saree' },
              { slug:'kurti',  cls:'t-kurti',  label:'Kurti' },
              { slug:'salwar', cls:'t-salwar', label:'Salwar Kameez' },
              { slug:'dress',  cls:'t-dress',  label:'Dress' },
              { slug:'orna',   cls:'t-neck',   label:'Orna & Dupatta' },
            ].map(({ slug, cls, label }) => (
              <Link key={slug} to={`/products?category=${slug}`} className="sc-tile">
                <div className={`sc-bg ${cls}`} /><div className="sc-pattern" />
                <span className="sc-label">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* HOME DECOR */}
      <div className="cat-block">
        <div className="cat-block-inner">
          <div className="sec-header">
            <div className="sec-header-text"><h2 className="sec-title">Home Decor</h2></div>
            <div className="arr-group">
              <ArrBtn dir="prev" disabled={decor.prevDis} onClick={decor.prev} />
              <ArrBtn dir="next" disabled={decor.nextDis} onClick={decor.next} />
            </div>
          </div>
          <div className="sc-carousel-track" ref={decorRef}>
            {[
              { slug:'wall-art',  cls:'t-wallart', label:'Wall Art' },
              { slug:'cushion',   cls:'t-cushion', label:'Cushion Covers' },
              { slug:'rug',       cls:'t-rug',      label:'Rugs & Runners' },
              { slug:'pottery',   cls:'t-pottery',  label:'Pottery' },
              { slug:'bedsheet',  cls:'t-denim',    label:'Bedsheets' },
            ].map(({ slug, cls, label }) => (
              <Link key={slug} to={`/products?category=${slug}`} className="sc-tile">
                <div className={`sc-bg ${cls}`} /><div className="sc-pattern" />
                <span className="sc-label">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* JEWELRY */}
      <div className="cat-block cat-block-alt">
        <div className="cat-block-inner">
          <div className="sec-header">
            <div className="sec-header-text"><h2 className="sec-title">Jewelry</h2></div>
            <div className="arr-group">
              <ArrBtn dir="prev" disabled={jew.prevDis} onClick={jew.prev} />
              <ArrBtn dir="next" disabled={jew.nextDis} onClick={jew.next} />
            </div>
          </div>
          <div className="sc-carousel-track" ref={jewRef}>
            {[
              { slug:'necklace', cls:'t-neck',   label:'Necklaces' },
              { slug:'earring',  cls:'t-ear',    label:'Earrings' },
              { slug:'bangle',   cls:'t-bangle', label:'Bangles' },
              { slug:'brooch',   cls:'t-brooch', label:'Brooches' },
              { slug:'ring',     cls:'t-rug',    label:'Rings' },
            ].map(({ slug, cls, label }) => (
              <Link key={slug} to={`/products?category=${slug}`} className="sc-tile">
                <div className={`sc-bg ${cls}`} /><div className="sc-pattern" />
                <span className="sc-label">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
