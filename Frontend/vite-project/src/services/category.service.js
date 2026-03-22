import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const categoryService = {
  sortByOrder: (a, b) => {
    const orderA = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : 0;
    const orderB = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  },

  getAllCategories: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getCategoryTree: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.TREE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getRootCategories: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.ROOT);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getCategoryById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getSubcategories: async (categoryId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.SUBCATEGORIES(categoryId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getChildrenWithProducts: async (categoryId, limit = 8) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.CHILDREN_WITH_PRODUCTS(categoryId), {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // FIX: was PUT — backend only exposes PATCH /categories/:id
  updateCategory: async (id, categoryData) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.CATEGORIES.BY_ID(id), categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  buildCategoryTree: (categories) => {
    const map = {};
    const roots = [];
    const sortedCategories = [...categories].sort(categoryService.sortByOrder);
    sortedCategories.forEach(cat => {
      map[cat.category_id] = { ...cat, subcategories: [] };
    });
    sortedCategories.forEach(cat => {
      if (cat.parent_category) {
        if (map[cat.parent_category]) {
          map[cat.parent_category].subcategories.push(map[cat.category_id]);
        }
      } else {
        roots.push(map[cat.category_id]);
      }
    });
    return roots;
  },

  flattenCategoryTree: (tree, depth = 0) => {
    const result = [];
    tree.forEach(category => {
      result.push({ ...category, depth });
      if (category.subcategories && category.subcategories.length > 0) {
        result.push(...categoryService.flattenCategoryTree(category.subcategories, depth + 1));
      }
    });
    return result;
  },

  getCategoryBreadcrumb: (categories, categoryId) => {
    const path = [];
    let current = categories.find(c => c.category_id === categoryId);
    while (current) {
      path.unshift(current);
      if (current.parent_category) {
        current = categories.find(c => c.category_id === current.parent_category);
      } else {
        break;
      }
    }
    return path;
  },

  hasSubcategories: (categories, categoryId) => {
    return categories.some(c => c.parent_category === categoryId);
  },

  getDescendantIds: (categories, categoryId) => {
    const ids = [];
    const children = categories
      .filter(c => c.parent_category === categoryId)
      .sort(categoryService.sortByOrder);
    children.forEach(child => {
      ids.push(child.category_id);
      ids.push(...categoryService.getDescendantIds(categories, child.category_id));
    });
    return ids;
  },
};

export default categoryService;