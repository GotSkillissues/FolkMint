import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { categoryService, productService } from '../services';
import { useAuth } from '../context';
import { useCategoryTree } from '../hooks/useCategories';
import { getCategoryUrl, getCardImageUrl } from '../utils';
import './Home.css';

/* ── Helpers ── */
const fmt = (n) => 'BDT ' + Number(n || 0).toLocaleString('en-BD');

const unwrap = (res) => res?.data ?? res ?? {};

const normalizeProducts = (res) => {
  const payload = unwrap(res);
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getChildren = (node) => {
  if (!node) return [];
  if (Array.isArray(node.children)) return node.children;
  if (Array.isArray(node.subcategories)) return node.subcategories;
  return [];
};

/* ── Carousel hook ── */
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
    if (!t) return 0;
    const gap = parseFloat(getComputedStyle(t).gap) || 0;
    return (t.firstElementChild?.offsetWidth || 0) + gap;
  };

  const prev = () => trackRef.current?.scrollBy({ left: -scrollAmt() * 2, behavior: 'smooth' });
  const next = () => trackRef.current?.scrollBy({ left: scrollAmt() * 2, behavior: 'smooth' });

  return { prev, next, prevDis, nextDis };
}

/* ── Sub-components ── */
const ArrBtn = ({ disabled, onClick, dir }) => (
  <button
    className="arr-btn"
    disabled={disabled}
    onClick={onClick}
    aria-label={dir === 'prev' ? 'Previous' : 'Next'}
  >
    {dir === 'prev'
      ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
  </button>
);

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

const CatTileSkel = () => (
  <div className="cat-tile cat-tile-skeleton" aria-hidden="true" />
);

const EmptyMsg = ({ msg }) => (
  <div className="empty-msg"><p>{msg}</p></div>
);

/* Product card — detail-page only.
   Cart/wishlist need variant_id, so quick actions stay off the homepage. */
const ProdCard = ({ p, showRating }) => {
  const img = getCardImageUrl(p, { width: 560, height: 720, crop: 'limit' });
  const price = fmt(p?.price);
  const cat = p?.category_name ?? '';
  const rating = showRating && p?.avg_rating && parseFloat(p.avg_rating) > 0;

  return (
    <Link to={`/products/${p.product_id}`} className="prod-card">
      <div className="card-img">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" />
        ) : (
          <div className="card-placeholder">
            <span className="card-placeholder-text">No image yet</span>
          </div>
        )}
        <div className="card-view-layer">
          <span className="card-view-pill">View Product</span>
        </div>
      </div>

      <div className="card-body">
        {cat && <p className="card-cat">{cat}</p>}
        <h3 className="card-name">{p.name}</h3>
        <div className="card-foot">
          <span className="card-price">{price}</span>
          {rating && (
            <div className="card-rating">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f0a500">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
              </svg>
              <span className="rating-num">{p.avg_rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

/* Category image tiles */
const getCategoryPreviewImage = (category) => {
  const first = Array.isArray(category?.products) ? category.products[0] : null;
  return first ? getCardImageUrl(first, { width: 700, height: 900, crop: 'limit' }) : null;
};

const CategoryTilesSection = ({ group, loading }) => {
  const root = group?.root || null;
  const children = Array.isArray(group?.children) ? group.children.slice(0, 4) : [];

  if (!loading && children.length === 0) return null;

  return (
    <section className="cat-section">
      <div className="cat-section-header">
        <h2 className="sec-title">{root?.name || 'Category'}</h2>
        <div className="cat-section-actions">
          {root && <Link to={getCategoryUrl(root)} className="cat-explore-link">Explore All →</Link>}
        </div>
      </div>

      <div className="cat-tiles-track">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CatTileSkel key={i} />)
          : children.map((child) => {
              const previewImage = getCategoryPreviewImage(child);
              return (
                <Link
                  key={child.category_id}
                  to={getCategoryUrl(child)}
                  className="cat-tile"
                  style={previewImage ? { backgroundImage: `url(${previewImage})` } : undefined}
                >
                  <div className="cat-tile-overlay" />
                  <span className="cat-tile-label">{child.name}</span>
                </Link>
              );
            })}
      </div>
    </section>
  );
};

/* Hero right-side illustration */
const HeroArt = () => (
  <div className="hero-art" aria-hidden="true">
    <svg viewBox="0 0 400 420" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(200,200) scale(9) translate(-20,-20)">
        <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="none" stroke="#C4922A" strokeWidth="1.4" />
        <path d="M20 9 L31 20 L20 31 L9 20 Z" fill="#C4922A" opacity=".18" />
        <line x1="20" y1="2" x2="20" y2="38" stroke="#C4922A" strokeWidth=".6" opacity=".3" />
        <line x1="2" y1="20" x2="38" y2="20" stroke="#C4922A" strokeWidth=".6" opacity=".3" />
        <line x1="7" y1="7" x2="33" y2="33" stroke="#C4922A" strokeWidth=".5" opacity=".22" />
        <line x1="7" y1="33" x2="33" y2="7" stroke="#C4922A" strokeWidth=".5" opacity=".22" />
        <circle cx="20" cy="20" r="5.5" fill="#C4922A" />
        <circle cx="20" cy="20" r="2.4" fill="#111" />
        <circle cx="20" cy="8" r="1.8" fill="#C4922A" />
        <circle cx="32" cy="20" r="1.8" fill="#C4922A" />
        <circle cx="20" cy="32" r="1.8" fill="#C4922A" />
        <circle cx="8" cy="20" r="1.8" fill="#C4922A" />
        <circle cx="11" cy="11" r="1.3" fill="#C4922A" opacity=".55" />
        <circle cx="29" cy="11" r="1.3" fill="#C4922A" opacity=".55" />
        <circle cx="29" cy="29" r="1.3" fill="#C4922A" opacity=".55" />
        <circle cx="11" cy="29" r="1.3" fill="#C4922A" opacity=".55" />
      </g>

      <text
        x="200"
        y="400"
        textAnchor="middle"
        fontFamily="'Playfair Display', serif"
        fontSize="22"
        fontWeight="400"
        letterSpacing="8"
        fill="#936606"
        opacity="0.6"
      >
        FOLKMINT
      </text>

      <line x1="110" y1="405" x2="280" y2="405" stroke="#C4922A" strokeWidth="1" opacity="0.5" />
    </svg>
  </div>
);

/* ═══════════════════════════════════════════════════
   Home — main component
═══════════════════════════════════════════════════ */
const Home = () => {
  const { isAuthenticated } = useAuth();
  const { tree: categoryTree } = useCategoryTree();

  const [forYou, setForYou] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);

  const [forYouLoad, setForYouLoad] = useState(false);
  const [popLoad, setPopLoad] = useState(true);
  const [ratedLoad, setRatedLoad] = useState(true);

  const [rootCategoryRows, setRootCategoryRows] = useState([]);
  const [rootCategoryRowsLoading, setRootCategoryRowsLoading] = useState(true);

  const forYouRef = useRef(null);
  const popularRef = useRef(null);
  const ratedRef = useRef(null);

  const fy = useCarousel(forYouRef);
  const pop = useCarousel(popularRef);
  const rated = useCarousel(ratedRef);

  const rootCategories = useMemo(() => {
    return (Array.isArray(categoryTree) ? categoryTree : [])
      .filter((node) => !node?.parent_category)
      .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0));
  }, [categoryTree]);

  /* For You — authenticated only */
  useEffect(() => {
    if (!isAuthenticated) {
      setForYou([]);
      setForYouLoad(false);
      return;
    }

    let active = true;
    setForYouLoad(true);

    Promise.resolve(productService.getRecommendedProducts?.(12))
      .then((res) => {
        if (!active) return;
        setForYou(normalizeProducts(res));
      })
      .catch(() => {
        if (active) setForYou([]);
      })
      .finally(() => {
        if (active) setForYouLoad(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  /* Popular — public */
  useEffect(() => {
    let active = true;
    setPopLoad(true);

    const loadPopular = async () => {
      try {
        if (typeof productService.getPopularProducts === 'function') {
          const res = await productService.getPopularProducts(10);
          if (!active) return;
          const items = normalizeProducts(res);
          if (items.length) {
            setPopular(items);
            return;
          }
        }

        const fallback = await productService.getAllProducts({ page: 1, limit: 10 });
        if (!active) return;
        setPopular(normalizeProducts(fallback));
      } catch {
        if (active) setPopular([]);
      } finally {
        if (active) setPopLoad(false);
      }
    };

    loadPopular();

    return () => {
      active = false;
    };
  }, []);

  /* Top Rated — public */
  useEffect(() => {
    let active = true;
    setRatedLoad(true);

    const loadTopRated = async () => {
      try {
        if (typeof productService.getTopRatedProducts === 'function') {
          const res = await productService.getTopRatedProducts(10, 4.2, 1);
          if (!active) return;
          const items = normalizeProducts(res);
          if (items.length) {
            setTopRated(items);
            return;
          }
        }

        const fallback = await productService.getAllProducts({ page: 1, limit: 10 });
        if (!active) return;
        setTopRated(normalizeProducts(fallback));
      } catch {
        if (active) setTopRated([]);
      } finally {
        if (active) setRatedLoad(false);
      }
    };

    loadTopRated();

    return () => {
      active = false;
    };
  }, []);

  /* Category tile rows — one row per root category */
  useEffect(() => {
    if (rootCategories.length === 0) {
      setRootCategoryRowsLoading(true);
      return;
    }

    let active = true;
    setRootCategoryRowsLoading(true);
    setRootCategoryRows([]);

    Promise.all(
      rootCategories.map(async (root) => {
        let children = getChildren(root).slice(0, 4);

        if (typeof categoryService.getChildrenWithProducts === 'function') {
          try {
            const res = await categoryService.getChildrenWithProducts(root.category_id, 8);
            const payload = unwrap(res);
            const apiChildren = Array.isArray(payload?.children) ? payload.children : [];
            if (apiChildren.length) children = apiChildren.slice(0, 4);
          } catch {
            // fallback to tree children
          }
        }

        return { root, children };
      })
    )
      .then((rows) => {
        if (active) setRootCategoryRows(rows);
      })
      .finally(() => {
        if (active) setRootCategoryRowsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rootCategories]);

  return (
    <div className="home-page">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <p className="hero-eyebrow">Handcrafted in Bangladesh</p>
            <h1>Where Folk <em>Art</em><br />Meets Modern Living</h1>
            <p className="hero-sub">
              Discover authentic handwoven textiles, terracotta crafts, and traditional
              jewellery from skilled artisans across Bangladesh.
            </p>
            <div className="hero-ctas">
              <Link to="/products" className="cta-primary">Explore Collection</Link>
              <Link to="/about" className="cta-outline">Our Story</Link>
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      {/* ── FOR YOU ── */}
      {isAuthenticated && (
        <section className="prod-section for-you-section">
          <div className="sec-inner">
            <div className="sec-header">
              <div className="sec-header-text">
                <p className="sec-eyebrow for-you-eyebrow">Personalised for You</p>
                <h2 className="sec-title">Recommended</h2>
              </div>
              <div className="sec-header-right">
                <Link to="/products" className="sec-view-all">View All</Link>
                <div className="arr-group">
                  <ArrBtn dir="prev" disabled={fy.prevDis} onClick={fy.prev} />
                  <ArrBtn dir="next" disabled={fy.nextDis} onClick={fy.next} />
                </div>
              </div>
            </div>

            <div className="prod-carousel-track" ref={forYouRef}>
              {forYouLoad
                ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
                : forYou.length
                  ? forYou.map((p) => <ProdCard key={p.product_id} p={p} showRating />)
                  : <EmptyMsg msg="No recommendations yet — keep browsing to personalise your feed." />}
            </div>
          </div>
        </section>
      )}

      {/* ── POPULAR ── */}
      <section className="prod-section">
        <div className="sec-inner">
          <div className="sec-header">
            <div className="sec-header-text">
              <p className="sec-eyebrow">Trending Now</p>
              <h2 className="sec-title">Most Loved This Month</h2>
            </div>
            <div className="sec-header-right">
              <Link to="/products" className="sec-view-all">View All</Link>
              <div className="arr-group">
                <ArrBtn dir="prev" disabled={pop.prevDis} onClick={pop.prev} />
                <ArrBtn dir="next" disabled={pop.nextDis} onClick={pop.next} />
              </div>
            </div>
          </div>

          <div className="prod-carousel-track" ref={popularRef}>
            {popLoad
              ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
              : popular.length
                ? popular.map((p) => <ProdCard key={p.product_id} p={p} />)
                : <EmptyMsg msg="No popular products yet. Check back soon." />}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="ornament"><div className="ornament-gem" /></div>

      {/* ── TOP RATED ── */}
      <section className="prod-section prod-section-alt">
        <div className="sec-inner">
          <div className="sec-header">
            <div className="sec-header-text">
              <p className="sec-eyebrow">Customer Favourites</p>
              <h2 className="sec-title">Top Rated</h2>
            </div>
            <div className="sec-header-right">
              <Link to="/products" className="sec-view-all">View All</Link>
              <div className="arr-group">
                <ArrBtn dir="prev" disabled={rated.prevDis} onClick={rated.prev} />
                <ArrBtn dir="next" disabled={rated.nextDis} onClick={rated.next} />
              </div>
            </div>
          </div>

          <div className="prod-carousel-track" ref={ratedRef}>
            {ratedLoad
              ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
              : topRated.length
                ? topRated.map((p) => <ProdCard key={p.product_id} p={p} showRating />)
                : <EmptyMsg msg="No highly-rated products yet. Be the first to review!" />}
          </div>
        </div>
      </section>

      {/* ── CATEGORY TILE ROWS ── */}
      <section className="home-root-sections">
        <div className="sec-inner">
          {rootCategoryRowsLoading && rootCategoryRows.length === 0
            ? [0, 1].map((i) => (
                <div key={i} className="cat-section">
                  <div className="cat-section-header">
                    <div className="skel-line" style={{ width: 140, height: 28, borderRadius: 4 }} />
                  </div>
                  <div className="cat-tiles-track">
                    {Array.from({ length: 4 }).map((_, j) => <CatTileSkel key={j} />)}
                  </div>
                </div>
              ))
            : rootCategoryRows.map((group) => (
                <CategoryTilesSection
                  key={group?.root?.category_id || group?.root?.name}
                  group={group}
                  loading={false}
                />
              ))}
        </div>
      </section>
    </div>
  );
};

export default Home;