import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../services';

// Backend flat response:  { categories: [...] }          GET /api/categories
// Backend tree response:  { categories: [...] }          GET /api/categories?tree=true
// Tree nodes have a `children` array added by backend

// Unwrap either shape
const unwrapCategories = (res) => {
  const payload = res?.data ?? res ?? {};
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload))             return payload;
  return [];
};

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryService.getAllCategories();
      setCategories(unwrapCategories(res));
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const rootCategories = categories.filter(c => !c.parent_category);

  const getSubcategories = (parentId) =>
    categories.filter(c => c.parent_category === parentId);

  const getCategoryById = (categoryId) =>
    categories.find(c => c.category_id === categoryId) ?? null;

  // Build breadcrumb path from flat list
  const getBreadcrumb = (categoryId) =>
    categoryService.getCategoryBreadcrumb(categories, categoryId);

  return {
    categories,
    rootCategories,
    loading,
    error,
    getSubcategories,
    getCategoryById,
    getBreadcrumb,
    refetch: fetchCategories,
  };
};

// Hook for the tree view — used by Header, Home, CategoryLanding, Products
export const useCategoryTree = () => {
  const [tree,    setTree]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/categories?tree=true — backend returns tree with children arrays
      const res  = await categoryService.getCategoryTree();
      const list = unwrapCategories(res);
      if (list.length > 0) {
        setTree(list);
      } else {
        // Fallback: fetch flat list and build tree client-side
        const flatRes  = await categoryService.getAllCategories();
        const flatList = unwrapCategories(flatRes);
        setTree(categoryService.buildCategoryTree(flatList));
      }
    } catch {
      // If tree endpoint fails entirely, try flat fallback
      try {
        const flatRes  = await categoryService.getAllCategories();
        const flatList = unwrapCategories(flatRes);
        setTree(categoryService.buildCategoryTree(flatList));
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to fetch category tree');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  // Flat list with depth for dropdowns / selects
  const flattenedTree = categoryService.flattenCategoryTree(tree);

  return { tree, flattenedTree, loading, error, refetch: fetchTree };
};