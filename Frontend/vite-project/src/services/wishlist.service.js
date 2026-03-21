import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

const wishlistService = {
  getWishlist: async (params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.WISHLIST.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  addToWishlist: async (productId) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLIST.BASE, {
        product_id: productId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  removeFromWishlist: async (wishlistId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLIST.BY_ID(wishlistId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  clearWishlist: async () => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLIST.CLEAR);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  checkWishlist: async (productId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.WISHLIST.CHECK(productId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // POST /api/wishlist/:wishlistId/move-to-cart
  // Moves a wishlisted out-of-stock item to cart when it comes back in stock.
  // Backend verifies stock > 0 and removes from wishlist atomically.
  moveToCart: async (wishlistId) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.WISHLIST.MOVE_TO_CART(wishlistId)
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default wishlistService;