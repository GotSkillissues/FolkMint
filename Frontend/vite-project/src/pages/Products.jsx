import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { categoryService, productService } from '../services';
import { useCategoryTree } from '../hooks/useCategories';
import { Loading } from '../components';
import jamdaniProducts from '../data/jamdani-sarees.json';
import { getCardImageUrl } from '../utils';
import './PageUI.css';

const getProductImage = (product) => {
  return getCardImageUrl(product, { width: 560, height: 720, crop: 'limit' });
};

const getProductPrice = (product) => Number(product?.price ?? product?.base_price ?? 0);
const PAGE_SIZE = 16;

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const { tree: categoryTree } = useCategoryTree();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const categoryId = searchParams.get('category_id') || '';
  const parentId = searchParams.get('parent_id') || '';
  const source = searchParams.get('source') || '';
  const activeCategoryId = parentId || categoryId || '';
  const currentPage = Math.max(1, Number(searchParams.get('page') || '1'));

  useEffect(() => {
    setSearchText(query);
  }, [query]);

  useEffect(() => {
    setSortBy('featured');
  }, [query, category, categoryId, parentId]);

  const findCategoryNodeMeta = (nodes, targetId, parent = null) => {
    if (!Array.isArray(nodes) || !targetId) return null;

    for (const node of nodes) {
      if (String(node?.category_id) === String(targetId)) {
        return { node, parent };
      }

      const childNodes = Array.isArray(node?.children)
        ? node.children
        : Array.isArray(node?.subcategories)
          ? node.subcategories
          : [];

      const found = findCategoryNodeMeta(childNodes, targetId, node);
      if (found) return found;
    }

    return null;
  };

  const getChildren = (node) => {
    if (!node) return [];
    if (Array.isArray(node.children)) return node.children;
    if (Array.isArray(node.subcategories)) return node.subcategories;
    return [];
  };

  const activeMeta = findCategoryNodeMeta(categoryTree, activeCategoryId);
  const activeNode = activeMeta?.node || null;
  const activeParent = activeMeta?.parent || null;

  const activeChildren = getChildren(activeNode);

  let subcategoryNavItems = [];

  if (activeNode && activeChildren.length > 0) {
    subcategoryNavItems = activeChildren;
  } else if (activeNode && activeParent) {
    subcategoryNavItems = getChildren(activeParent);
  } else if (activeNode && !activeParent) {
    subcategoryNavItems = Array.isArray(categoryTree) ? categoryTree : [];
  }

  const buildSubcategoryUrl = (subcategoryId) => {
    const params = new URLSearchParams(searchParams);
    params.set('parent_id', String(subcategoryId));
    params.set('include_descendants', 'true');
    params.set('page', '1');
    params.delete('category_id');
    params.delete('category');
    return `/products?${params.toString()}`;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        if (source.toLowerCase() === 'jamdani') {
          const all = Array.isArray(jamdaniProducts) ? jamdaniProducts.slice(0, 40) : [];
          const total = all.length;
          const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
          const start = (currentPage - 1) * PAGE_SIZE;
          const pagedItems = all.slice(start, start + PAGE_SIZE);
          setProducts(pagedItems);
          setPagination({ page: currentPage, totalPages, total, limit: PAGE_SIZE });
          return;
        }

        let resolvedCategoryId = categoryId || undefined;

        if (!resolvedCategoryId && category) {
          if (/^\d+$/.test(category)) {
            resolvedCategoryId = category;
          } else {
            const categoriesResponse = await categoryService.getAllCategories();
            const payload = categoriesResponse?.data ?? categoriesResponse;
            const categoryList = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.categories)
                ? payload.categories
                : [];

            const normalize = (value) => String(value || '')
              .toLowerCase()
              .trim()
              .replace(/[-_]+/g, ' ')
              .replace(/\s+/g, ' ');

            const target = normalize(category);
            const matched = categoryList.find((item) => normalize(item?.name) === target);

            if (matched?.category_id) {
              resolvedCategoryId = String(matched.category_id);
            }
          }
        }

        const response = await productService.getAllProducts({
          search: query || undefined,
          category_id: resolvedCategoryId,
          parent_id: parentId || undefined,
          include_descendants: parentId ? 'true' : undefined,
          page: currentPage,
          limit: PAGE_SIZE,
        });

        const payload = response?.data ?? response ?? {};
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.products)
            ? payload.products
            : [];
        const serverPagination = payload?.pagination || null;

        if (serverPagination) {
          setPagination({
            page: Number(serverPagination.page) || currentPage,
            totalPages: Number(serverPagination.totalPages) || 1,
            total: Number(serverPagination.total) || items.length,
            limit: Number(serverPagination.limit) || PAGE_SIZE,
          });
        } else {
          setPagination({ page: currentPage, totalPages: 1, total: items.length, limit: PAGE_SIZE });
        }

        setProducts(Array.isArray(items) ? items : []);
      } catch (err) {
        setError(err?.message || 'Failed to load products.');
        setProducts([]);
        setPagination({ page: currentPage, totalPages: 1, total: 0, limit: PAGE_SIZE });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [query, category, categoryId, parentId, source, currentPage]);

  const onSearchSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);

    if (searchText.trim()) {
      params.set('q', searchText.trim());
    } else {
      params.delete('q');
    }

    params.set('page', '1');

    navigate(`/products?${params.toString()}`);
  };

  const onPageChange = (targetPage) => {
    const safePage = Math.max(1, targetPage);
    if (safePage === currentPage) return;
    const params = new URLSearchParams(searchParams);
    params.set('page', String(safePage));
    navigate(`/products?${params.toString()}`);
  };

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = getProductPrice(a);
    const priceB = getProductPrice(b);

    if (sortBy === 'price_low') return priceA - priceB;
    if (sortBy === 'price_high') return priceB - priceA;
    if (sortBy === 'name_asc') return (a?.name || '').localeCompare(b?.name || '');

    return 0;
  });

  if (loading) return <Loading message="Loading products..." />;

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Discover handcrafted collections curated for every style.</p>
        </div>
      </div>

      <form className="ui-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="ui-input"
          type="text"
          placeholder="Search products, e.g. saree, pottery, necklace..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div className="row-actions">
          <select className="ui-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="name_asc">Name: A-Z</option>
          </select>
          <button className="ui-btn" type="submit">Search</button>
        </div>
      </form>

      {subcategoryNavItems.length > 0 && (
        <div className="subcat-nav-wrap" role="navigation" aria-label="Subcategories">
          <div className="subcat-nav">
            {subcategoryNavItems.map((subcategory) => {
              const childHasMore = getChildren(subcategory).length > 0;
              return (
                <Link
                  key={subcategory.category_id}
                  to={buildSubcategoryUrl(subcategory.category_id)}
                  className={`subcat-link${String(activeCategoryId) === String(subcategory.category_id) ? ' active' : ''}`}
                >
                  {subcategory.name}
                  {childHasMore ? ' ▾' : ''}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(query || category || categoryId || parentId) && (
        <p className="msg-note">
          Showing results{query ? ` for "${query}"` : ''}{category ? ` in ${category}` : ''}
        </p>
      )}

      {error && <p className="msg-error" role="alert">{error}</p>}

      {!error && !sortedProducts.length && <p className="msg-note">No products found.</p>}

      <div className="product-grid">
        {sortedProducts.map((product) => {
          const productId = product?.product_id || product?.id;
          const price = getProductPrice(product);
          const imageUrl = getProductImage(product);

          return (
            <Link
              key={productId}
              to={`/products/${productId}`}
              className="product-card"
            >
              <div className="product-image-wrap">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product?.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="product-image-empty">Image unavailable</div>
                )}
              </div>
              <div className="product-card-body">
                <h3 className="product-name">{product?.name}</h3>
                <p className="product-price">৳{price.toFixed(2)}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="products-pagination" role="navigation" aria-label="Products pagination">
          {currentPage > 1 && (
            <button
              className="ui-btn-ghost"
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </button>
          )}
          <p className="admin-muted">
            Page {currentPage} of {pagination.totalPages}
          </p>
          {currentPage < pagination.totalPages && (
            <button
              className="ui-btn-ghost"
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Products;
