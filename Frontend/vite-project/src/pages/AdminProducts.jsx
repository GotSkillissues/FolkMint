import { useEffect, useState, useCallback } from 'react';
import { categoryService, productService } from '../services';

/* ─────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const unwrap = (res) => res?.data ?? res ?? {};

const normalizeCategories = (res) => {
  const payload = unwrap(res);
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeProductsResponse = (res) => {
  const payload = unwrap(res);
  return {
    products: Array.isArray(payload?.products) ? payload.products : [],
    pagination: payload?.pagination || {},
  };
};

const normalizeVariantsResponse = (res) => {
  const payload = unwrap(res);
  return Array.isArray(payload?.variants) ? payload.variants : [];
};

const normalizeImagesResponse = (res) => {
  const payload = unwrap(res);
  return Array.isArray(payload?.images) ? payload.images : [];
};

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  if (!msg) return null;

  return (
    <div className={`ap-toast ap-toast-${type}`}>
      {type === 'error' ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ) : (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}
      {msg}
    </div>
  );
};

/* Backend schema facts:
   - price lives on product (not variant)
   - variant columns: variant_id, product_id, size (nullable), stock_quantity
   - image columns: image_id, product_id, image_url, is_primary
   - backend createProduct defaults active unless is_active=false is explicitly sent
   - publishing is blocked by backend until at least one variant and one image exist
*/

const EMPTY_PRODUCT = { name: '', description: '', price: '', category_id: '' };
const EMPTY_VARIANT = { size: '', stock_quantity: '' };

