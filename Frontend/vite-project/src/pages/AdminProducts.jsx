import { useEffect, useState } from 'react';
import { categoryService, productService, variantService } from '../services';
import './PageUI.css';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [filters, setFilters] = useState({
    search: '',
    category_id: 'all',
    sort: 'newest',
  });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editing, setEditing] = useState({});
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [variantsMap, setVariantsMap] = useState({});
  const [variantLoadingId, setVariantLoadingId] = useState(null);
  const [variantSavingKey, setVariantSavingKey] = useState('');
  const [variantDeletingId, setVariantDeletingId] = useState(null);
  const [newVariant, setNewVariant] = useState({ size: '', color: '', stock_quantity: 0, price: '' });
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    base_price: '',
    category_id: '',
  });
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  const getStock = (product) => Number(product?.stock ?? product?.stock_quantity ?? 0);

  const loadProducts = async (page = pagination.page, nextFilters = filters) => {
    setLoading(true);
    setError('');

    try {
      const response = await productService.getAllProducts({
        page,
        limit: pagination.limit,
        search: nextFilters.search?.trim() || undefined,
        category_id: nextFilters.category_id !== 'all' ? nextFilters.category_id : undefined,
        sort: nextFilters.sort,
      });

      const fetchedProducts = Array.isArray(response?.products) ? response.products : [];
      setProducts(fetchedProducts);

      const backendPagination = response?.pagination || {};
      setPagination({
        page: backendPagination.page || page,
        pages: backendPagination.pages || backendPagination.totalPages || 1,
        total: backendPagination.total || fetchedProducts.length,
        limit: backendPagination.limit || pagination.limit,
      });

      const draft = {};
      fetchedProducts.forEach((item) => {
        draft[item.product_id] = {
          name: item.name || '',
          description: item.description || '',
          base_price: item.base_price || item.price || '',
          category_id: item.category_id || '',
        };
      });
      setEditing(draft);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to load products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const response = await categoryService.getAllCategories();
        const allCategories = response?.categories || response?.data || response || [];
        setCategories(Array.isArray(allCategories) ? allCategories : []);
      } catch {
        setCategories([]);
      }
      loadProducts(1, filters);
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setProductDraft = (productId, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    if (!newProduct.name.trim() || !newProduct.base_price || !newProduct.category_id) {
      setError('Name, base price, and category are required to create a product.');
      return;
    }

    setCreating(true);
    setError('');
    setActionMessage('');

    try {
      await productService.createProduct({
        name: newProduct.name,
        description: newProduct.description,
        base_price: Number(newProduct.base_price),
        category_id: Number(newProduct.category_id),
      });

      setActionMessage('Product created successfully.');
      setNewProduct({ name: '', description: '', base_price: '', category_id: '' });
      await loadProducts(1, filters);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to create product.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProduct = async (productId) => {
    const draft = editing[productId];
    if (!draft?.name?.trim() || !draft.base_price || !draft.category_id) {
      setError('Name, base price, and category are required for updates.');
      return;
    }

    setSavingId(productId);
    setError('');
    setActionMessage('');

    try {
      await productService.updateProduct(productId, {
        name: draft.name,
        description: draft.description,
        base_price: Number(draft.base_price),
        category_id: Number(draft.category_id),
      });
      setActionMessage(`Product #${productId} updated.`);
      await loadProducts(pagination.page, filters);
      if (expandedProductId === productId) {
        await loadVariants(productId, true);
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to update product.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const confirmed = window.confirm(`Delete product #${productId}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(productId);
    setError('');
    setActionMessage('');

    try {
      await productService.deleteProduct(productId);
      setActionMessage(`Product #${productId} deleted.`);
      const nextPage = products.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await loadProducts(nextPage, filters);
      if (expandedProductId === productId) {
        setExpandedProductId(null);
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  const loadVariants = async (productId, keepExpanded = false) => {
    setVariantLoadingId(productId);
    try {
      const response = await variantService.getProductVariants(productId);
      setVariantsMap((prev) => ({
        ...prev,
        [productId]: response?.variants || [],
      }));
      if (!keepExpanded) {
        setExpandedProductId(productId);
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to load variants.');
    } finally {
      setVariantLoadingId(null);
    }
  };

  const toggleVariants = async (productId) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    if (variantsMap[productId]) {
      setExpandedProductId(productId);
      return;
    }

    await loadVariants(productId);
  };

  const handleCreateVariant = async (productId) => {
    if (!newVariant.price) {
      setError('Variant price is required.');
      return;
    }

    const savingKey = `create-${productId}`;
    setVariantSavingKey(savingKey);
    setError('');
    setActionMessage('');

    try {
      await variantService.createVariant(productId, {
        size: newVariant.size || null,
        color: newVariant.color || null,
        stock_quantity: Number(newVariant.stock_quantity || 0),
        price: Number(newVariant.price),
      });
      setActionMessage(`Variant added to product #${productId}.`);
      setNewVariant({ size: '', color: '', stock_quantity: 0, price: '' });
      await loadVariants(productId, true);
      await loadProducts(pagination.page, filters);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to create variant.');
    } finally {
      setVariantSavingKey('');
    }
  };

  const handleUpdateVariant = async (productId, variant) => {
    const savingKey = `variant-${variant.variant_id}`;
    setVariantSavingKey(savingKey);
    setError('');
    setActionMessage('');

    try {
      await variantService.updateVariant(variant.variant_id, {
        size: variant.size || null,
        color: variant.color || null,
        stock_quantity: Number(variant.stock_quantity || 0),
        price: Number(variant.price),
      });
      setActionMessage(`Variant #${variant.variant_id} updated.`);
      await loadVariants(productId, true);
      await loadProducts(pagination.page, filters);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to update variant.');
    } finally {
      setVariantSavingKey('');
    }
  };

  const handleDeleteVariant = async (productId, variantId) => {
    const confirmed = window.confirm(`Delete variant #${variantId}?`);
    if (!confirmed) return;

    setVariantDeletingId(variantId);
    setError('');
    setActionMessage('');

    try {
      await variantService.deleteVariant(variantId);
      setActionMessage(`Variant #${variantId} deleted.`);
      await loadVariants(productId, true);
      await loadProducts(pagination.page, filters);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to delete variant.');
    } finally {
      setVariantDeletingId(null);
    }
  };

  const updateVariantDraft = (productId, variantId, field, value) => {
    setVariantsMap((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).map((entry) => (
        entry.variant_id === variantId ? { ...entry, [field]: value } : entry
      )),
    }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadProducts(1, filters);
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    loadProducts(nextPage, filters);
  };

  return (
    <div className="page-shell admin-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin · Products</h1>
          <p className="page-subtitle">Control catalog with product CRUD, filters, and variant-level inventory/pricing.</p>
        </div>
      </div>
      {actionMessage && <p className="msg-success">{actionMessage}</p>}
      {error && <p className="msg-error">{error}</p>}

      <section className="ui-card section">
        <div className="admin-card-head">
          <h3>Create Product</h3>
        </div>

        <form className="admin-inline-form" onSubmit={handleCreateProduct}>
          <input className="ui-input" placeholder="Product name" value={newProduct.name} onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))} required />
          <input className="ui-input" placeholder="Base price" type="number" min="0" step="0.01" value={newProduct.base_price} onChange={(e) => setNewProduct((prev) => ({ ...prev, base_price: e.target.value }))} required />
          <select className="ui-select" value={newProduct.category_id} onChange={(e) => setNewProduct((prev) => ({ ...prev, category_id: e.target.value }))} required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>{category.name}</option>
            ))}
          </select>
          <textarea className="ui-textarea" placeholder="Description" rows={2} value={newProduct.description} onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))} />
          <button className="ui-btn" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Product'}</button>
        </form>
      </section>

      <section className="ui-card section">
        <div className="admin-card-head">
          <h3>Catalog Management</h3>
          <p className="admin-muted">Total products: {pagination.total}</p>
        </div>

        <form className="admin-toolbar" onSubmit={applyFilters}>
          <input
            className="ui-input"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search by product name or description"
          />
          <select
            className="ui-select"
            value={filters.category_id}
            onChange={(event) => setFilters((prev) => ({ ...prev, category_id: event.target.value }))}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>{category.name}</option>
            ))}
          </select>
          <select className="ui-select" value={filters.sort} onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="price_asc">Price Low-High</option>
            <option value="price_desc">Price High-Low</option>
          </select>
          <button className="ui-btn" type="submit">Apply</button>
        </form>

        {loading ? (
          <p className="msg-note">Loading products...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!products.length ? (
                  <tr>
                    <td colSpan={5}>No products found.</td>
                  </tr>
                ) : products.map((product) => {
                  const draft = editing[product.product_id] || {};
                  const variants = variantsMap[product.product_id] || [];
                  const isExpanded = expandedProductId === product.product_id;

                  return (
                    <tr key={product.product_id}>
                      <td>
                        <div className="stack">
                          <input className="ui-input" value={draft.name || ''} onChange={(e) => setProductDraft(product.product_id, 'name', e.target.value)} />
                          <textarea className="ui-textarea" rows={2} value={draft.description || ''} onChange={(e) => setProductDraft(product.product_id, 'description', e.target.value)} />
                        </div>
                      </td>
                      <td>
                        <input className="ui-input" type="number" min="0" step="0.01" value={draft.base_price || ''} onChange={(e) => setProductDraft(product.product_id, 'base_price', e.target.value)} />
                      </td>
                      <td>
                        <select className="ui-select" value={draft.category_id || ''} onChange={(e) => setProductDraft(product.product_id, 'category_id', e.target.value)}>
                          <option value="">Select</option>
                          {categories.map((category) => (
                            <option key={category.category_id} value={category.category_id}>{category.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>{getStock(product)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="ui-btn-ghost" type="button" onClick={() => toggleVariants(product.product_id)}>
                            {isExpanded ? 'Hide Variants' : 'Variants'}
                          </button>
                          <button className="ui-btn-ghost" type="button" disabled={savingId === product.product_id} onClick={() => handleUpdateProduct(product.product_id)}>
                            {savingId === product.product_id ? 'Saving...' : 'Save'}
                          </button>
                          <button className="ui-btn-ghost danger-text" type="button" disabled={deletingId === product.product_id} onClick={() => handleDeleteProduct(product.product_id)}>
                            {deletingId === product.product_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="msg-note" style={{ marginTop: '.5rem' }}>
                            {variantLoadingId === product.product_id ? (
                              <p className="admin-muted">Loading variants...</p>
                            ) : (
                              <div className="stack">
                                <div className="admin-inline-form">
                                  <input className="ui-input" placeholder="Size (optional)" value={newVariant.size} onChange={(e) => setNewVariant((prev) => ({ ...prev, size: e.target.value }))} />
                                  <input className="ui-input" placeholder="Color (optional)" value={newVariant.color} onChange={(e) => setNewVariant((prev) => ({ ...prev, color: e.target.value }))} />
                                  <input className="ui-input" type="number" min="0" placeholder="Stock" value={newVariant.stock_quantity} onChange={(e) => setNewVariant((prev) => ({ ...prev, stock_quantity: e.target.value }))} />
                                  <input className="ui-input" type="number" min="0" step="0.01" placeholder="Price" value={newVariant.price} onChange={(e) => setNewVariant((prev) => ({ ...prev, price: e.target.value }))} />
                                  <button className="ui-btn-ghost" type="button" disabled={variantSavingKey === `create-${product.product_id}`} onClick={() => handleCreateVariant(product.product_id)}>
                                    {variantSavingKey === `create-${product.product_id}` ? 'Adding...' : 'Add Variant'}
                                  </button>
                                </div>

                                {!variants.length ? (
                                  <p className="admin-muted">No variants added yet.</p>
                                ) : (
                                  variants.map((variant) => (
                                    <div key={variant.variant_id} className="list-row">
                                      <div className="admin-inline-form">
                                        <input className="ui-input" value={variant.size || ''} placeholder="Size" onChange={(e) => updateVariantDraft(product.product_id, variant.variant_id, 'size', e.target.value)} />
                                        <input className="ui-input" value={variant.color || ''} placeholder="Color" onChange={(e) => updateVariantDraft(product.product_id, variant.variant_id, 'color', e.target.value)} />
                                        <input className="ui-input" type="number" min="0" value={variant.stock_quantity || 0} onChange={(e) => updateVariantDraft(product.product_id, variant.variant_id, 'stock_quantity', e.target.value)} />
                                        <input className="ui-input" type="number" min="0" step="0.01" value={variant.price || 0} onChange={(e) => updateVariantDraft(product.product_id, variant.variant_id, 'price', e.target.value)} />
                                        <div className="row-actions">
                                          <button className="ui-btn-ghost" type="button" disabled={variantSavingKey === `variant-${variant.variant_id}`} onClick={() => handleUpdateVariant(product.product_id, variant)}>
                                            {variantSavingKey === `variant-${variant.variant_id}` ? 'Saving...' : 'Save'}
                                          </button>
                                          <button className="ui-btn-ghost danger-text" type="button" disabled={variantDeletingId === variant.variant_id} onClick={() => handleDeleteVariant(product.product_id, variant.variant_id)}>
                                            {variantDeletingId === variant.variant_id ? 'Deleting...' : 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-pagination">
          <p className="admin-muted">Page {pagination.page} of {pagination.pages || 1}</p>
          <div className="row-actions">
            <button className="ui-btn-ghost" type="button" disabled={pagination.page <= 1 || loading} onClick={() => goToPage(pagination.page - 1)}>Previous</button>
            <button className="ui-btn-ghost" type="button" disabled={pagination.page >= pagination.pages || loading} onClick={() => goToPage(pagination.page + 1)}>Next</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminProducts;
