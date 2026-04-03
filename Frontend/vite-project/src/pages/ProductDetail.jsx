import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { productService, reviewService, wishlistService } from '../services';
import { useCategoryTree } from '../hooks/useCategories';
import { useAuth } from '../context';
import { useCart } from '../context';
import { getCardImageUrl, getCategoryUrl } from '../utils';

/* ─── helpers ─── */
const getChildren = (n) =>
  Array.isArray(n?.children)
    ? n.children
    : Array.isArray(n?.subcategories)
      ? n.subcategories
      : [];

const findPath = (nodes, pred, trail = []) => {
  if (!Array.isArray(nodes)) return null;
  for (const n of nodes) {
    const t = [...trail, n];
    if (pred(n)) return t;
    const f = findPath(getChildren(n), pred, t);
    if (f) return f;
  }
  return null;
};

/* Parse description field — may be plain text or JSON {text, specs} */
const parseDescription = (raw) => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const directSpecs = raw.specs && typeof raw.specs === 'object' ? raw.specs : {};
    const altSpecs = raw.specifications && typeof raw.specifications === 'object' ? raw.specifications : {};
    return {
      text: String(raw.text || raw.description || '').trim(),
      specs: Object.keys(directSpecs).length ? directSpecs : altSpecs,
    };
  }

  if (!raw) return { text: '', specs: {} };
  const str = String(raw).trim();

  const specsMarkerMatch = str.match(/\bspecifications\s*:/i);
  if (specsMarkerMatch) {
    const markerStart = specsMarkerMatch.index ?? -1;
    const markerEnd = markerStart + specsMarkerMatch[0].length;

    const introText = str.slice(0, markerStart).trim();
    const specsText = str.slice(markerEnd).trim();

    const keyPrefixes = [
      'category path',
      'care instructions',
      'product code',
      'sleeve length',
      'neck type',
      'occasion',
      'material'
    ];

    const inlineSpecs = specsText
      .split(/[;\n]+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => chunk.replace(/\.+$/, '').trim())
      .map((chunk) => {
        if (!chunk) return null;

        const colonSplit = chunk.split(/:(.+)/);
        if (colonSplit.length >= 3) {
          const key = colonSplit[0].trim();
          const value = String(colonSplit[1] || '').trim();
          return key && value ? [key, value] : null;
        }

        const lower = chunk.toLowerCase();
        const matchedPrefix = keyPrefixes.find((prefix) => lower.startsWith(`${prefix} `));
        if (matchedPrefix) {
          const value = chunk.slice(matchedPrefix.length).trim();
          return value ? [matchedPrefix, value] : null;
        }

        const firstSpaceIdx = chunk.indexOf(' ');
        if (firstSpaceIdx <= 0) return null;

        const key = chunk.slice(0, firstSpaceIdx).trim();
        const value = chunk.slice(firstSpaceIdx + 1).trim();
        return key && value ? [key, value] : null;
      })
      .filter(Boolean);

    if (inlineSpecs.length >= 2) {
      return {
        text: introText,
        specs: Object.fromEntries(inlineSpecs),
      };
    }
  }

  const parsedFromPlainText = str
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce(
      (acc, line) => {
        const m = line.match(/^([^:]+)\s*:\s*(.+)$/);
        if (!m) {
          acc.nonSpecLines.push(line);
          return acc;
        }

        const key = m[1].trim();
        const value = m[2].trim();

        if (!key || !value) {
          acc.nonSpecLines.push(line);
          return acc;
        }

        acc.specLines.push([key, value]);
        return acc;
      },
      { specLines: [], nonSpecLines: [] }
    );

  // If description is mostly key:value rows, treat it as specifications.
  if (
    parsedFromPlainText.specLines.length >= 2 &&
    parsedFromPlainText.nonSpecLines.length === 0
  ) {
    return {
      text: '',
      specs: Object.fromEntries(parsedFromPlainText.specLines),
    };
  }

  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      const directSpecs = parsed.specs && typeof parsed.specs === 'object' ? parsed.specs : {};
      const altSpecs = parsed.specifications && typeof parsed.specifications === 'object' ? parsed.specifications : {};
      return {
        text: String(parsed.text || parsed.description || '').trim(),
        specs: Object.keys(directSpecs).length ? directSpecs : altSpecs,
      };
    } catch {
      // fall through
    }
  }

  return { text: str, specs: {} };
};

