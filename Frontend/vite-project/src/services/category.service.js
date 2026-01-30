import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Category Service
 * Handles all category-related API calls
 * Maps to: category table
 * 
 * Category Structure:
 * - Root categories have parent_category = NULL
 * - Subcategories reference their parent via parent_category
 */
const categoryService = {
  // Get all categories (flat list)
  getAllCategories: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get categories as tree structure
  getCategoryTree: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.TREE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get only root categories
  getRootCategories: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.ROOT);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get category by ID
  getCategoryById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get subcategories of a category
  getSubcategories: async (categoryId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.SUBCATEGORIES(categoryId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create category (admin only)
  createCategory: async (categoryData) => {
    try {
      // categoryData: { name, parent_category? }
      const response = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update category (admin only)
  updateCategory: async (id, categoryData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.CATEGORIES.BY_ID(id), categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete category (admin only)
  deleteCategory: async (id) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Build tree structure from flat list
  buildCategoryTree: (categories) => {
    const map = {};
    const roots = [];

    // Create map
    categories.forEach(cat => {
      map[cat.category_id] = { ...cat, subcategories: [] };
    });

    // Build tree
    categories.forEach(cat => {
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

  // Flatten tree to list
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

  // Get breadcrumb path for a category
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

  // Check if category has subcategories
  hasSubcategories: (categories, categoryId) => {
    return categories.some(c => c.parent_category === categoryId);
  },

  // Get all descendant category IDs
  getDescendantIds: (categories, categoryId) => {
    const ids = [];
    const children = categories.filter(c => c.parent_category === categoryId);
    
    children.forEach(child => {
      ids.push(child.category_id);
      ids.push(...categoryService.getDescendantIds(categories, child.category_id));
    });
    
    return ids;
  },
};

export default categoryService;
