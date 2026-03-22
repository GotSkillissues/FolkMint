import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services';

// Backend response shape: { products: [...], pagination: { page, limit, total, pages } }
// Backend response shape for single: { product: { ...fields, variants: [], images: [] } }

export const useProducts = (initialParams = {}) => {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [params,     setParams]     = useState(initialParams);

  const fetchProducts = useCallback(async (page = pagination.page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getAllProducts({
        ...params,
        page,
        limit: pagination.limit,
      });
      setProducts(Array.isArray(res?.products) ? res.products : []);
      if (res?.pagination) {
        setPagination(prev => ({
          ...prev,
          page:  res.pagination.page  ?? prev.page,
          total: res.pagination.total ?? 0,
          pages: res.pagination.pages ?? 1,
        }));
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, pagination.limit]);

  useEffect(() => { fetchProducts(pagination.page); }, [fetchProducts, pagination.page]);

  const setPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const setLimit = (limit) => {
    setPagination(prev => ({ ...prev, page: 1, limit }));
  };

  const updateParams = (newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return {
    products,
    loading,
    error,
    pagination,
    setPage,
    setLimit,
    updateParams,
    refetch: () => fetchProducts(pagination.page),
  };
};

// Hook for a single product by ID — includes variants and images
export const useProduct = (productId) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProductById(productId);
      // Backend returns { product: { ...fields, variants: [], images: [] } }
      setProduct(res?.product ?? null);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  return { product, loading, error, refetch: fetchProduct };
};

// Debounced search hook
export const useProductSearch = (debounceMs = 300) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    const id = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await productService.searchProducts(query);
        setResults(Array.isArray(res?.products) ? res.products : []);
      } catch (err) {
        setError(err?.error || err?.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(id);
  }, [query, debounceMs]);

  return { query, setQuery, results, loading, error, clearResults: () => setResults([]) };
};