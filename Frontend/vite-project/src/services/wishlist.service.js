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

  // FIX: schema wishlist.variant_id — must send variant_id, not product_id
  // For unsized products, pass the product's default variant id (size = NULL)
  addToWishlist: async (variantId) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLIST.BASE, {
        variant_id: variantId,
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

  removeFromWishlistByVariant: async (variantId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.WISHLIST.REMOVE_BY_VARIANT(variantId));
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

  // variantId — matches GET /api/wishlist/check/:variantId
  checkWishlist: async (variantId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.WISHLIST.CHECK(variantId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  moveToCart: async (wishlistId) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.WISHLIST.MOVE_TO_CART(wishlistId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default wishlistService;