const formatSpecLabel = (label) =>
  String(label || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatSpecValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${formatSpecLabel(k)}: ${String(v)}`)
      .join(' | ');
  }

  return String(value ?? '');
};

const normalizeCollectionResponse = (res) => {
  const payload = res?.data ?? res ?? {};
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeProductDetailResponse = (res) => {
  const payload = res?.data ?? res ?? {};
  return payload?.product || payload;
};

const normalizeReviewResponse = (res) => {
  const payload = res?.data ?? res ?? {};
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  if (Array.isArray(payload)) return payload;
  return [];
};

const VISIBLE = 4;
const ANIM_MS = 420;

const Spin = ({ s = 14 }) => (
  <span
    style={{
      display: 'inline-block',
      width: s,
      height: s,
      borderRadius: '50%',
      border: '2px solid #e5e5e5',
      borderTopColor: '#111',
      animation: 'pd-spin .65s linear infinite',
      flexShrink: 0,
    }}
  />
);

const Stars = ({ rating, count }) => {
  const r = parseFloat(rating) || 0;

  return (
    <span className="pd-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={n <= Math.round(r) ? '#f0a500' : 'none'}
          stroke="#f0a500"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
      ))}
      {count != null && r > 0 && (
        <span className="pd-stars-label">
          {r} ({count})
        </span>
      )}
    </span>
  );
};

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;

  return (
    <div className={`pd-toast pd-toast-${type}`}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.5,
          padding: 0,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
};

/* Accordion */
const Accordion = ({ label, badge, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="pd-acc">
      <button className="pd-acc-row" onClick={() => setOpen((v) => !v)}>
        <span className="pd-acc-label">
          {label}
          {badge ? <span className="pd-acc-badge">{badge}</span> : null}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && <div className="pd-acc-body">{children}</div>}
    </div>
  );
};

/* Carousel hook */
const useCarousel = (items, visible = VISIBLE) => {
  const [idx, setIdx] = useState(0);
  const [beh, setBeh] = useState('smooth');
  const ref = useRef(null);
  const timer = useRef(null);

  const hasWheel = items.length > visible;
  const rendered = hasWheel
    ? [...items.slice(-visible), ...items, ...items.slice(0, visible)]
    : items;

  const min = hasWheel ? visible : 0;
  const max = hasWheel ? visible + items.length - 1 : 0;
  const rEdge = hasWheel ? visible + items.length : 0;
  const lEdge = hasWheel ? visible - 1 : 0;

  const scrollTo = useCallback((i, b) => {
    const vp = ref.current;
    if (!vp) return;

    const track = vp.querySelector('.pd-c-track');
    const card = vp.querySelector('.pd-c-card');
    if (!track || !card) return;

    const gap = parseFloat(getComputedStyle(track).gap || '0') || 0;
    const step = card.getBoundingClientRect().width + gap;
    vp.scrollTo({ left: i * step, behavior: b });
  }, []);

  useEffect(() => {
    scrollTo(idx, beh);
  }, [idx, beh, rendered, scrollTo]);

  useEffect(() => {
    if (!hasWheel) {
      setBeh('smooth');
      return;
    }
    setBeh('auto');
    const t = setTimeout(() => setBeh('smooth'), 30);
    return () => clearTimeout(t);
  }, [items, hasWheel]);

  useEffect(() => {
    if (!hasWheel) return undefined;

    if (idx === rEdge || idx === lEdge) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setBeh('auto');
        setIdx(idx === rEdge ? min : max);
        setTimeout(() => setBeh('smooth'), 10);
      }, ANIM_MS);
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hasWheel, idx, rEdge, lEdge, min, max]);

  const prev = useCallback(() => setIdx((p) => p - 1), []);
  const next = useCallback(() => setIdx((p) => p + 1), []);

  return { ref, rendered, hasWheel, prev, next };
};

/* Product card for carousels */
const PCard = ({ item }) => {
  const pid = item?.product_id;
  const img = getCardImageUrl(item, { width: 540, height: 680, crop: 'limit' });
  const price = Number(item?.price ?? 0);

  return (
    <Link to={`/products/${pid}`} className="pd-c-card">
      <div className="pd-c-img-wrap">
        {img ? <img src={img} alt={item?.name} className="pd-c-img" loading="lazy" /> : <div className="pd-c-img-ph" />}
      </div>
      <div className="pd-c-body">
        <p className="pd-c-name">{item?.name}</p>
        <p className="pd-c-price">BDT {price.toLocaleString('en-BD')}</p>
      </div>
    </Link>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { tree: categoryTree } = useCategoryTree();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingCart, setAddingCart] = useState(false);

  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const [canReview, setCanReview] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const [similar, setSimilar] = useState([]);
  const [youMayLike, setYouMayLike] = useState([]);
  const [syncKey, setSyncKey] = useState(0);

  const simCarousel = useCarousel(similar);
  const likeCarousel = useCarousel(youMayLike);

  const [addingWishlist, setAddingWishlist] = useState(false);

  const handleAddToWishlist = async () => {
    if (!selectedVariant?.variant_id) {
      showToast('Please select a variant first.', 'error');
      return;
    }
    setAddingWishlist(true);
    try {
      await wishlistService.addToWishlist(selectedVariant.variant_id);
      showToast('Added to wishlist!');
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to add to wishlist.', 'error');
    } finally {
      setAddingWishlist(false);
    }
  };

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const images = useMemo(() => {
    const list = Array.isArray(product?.images) ? product.images : [];
    return [...list.filter((i) => i.is_primary), ...list.filter((i) => !i.is_primary)];
  }, [product]);

  const variants = useMemo(() => {
    return Array.isArray(product?.variants) ? product.variants : [];
  }, [product]);

  const hasSizes = variants.some((v) => v.size !== null && String(v.size).trim() !== '');
  const selectedStock = selectedVariant ? Number(selectedVariant.stock_quantity || 0) : 0;
  const totalStock = Number(product?.total_stock || 0);
  const stockQty = selectedVariant ? selectedStock : totalStock;
  const inStock = stockQty > 0;
  const price = Number(product?.price ?? 0);
  const { text: descText, specs: descSpecs } = parseDescription(product?.description);

  const crumbs = useMemo(() => {
    if (!product || !categoryTree?.length) return [];

    const catId = product?.category_id;
    if (catId) {
      return findPath(categoryTree, (n) => String(n?.category_id) === String(catId)) || [];
    }

    return [];
  }, [product, categoryTree]);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');

    const load = async () => {
      setProduct(null);
      setSelectedVariant(null);
      setActiveImg(0);
      setQuantity(1);
      setReviews([]);
      setSimilar([]);
      setYouMayLike([]);

      try {
        const res = await productService.getProductById(id);
        if (!mounted) return;

        const p = normalizeProductDetailResponse(res);
        setProduct(p);

        const pVariants = Array.isArray(p?.variants) ? p.variants : [];
        if (pVariants.length > 0) {
          const firstInStock = pVariants.find((v) => Number(v.stock_quantity) > 0);
          setSelectedVariant(firstInStock || pVariants[0]);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.error || err?.message || 'Failed to load product.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  /* keep quantity valid when stock/variant changes */
  useEffect(() => {
    if (!stockQty) {
      setQuantity(1);
      return;
    }
    setQuantity((prev) => Math.min(Math.max(1, prev), stockQty));
  }, [stockQty, selectedVariant?.variant_id]);

  /* load reviews */
  useEffect(() => {
    if (!product?.product_id) return;

    let mounted = true;
    setReviewsLoading(true);
    setCanReview(false);

    reviewService
      .getProductReviews(product.product_id, { limit: 5 })
      .then((res) => {
        if (!mounted) return;
        setReviews(normalizeReviewResponse(res));
      })
      .catch(() => {
        if (mounted) setReviews([]);
      })
      .finally(() => {
        if (mounted) setReviewsLoading(false);
      });

    if (isAuthenticated) {
      productService.canReview(product.product_id)
        .then((res) => {
          const payload = res?.data ?? res ?? {};
          if (mounted) setCanReview(payload.can_review === true);
        })
        .catch((err) => {
          console.error('Check canReview error:', err);
        });
    }

    return () => {
      mounted = false;
    };
  }, [product?.product_id, isAuthenticated]);

  /* load similar / you may also like */
  useEffect(() => {
    if (!product?.product_id) return;

    let mounted = true;

    const loadCollections = async () => {
      const currentId = String(product.product_id);
      const currentCategory = product.category_id;

      // Similar products
      try {
        let items = [];

        if (typeof productService.getSimilarProducts === 'function') {
          const res = await productService.getSimilarProducts(product.product_id, { limit: 12 });
          items = normalizeCollectionResponse(res);
        }

        if (!items.length) {
          const res = await productService.getAllProducts({
            category: currentCategory,
            page: 1,
            limit: 16,
          });
          items = normalizeCollectionResponse(res).filter((i) => String(i?.product_id) !== currentId);
        }

        if (mounted) {
          setSimilar(items.filter((i) => String(i?.product_id) !== currentId).slice(0, 12));
        }
      } catch {
        if (mounted) setSimilar([]);
      }

      // You may also like
      try {
        let items = [];

        if (typeof productService.getYouMayAlsoLike === 'function') {
          const res = await productService.getYouMayAlsoLike(product.product_id, { limit: 12 });
          items = normalizeCollectionResponse(res);
        }

        if (!items.length) {
          const res = await productService.getAllProducts({ page: 1, limit: 24 });
          const all = normalizeCollectionResponse(res);
          const differentCategory = all.filter(
            (i) =>
              String(i?.product_id) !== currentId &&
              Number(i?.category_id) !== Number(currentCategory)
          );
          items = differentCategory.length ? differentCategory : all.filter((i) => String(i?.product_id) !== currentId);
        }

        if (mounted) {
          setYouMayLike(items.filter((i) => String(i?.product_id) !== currentId).slice(0, 12));
        }
      } catch {
        if (mounted) setYouMayLike([]);
      }
    };

    loadCollections();

    return () => {
      mounted = false;
    };
  }, [product]);

  /* auto-rotate carousels */
  useEffect(() => {
    if (!simCarousel.hasWheel && !likeCarousel.hasWheel) return undefined;

    const iv = setInterval(() => {
      if (simCarousel.hasWheel) simCarousel.next();
      if (likeCarousel.hasWheel) likeCarousel.next();
    }, 3500);

    return () => clearInterval(iv);
  }, [simCarousel.hasWheel, likeCarousel.hasWheel, simCarousel.next, likeCarousel.next, syncKey]);


  const handleSubmitReview = async () => {
    if (!reviewForm.rating) return;
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        product_id: product.product_id,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim() || undefined,
      });
      showToast('Review submitted!');
      setReviewForm({ rating: 5, comment: '' });
      
      // Refresh everything to update avg rating and count
      const [prodRes, revRes] = await Promise.all([
        productService.getProductById(product.product_id),
        reviewService.getProductReviews(product.product_id, { limit: 5 })
      ]);
      
      setProduct(normalizeProductDetailResponse(prodRes));
      setReviews(normalizeReviewResponse(revRes));
      setCanReview(false);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!selectedVariant?.variant_id) {
      showToast('Please select an available option first.', 'error');
      return;
    }

    if (!inStock) {
      showToast('This item is currently out of stock.', 'error');
      return;
    }

    setAddingCart(true);

    try {
      await addToCart(
        {
          product_id: product.product_id,
          variant_id: selectedVariant.variant_id,
          name: product.name,
          sku: product.sku,
          price,
          image: images[activeImg]?.image_url || images[0]?.image_url || null,
          stock: selectedStock,
          size: selectedVariant?.size || null,
          category_id: product.category_id,
        },
        quantity
      );

      showToast(`"${product.name}" added to cart!`);
    } catch {
      showToast('Failed to add to cart.', 'error');
    } finally {
      setAddingCart(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          background: '#fff',
        }}
      >
        <Spin s={32} />
        <p style={{ color: '#999', fontSize: 14, margin: 0 }}>Loading…</p>
        <style>{`@keyframes pd-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pd-state-wrap">
        <div className="pd-state-card">
          <p className="pd-state-title">Product not found</p>
          <p className="pd-state-sub">{error}</p>
          <button
            onClick={() => navigate('/products')}
            className="pd-state-btn"
          >
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-page">
      <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />

      {/* Breadcrumb */}
      <nav className="pd-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {crumbs.map((n) => (
          <span key={n.category_id} className="pd-crumb-seg">
            <span className="pd-crumb-sep"> / </span>
            <Link to={getCategoryUrl(n)}>{n.name}</Link>
          </span>
        ))}
        <span className="pd-crumb-seg">
          <span className="pd-crumb-sep"> / </span>
          <span className="pd-crumb-current">{product.name}</span>
        </span>
      </nav>

      <div className="pd-main">
        {/* Left — gallery */}
        <div className="pd-gallery">
          <div className="pd-gallery-stage">
            {images.length > 1 && (
              <button
                className="pd-gal-arrow pd-gal-arrow-l"
                onClick={() => setActiveImg((p) => (p - 1 + images.length) % images.length)}
                aria-label="Previous"
              >
                <svg width="10" height="18" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="9 1 1 9 9 17" />
                </svg>
              </button>
            )}

            <div className="pd-gal-img-wrap">
              {images[activeImg]?.image_url ? (
                <img src={images[activeImg].image_url} alt={product.name} className="pd-gal-img" />
              ) : (
                <div className="pd-gal-img-ph">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <button
                className="pd-gal-arrow pd-gal-arrow-r"
                onClick={() => setActiveImg((p) => (p + 1) % images.length)}
                aria-label="Next"
              >
                <svg width="10" height="18" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="1 1 9 9 1 17" />
                </svg>
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="pd-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`pd-dot${activeImg === i ? ' active' : ''}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — info */}
        <div className="pd-info">
          <h1 className="pd-title">{product.name}</h1>

          {Number(product.review_count) > 0 && <Stars rating={product.avg_rating} count={product.review_count} />}

          <p className="pd-price">BDT {price.toLocaleString('en-BD')}</p>

          <div className="pd-controls">
            <div className="pd-ctrl-block">
              <p className="pd-ctrl-label">Quantity</p>
              <div className="pd-qty">
                <button
                  className="pd-qty-btn"
                  onClick={() => setQuantity((p) => Math.max(1, p - 1))}
                  disabled={!inStock}
                >
                  −
                </button>
                <span className="pd-qty-num">{quantity}</span>
                <button
                  className="pd-qty-btn"
                  onClick={() => setQuantity((p) => Math.min(stockQty, p + 1))}
                  disabled={!inStock}
                >
                  +
                </button>
              </div>
            </div>

            {hasSizes && (
              <div className="pd-ctrl-block pd-ctrl-grow">
                <p className="pd-ctrl-label">Size</p>
                <div className="pd-select-wrap">
                  <select
                    className="pd-select"
                    value={selectedVariant?.variant_id ?? ''}
                    onChange={(e) => {
                      const chosen = variants.find((v) => String(v.variant_id) === e.target.value);
                      if (chosen) {
                        setSelectedVariant(chosen);
                        setQuantity(1);
                      }
                    }}
                  >
                    <option value="" disabled>
                      Choose an Option…
                    </option>
                    {variants.map((v) => (
                      <option key={v.variant_id} value={v.variant_id} disabled={Number(v.stock_quantity) === 0}>
                        {v.size}
                        {Number(v.stock_quantity) === 0 ? ' — Out of stock' : ''}
                      </option>
                    ))}
                  </select>
                  <svg className="pd-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {!inStock && (
  <div className="pd-oos-block">
    <p className="pd-out-of-stock">This item is currently out of stock</p>
    {isAuthenticated && (
      <button
        className="pd-btn-wishlist"
        onClick={handleAddToWishlist}
        disabled={addingWishlist}
      >
        {addingWishlist ? <><Spin s={13} /> Adding…</> : '♡ Add to Wishlist — notify me when back'}
      </button>
    )}
  </div>
)}
          {inStock && selectedVariant && (
            <p className="pd-stock-note">
              {selectedVariant.size ? `Selected size stock: ${selectedStock}` : `Available stock: ${selectedStock}`}
            </p>
          )}

          <div className="pd-divider" />

          {product.sku && (
            <div className="pd-info-row">
              <span className="pd-info-row-label">Product Code</span>
              <span className="pd-info-row-val">{product.sku}</span>
            </div>
          )}

          {hasSizes && (
            <Accordion label="Size Guide">
              <div className="pd-acc-content">
                <p className="pd-acc-text">Sizes may vary slightly. When in doubt, size up.</p>
                <table className="pd-size-guide-table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Chest</th>
                      <th>Waist</th>
                      <th>Hip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['XS', '32"', '26"', '34"'],
                      ['S', '34"', '28"', '36"'],
                      ['M', '36"', '30"', '38"'],
                      ['L', '38"', '32"', '40"'],
                      ['XL', '40"', '34"', '42"'],
                      ['XXL', '42"', '36"', '44"'],
                    ].map(([s, ...m]) => (
                      <tr key={s}>
                        <td>{s}</td>
                        {m.map((v, i) => (
                          <td key={i}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Accordion>
          )}

          <Accordion label="Product Description">
            <div className="pd-acc-content">
              {descText ? (
                <p className="pd-acc-text">{descText}</p>
              ) : (
                <p className="pd-acc-text pd-acc-muted">No description available.</p>
              )}

              {Object.keys(descSpecs).length > 0 && (
                <>
                  <p className="pd-spec-subhead">Specifications</p>
                  <table className="pd-spec-table">
                    <tbody>
                      {Object.entries(descSpecs).map(([k, v]) => (
                        <tr key={k}>
                          <td className="pd-spec-key">{formatSpecLabel(k)}</td>
                          <td className="pd-spec-val">{formatSpecValue(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </Accordion>

          <Accordion
            label="Reviews"
            badge={Number(product.review_count) > 0 ? ` (${product.review_count})` : null}
          >
           <div className="pd-acc-content">
              {canReview && (
                <div className="pd-review-form">
                  <p className="pd-review-form-label">Write a Review</p>
                  <div className="pd-review-stars-pick">
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        type="button"
                        className="pd-star-btn"
                        onClick={() => setReviewForm(p => ({ ...p, rating: n }))}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24"
                          fill={n <= reviewForm.rating ? '#f0a500' : 'none'}
                          stroke="#f0a500" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="pd-review-textarea"
                    rows={3}
                    placeholder="Share your thoughts (optional)…"
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  />
                  <button
                    className="pd-btn-add"
                    style={{ height: 44, fontSize: 12, letterSpacing: '.08em', flex: 'none', alignSelf: 'flex-start', padding: '0 24px' }}
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview ? <><Spin s={14}/> SUBMITTING…</> : 'SUBMIT REVIEW'}
                  </button>
                </div>
              )}
              {reviewsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', fontSize: 13.5 }}>
                  <Spin /> Loading reviews…
                </div>
              ) : reviews.length === 0 ? (
                <p className="pd-acc-text pd-acc-muted">No reviews yet.</p>
              ) : (
                <div className="pd-reviews">
                  {reviews.map((r) => (
                    <div key={r.review_id} className="pd-review">
                      <div className="pd-review-top">
                        <div className="pd-review-avatar">
                          {((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <p className="pd-review-name">
                              {r.first_name || r.last_name
                                ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
                                : 'Anonymous'}
                            </p>
                            <span className="pd-verified-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Verified Buyer
                            </span>
                          </div>
                          <Stars rating={r.rating} count={null} />
                        </div>
                        <span className="pd-review-date">
                          {new Date(r.created_at).toLocaleDateString('en-BD', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {r.comment && <p className="pd-review-comment">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Accordion>

          <div className="pd-cta-row">
            <button className="pd-btn-add" onClick={handleAddToCart} disabled={!inStock || addingCart}>
              {addingCart ? (
                <>
                  <Spin s={15} /> ADDING…
                </>
              ) : inStock ? (
                'ADD TO CART'
              ) : (
                'OUT OF STOCK'
              )}
            </button>

            <button
              className="pd-icon-btn"
              title="Share"
              onClick={async () => {
                try {
                  await navigator.clipboard?.writeText(window.location.href);
                  showToast('Link copied!');
                } catch {
                  showToast('Could not copy link.', 'error');
                }
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="pd-carousel-section">
          <h2 className="pd-carousel-title">SIMILAR PRODUCTS</h2>
          <div className="pd-carousel-stage">
            {simCarousel.hasWheel && (
              <button
                className="pd-carousel-arrow pd-carousel-arrow-l"
                onClick={() => {
                  simCarousel.prev();
                  setSyncKey((p) => p + 1);
                }}
                aria-label="Previous"
              >
                <svg width="10" height="18" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="9 1 1 9 9 17" />
                </svg>
              </button>
            )}

            <div className="pd-c-vp" ref={simCarousel.ref}>
              <div className="pd-c-track">
                {simCarousel.rendered.map((item, ri) => (
                  <PCard key={`s-${item?.product_id}-${ri}`} item={item} />
                ))}
              </div>
            </div>

            {simCarousel.hasWheel && (
              <button
                className="pd-carousel-arrow pd-carousel-arrow-r"
                onClick={() => {
                  simCarousel.next();
                  setSyncKey((p) => p + 1);
                }}
                aria-label="Next"
              >
                <svg width="10" height="18" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="1 1 9 9 1 17" />
                </svg>
              </button>
            )}
          </div>
        </section>
      )}

      {youMayLike.length > 0 && (
        <section className="pd-carousel-section">
          <h2 className="pd-carousel-title">YOU MAY ALSO LIKE</h2>
          <div className="pd-carousel-stage">
            {likeCarousel.hasWheel && (
              <button
                className="pd-carousel-arrow pd-carousel-arrow-l"
                onClick={() => {
                  likeCarousel.prev();
                  setSyncKey((p) => p + 1);
                }}
                aria-label="Previous"
              >
                <svg width="10" height="18" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="9 1 1 9 9 17" />
                </svg>
              </button>
            )}

            <div className="pd-c-vp" ref={likeCarousel.ref}>
              <div className="pd-c-track">
                {likeCarousel.rendered.map((item, ri) => (
                  <PCard key={`l-${item?.product_id}-${ri}`} item={item} />
                ))}
              </div>
            </div>

            {likeCarousel.hasWheel && (
              <button
                className="pd-carousel-arrow pd-carousel-arrow-r"
                onClick={() => {
                  likeCarousel.next();
                  setSyncKey((p) => p + 1);
                }}
                aria-label="Next"
              >
                <svg width="10" height="18" viewBox="0 0 10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="1 1 9 9 1 17" />
                </svg>
              </button>
            )}
          </div>
        </section>
      )}

      <style>{`
        @keyframes pd-spin { to { transform: rotate(360deg); } }
        @keyframes pd-fade { from { opacity: 0; transform: translateX(10px); } }

        .pd-page {
          width: 100%;
          min-height: 100vh;
          padding: 20px 48px 80px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: var(--bg);
        }

        .pd-state-wrap {
          width: 100%;
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg);
        }
        .pd-state-card {
          width: min(460px, 100%);
          padding: 34px 28px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--bg-card);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          box-shadow: var(--sh-sm);
        }
        .pd-state-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(26px, 3.4vw, 34px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
        }
        .pd-state-sub {
          margin: 0;
          font-size: 13.5px;
          color: var(--muted);
        }
        .pd-state-btn {
          margin-top: 8px;
          padding: 10px 20px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          transition: background .2s;
        }
        .pd-state-btn:hover { background: var(--black); }

        .pd-toast {
          position: fixed;
          top: 86px;
          right: 20px;
          z-index: 1500;
          width: min(320px, calc(100vw - 40px));
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid;
          animation: pd-fade .2s ease both;
        }
        .pd-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .pd-toast-error { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        .pd-breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .pd-breadcrumb a {
          color: var(--muted);
          text-decoration: none;
          transition: color .2s;
        }
        .pd-breadcrumb a:hover { color: var(--gold); }
        .pd-crumb-sep { color: var(--border); margin: 0 8px; }
        .pd-crumb-current { color: var(--dark); font-weight: 600; }

        .pd-main {
          display: grid;
          grid-template-columns: minmax(360px, 0.92fr) minmax(380px, 1.08fr);
          gap: 24px;
          align-items: start;
        }

        .pd-gallery {
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--bg-card);
          padding: 16px;
          max-width: 560px;
          width: 100%;
          justify-self: center;
        }
        .pd-gallery-stage {
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
          width: 100%;
        }
        .pd-gal-arrow {
          width: 44px;
          height: 60px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding: 0;
          transition: all .2s;
        }
        .pd-gal-arrow:hover { color: var(--gold); transform: scale(1.1); }

        .pd-gal-img-wrap {
          flex: 1;
          aspect-ratio: 5 / 6;
          max-height: 620px;
          background: var(--bg-alt);
          overflow: hidden;
          border-radius: calc(var(--r) - 2px);
        }
        .pd-gal-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pd-gal-img-ph {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pd-dots {
          display: flex;
          justify-content: center;
          gap: 9px;
          padding: 4px 0;
        }
        .pd-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          padding: 0;
          border: none;
          background: var(--border);
          cursor: pointer;
          transition: all .3s var(--ease);
        }
        .pd-dot.active { background: var(--gold); width: 24px; border-radius: 4px; }

        .pd-info {
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--bg-card);
          padding: 20px;
          box-shadow: var(--sh-sm);
        }
        .pd-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 3.2vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.08;
        }
        .pd-stars {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .pd-stars-label {
          margin-left: 5px;
          font-size: 13px;
          color: var(--muted);
        }
        .pd-price {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--gold);
        }

        .pd-controls {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .pd-ctrl-block {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .pd-ctrl-grow {
          flex: 1;
          min-width: 160px;
        }
        .pd-ctrl-label {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
        }

        .pd-qty {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--border);
          height: 46px;
          background: var(--bg-card);
        }
        .pd-qty-btn {
          width: 46px;
          height: 100%;
          background: var(--bg-card);
          border: none;
          font-size: 20px;
          color: var(--text);
          cursor: pointer;
          transition: all .15s;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .pd-qty-btn:hover:not(:disabled) { background: var(--bg-alt); color: var(--gold); }
        .pd-qty-btn:disabled { opacity: .35; cursor: not-allowed; }
        .pd-qty-num {
          min-width: 52px;
          line-height: 44px;
          text-align: center;
          font-size: 15px;
          font-weight: 500;
          color: var(--dark);
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
          user-select: none;
        }

        .pd-select-wrap { position: relative; }
        .pd-select {
          width: 100%;
          height: 46px;
          padding: 0 36px 0 14px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--dark);
          font-size: 14px;
          cursor: pointer;
          appearance: none;
          outline: none;
          transition: border-color .2s;
        }
        .pd-select:focus { border-color: var(--gold); }
        .pd-select-chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          pointer-events: none;
        }

        .pd-out-of-stock {
          margin: 0;
          font-size: 13px;
          color: #c62828;
        }
        .pd-oos-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pd-btn-wishlist {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .04em;
          color: var(--dark);
          cursor: pointer;
          transition: all .2s;
          align-self: flex-start;
        }
        .pd-btn-wishlist:hover:not(:disabled) {
          border-color: var(--gold);
          color: var(--gold);
        }
        .pd-btn-wishlist:disabled { opacity: .5; cursor: not-allowed; }
        .pd-stock-note {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .pd-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }

        .pd-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          font-size: 13.5px;
        }
        .pd-info-row-label { color: var(--dark); font-weight: 500; }
        .pd-info-row-val {
          color: var(--muted);
          font-family: ui-monospace, monospace;
          font-size: 12.5px;
        }

        .pd-acc { border-bottom: 1px solid var(--border); }
        .pd-acc-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--dark);
          text-align: left;
          transition: all .2s;
        }
        .pd-acc-row:hover { color: var(--gold); padding-left: 4px; }
        .pd-acc-badge {
          font-weight: 400;
          color: var(--muted);
          font-size: 13px;
        }
        .pd-acc-body { padding-bottom: 16px; }
        .pd-acc-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pd-acc-text {
          margin: 0;
          font-size: 13.5px;
          color: var(--text);
          line-height: 1.7;
        }
        .pd-acc-muted { color: var(--muted); }

        .pd-size-guide-table,
        .pd-spec-table {
          width: 100%;
          border-collapse: collapse;
        }

        .pd-size-guide-table th,
        .pd-size-guide-table td {
          padding: 8px 12px;
          border: 1px solid var(--border);
          text-align: center;
          font-size: 13px;
        }
        .pd-size-guide-table thead th {
          background: var(--bg-alt);
          font-weight: 700;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .pd-spec-subhead {
          margin: 4px 0 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--dark);
        }
        .pd-spec-table tr { border-bottom: 1px solid var(--border); }
        .pd-spec-key {
          width: 40%;
          padding: 9px 16px 9px 0;
          color: var(--muted);
          vertical-align: top;
          font-size: 13.5px;
        }
        .pd-spec-val {
          padding: 9px 0;
          color: var(--dark);
          font-weight: 500;
          font-size: 13.5px;
        }

        .pd-reviews {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pd-review {
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .pd-review:last-child { border-bottom: none; }
        .pd-review-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .pd-review-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--dark);
          color: var(--bg);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pd-review-name {
          margin: 0 0 2px;
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
        }
        .pd-review-date {
          margin-left: auto;
          white-space: nowrap;
          font-size: 12px;
          color: #aaa;
        }
        .pd-review-comment {
          margin: 0;
          font-size: 13.5px;
          color: var(--text);
          line-height: 1.65;
        }
        .pd-review-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          background: var(--bg-alt);
          border: 1px solid var(--border);
          margin-bottom: 24px;
          border-radius: 4px;
        }
        .pd-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: #156238;
          background: #f0faf3;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .pd-review-form-label {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--dark);
          letter-spacing: .04em;
        }
        .pd-review-stars-pick {
          display: flex;
          gap: 4px;
        }
        .pd-star-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          line-height: 0;
          transition: transform .1s;
        }
        .pd-star-btn:hover { transform: scale(1.15); }
        .pd-review-textarea {
          padding: 9px 13px;
          border: 1px solid var(--border);
          font-size: 13.5px;
          color: var(--text);
          background: var(--bg-card);
          font-family: inherit;
          resize: vertical;
          line-height: 1.6;
          outline: none;
          transition: border-color .2s;
        }
        .pd-review-textarea:focus { border-color: var(--gold); }

        .pd-cta-row {
          display: flex;
          align-items: stretch;
          gap: 10px;
          margin-top: 6px;
        }
        .pd-btn-add {
          flex: 1;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 24px;
          background: var(--dark);
          color: var(--bg);
          border: 1px solid var(--dark);
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .1em;
          cursor: pointer;
          transition: background .2s;
          white-space: nowrap;
        }
        .pd-btn-add:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--sh-md); }
        .pd-btn-add:disabled { opacity: .5; cursor: not-allowed; }

        .pd-icon-btn {
          width: 52px;
          height: 52px;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--bg-card);
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .2s;
          flex-shrink: 0;
        }
        .pd-icon-btn:hover {
          border-color: var(--gold);
          color: var(--gold);
        }

        .pd-carousel-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .pd-carousel-title {
          margin: 0;
          font-size: clamp(16px, 2vw, 20px);
          font-weight: 700;
          letter-spacing: .08em;
          color: var(--dark);
          text-align: center;
        }
        .pd-carousel-stage {
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
        }
        .pd-carousel-arrow {
          width: 44px;
          height: 60px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: none;
          cursor: pointer;
          color: #555;
          transition: color .2s;
          padding: 0;
        }
        .pd-carousel-arrow:hover { color: var(--gold); }
        .pd-carousel-arrow-l { order: -1; }

        .pd-c-vp {
          flex: 1;
          overflow: hidden;
        }
        .pd-c-track {
          display: flex;
          gap: 2px;
        }
        .pd-c-card {
          flex: 0 0 calc((100% - 3 * 2px) / 4);
          text-decoration: none;
          color: inherit;
          background: var(--bg-alt);
          position: relative;
          display: block;
        }
        .pd-c-card:hover .pd-c-img { transform: scale(1.03); }
        .pd-c-img-wrap {
          aspect-ratio: 3 / 4;
          overflow: hidden;
          background: var(--bg-alt);
        }
        .pd-c-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .35s ease;
        }
        .pd-c-img-ph {
          width: 100%;
          height: 100%;
          background: #eee;
        }
        .pd-c-body {
          padding: 12px 4px 4px;
          background: var(--bg-card);
        }
        .pd-c-name {
          margin: 0 0 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }
        .pd-c-price {
          margin: 0;
          font-size: 13px;
          color: var(--muted);
          font-weight: 400;
        }

        @media (max-width: 1100px) {
          .pd-page { padding: 20px 28px 64px; }
          .pd-main { gap: 18px; }
          .pd-c-card { flex: 0 0 calc((100% - 2 * 2px) / 3); }
        }

        @media (max-width: 860px) {
          .pd-page { padding: 20px 20px 56px; }
          .pd-main { grid-template-columns: 1fr; gap: 28px; }
          .pd-info { padding: 16px; }
          .pd-gallery { padding: 12px; }
          .pd-c-card { flex: 0 0 calc((100% - 2px) / 2); }
        }

        @media (max-width: 480px) {
          .pd-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .pd-ctrl-grow { min-width: unset; }
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;