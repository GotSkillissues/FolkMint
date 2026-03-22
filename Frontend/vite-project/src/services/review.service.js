import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const reviewService = {
  getProductReviews: async (productId, params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BY_PRODUCT(productId), { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getReviewById: async (reviewId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BY_ID(reviewId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserReviews: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.USER_REVIEWS);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  canReviewProduct: async (productId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.CAN_REVIEW(productId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createReview: async (reviewData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.REVIEWS.CREATE, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // FIX: was PUT — backend only exposes PATCH /reviews/:id
  updateReview: async (reviewId, reviewData) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.REVIEWS.UPDATE(reviewId), reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteReview: async (reviewId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.REVIEWS.DELETE(reviewId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getAllReviews: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  calculateAverageRating: (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  },

  getRatingDistribution: (reviews) => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (!reviews) return distribution;
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    return distribution;
  },
};

export default reviewService;