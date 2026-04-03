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

  // Supports variant_id (number) OR { product_id, variant_id } payload
  addToWishlist: async (payload) => {
    try {
      const data = typeof payload === 'object' ? payload : { variant_id: payload };
      const response = await apiClient.post(API_ENDPOINTS.WISHLIST.BASE, data);
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