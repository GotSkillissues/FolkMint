import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Admin Service
 * Handles admin-specific operations
 * Requires admin role to access
 */
const adminService = {
  // ==================== DASHBOARD ====================

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get analytics data
  getAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN.ANALYTICS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get recent activity (orders + new users)
  getRecentActivity: async (limit = 8) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.RECENT_ACTIVITY, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get sales report
  getSalesReport: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.SALES, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get top products
  getTopProducts: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.TOP_PRODUCTS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get order status breakdown
  getOrderStatusBreakdown: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.ORDER_STATUS_BREAKDOWN);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get low stock variants
  getLowStock: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.LOW_STOCK, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get category performance
  getCategoryPerformance: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.CATEGORIES);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get review stats
  getReviewStats: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.REVIEWS);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== USER MANAGEMENT ====================

  // Get all users with filters
  getUsers: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN.USERS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.USERS}/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Ban/Unban user
  toggleUserStatus: async (userId, active) => {
    try {
      const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.USERS}/${userId}/status`, { active });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== ORDER MANAGEMENT ====================

  // Get all orders with filters
  getOrders: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN.ORDERS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Bulk update order status
  bulkUpdateOrderStatus: async (orderIds, status) => {
    try {
      const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.ORDERS}/bulk-status`, {
        order_ids: orderIds,
        status,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== PRODUCT MANAGEMENT ====================

  // Get all products with admin details
  getProducts: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN.PRODUCTS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get low stock products
  getLowStockProducts: async (threshold = 10) => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ADMIN.PRODUCTS}/low-stock`, {
        params: { threshold },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Bulk update product prices
  bulkUpdatePrices: async (updates) => {
    try {
      const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.PRODUCTS}/bulk-price`, {
        updates,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Bulk update stock
  bulkUpdateStock: async (updates) => {
    try {
      const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.PRODUCTS}/bulk-stock`, {
        updates,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== REPORTS ====================

  // Get customer insights
  getCustomerInsights: async () => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ADMIN.ANALYTICS}/customers`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Export data
  exportData: async (type, params = {}) => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ADMIN.ANALYTICS}/export/${type}`, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default adminService;