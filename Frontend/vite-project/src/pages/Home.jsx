import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { categoryService, productService } from '../services';
import { useAuth } from '../context';
import { useCategoryTree } from '../hooks/useCategories';
import { getCategoryUrl } from '../utils';
import './Home.css';

function fmt(n) {
  return 'BDT ' + Number(n).toLocaleString('en-BD');
}

function getImg(p) {
  if (p.primary_image) return p.primary_image;
  if (p.image_url) return p.image_url;
  if (p.variants) {
    for (const v of p.variants) {
      const imgs = v.images || [];
      const pri = imgs.find((i) => i.is_primary);
      if (pri) return pri.image_url;
      if (imgs[0]) return imgs[0].image_url;
    }
  }
  return null;
}

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
    const gap = parseFloat(getComputedStyle(t).gap) || 0;
    return (t.firstElementChild?.offsetWidth || 0) + gap;
  };

  const prev = () => trackRef.current?.scrollBy({ left: -scrollAmt() * 2, behavior: 'smooth' });
  const next = () => trackRef.current?.scrollBy({ left: scrollAmt() * 2, behavior: 'smooth' });

  return { prev, next, prevDis, nextDis };
}

const ArrBtn = ({ disabled, onClick, dir }) => (
  <button className="arr-btn" disabled={disabled} onClick={onClick} aria-label={dir === 'prev' ? 'Previous' : 'Next'}>
    {dir === 'prev'
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>}
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
          : <div className="card-placeholder"><span className="card-placeholder-text">No image yet</span></div>}
        <div className="card-view-layer"><span className="card-view-pill">View Product</span></div>
      </div>
      <div className="card-body">
        <p className="card-cat">{cat}</p>
        <h3 className="card-name">{p.name}</h3>
        <div className="card-foot">
          <span className="card-price">{price}</span>
          {rating && (
            <div className="card-rating">
              <span className="rating-num">{p.avg_rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const EmptyMsg = ({ msg }) => (
  <div className="empty-msg"><p>{msg}</p></div>
);

const CatTileSkel = () => (
  <div className="cat-tile cat-tile-skeleton" aria-hidden="true" />
);

const getCategoryPreviewImage = (category) => {
  const firstProduct = Array.isArray(category?.products) ? category.products[0] : null;
  if (!firstProduct) return null;
  if (firstProduct.primary_image) return firstProduct.primary_image;
  if (firstProduct.image_url) return firstProduct.image_url;
  return null;
};

const CategoryTilesSection = ({ group, loading }) => {
  const root = group?.root || null;
  const children = Array.isArray(group?.children) ? group.children.slice(0, 4) : [];

  return (
    <section className="cat-section">
      <div className="cat-section-header">
        <h2 className="sec-title">{root?.name || 'Category'}</h2>
        <div className="cat-section-actions">
          <Link to={getCategoryUrl(root)} className="cat-explore-link">Explore All</Link>
        </div>
      </div>

      <div className="cat-tiles-track">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <CatTileSkel key={`cat-sk-${index}`} />)
          : children.map((child) => {
              const previewImage = getCategoryPreviewImage(child);
              const targetUrl = getCategoryUrl(child);

              return (
                <Link
                  key={child.category_id}
                  to={targetUrl}
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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const startLoadTimer = setTimeout(() => {
      setForYouLoad(true);
    }, 0);

    productService.getRecommendedProducts(12)
      .then((d) => setForYou(d.products || []))
      .catch(() => setForYou([]))
      .finally(() => setForYouLoad(false));

    return () => {
      clearTimeout(startLoadTimer);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    productService.getPopularProducts(10, 30)
      .then((d) => setPopular(d.products || []))
      .catch(() =>
        productService.getFeaturedProducts(10)
          .then((d) => setPopular(d.products || []))
          .catch(() => setPopular([]))
      )
      .finally(() => setPopLoad(false));

    productService.getTopRatedProducts(10, 4.2, 1)
      .then((d) => setTopRated(d.products || []))
      .catch(() =>
        productService.getFeaturedProducts(10)
          .then((d) => setTopRated(d.products || []))
          .catch(() => setTopRated([]))
      )
      .finally(() => setRatedLoad(false));
  }, []);

  useEffect(() => {
    let active = true;

    const showLoadingTimer = setTimeout(() => {
      if (active) setRootCategoryRowsLoading(true);
    }, 0);

    Promise.resolve()
      .then(async () => {
        const rows = await Promise.all(
          rootCategories.map(async (root) => {
            try {
              const response = await categoryService.getChildrenWithProducts(root.category_id, 8);
              return {
                root: response?.category || root,
                children: Array.isArray(response?.children) ? response.children : [],
              };
            } catch {
              return { root, children: [] };
            }
          })
        );

        if (active) setRootCategoryRows(rows);
      })
      .finally(() => {
        if (active) setRootCategoryRowsLoading(false);
        clearTimeout(showLoadingTimer);
      });

    return () => {
      active = false;
      clearTimeout(showLoadingTimer);
    };
  }, [rootCategories]);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <p className="hero-eyebrow">Handcrafted in Bangladesh</p>
            <h1>Where Folk <em>Art</em><br />Meets Modern Living</h1>
            <p className="hero-sub">
              Discover authentic handwoven textiles, terracotta crafts, and traditional jewelry
              from skilled artisans across Bangladesh.
            </p>
            <div className="hero-ctas">
              <Link to="/products" className="cta-primary">Explore Collection</Link>
              <Link to="/about" className="cta-outline">Our Story</Link>
            </div>
          </div>
        </div>
      </section>

      {isAuthenticated && (
        <section className="prod-section for-you-section">
          <div className="sec-inner">
            <div className="sec-header">
              <div className="sec-header-text">
                <p className="sec-eyebrow for-you-eyebrow">Personalized Recommendations</p>
                <h2 className="sec-title">Recommended for You</h2>
              </div>
              <div className="arr-group">
                <ArrBtn dir="prev" disabled={fy.prevDis} onClick={fy.prev} />
                <ArrBtn dir="next" disabled={fy.nextDis} onClick={fy.next} />
              </div>
            </div>
            <div className="prod-carousel-track" ref={forYouRef}>
              {forYouLoad
                ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />)
                : forYou.length
                  ? forYou.map((p) => <ProdCard key={p.product_id} p={p} showRating />)
                  : <EmptyMsg msg="No recommendations available yet. Keep browsing to personalize your feed." />}
            </div>
          </div>
        </section>
      )}

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
                ? popular.map((p) => <ProdCard key={p.product_id} p={p} />)
                : <EmptyMsg msg="No popular products yet. Check back soon." />}
          </div>
        </div>
      </section>

      <div className="ornament"><div className="ornament-gem" /></div>

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
                ? topRated.map((p) => <ProdCard key={p.product_id} p={p} showRating />)
                : <EmptyMsg msg="No highly-rated products yet. Be the first to review!" />}
          </div>
        </div>
      </section>

      <section className="home-root-sections">
        <div className="sec-inner">
          {rootCategoryRows.map((group) => (
            <CategoryTilesSection
              key={group?.root?.category_id || group?.root?.name}
              group={group}
              loading={rootCategoryRowsLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