/* ─────────────────────────────────────────
   Variant panel
───────────────────────────────────────── */
const VariantPanel = ({ productId, onToast }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newV, setNewV] = useState(EMPTY_VARIANT);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getVariants(productId);
      const fetched = normalizeVariantsResponse(res);
      setVariants(fetched);

      const d = {};
      fetched.forEach((v) => {
        d[v.variant_id] = {
          size: v.size || '',
          stock_quantity: String(v.stock_quantity ?? 0),
        };
      });
      setDraft(d);
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to load variants.', 'error');
    } finally {
      setLoading(false);
    }
  }, [productId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const stock = Number(newV.stock_quantity);

    if (Number.isNaN(stock) || stock < 0) {
      onToast('Stock quantity must be 0 or more.', 'error');
      return;
    }

    setCreating(true);
    try {
      await productService.createVariant(productId, {
        size: newV.size.trim().toUpperCase() || null,
        stock_quantity: stock,
      });
      onToast('Variant added.');
      setNewV(EMPTY_VARIANT);
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to add variant.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (variantId) => {
    const v = draft[variantId];
    const stock = Number(v.stock_quantity);

    if (Number.isNaN(stock) || stock < 0) {
      onToast('Stock must be 0 or more.', 'error');
      return;
    }

    setSavingId(variantId);
    try {
      await productService.updateVariant(variantId, {
        size: v.size.trim().toUpperCase() || null,
        stock_quantity: stock,
      });
      onToast('Variant updated.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to update variant.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (variantId) => {
    if (!window.confirm('Delete this variant?')) return;

    setDeletingId(variantId);
    try {
      await productService.deleteVariant(variantId);
      onToast('Variant deleted.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to delete variant.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const setField = (variantId, field, value) =>
    setDraft((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], [field]: value },
    }));

  if (loading) {
    return (
      <div className="ap-variant-panel">
        <div className="ap-variant-loading">
          <div className="ap-spinner" /> Loading variants…
        </div>
      </div>
    );
  }

  return (
    <div className="ap-variant-panel">
      <form className="ap-variant-add-form" onSubmit={handleCreate}>
        <p className="ap-variant-form-label">Add Variant</p>
        <div className="ap-variant-add-row">
          <div className="ap-vfield">
            <label className="ap-vlabel">
              Size <span className="ap-vmuted">(optional)</span>
            </label>
            <input
              className="ap-vinput"
              placeholder="e.g. S, M, L, XL"
              value={newV.size}
              onChange={(e) => setNewV((p) => ({ ...p, size: e.target.value }))}
            />
          </div>

          <div className="ap-vfield">
            <label className="ap-vlabel">
              Stock <span className="ap-req">*</span>
            </label>
            <input
              className="ap-vinput"
              type="number"
              min="0"
              placeholder="0"
              value={newV.stock_quantity}
              onChange={(e) => setNewV((p) => ({ ...p, stock_quantity: e.target.value }))}
              required
            />
          </div>

          <button className="ap-variant-add-btn" type="submit" disabled={creating}>
            {creating ? (
              <>
                <span className="ap-spinner" /> Adding…
              </>
            ) : (
              '+ Add'
            )}
          </button>
        </div>
      </form>

      {!variants.length ? (
        <p className="ap-variant-empty">
          No variants loaded yet. Add a variant above, or refresh after product creation if the
          default unsized variant was auto-created by the database trigger.
        </p>
      ) : (
        <div className="ap-variant-list">
          <div className="ap-variant-list-head">
            <span>Size</span>
            <span>Stock</span>
            <span>Created</span>
            <span></span>
          </div>

          {variants.map((v) => {
            const d = draft[v.variant_id] || {};
            return (
              <div key={v.variant_id} className="ap-variant-row">
                <input
                  className="ap-vinput"
                  placeholder="Unsized"
                  value={d.size || ''}
                  onChange={(e) => setField(v.variant_id, 'size', e.target.value)}
                />

                <div className="ap-vstock-wrap">
                  <input
                    className={`ap-vinput${Number(d.stock_quantity) === 0 ? ' ap-vinput-zero' : ''}`}
                    type="number"
                    min="0"
                    value={d.stock_quantity ?? ''}
                    onChange={(e) => setField(v.variant_id, 'stock_quantity', e.target.value)}
                  />
                  {Number(d.stock_quantity) === 0 && (
                    <span className="ap-out-of-stock">Out of stock</span>
                  )}
                </div>

                <span className="ap-variant-created">{v.created_at ? fmtDate(v.created_at) : '—'}</span>

                <div className="ap-variant-actions">
                  <button
                    className="ap-vbtn ap-vbtn-save"
                    type="button"
                    disabled={savingId === v.variant_id}
                    onClick={() => handleSave(v.variant_id)}
                  >
                    {savingId === v.variant_id ? <span className="ap-spinner" /> : 'Save'}
                  </button>

                  <button
                    className="ap-vbtn ap-vbtn-delete"
                    type="button"
                    disabled={deletingId === v.variant_id}
                    onClick={() => handleDelete(v.variant_id)}
                  >
                    {deletingId === v.variant_id ? <span className="ap-spinner" /> : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Image panel
───────────────────────────────────────── */
const ImagePanel = ({ productId, onToast }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(null);
  const [deletingImg, setDeletingImg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getImages(productId);
      setImages(normalizeImagesResponse(res));
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onToast('Only JPEG, PNG, and WebP images are supported.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onToast('Image must be under 5MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const uploadRes = await productService.uploadImage(file);
      const payload = unwrap(uploadRes);
      const imageUrl = payload?.url || payload?.image_url;

      if (!imageUrl) throw new Error('No URL returned from upload.');

      await productService.addImage(productId, {
        image_url: imageUrl,
        is_primary: images.length === 0,
      });

      onToast('Image uploaded.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (imageId) => {
    setSettingPrimary(imageId);
    try {
      await productService.setPrimaryImage(imageId);
      onToast('Primary image updated.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to set primary.', 'error');
    } finally {
      setSettingPrimary(null);
    }
  };

  const handleDeleteImg = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;

    setDeletingImg(imageId);
    try {
      await productService.deleteImage(imageId);
      onToast('Image deleted.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to delete image.', 'error');
    } finally {
      setDeletingImg(null);
    }
  };

  if (loading) {
    return (
      <div className="ap-image-panel">
        <div className="ap-variant-loading">
          <div className="ap-spinner" /> Loading images…
        </div>
      </div>
    );
  }

  return (
    <div className="ap-image-panel">
      <div className="ap-image-upload-row">
        <label className={`ap-upload-label${uploading ? ' uploading' : ''}`}>
          {uploading ? (
            <>
              <span className="ap-spinner" /> Uploading…
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Image
            </>
          )}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>

        <span className="ap-upload-hint">
          JPEG, PNG or WebP · max 5 MB · first image auto-set as primary
        </span>
      </div>

      {!images.length ? (
        <p className="ap-variant-empty">No images yet. Upload one above.</p>
      ) : (
        <div className="ap-image-grid">
          {images.map((img) => (
            <div key={img.image_id} className={`ap-image-card${img.is_primary ? ' ap-image-primary' : ''}`}>
              <div className="ap-image-thumb-wrap">
                <img src={img.image_url} alt="" className="ap-image-thumb" />
                {img.is_primary && <span className="ap-primary-chip">Primary</span>}
              </div>

              <div className="ap-image-card-actions">
                {!img.is_primary && (
                  <button
                    className="ap-vbtn ap-vbtn-save"
                    type="button"
                    disabled={settingPrimary === img.image_id}
                    onClick={() => handleSetPrimary(img.image_id)}
                  >
                    {settingPrimary === img.image_id ? <span className="ap-spinner" /> : 'Set Primary'}
                  </button>
                )}

                <button
                  className="ap-vbtn ap-vbtn-delete"
                  type="button"
                  disabled={deletingImg === img.image_id}
                  onClick={() => handleDeleteImg(img.image_id)}
                >
                  {deletingImg === img.image_id ? <span className="ap-spinner" /> : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', category: '', sort: 'newest' });
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [creating, setCreating] = useState(false);

  const [editDrafts, setEditDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null); // 'variants' | 'images'
  const [publishingId, setPublishingId] = useState(null);

  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  useEffect(() => {
    categoryService
      .getAllCategories()
      .then((res) => setCategories(normalizeCategories(res)))
      .catch(() => setCategories([]));
  }, []);

  const loadProducts = useCallback(
    async (page = 1, f = filters) => {
      setLoading(true);
      try {
        const res = await productService.getAllProducts({
          page,
          limit: 12,
          search: f.search.trim() || undefined,
          category: f.category || undefined,
          sort: f.sort,
        });

        const { products: fetched, pagination: pg } = normalizeProductsResponse(res);

        setProducts(fetched);
        setPagination({
          page: Number(pg.page) || page,
          pages: Number(pg.pages || pg.totalPages) || 1,
          total: Number(pg.total) || fetched.length,
        });

        const d = {};
        fetched.forEach((p) => {
          d[p.product_id] = {
            name: p.name || '',
            description: p.description || '',
            price: p.price || '',
            category_id: String(p.category_id || ''),
          };
        });
        setEditDrafts(d);
      } catch (err) {
        showToast(err?.error || err?.message || 'Failed to load products.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [filters, showToast]
  );

  useEffect(() => {
    loadProducts();
  }, []); // eslint-disable-line

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newProduct.name.trim() || !newProduct.price || !newProduct.category_id) {
      showToast('Name, price, and category are required.', 'error');
      return;
    }

    const priceNum = parseFloat(newProduct.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be a valid positive number.', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await productService.createProduct({
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || undefined,
        price: priceNum.toFixed(2),
        category_id: Number(newProduct.category_id),
        is_active: false,
      });

      const payload = unwrap(res);
      showToast('Product created as draft. Add variants and images, then publish it.');
      setNewProduct(EMPTY_PRODUCT);
      setShowCreate(false);
      await loadProducts(1, filters);

      const createdId = payload?.product?.product_id;
      if (createdId) {
        setExpandedId(createdId);
        setExpandedPanel('images');
      }
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to create product.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (productId) => {
    const d = editDrafts[productId];

    if (!d?.name?.trim() || !d.price || !d.category_id) {
      showToast('Name, price, and category are required.', 'error');
      return;
    }

    const priceNum = parseFloat(d.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be a valid positive number.', 'error');
      return;
    }

    setSavingId(productId);
    try {
      await productService.updateProduct(productId, {
        name: d.name.trim(),
        description: d.description.trim() || undefined,
        price: priceNum.toFixed(2),
        category_id: Number(d.category_id),
      });
      showToast('Product saved.');
      await loadProducts(pagination.page, filters);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to save product.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleTogglePublish = async (product) => {
    setPublishingId(product.product_id);
    try {
      await productService.updateProduct(product.product_id, {
        is_active: !product.is_active,
      });
      showToast(product.is_active ? 'Product unpublished.' : 'Product published.');
      await loadProducts(pagination.page, filters);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to update visibility.', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product? If it has order history it will be hidden instead.')) {
      return;
    }

    setDeletingId(productId);
    try {
      await productService.deleteProduct(productId);
      showToast('Product deleted.');
      const nextPage = products.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await loadProducts(nextPage, filters);
      if (expandedId === productId) {
        setExpandedId(null);
        setExpandedPanel(null);
      }
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete product.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const togglePanel = (productId, panel) => {
    if (expandedId === productId && expandedPanel === panel) {
      setExpandedId(null);
      setExpandedPanel(null);
    } else {
      setExpandedId(productId);
      setExpandedPanel(panel);
    }
  };

  const setDraftField = (productId, field, value) =>
    setEditDrafts((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));

  const applySearch = (e) => {
    e.preventDefault();
    loadProducts(1, filters);
  };

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <p className="ap-eyebrow">Admin</p>
          <h1 className="ap-title">Products</h1>
        </div>

        <button className="ap-create-btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? (
            'Cancel'
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Product
            </>
          )}
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      {showCreate && (
        <div className="ap-create-card">
          <h3 className="ap-card-title">New Product</h3>
          <p className="ap-card-hint">
            Products are created as <strong>drafts</strong>. After creating, add at least one
            variant and one image, then publish.
          </p>

          <form className="ap-create-form" onSubmit={handleCreate} noValidate>
            <div className="ap-create-row ap-create-row-main">
              <div className="ap-field ap-field-grow">
                <label className="ap-label">
                  Product name <span className="ap-req">*</span>
                </label>
                <input
                  className="ap-input"
                  placeholder="e.g. Jamdani Saree"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="ap-field ap-field-price">
                <label className="ap-label">
                  Price (৳) <span className="ap-req">*</span>
                </label>
                <input
                  className="ap-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                  required
                />
              </div>

              <div className="ap-field ap-field-cat">
                <label className="ap-label">
                  Category <span className="ap-req">*</span>
                </label>
                <select
                  className="ap-select"
                  value={newProduct.category_id}
                  onChange={(e) => setNewProduct((p) => ({ ...p, category_id: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ap-field">
              <label className="ap-label">Description</label>
              <textarea
                className="ap-textarea"
                rows={3}
                placeholder="Short description of the product…"
                value={newProduct.description}
                onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="ap-create-foot">
              <button className="ap-btn-primary" type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <span className="ap-spinner" /> Creating…
                  </>
                ) : (
                  'Create Product'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="ap-filters-card">
        <form className="ap-filters" onSubmit={applySearch}>
          <input
            className="ap-input ap-input-search"
            placeholder="Search products…"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />

          <select
            className="ap-select"
            value={filters.category}
            onChange={(e) => {
              const f = { ...filters, category: e.target.value };
              setFilters(f);
              loadProducts(1, f);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="ap-select"
            value={filters.sort}
            onChange={(e) => {
              const f = { ...filters, sort: e.target.value };
              setFilters(f);
              loadProducts(1, f);
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="price_asc">Price Low–High</option>
            <option value="price_desc">Price High–Low</option>
          </select>

          <button className="ap-btn-primary" type="submit">
            Search
          </button>
        </form>

        <p className="ap-count">
          {pagination.total} product{pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="ap-loading">
          <div className="ap-spinner ap-spinner-lg" />
          <p>Loading products…</p>
        </div>
      ) : !products.length ? (
        <div className="ap-empty">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <p>No products found.</p>
        </div>
      ) : (
        <div className="ap-product-list">
          {products.map((product) => {
            const d = editDrafts[product.product_id] || {};
            const isExpandedVariants = expandedId === product.product_id && expandedPanel === 'variants';
            const isExpandedImages = expandedId === product.product_id && expandedPanel === 'images';

            const primaryImage = product.primary_image || product.image_url || null;

            return (
              <div
                key={product.product_id}
                className={`ap-product-card${!product.is_active ? ' ap-product-inactive' : ''}`}
              >
                <div className="ap-product-row">
                  <div className="ap-product-thumb">
                    {primaryImage ? (
                      <img src={primaryImage} alt={product.name} />
                    ) : (
                      <div className="ap-thumb-placeholder">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="ap-product-fields">
                    <div className="ap-product-fields-top">
                      <div className="ap-field ap-field-grow">
                        <label className="ap-label">Name</label>
                        <input
                          className="ap-input"
                          value={d.name || ''}
                          onChange={(e) => setDraftField(product.product_id, 'name', e.target.value)}
                        />
                      </div>

                      <div className="ap-field ap-field-price">
                        <label className="ap-label">Price (৳)</label>
                        <input
                          className="ap-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={d.price || ''}
                          onChange={(e) => setDraftField(product.product_id, 'price', e.target.value)}
                        />
                      </div>

                      <div className="ap-field ap-field-cat">
                        <label className="ap-label">Category</label>
                        <select
                          className="ap-select"
                          value={d.category_id || ''}
                          onChange={(e) => setDraftField(product.product_id, 'category_id', e.target.value)}
                        >
                          <option value="">Select…</option>
                          {categories.map((c) => (
                            <option key={c.category_id} value={c.category_id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="ap-field">
                      <label className="ap-label">Description</label>
                      <textarea
                        className="ap-textarea ap-textarea-sm"
                        rows={2}
                        value={d.description || ''}
                        onChange={(e) => setDraftField(product.product_id, 'description', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="ap-product-meta">
                    <div className="ap-product-meta-top">
                      <div className="ap-product-sku">
                        <span className="ap-meta-label">SKU</span>
                        <span className="ap-sku-val">{product.sku || '—'}</span>
                      </div>

                      <div className="ap-product-stock">
                        <span className="ap-meta-label">Stock</span>
                        <span
                          className={`ap-stock-val${(product.total_stock || 0) === 0 ? ' ap-stock-zero' : ''}`}
                        >
                          {product.total_stock ?? 0}
                        </span>
                      </div>

                      <div>
                        <span className="ap-meta-label">Added</span>
                        <span className="ap-meta-val">{fmtDate(product.created_at)}</span>
                      </div>
                    </div>

                    <div className="ap-product-actions">
                      <button
                        className={`ap-publish-btn${product.is_active ? ' ap-publish-active' : ''}`}
                        type="button"
                        disabled={publishingId === product.product_id}
                        onClick={() => handleTogglePublish(product)}
                        title={
                          product.is_active
                            ? 'Click to unpublish'
                            : 'Click to publish (requires at least one variant and one image)'
                        }
                      >
                        {publishingId === product.product_id ? (
                          <span className="ap-spinner" />
                        ) : product.is_active ? (
                          'Live'
                        ) : (
                          'Draft'
                        )}
                      </button>

                      <button
                        className="ap-action-btn ap-action-save"
                        type="button"
                        disabled={savingId === product.product_id}
                        onClick={() => handleSave(product.product_id)}
                      >
                        {savingId === product.product_id ? <span className="ap-spinner" /> : 'Save'}
                      </button>

                      <button
                        className={`ap-action-btn ap-action-panel${isExpandedVariants ? ' active' : ''}`}
                        type="button"
                        onClick={() => togglePanel(product.product_id, 'variants')}
                      >
                        Variants
                      </button>

                      <button
                        className={`ap-action-btn ap-action-panel${isExpandedImages ? ' active' : ''}`}
                        type="button"
                        onClick={() => togglePanel(product.product_id, 'images')}
                      >
                        Images
                      </button>

                      <button
                        className="ap-action-btn ap-action-delete"
                        type="button"
                        disabled={deletingId === product.product_id}
                        onClick={() => handleDelete(product.product_id)}
                      >
                        {deletingId === product.product_id ? <span className="ap-spinner" /> : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpandedVariants && (
                  <VariantPanel productId={product.product_id} onToast={showToast} />
                )}

                {isExpandedImages && (
                  <ImagePanel productId={product.product_id} onToast={showToast} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="ap-pagination">
          <p className="ap-muted">
            Page {pagination.page} of {pagination.pages}
          </p>

          <div className="ap-pag-btns">
            <button
              className="ap-pag-btn"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadProducts(pagination.page - 1, filters)}
            >
              ← Previous
            </button>

            <button
              className="ap-pag-btn"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => loadProducts(pagination.page + 1, filters)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <style>{`
        .ap-page {
          width: 100%;
          padding: 40px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-alt);
          min-height: 100vh;
        }

        .ap-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 4px;
        }
        .ap-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }
        .ap-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
          margin: 0;
        }
        .ap-create-btn {
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
          transition: background .2s;
          white-space: nowrap;
        }
        .ap-create-btn:hover { background: var(--black); }

        .ap-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--r);
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid;
          animation: ap-fade .2s ease;
        }
        @keyframes ap-fade { from { opacity: 0; transform: translateY(-6px); } }
        .ap-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ap-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        .ap-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ap-req { color: #b91c1c; margin-left: 2px; }

        .ap-input {
          padding: 9px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color .2s, box-shadow .2s;
        }
        .ap-input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(196,146,42,.1);
        }
        .ap-input-search { max-width: 320px; }

        .ap-textarea {
          padding: 9px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          resize: vertical;
          line-height: 1.6;
          transition: border-color .2s;
        }
        .ap-textarea:focus { outline: none; border-color: var(--gold); }
        .ap-textarea-sm { min-height: 56px; }

        .ap-select {
          padding: 9px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          cursor: pointer;
          box-sizing: border-box;
          width: 100%;
        }
        .ap-select:focus { outline: none; border-color: var(--gold); }

        .ap-field { display: flex; flex-direction: column; gap: 5px; }
        .ap-field-grow { flex: 1 1 220px; }
        .ap-field-price { flex: 0 0 130px; }
        .ap-field-cat { flex: 0 0 180px; }

        .ap-btn-primary {
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
          white-space: nowrap;
          transition: background .2s;
        }
        .ap-btn-primary:hover:not(:disabled) { background: var(--black); }
        .ap-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .ap-create-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 28px 32px;
          animation: ap-fade .2s ease;
        }
        .ap-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin: 0 0 6px;
        }
        .ap-card-hint {
          font-size: 13px;
          color: var(--muted);
          margin: 0 0 20px;
          line-height: 1.6;
        }
        .ap-create-form { display: flex; flex-direction: column; gap: 14px; }
        .ap-create-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .ap-create-row-main { align-items: flex-end; }
        .ap-create-foot { display: flex; justify-content: flex-end; }

        .ap-filters-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ap-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          flex: 1;
        }
        .ap-count {
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
          margin: 0;
        }

        .ap-loading, .ap-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 64px 24px;
          color: var(--muted);
          font-size: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }

        .ap-product-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ap-product-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          transition: box-shadow .2s;
        }
        .ap-product-card:hover { box-shadow: var(--sh-md); }
        .ap-product-inactive {
          opacity: .72;
          border-style: dashed;
        }

        .ap-product-row {
          display: flex;
          gap: 0;
          align-items: stretch;
        }

        .ap-product-thumb {
          width: 90px;
          flex-shrink: 0;
          background: var(--bg-alt);
          border-right: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ap-product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ap-thumb-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--muted);
          min-height: 80px;
        }

        .ap-product-fields {
          flex: 1;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-right: 1px solid var(--border);
        }
        .ap-product-fields-top {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .ap-product-meta {
          width: 220px;
          flex-shrink: 0;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        }
        .ap-product-meta-top {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ap-meta-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 2px;
        }
        .ap-meta-val {
          font-size: 13px;
          color: var(--dark);
        }
        .ap-sku-val {
          font-family: ui-monospace, monospace;
          font-size: 12.5px;
          color: var(--dark);
        }
        .ap-stock-val {
          font-size: 18px;
          font-weight: 700;
          color: #15803d;
        }
        .ap-stock-zero { color: #dc2626; }
        .ap-product-sku, .ap-product-stock { display: flex; flex-direction: column; }

        .ap-product-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ap-publish-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 14px;
          border-radius: calc(var(--r) - 2px);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ap-publish-btn.ap-publish-active {
          background: #f0faf3;
          border-color: #bbe5c8;
          color: #15803d;
        }
        .ap-publish-btn:disabled { opacity: .5; cursor: not-allowed; }

        .ap-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 7px 14px;
          border-radius: calc(var(--r) - 2px);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .04em;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          white-space: nowrap;
        }
        .ap-action-btn:disabled { opacity: .4; cursor: not-allowed; }

        .ap-action-save {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--gold);
        }
        .ap-action-save:hover:not(:disabled) {
          background: var(--black);
          border-color: var(--black);
        }

        .ap-action-panel {
          background: var(--bg);
          border-color: var(--border);
          color: var(--dark);
        }
        .ap-action-panel:hover,
        .ap-action-panel.active {
          border-color: var(--gold);
          color: var(--gold);
          background: #fffbf0;
        }

        .ap-action-delete {
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ap-action-delete:hover:not(:disabled) {
          background: #9f1239;
          border-color: #9f1239;
          color: #fff;
        }

        .ap-variant-panel {
          border-top: 1px solid var(--border);
          background: #fffbf0;
          padding: 20px 24px;
          animation: ap-fade .2s ease;
        }
        .ap-variant-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--muted);
        }
        .ap-variant-form-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0 0 10px;
        }
        .ap-variant-add-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .ap-vfield { display: flex; flex-direction: column; gap: 4px; }
        .ap-vlabel {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ap-vmuted { font-weight: 400; text-transform: none; letter-spacing: 0; }

        .ap-vinput {
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13px;
          color: var(--dark);
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color .2s;
        }
        .ap-vinput:focus { outline: none; border-color: var(--gold); }
        .ap-vinput-zero { border-color: #fca5a5; background: #fff5f5; }

        .ap-variant-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: calc(var(--r) - 2px);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background .2s;
          align-self: flex-end;
        }
        .ap-variant-add-btn:hover:not(:disabled) { background: var(--black); }
        .ap-variant-add-btn:disabled { opacity: .5; cursor: not-allowed; }

        .ap-variant-empty {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.65;
          margin: 0;
        }

        .ap-variant-list {
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          overflow: hidden;
          background: var(--bg-card);
        }
        .ap-variant-list-head {
          display: grid;
          grid-template-columns: 160px 160px 1fr auto;
          gap: 12px;
          padding: 10px 14px;
          background: var(--bg-alt);
          border-bottom: 1px solid var(--border);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ap-variant-row {
          display: grid;
          grid-template-columns: 160px 160px 1fr auto;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          align-items: center;
          transition: background .2s;
        }
        .ap-variant-row:last-child { border-bottom: none; }
        .ap-variant-row:hover { background: var(--bg); }

        .ap-vstock-wrap { display: flex; flex-direction: column; gap: 3px; }
        .ap-out-of-stock {
          font-size: 10px;
          font-weight: 700;
          color: #dc2626;
          letter-spacing: .04em;
        }
        .ap-variant-created {
          font-size: 12px;
          color: var(--muted);
        }

        .ap-variant-actions { display: flex; gap: 6px; }
        .ap-vbtn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: calc(var(--r) - 2px);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          white-space: nowrap;
        }
        .ap-vbtn:disabled { opacity: .4; cursor: not-allowed; }

        .ap-vbtn-save {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--gold);
        }
        .ap-vbtn-save:hover:not(:disabled) {
          background: var(--black);
          border-color: var(--black);
        }

        .ap-vbtn-delete {
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ap-vbtn-delete:hover:not(:disabled) {
          background: #9f1239;
          border-color: #9f1239;
          color: #fff;
        }

        .ap-image-panel {
          border-top: 1px solid var(--border);
          background: #fffbf0;
          padding: 20px 24px;
          animation: ap-fade .2s ease;
        }
        .ap-image-upload-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .ap-upload-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          background: var(--dark);
          color: var(--gold);
          border-radius: calc(var(--r) - 2px);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s;
          white-space: nowrap;
        }
        .ap-upload-label:hover:not(.uploading) { background: var(--black); }
        .ap-upload-label.uploading { opacity: .7; cursor: not-allowed; }
        .ap-upload-hint {
          font-size: 12px;
          color: var(--muted);
        }

        .ap-image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
        .ap-image-card {
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          overflow: hidden;
          background: var(--bg-card);
          transition: box-shadow .2s;
        }
        .ap-image-card:hover { box-shadow: var(--sh-md); }
        .ap-image-primary { border-color: var(--gold); border-width: 2px; }

        .ap-image-thumb-wrap {
          position: relative;
          aspect-ratio: 4/5;
          background: var(--bg-alt);
          overflow: hidden;
        }
        .ap-image-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ap-primary-chip {
          position: absolute;
          top: 6px;
          left: 6px;
          padding: 2px 8px;
          background: var(--gold);
          color: var(--dark);
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .ap-image-card-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
        }

        .ap-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }
        .ap-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .ap-pag-btns { display: flex; gap: 8px; }
        .ap-pag-btn {
          padding: 8px 18px;
          border-radius: var(--r);
          border: 1px solid var(--border);
          background: var(--bg-card);
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          cursor: pointer;
          transition: all .2s;
        }
        .ap-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ap-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        @keyframes ap-spin { to { transform: rotate(360deg); } }
        .ap-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid rgba(196,146,42,.3);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: ap-spin .7s linear infinite;
          flex-shrink: 0;
        }
        .ap-spinner-lg { width: 28px; height: 28px; }

        @media (max-width: 1100px) {
          .ap-page { padding: 32px 28px 56px; }
          .ap-product-meta { width: 180px; }
        }
        @media (max-width: 860px) {
          .ap-page { padding: 24px 20px 48px; }
          .ap-head { flex-direction: column; align-items: flex-start; }
          .ap-product-row { flex-direction: column; }
          .ap-product-thumb {
            width: 100%;
            height: 160px;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }
          .ap-product-meta {
            width: 100%;
            border-top: 1px solid var(--border);
          }
          .ap-product-meta-top { flex-direction: row; gap: 20px; }
          .ap-product-actions { flex-direction: row; flex-wrap: wrap; }
          .ap-variant-list-head,
          .ap-variant-row { grid-template-columns: 120px 120px 1fr auto; }
        }
        @media (max-width: 560px) {
          .ap-filters { flex-direction: column; align-items: stretch; }
          .ap-input-search { max-width: 100%; }
          .ap-variant-list-head { display: none; }
          .ap-variant-row { grid-template-columns: 1fr 1fr; gap: 8px; }
          .ap-variant-created { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;