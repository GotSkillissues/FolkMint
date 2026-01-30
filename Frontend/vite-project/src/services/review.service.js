import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Review Service
 * Handles product reviews
 * Maps to: review table
 * Note: Reviews require a valid order_item_id (user must have purchased the product)
 */
const reviewService = {
  // Get all reviews for a product
  getProductReviews: async (productId, params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BY_PRODUCT(productId), { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get review by ID
  getReviewById: async (reviewId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BY_ID(reviewId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get current user's reviews
  getUserReviews: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.USER_REVIEWS);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check if user can review a product (must have purchased it)
  canReviewProduct: async (productId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.CAN_REVIEW(productId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create a new review
  createReview: async (reviewData) => {
    try {
      // reviewData: { rating (1-5), comment?, product_id, order_item_id }
      const response = await apiClient.post(API_ENDPOINTS.REVIEWS.CREATE, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update an existing review
  updateReview: async (reviewId, reviewData) => {
    try {
      // reviewData: { rating?, comment? }
      const response = await apiClient.put(API_ENDPOINTS.REVIEWS.UPDATE(reviewId), reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a review
  deleteReview: async (reviewId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.REVIEWS.DELETE(reviewId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all reviews (admin only)
  getAllReviews: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Calculate average rating for a product (utility)
  calculateAverageRating: (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  },

  // Get rating distribution for a product (utility)
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
