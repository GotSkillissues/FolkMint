import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { categoryService, productService } from '../services';
import { useCategoryTree } from '../hooks/useCategories';
import { getCardImageUrl, getCategoryUrl } from '../utils';

const PAGE_SIZE = 16;

const getChildren = (node) => {
  if (!node) return [];
  if (Array.isArray(node.children)) return node.children;
  if (Array.isArray(node.subcategories)) return node.subcategories;
  return [];
};

const findCategoryPath = (nodes, predicate, trail = []) => {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    const currentTrail = [...trail, node];
    if (predicate(node)) return currentTrail;
    const found = findCategoryPath(getChildren(node), predicate, currentTrail);
    if (found) return found;
  }
  return null;
};

const normalizeText = (value) => String(value || '').trim();
const normalizeLoose = (value) =>
  normalizeText(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

const Spin = () => (
  <span
    style={{
      display: 'inline-block',
      width: 32,
      height: 32,
      borderRadius: '50%',
      border: '2px solid rgba(212,175,55,.2)',
      borderTopColor: 'var(--gold)',
      animation: 'pr-spin .65s linear infinite',
    }}
  />
);

const ImgFallback = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const normalizeListResponse = (res) => {
  const payload = res?.data ?? res ?? {};
  const items = Array.isArray(payload?.products)
    ? payload.products
    : Array.isArray(payload)
      ? payload
      : [];

  const pg = payload?.pagination || {};

  return {
    items,
    pagination: {
      page: Number(pg.page) || 1,
      totalPages: Number(pg.pages) || 1,
      total: Number(pg.total) || items.length,
    },
  };
};

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tree: categoryTree } = useCategoryTree();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const categoryId = searchParams.get('category_id') || '';
  const parentId = searchParams.get('parent_id') || '';
  const legacyCatId = /^\d+$/.test(category) ? category : '';
  const selectedCatId = categoryId || parentId || legacyCatId;
  const activeCategoryPath = (() => {
    if (selectedCatId) {
      return findCategoryPath(
        categoryTree,
        (n) => String(n?.category_id) === String(selectedCatId)
      ) || [];
    }

    if (category && !/^\d+$/.test(category)) {
      return findCategoryPath(
        categoryTree,
        (n) =>
          String(n?.category_slug || '').toLowerCase() === String(category).toLowerCase()
      ) || [];
    }

    return [];
  })();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    setProducts([]);
    setPagination({ page: 1, totalPages: 1, total: 0 });
    setPage(1);
  }, [query, category, selectedCatId]);

  useEffect(() => {
    let mounted = true;
    const isFirstPage = page === 1;

    const fetchProducts = async () => {
      if (isFirstPage) {
        setLoading(true);
        setError('');
      } else {
        setLoadingMore(true);
      }

      try {
        if (selectedCatId && Array.isArray(categoryTree) && categoryTree.length > 0) {
          const exists = !!findCategoryPath(
            categoryTree,
            (n) => String(n?.category_id) === String(selectedCatId)
          );

          if (!exists) {
            if (!mounted) return;
            if (isFirstPage) {
              setProducts([]);
              setPagination({ page: 1, totalPages: 0, total: 0 });
            }
            return;
          }
        }

        let resolvedCategoryParam = selectedCatId || undefined;

        if (!resolvedCategoryParam && category) {
          if (/^\d+$/.test(category)) {
            resolvedCategoryParam = category;
          } else {
            const categorySlugExistsInTree =
              Array.isArray(categoryTree) &&
              categoryTree.length > 0 &&
              !!findCategoryPath(
                categoryTree,
                (n) =>
                  String(n?.category_slug || '').toLowerCase() ===
                  String(category).toLowerCase()
              );

            if (categorySlugExistsInTree) {
              resolvedCategoryParam = category;
            } else {
              const res = await categoryService.getAllCategories();
              const payload = res?.data ?? res ?? {};
              const list = Array.isArray(payload?.categories)
                ? payload.categories
                : Array.isArray(payload)
                  ? payload
                  : [];

              const matched = list.find(
                (c) =>
                  normalizeLoose(c?.name) === normalizeLoose(category) ||
                  normalizeLoose(c?.category_slug) === normalizeLoose(category)
              );

              if (matched?.category_slug) {
                resolvedCategoryParam = matched.category_slug;
              } else if (matched?.category_id) {
                resolvedCategoryParam = String(matched.category_id);
              }
            }
          }

          if (!resolvedCategoryParam) {
            if (!mounted) return;
            if (isFirstPage) {
              setProducts([]);
              setPagination({ page: 1, totalPages: 0, total: 0 });
            }
            return;
          }
        }

        const res = await productService.getAllProducts({
          search: query || undefined,
          category: resolvedCategoryParam,
          page,
          limit: PAGE_SIZE,
        });

        const { items, pagination: pg } = normalizeListResponse(res);

        if (!mounted) return;

        setProducts((prev) => {
          if (isFirstPage) return items;
          const seen = new Set(prev.map((p) => p?.product_id || p?.id));
          const next = items.filter((p) => !seen.has(p?.product_id || p?.id));
          return [...prev, ...next];
        });
        setPagination({
          page: pg.page || page,
          totalPages: pg.totalPages,
          total: pg.total,
        });
      } catch (err) {
        if (!mounted) return;
        setError(err?.error || err?.message || 'Failed to load products.');
        if (isFirstPage) {
          setProducts([]);
          setPagination({ page: 1, totalPages: 1, total: 0 });
        }
      } finally {
        if (!mounted) return;
        if (isFirstPage) setLoading(false);
        else setLoadingMore(false);
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, [query, category, selectedCatId, page, categoryTree]);

  const loadNextPage = useCallback(() => {
    if (loading || loadingMore) return;
    if (pagination.page >= pagination.totalPages) return;
    setPage((prev) => prev + 1);
  }, [loading, loadingMore, pagination.page, pagination.totalPages]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadNextPage]);

  const handleSearch = (e) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
    } else {
      params.delete('q');
    }
    params.delete('page');

    navigate(`/products?${params.toString()}`);
  };

  const clearQueryHref = (() => {
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    params.delete('page');
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  })();

  const activeCategory = activeCategoryPath[activeCategoryPath.length - 1];

  return (
    <div className="pr-page">
      <div className="pr-head">
        <div>
          <nav className="pr-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {activeCategoryPath.map((node, i) => {
              const isLast = i === activeCategoryPath.length - 1;
              return (
                <span key={node.category_id} className="pr-crumb-seg">
                  <span className="pr-crumb-sep">/</span>
                  {isLast ? <span>{node.name}</span> : <Link to={getCategoryUrl(node)}>{node.name}</Link>}
                </span>
              );
            })}
          </nav>

          <p className="pr-eyebrow">Collection</p>
          <h1 className="pr-title">{activeCategory?.name || 'All Products'}</h1>
          {!activeCategory && (
            <p className="pr-subtitle">
              Discover handcrafted collections curated for every style.
            </p>
          )}
        </div>

        <form className="pr-search-form" onSubmit={handleSearch}>
          <input
            className="pr-search-input"
            type="text"
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search products"
          />
          <button className="pr-search-btn" type="submit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>
      </div>

      <div className="pr-meta-bar">
        <span className="pr-result-count">
          {loading
            ? 'Loading…'
            : `${pagination.total.toLocaleString('en-BD')} product${pagination.total !== 1 ? 's' : ''}`}
        </span>

        {query && (
          <span className="pr-active-query">
            Results for "<strong>{query}</strong>"
            <Link to={clearQueryHref} className="pr-clear-query">
              ✕ Clear
            </Link>
          </span>
        )}
      </div>

      {error && <div className="pr-error">{error}</div>}

      {loading ? (
        <div className="pr-loading">
          <Spin />
          <p>Loading products…</p>
        </div>
      ) : !products.length ? (
        <div className="pr-empty">
          <ImgFallback />
          <p className="pr-empty-title">No products found</p>
          <p className="pr-empty-sub">
            {query ? `No results for "${query}".` : 'This collection has no products yet.'}
          </p>
          {query && (
            <Link to="/products" className="pr-btn-primary">
              Browse all products
            </Link>
          )}
        </div>
      ) : (
        <div className="pr-grid">
          {products.map((product) => {
            const pid = product?.product_id || product?.id;
            const price = Number(product?.price ?? 0);
            const imageUrl = getCardImageUrl(product, { width: 560, height: 720, crop: 'limit' });
            const inStock = Number(product?.total_stock ?? 0) > 0;

            return (
              <Link key={pid} to={`/products/${pid}`} className="pr-card">
                <div className="pr-card-img-wrap">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product?.name}
                      loading="lazy"
                      className="pr-card-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}

                  <div className="pr-card-img-ph" style={{ display: imageUrl ? 'none' : 'flex' }}>
                    <ImgFallback />
                  </div>

                  {!inStock && <span className="pr-oos-badge">Out of stock</span>}
                </div>

                <div className="pr-card-body">
                  <p className="pr-card-name">{product?.name}</p>
                  <p className="pr-card-price">৳{price.toLocaleString('en-BD')}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div ref={loadMoreRef} className="pr-load-more" aria-hidden="true" />
          {loadingMore && <p className="pr-pag-info">Loading more products…</p>}
        </>
      )}

      <style>{`
        @keyframes pr-spin { to { transform: rotate(360deg); } }

        .pr-page {
          width: 100%;
          padding: 20px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: var(--bg-alt);
          min-height: 100vh;
        }

        .pr-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .pr-breadcrumb {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 10px;
        }

        .pr-breadcrumb a {
          color: var(--muted);
          text-decoration: none;
          transition: color .15s;
        }

        .pr-breadcrumb a:hover { color: var(--dark); }

        .pr-crumb-sep {
          margin: 0 2px;
          opacity: .4;
        }

        .pr-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }

        .pr-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
          margin: 0;
        }

        .pr-subtitle {
          font-size: 14px;
          color: var(--muted);
          margin: 6px 0 0;
        }

        .pr-search-form {
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--bg-card);
          overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
        }

        .pr-search-form:focus-within {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(212,175,55,.1);
        }

        .pr-search-input {
          padding: 10px 16px;
          border: none;
          background: transparent;
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          outline: none;
          min-width: 240px;
        }

        .pr-search-btn {
          padding: 10px 14px;
          background: none;
          border: none;
          border-left: 1px solid var(--border);
          color: var(--muted);
          cursor: pointer;
          transition: color .2s, background .2s;
          display: flex;
          align-items: center;
        }

        .pr-search-btn:hover {
          color: var(--gold);
          background: var(--bg-alt);
        }

        .pr-meta-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pr-result-count {
          font-size: 13px;
          color: var(--muted);
          font-weight: 600;
        }

        .pr-active-query {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text);
          padding: 5px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 999px;
        }

        .pr-clear-query {
          color: var(--muted);
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: color .15s;
        }

        .pr-clear-query:hover { color: #9f1239; }

        .pr-error {
          padding: 12px 16px;
          background: #fff2f3;
          border: 1px solid #f5c2c7;
          color: #9f1239;
          border-radius: var(--r);
          font-size: 13.5px;
        }

        .pr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 80px 24px;
          color: var(--muted);
          font-size: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }

        .pr-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 80px 24px;
          text-align: center;
          color: var(--muted);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }

        .pr-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: var(--dark);
          margin: 8px 0 0;
        }

        .pr-empty-sub {
          font-size: 13.5px;
          color: var(--muted);
          margin: 0 0 8px;
        }

        .pr-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .pr-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          transition: border-color .2s, box-shadow .2s, transform .2s var(--ease);
        }

        .pr-card:hover {
          border-color: var(--gold-lt);
          box-shadow: var(--sh-lg);
          transform: translateY(-4px);
        }

        .pr-card-img-wrap {
          aspect-ratio: 4/5;
          background: var(--bg-alt);
          overflow: hidden;
          position: relative;
        }

        .pr-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .35s var(--ease);
        }

        .pr-card:hover .pr-card-img { transform: scale(1.04); }

        .pr-card-img-ph {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--border);
        }

        .pr-oos-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(10,17,40,.72);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 999px;
          letter-spacing: .04em;
        }

        .pr-card-body {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pr-card-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--dark);
          margin: 0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .pr-card-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--gold);
          margin: 0;
        }

        .pr-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          text-decoration: none;
          transition: background .2s;
        }

        .pr-btn-primary:hover { background: var(--black); }

        .pr-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }

        .pr-pag-btn {
          padding: 9px 20px;
          border-radius: var(--r);
          border: 1px solid var(--border);
          background: var(--bg-card);
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          cursor: pointer;
          transition: all .2s;
        }

        .pr-pag-btn:hover:not(:disabled) {
          border-color: var(--gold);
          color: var(--gold);
        }

        .pr-pag-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .pr-pag-info {
          font-size: 13px;
          color: var(--muted);
          font-weight: 600;
        }

        @media (max-width: 1100px) {
          .pr-page { padding: 20px 28px 56px; }
          .pr-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (max-width: 860px) {
          .pr-page { padding: 20px 20px 48px; }
          .pr-head { flex-direction: column; align-items: flex-start; }
          .pr-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pr-search-input { min-width: 180px; }
        }

        @media (max-width: 480px) {
          .pr-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
      `}</style>
    </div>
  );
};

export default Products;