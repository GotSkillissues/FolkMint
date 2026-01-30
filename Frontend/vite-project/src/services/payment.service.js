import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Payment Service
 * Handles payment methods and payment processing
 * Maps to: payment_method, payment tables
 */
const paymentService = {
  // ==================== PAYMENT METHODS ====================

  // Get all payment methods for the current user
  getUserPaymentMethods: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENT_METHODS.USER_METHODS);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get payment method by ID
  getPaymentMethodById: async (methodId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(methodId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add new payment method
  addPaymentMethod: async (methodData) => {
    try {
      // methodData: { type, card_last4?, expiry_date? }
      const response = await apiClient.post(API_ENDPOINTS.PAYMENT_METHODS.BASE, methodData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update payment method
  updatePaymentMethod: async (methodId, methodData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(methodId), methodData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete payment method
  deletePaymentMethod: async (methodId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(methodId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== PAYMENTS ====================

  // Process a payment
  processPayment: async (paymentData) => {
    try {
      // paymentData: { amount, method_id }
      const response = await apiClient.post(API_ENDPOINTS.PAYMENTS.PROCESS, paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get payment by ID
  getPaymentById: async (paymentId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.BY_ID(paymentId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all payments (admin only)
  getAllPayments: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.BASE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default paymentService;
