import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const paymentService = {
  // ==================== PAYMENT METHODS ====================

  getUserPaymentMethods: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENT_METHODS.USER_METHODS);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getPaymentMethodById: async (methodId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(methodId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // POST /api/payment-methods — { type, is_default? }
  addPaymentMethod: async (methodData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PAYMENT_METHODS.BASE, methodData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/payment-methods/:id/default
  // Only meaningful mutation for a saved method — promote it to default
  setDefaultPaymentMethod: async (methodId) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.PAYMENT_METHODS.SET_DEFAULT(methodId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deletePaymentMethod: async (methodId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(methodId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== PAYMENTS ====================

  getPaymentById: async (paymentId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.BY_ID(paymentId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getAllPayments: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Admin only
  updatePaymentStatus: async (paymentId, status) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.PAYMENTS.UPDATE_STATUS(paymentId), { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default paymentService;