import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { categoryService, productService } from '../services';
import { useCategoryTree } from '../hooks/useCategories';
import { Loading } from '../components';
import { getCardImageUrl, getCategoryUrl } from '../utils';
import './PageUI.css';

const getProductImage = (product) => {
  return getCardImageUrl(product, { width: 560, height: 720, crop: 'limit' });
};

const getProductPrice = (product) => Number(product?.price ?? product?.base_price ?? 0);
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

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { tree: categoryTree } = useCategoryTree();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const categoryId = searchParams.get('category_id') || '';
  const parentId = searchParams.get('parent_id') || '';
  const legacyCategoryId = /^\d+$/.test(category) ? category : '';
  const selectedCategoryId = categoryId || parentId || legacyCategoryId;
  const activeCategoryId = selectedCategoryId || '';
  const currentPage = Math.max(1, Number(searchParams.get('page') || '1'));

  const activeCategoryPath = (() => {
    if (activeCategoryId) {
      return findCategoryPath(categoryTree, (node) => String(node?.category_id) === String(activeCategoryId)) || [];
    }

    if (category && !/^\d+$/.test(category)) {
      return findCategoryPath(
        categoryTree,
        (node) => String(node?.category_slug || '').toLowerCase() === String(category).toLowerCase()
      ) || [];
    }

    return [];
  })();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        if (selectedCategoryId && Array.isArray(categoryTree) && categoryTree.length > 0) {
          const categoryExists = !!findCategoryPath(
            categoryTree,
            (node) => String(node?.category_id) === String(selectedCategoryId)
          );
          if (!categoryExists) {
            setProducts([]);
            setPagination({ page: currentPage, totalPages: 0, total: 0, limit: PAGE_SIZE });
            return;
          }
        }

        let resolvedCategoryId = selectedCategoryId || undefined;

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

          // If a category string was provided but does not resolve, do not fall back to full catalog.
          if (!resolvedCategoryId) {
            setProducts([]);
            setPagination({ page: currentPage, totalPages: 0, total: 0, limit: PAGE_SIZE });
            return;
          }
        }

        const response = await productService.getAllProducts({
          search: query || undefined,
          category_id: resolvedCategoryId,
          include_descendants: resolvedCategoryId ? 'true' : undefined,
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
  }, [query, category, selectedCategoryId, currentPage, categoryTree]);

  const onPageChange = (targetPage) => {
    const safePage = Math.max(1, targetPage);
    if (safePage === currentPage) return;
    const params = new URLSearchParams(searchParams);
    params.set('page', String(safePage));
    navigate(`/products?${params.toString()}`);
  };

  if (loading) return <Loading message="Loading products..." />;

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {activeCategoryPath.map((node, index) => {
              const isLast = index === activeCategoryPath.length - 1;
              return (
                <span key={node.category_id}>
                  / {isLast ? node.name : <Link to={getCategoryUrl(node)}>{node.name}</Link>}
                </span>
              );
            })}
          </nav>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Discover handcrafted collections curated for every style.</p>
        </div>
      </div>

      <p className="result-count">{Number(pagination.total || products.length).toLocaleString('en-BD')} Results</p>

      {error && <p className="msg-error" role="alert">{error}</p>}

      {!error && !products.length && <p className="msg-note">No products found.</p>}

      <div className="product-grid">
        {products.map((product) => {
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
