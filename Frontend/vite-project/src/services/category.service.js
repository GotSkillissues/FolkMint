import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const categoryService = {
  // Get all categories
  getAllCategories: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE);
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

  // Create category (admin only)
  createCategory: async (categoryData) => {
    try {
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
};

export default categoryService;
