import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const productService = {
  // Get all products
  getAllProducts: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get product by ID
  getProductById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get products by category
  getProductsByCategory: async (categoryId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_CATEGORY(categoryId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Search products
  searchProducts: async (searchTerm) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.SEARCH, {
        params: { q: searchTerm },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create product (admin only)
  createProduct: async (productData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update product (admin only)
  updateProduct: async (id, productData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete product (admin only)
  deleteProduct: async (id) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default productService;
