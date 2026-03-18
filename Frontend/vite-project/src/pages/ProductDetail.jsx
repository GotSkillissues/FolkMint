import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { categoryService, productService } from '../services';
import { useCart } from '../context';
import { Loading } from '../components';
import { getCardImageUrl } from '../utils';
import './ProductDetail.css';

const normalizeNameKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const collectProductImages = (item) => {
  const seen = new Set();
  const images = [];

  const addImage = (value) => {
    const url = String(value || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };

  const topLevelImages = Array.isArray(item?.images) ? item.images : [];
  const primaryTopLevel = topLevelImages.filter((image) => image?.is_primary);
  const secondaryTopLevel = topLevelImages.filter((image) => !image?.is_primary);

  [...primaryTopLevel, ...secondaryTopLevel].forEach((image) => {
    addImage(image?.secure_url);
    addImage(image?.image_url);
    addImage(image?.source_url);
  });

  addImage(item?.thumbnail_url);
  addImage(item?.image_url);
  addImage(item?.image);

  const variants = Array.isArray(item?.variants) ? item.variants : [];
  variants.forEach((variant) => {
    const variantImages = Array.isArray(variant?.images) ? variant.images : [];
    const primary = variantImages.filter((img) => img?.is_primary);
    const secondary = variantImages.filter((img) => !img?.is_primary);

    [...primary, ...secondary].forEach((img) => addImage(img?.image_url));
  });

  const hasCloudinaryImage = images.some((url) => String(url || '').includes('res.cloudinary.com'));
  if (!hasCloudinaryImage) {
    const sourceImageUrls = Array.isArray(item?.source_image_urls) ? item.source_image_urls : [];
    sourceImageUrls.forEach((url) => addImage(url));
  }

  return images.slice(0, 3);
};

const getProductImage = (item) => {
  return collectProductImages(item)[0];
};

const getProductPrice = (item) => Number(item?.price ?? item?.base_price ?? 0);

const getProductStock = (item) => {
  if (typeof item?.stock === 'number') return item.stock;
  if (typeof item?.total_stock === 'number') return item.total_stock;

  const variants = item?.variants || [];
  return variants.reduce((sum, variant) => sum + (variant?.stock_quantity || 0), 0);
};

const getNormalizedItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
};

const extractSkuCode = (item) => {
  const sku = String(item?.sku || '').trim();
  if (sku) return sku.toUpperCase();

  const firstVariantSku = String(item?.variants?.[0]?.sku || '').trim();
  if (firstVariantSku) return firstVariantSku.toUpperCase();

  const productUrl = String(item?.product_url || '').trim();
  const urlMatch = productUrl.match(/-([a-z0-9]{8,})\.html$/i);
  if (urlMatch?.[1]) return urlMatch[1];

  const description = getDetailDescription(item) || String(item?.description || '').trim();
  const sourceUrlMatch = description.match(/\[source_url:(.*?)\]/i);
  if (sourceUrlMatch?.[1]) {
    const sourceCodeMatch = sourceUrlMatch[1].match(/-([a-z0-9]{8,})\.html$/i);
    if (sourceCodeMatch?.[1]) return sourceCodeMatch[1];
  }

  return '';
};

const stripSourceMarker = (text) => String(text || '').replace(/\s*\[source_url:[^\]]+\]\s*/gi, '').trim();

