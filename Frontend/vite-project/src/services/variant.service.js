import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Variant Service
 * Handles product variants and images
 * Maps to: product_variant, product_image tables
 */
const variantService = {
  // ==================== PRODUCT VARIANTS ====================

  // Get all variants for a product
  getProductVariants: async (productId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.VARIANTS.BY_PRODUCT(productId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get variant by ID
  getVariantById: async (variantId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.VARIANTS.BY_ID(variantId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new variant (admin only)
  createVariant: async (productId, variantData) => {
    try {
      // variantData: { size?, color?, stock_quantity, price }
      const response = await apiClient.post(API_ENDPOINTS.VARIANTS.BY_PRODUCT(productId), variantData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update variant (admin only)
  updateVariant: async (variantId, variantData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.VARIANTS.BY_ID(variantId), variantData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update stock quantity (admin only)
  updateStock: async (variantId, quantity) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.VARIANTS.UPDATE_STOCK(variantId), {
        stock_quantity: quantity,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete variant (admin only)
  deleteVariant: async (variantId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.VARIANTS.BY_ID(variantId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== PRODUCT IMAGES ====================

  // Get all images for a variant
  getVariantImages: async (variantId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.IMAGES.BY_VARIANT(variantId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add image to variant (admin only)
  addImage: async (variantId, imageUrl) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.IMAGES.BY_VARIANT(variantId), {
        image_url: imageUrl,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload image (admin only)
  uploadImage: async (formData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.IMAGES.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete image (admin only)
  deleteImage: async (imageId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.IMAGES.BY_ID(imageId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Get unique sizes from variants
  getUniqueSizes: (variants) => {
    if (!variants) return [];
    const sizes = variants.map(v => v.size).filter(Boolean);
    return [...new Set(sizes)];
  },

  // Get unique colors from variants
  getUniqueColors: (variants) => {
    if (!variants) return [];
    const colors = variants.map(v => v.color).filter(Boolean);
    return [...new Set(colors)];
  },

  // Find variant by size and color
  findVariant: (variants, size, color) => {
    if (!variants) return null;
    return variants.find(v => v.size === size && v.color === color);
  },

  // Check if variant is in stock
  isInStock: (variant) => {
    return variant && variant.stock_quantity > 0;
  },

  // Get total stock for a product
  getTotalStock: (variants) => {
    if (!variants) return 0;
    return variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  },

  // Get price range for a product
  getPriceRange: (variants) => {
    if (!variants || variants.length === 0) return { min: 0, max: 0 };
    const prices = variants.map(v => parseFloat(v.price));
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  },
};

export default variantService;
