import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../services';

/**
 * Hook for fetching all categories
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || response || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Get root categories
  const rootCategories = categories.filter(c => !c.parent_category);

  // Get subcategories for a parent
  const getSubcategories = (parentId) => {
    return categories.filter(c => c.parent_category === parentId);
  };

  // Get category by ID
  const getCategoryById = (categoryId) => {
    return categories.find(c => c.category_id === categoryId);
  };

  // Get breadcrumb path
  const getBreadcrumb = (categoryId) => {
    return categoryService.getCategoryBreadcrumb(categories, categoryId);
  };

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

/**
 * Hook for fetching categories as tree structure
 */
export const useCategoryTree = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to get tree from API first
      try {
        const response = await categoryService.getCategoryTree();
        setTree(response.data || response || []);
      } catch {
        // If tree endpoint doesn't exist, build from flat list
        const response = await categoryService.getAllCategories();
        const categories = response.data || response || [];
        const builtTree = categoryService.buildCategoryTree(categories);
        setTree(builtTree);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch category tree');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Flatten tree for dropdown/select
  const flattenedTree = categoryService.flattenCategoryTree(tree);

  return {
    tree,
    flattenedTree,
    loading,
    error,
    refetch: fetchTree,
  };
};
