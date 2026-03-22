import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const orderService = {
  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.BASE, orderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserOrders: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.USER_ORDERS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getOrderById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // getOrderItems is just getOrderById — the full order response includes items
  getOrderItems: async (orderId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  cancelOrder: async (orderId) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.CANCEL(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getAllOrders: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Admin only — PATCH /orders/:id/status
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.ORDERS.UPDATE_STATUS(orderId), { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // FIX: deleteOrder removed — DELETE /orders/:id does not exist in the backend router.
  // Cancelled orders stay in the DB. Use cancelOrder for pending orders.

  calculateOrderTotal: (items) => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price_at_purchase || item.unit_price || item.price);
      return sum + (price * item.quantity);
    }, 0);
  },

  canCancelOrder: (order) => {
    return order.status === 'pending';
  },

  canReviewOrder: (order) => {
    return order.status === 'delivered';
  },

  getStatusColor: (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#0ea5e9',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  },

  getStatusLabel: (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  },

  formatOrderDate: (date) => {
    return new Date(date).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  getOrderSummary: (order) => {
    const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    return {
      itemCount,
      total: parseFloat(order.total_amount),
      status: order.status,
      date: orderService.formatOrderDate(order.created_at),
    };
  },
};

export default orderService;