const formatSpecificationLabel = (label) =>
  String(label || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarTrackIndex, setSimilarTrackIndex] = useState(0);
  const [similarTrackBehavior, setSimilarTrackBehavior] = useState('smooth');
  const [youMayLikeProducts, setYouMayLikeProducts] = useState([]);
  const [youMayLikeTrackIndex, setYouMayLikeTrackIndex] = useState(0);
  const [youMayLikeTrackBehavior, setYouMayLikeTrackBehavior] = useState('smooth');
  const [autoRotateSyncKey, setAutoRotateSyncKey] = useState(0);
  const [isInfoPaneOpen, setIsInfoPaneOpen] = useState(false);
  const similarViewportRef = useRef(null);
  const youMayLikeViewportRef = useRef(null);
  const similarResetTimerRef = useRef(null);
  const youMayLikeResetTimerRef = useRef(null);
  const SIMILAR_VISIBLE_COUNT = 4;
  const SIMILAR_ANIMATION_MS = 420;

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setSelectedImageIndex(0);
  }, [product]);

  useEffect(() => {
    setIsInfoPaneOpen(false);
  }, [id]);

  useEffect(() => {
    const onEscClose = (event) => {
      if (event.key === 'Escape') {
        setIsInfoPaneOpen(false);
      }
    };

    if (isInfoPaneOpen) {
      document.body.classList.add('drawer-open');
      window.addEventListener('keydown', onEscClose);
    }

    return () => {
      document.body.classList.remove('drawer-open');
      window.removeEventListener('keydown', onEscClose);
    };
  }, [isInfoPaneOpen]);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      if (!product) return;

      try {
        const categoryId = product?.category?.category_id || product?.category_id;
        const data = await productService.getAllProducts({
          category_id: categoryId || undefined,
          page: 1,
          limit: 16,
        });

        const payload = data?.data ?? data ?? {};
        const items = getNormalizedItems(payload);

        const currentId = String(product?.product_id || product?.id || id);
        const filtered = items.filter((item) => String(item?.product_id || item?.id) !== currentId).slice(0, 12);
        setSimilarProducts(filtered);
        setSimilarTrackIndex(filtered.length > SIMILAR_VISIBLE_COUNT ? SIMILAR_VISIBLE_COUNT : 0);
      } catch {
        setSimilarProducts([]);
        setSimilarTrackIndex(0);
      }
    };

    fetchSimilarProducts();
  }, [product, id]);

  useEffect(() => {
    const fetchYouMayAlsoLike = async () => {
      if (!product) return;

      try {
        const allCategoriesResponse = await categoryService.getAllCategories();
        const allCategoryPayload = allCategoriesResponse?.data ?? allCategoriesResponse;
        const categories = Array.isArray(allCategoryPayload)
          ? allCategoryPayload
          : Array.isArray(allCategoryPayload?.categories)
            ? allCategoryPayload.categories
            : [];

        const rawCategoryId = Number(product?.category?.category_id || product?.category_id || 0);
        const productCategoryName = String(product?.category?.name || product?.category_name || '').trim().toLowerCase();
        const currentCategory = categories.find((category) => {
          if (rawCategoryId && Number(category?.category_id) === rawCategoryId) return true;
          if (!productCategoryName) return false;
          return String(category?.name || '').trim().toLowerCase() === productCategoryName;
        });
        const currentCategoryId = Number(currentCategory?.category_id || rawCategoryId || 0);

        const parentCategoryId = Number(currentCategory?.parent_category || currentCategoryId || 0);
        if (!parentCategoryId) {
          const fallbackData = await productService.getAllProducts({
            category_id: currentCategoryId || undefined,
            page: 1,
            limit: 16,
          });
          const fallbackPayload = fallbackData?.data ?? fallbackData ?? {};
          const fallbackItems = getNormalizedItems(fallbackPayload);
          const currentId = String(product?.product_id || product?.id || id);
          const fallbackFiltered = fallbackItems.filter((item) => String(item?.product_id || item?.id) !== currentId).slice(0, 16);
          setYouMayLikeProducts(fallbackFiltered);
          setYouMayLikeTrackIndex(fallbackFiltered.length > SIMILAR_VISIBLE_COUNT ? SIMILAR_VISIBLE_COUNT : 0);
          return;
        }

        const data = await productService.getAllProducts({
          parent_id: parentCategoryId,
          include_descendants: 'true',
          page: 1,
          limit: 40,
        });

        const payload = data?.data ?? data ?? {};
        const items = getNormalizedItems(payload);

        const currentId = String(product?.product_id || product?.id || id);
        let filtered = items
          .filter((item) => String(item?.product_id || item?.id) !== currentId)
          .filter((item) => {
            if (!currentCategory?.parent_category) return true;
            return Number(item?.category_id) !== currentCategoryId;
          })
          .slice(0, 16);

        if (!filtered.length) {
          const fallbackData = await productService.getAllProducts({
            category_id: currentCategoryId || undefined,
            page: 1,
            limit: 16,
          });
          const fallbackPayload = fallbackData?.data ?? fallbackData ?? {};
          const fallbackItems = getNormalizedItems(fallbackPayload);
          filtered = fallbackItems.filter((item) => String(item?.product_id || item?.id) !== currentId).slice(0, 16);
        }

        setYouMayLikeProducts(filtered);
        setYouMayLikeTrackIndex(filtered.length > SIMILAR_VISIBLE_COUNT ? SIMILAR_VISIBLE_COUNT : 0);
      } catch {
        setYouMayLikeProducts([]);
        setYouMayLikeTrackIndex(0);
      }
    };

    fetchYouMayAlsoLike();
  }, [product, id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getProductById(id);
      setProduct(data?.data || data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load product');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const galleryImages = collectProductImages(product);
    const primaryImage = galleryImages[selectedImageIndex] || getProductImage(product) || '';
    addToCart({
      ...product,
      price: getProductPrice(product),
      image: primaryImage,
      stock: getProductStock(product),
    }, quantity);
    alert('Product added to cart!');
  };

  const productPrice = getProductPrice(product);
  const productStock = getProductStock(product);
  const productImages = collectProductImages(product);
  const activeImage = productImages[selectedImageIndex] || '';
  const detailDescription = stripSourceMarker(
    String(product?.description || '').trim() || 'No description available.'
  );
  const detailSpecifications = product?.specifications && typeof product.specifications === 'object'
    ? Object.entries(product.specifications).filter(([, value]) => String(value || '').trim().length > 0)
    : [];

  const onPrevImage = () => {
    if (productImages.length <= 1) return;
    setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const onNextImage = () => {
    if (productImages.length <= 1) return;
    setSelectedImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const hasSimilarWheel = similarProducts.length > SIMILAR_VISIBLE_COUNT;
  const similarRenderedProducts = hasSimilarWheel
    ? [
        ...similarProducts.slice(-SIMILAR_VISIBLE_COUNT),
        ...similarProducts,
        ...similarProducts.slice(0, SIMILAR_VISIBLE_COUNT),
      ]
    : similarProducts;

  const similarMinIndex = hasSimilarWheel ? SIMILAR_VISIBLE_COUNT : 0;
  const similarMaxIndex = hasSimilarWheel ? SIMILAR_VISIBLE_COUNT + similarProducts.length - 1 : 0;
  const similarRightEdgeIndex = hasSimilarWheel ? SIMILAR_VISIBLE_COUNT + similarProducts.length : 0;
  const similarLeftEdgeIndex = hasSimilarWheel ? SIMILAR_VISIBLE_COUNT - 1 : 0;

  const hasYouMayLikeWheel = youMayLikeProducts.length > SIMILAR_VISIBLE_COUNT;
  const youMayLikeRenderedProducts = hasYouMayLikeWheel
    ? [
        ...youMayLikeProducts.slice(-SIMILAR_VISIBLE_COUNT),
        ...youMayLikeProducts,
        ...youMayLikeProducts.slice(0, SIMILAR_VISIBLE_COUNT),
      ]
    : youMayLikeProducts;

  const youMayLikeMinIndex = hasYouMayLikeWheel ? SIMILAR_VISIBLE_COUNT : 0;
  const youMayLikeMaxIndex = hasYouMayLikeWheel ? SIMILAR_VISIBLE_COUNT + youMayLikeProducts.length - 1 : 0;
  const youMayLikeRightEdgeIndex = hasYouMayLikeWheel ? SIMILAR_VISIBLE_COUNT + youMayLikeProducts.length : 0;
  const youMayLikeLeftEdgeIndex = hasYouMayLikeWheel ? SIMILAR_VISIBLE_COUNT - 1 : 0;

  useEffect(() => {
    if (!hasSimilarWheel) {
      setSimilarTrackBehavior('smooth');
      return;
    }

    setSimilarTrackBehavior('auto');
    const timerId = window.setTimeout(() => {
      setSimilarTrackBehavior('smooth');
    }, 30);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [similarProducts, hasSimilarWheel]);

  useEffect(() => {
    if (!hasYouMayLikeWheel) {
      setYouMayLikeTrackBehavior('smooth');
      return;
    }

    setYouMayLikeTrackBehavior('auto');
    const timerId = window.setTimeout(() => {
      setYouMayLikeTrackBehavior('smooth');
    }, 30);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [youMayLikeProducts, hasYouMayLikeWheel]);

  const scrollSimilarTo = (index) => {
    const viewport = similarViewportRef.current;
    if (!viewport) return;

    const track = viewport.querySelector('.similar-track');
    const firstCard = viewport.querySelector('.similar-card');
    if (!track || !firstCard) return;

    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap || '0') || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    viewport.scrollTo({ left: index * step, behavior: similarTrackBehavior });
  };

  const scrollYouMayLikeTo = (index) => {
    const viewport = youMayLikeViewportRef.current;
    if (!viewport) return;

    const track = viewport.querySelector('.similar-track');
    const firstCard = viewport.querySelector('.similar-card');
    if (!track || !firstCard) return;

    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap || '0') || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    viewport.scrollTo({ left: index * step, behavior: youMayLikeTrackBehavior });
  };

  useEffect(() => {
    scrollSimilarTo(similarTrackIndex);
  }, [similarTrackIndex, similarRenderedProducts]);

  useEffect(() => {
    if (!hasSimilarWheel) return;

    if (similarTrackIndex === similarRightEdgeIndex || similarTrackIndex === similarLeftEdgeIndex) {
      if (similarResetTimerRef.current) window.clearTimeout(similarResetTimerRef.current);

      similarResetTimerRef.current = window.setTimeout(() => {
        setSimilarTrackBehavior('auto');
        setSimilarTrackIndex(
          similarTrackIndex === similarRightEdgeIndex ? similarMinIndex : similarMaxIndex
        );

        window.setTimeout(() => {
          setSimilarTrackBehavior('smooth');
        }, 10);
      }, SIMILAR_ANIMATION_MS);
    }

    return () => {
      if (similarResetTimerRef.current) {
        window.clearTimeout(similarResetTimerRef.current);
      }
    };
  }, [
    hasSimilarWheel,
    similarLeftEdgeIndex,
    similarMaxIndex,
    similarMinIndex,
    similarRightEdgeIndex,
    similarTrackIndex,
  ]);

  useEffect(() => {
    scrollYouMayLikeTo(youMayLikeTrackIndex);
  }, [youMayLikeTrackIndex, youMayLikeRenderedProducts]);

  useEffect(() => {
    if (!hasYouMayLikeWheel) return;

    if (youMayLikeTrackIndex === youMayLikeRightEdgeIndex || youMayLikeTrackIndex === youMayLikeLeftEdgeIndex) {
      if (youMayLikeResetTimerRef.current) window.clearTimeout(youMayLikeResetTimerRef.current);

      youMayLikeResetTimerRef.current = window.setTimeout(() => {
        setYouMayLikeTrackBehavior('auto');
        setYouMayLikeTrackIndex(
          youMayLikeTrackIndex === youMayLikeRightEdgeIndex ? youMayLikeMinIndex : youMayLikeMaxIndex
        );

        window.setTimeout(() => {
          setYouMayLikeTrackBehavior('smooth');
        }, 10);
      }, SIMILAR_ANIMATION_MS);
    }

    return () => {
      if (youMayLikeResetTimerRef.current) {
        window.clearTimeout(youMayLikeResetTimerRef.current);
      }
    };
  }, [
    hasYouMayLikeWheel,
    youMayLikeLeftEdgeIndex,
    youMayLikeMaxIndex,
    youMayLikeMinIndex,
    youMayLikeRightEdgeIndex,
    youMayLikeTrackIndex,
  ]);

  useEffect(() => {
    if (!hasSimilarWheel && !hasYouMayLikeWheel) return undefined;

    const intervalId = window.setInterval(() => {
      if (hasSimilarWheel) {
        setSimilarTrackIndex((prev) => prev + 1);
      }

      if (hasYouMayLikeWheel) {
        setYouMayLikeTrackIndex((prev) => prev + 1);
      }
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasSimilarWheel, hasYouMayLikeWheel, autoRotateSyncKey]);

  const onSimilarPrev = () => {
    if (!hasSimilarWheel) return;
    setSimilarTrackIndex((prev) => prev - 1);
    setAutoRotateSyncKey((prev) => prev + 1);
  };

  const onSimilarNext = () => {
    if (!hasSimilarWheel) return;
    setSimilarTrackIndex((prev) => prev + 1);
    setAutoRotateSyncKey((prev) => prev + 1);
  };

  const onYouMayLikePrev = () => {
    if (!hasYouMayLikeWheel) return;
    setYouMayLikeTrackIndex((prev) => prev - 1);
    setAutoRotateSyncKey((prev) => prev + 1);
  };

  const onYouMayLikeNext = () => {
    if (!hasYouMayLikeWheel) return;
    setYouMayLikeTrackIndex((prev) => prev + 1);
    setAutoRotateSyncKey((prev) => prev + 1);
  };

  if (loading) return <Loading message="Loading product..." />;
  
  if (error) return <div className="error-message">{error}</div>;
  
  if (!product) return <div className="error-message">Product not found</div>;

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        <div className="product-images">
          <div className="main-image-wrap">
            {productImages.length > 1 && (
              <>
                <button type="button" className="img-nav-btn left" onClick={onPrevImage} aria-label="Previous image">‹</button>
                <button type="button" className="img-nav-btn right" onClick={onNextImage} aria-label="Next image">›</button>
              </>
            )}

            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="main-image"
              />
            ) : (
              <div className="main-image-empty">Image unavailable</div>
            )}
          </div>

          {productImages.length > 1 && (
            <div className="image-thumbnails">
              {productImages.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  className={`thumb-btn${selectedImageIndex === index ? ' active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={imageUrl} alt={`${product.name} ${index + 1}`} className="thumb-image" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-details">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-price">৳{productPrice.toFixed(2)}</p>

          <button
            type="button"
            className="product-description-btn"
            onClick={() => setIsInfoPaneOpen(true)}
          >
            Product Description
          </button>

          <div className="product-info-item">
            <strong>Category:</strong> {product.category?.name || 'Uncategorized'}
          </div>

          <div className="product-info-item">
            <strong>Stock:</strong> {productStock > 0 ? `${productStock} available` : 'Out of stock'}
          </div>

          <div className="quantity-selector">
            <label htmlFor="quantity">Quantity:</label>
            <div className="quantity-controls">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="qty-btn"
              >
                -
              </button>
              <input 
                type="number" 
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={Math.max(1, productStock)}
              />
              <button 
                onClick={() => setQuantity(Math.min(Math.max(1, productStock), quantity + 1))}
                className="qty-btn"
              >
                +
              </button>
            </div>
          </div>

          <button 
            className="add-to-cart-btn-large"
            onClick={handleAddToCart}
            disabled={productStock <= 0}
          >
            {productStock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
          </button>
        </div>
      </div>

      <div
        className={`product-info-overlay${isInfoPaneOpen ? ' open' : ''}`}
        onClick={() => setIsInfoPaneOpen(false)}
        aria-hidden={!isInfoPaneOpen}
      >
        <aside
          className={`product-info-pane${isInfoPaneOpen ? ' open' : ''}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Product Description and Specifications"
        >
          <div className="product-info-pane-header">
            <h3>Product Description</h3>
            <button
              type="button"
              className="product-info-close"
              onClick={() => setIsInfoPaneOpen(false)}
              aria-label="Close product details"
            >
              ×
            </button>
          </div>

          <div className="product-info-pane-content">
            <p className="product-info-description">{detailDescription}</p>

            <h4 className="product-info-spec-title">Specifications</h4>
            {detailSpecifications.length > 0 ? (
              <dl className="product-spec-grid">
                {detailSpecifications.map(([key, value]) => (
                  <div className="product-spec-row" key={key}>
                    <dt>{formatSpecificationLabel(key)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="product-info-spec-empty">No specifications available.</p>
            )}
          </div>
        </aside>
      </div>

      {similarProducts.length > 0 && (
        <section className="similar-products-section" aria-label="Similar products">
          <div className="similar-head">
            <h2 className="similar-title">Similar Products</h2>
            {hasSimilarWheel && (
              <div className="similar-controls">
                <button
                  type="button"
                  className="similar-nav-btn"
                  onClick={onSimilarPrev}
                  aria-label="Show previous products"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="similar-nav-btn"
                  onClick={onSimilarNext}
                  aria-label="Show more products"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="similar-viewport" ref={similarViewportRef}>
            <div className="similar-track">
              {similarRenderedProducts.map((item, renderedIndex) => {
              const itemId = item?.product_id || item?.id;
              const imageUrl = getCardImageUrl(item, { width: 560, height: 720, crop: 'limit' });
              const price = Number(item?.price ?? item?.base_price ?? 0);

              return (
                <Link key={`similar-${itemId}-${renderedIndex}`} to={`/products/${itemId}`} className="similar-card">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item?.name} className="similar-image" loading="lazy" />
                  ) : (
                    <div className="similar-image-empty">Image unavailable</div>
                  )}
                  <div className="similar-body">
                    <h3 className="similar-name">{item?.name}</h3>
                    <p className="similar-price">৳{price.toFixed(2)}</p>
                  </div>
                </Link>
              );
              })}
            </div>
          </div>
        </section>
      )}

      {youMayLikeProducts.length > 0 && (
        <section className="similar-products-section" aria-label="You may also like">
          <div className="similar-head">
            <h2 className="similar-title">You May Also Like</h2>
            {hasYouMayLikeWheel && (
              <div className="similar-controls">
                <button
                  type="button"
                  className="similar-nav-btn"
                  onClick={onYouMayLikePrev}
                  aria-label="Show previous suggestions"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="similar-nav-btn"
                  onClick={onYouMayLikeNext}
                  aria-label="Show more suggestions"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="similar-viewport" ref={youMayLikeViewportRef}>
            <div className="similar-track">
              {youMayLikeRenderedProducts.map((item, renderedIndex) => {
                const itemId = item?.product_id || item?.id;
                const imageUrl = getCardImageUrl(item, { width: 560, height: 720, crop: 'limit' });
                const price = Number(item?.price ?? item?.base_price ?? 0);

                return (
                  <Link key={`like-${itemId}-${renderedIndex}`} to={`/products/${itemId}`} className="similar-card">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item?.name} className="similar-image" loading="lazy" />
                    ) : (
                      <div className="similar-image-empty">Image unavailable</div>
                    )}
                    <div className="similar-body">
                      <h3 className="similar-name">{item?.name}</h3>
                      <p className="similar-price">৳{price.toFixed(2)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
