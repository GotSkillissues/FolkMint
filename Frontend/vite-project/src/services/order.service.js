import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const orderService = {
  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.BASE, orderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all orders (admin) or user's orders
  getAllOrders: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user's orders
  getUserOrders: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.USER_ORDERS);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get order by ID
  getOrderById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update order status (admin only)
  updateOrderStatus: async (id, status) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.ORDERS.BY_ID(id), { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Cancel order
  cancelOrder: async (id) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.ORDERS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default orderService;
