import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Order Service
 * Handles all order-related API calls
 * Maps to: orders, order_item tables
 * 
 * Order Status Flow:
 * pending -> paid -> shipped -> delivered
 *        \-> cancelled
 */
const orderService = {
  // ==================== CREATE & GET ORDERS ====================

  // Create new order
  createOrder: async (orderData) => {
    try {
      // orderData: { address_id, method_id?, items: [{ variant_id, quantity }] }
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.BASE, orderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user's orders
  getUserOrders: async (params = {}) => {
    try {
      // params: { page, limit, status }
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.USER_ORDERS, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get order by ID (includes items, address, payment)
  getOrderById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get order items
  getOrderItems: async (orderId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.ITEMS(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== ORDER ACTIONS ====================

  // Cancel order (user action)
  cancelOrder: async (orderId) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.CANCEL(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== ADMIN OPERATIONS ====================

  // Get all orders (admin only)
  getAllOrders: async (params = {}) => {
    try {
      // params: { page, limit, status, user_id, from_date, to_date }
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update order status (admin only)
  updateOrderStatus: async (orderId, status) => {
    try {
      // status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
      const response = await apiClient.put(API_ENDPOINTS.ORDERS.UPDATE_STATUS(orderId), { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete order (admin only, for cancelled orders)
  deleteOrder: async (orderId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.ORDERS.BY_ID(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Calculate order total from items
  calculateOrderTotal: (items) => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price_at_purchase || item.price);
      return sum + (price * item.quantity);
    }, 0);
  },

  // Check if order can be cancelled
  canCancelOrder: (order) => {
    return ['pending', 'paid'].includes(order.status);
  },

  // Check if order can be reviewed
  canReviewOrder: (order) => {
    return order.status === 'delivered';
  },

  // Get status badge color
  getStatusColor: (status) => {
    const colors = {
      pending: '#f59e0b',    // Amber
      paid: '#3b82f6',       // Blue
      shipped: '#8b5cf6',    // Purple
      delivered: '#10b981',  // Green
      cancelled: '#ef4444',  // Red
    };
    return colors[status] || '#6b7280';
  },

  // Get status display label
  getStatusLabel: (status) => {
    const labels = {
      pending: 'Pending',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  },

  // Format order date
  formatOrderDate: (date) => {
    return new Date(date).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Get order summary
  getOrderSummary: (order) => {
    const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    return {
      itemCount,
      total: parseFloat(order.total_amount),
      status: order.status,
      date: orderService.formatOrderDate(order.order_date),
    };
  },
};

export default orderService;
