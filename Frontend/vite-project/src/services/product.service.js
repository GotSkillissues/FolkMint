import apiClient from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Product Service
 * Handles all product-related API calls
 * Maps to: product, product_variant, product_image tables
 */
const productService = {
  // ==================== GET PRODUCTS ====================

  // Get all products with optional filters
  getAllProducts: async (params = {}) => {
    try {
      // params: { page, limit, category_id, search, sort, minPrice, maxPrice }
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get product by ID (includes variants and images)
  getProductById: async (id) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get products by category
  getProductsByCategory: async (categoryId, params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_CATEGORY(categoryId), { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Search products
  searchProducts: async (searchTerm, params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.SEARCH, {
        params: { q: searchTerm, ...params },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get featured products
  getFeaturedProducts: async (limit = 8) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.FEATURED, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get new arrivals
  getNewArrivals: async (limit = 8) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.NEW_ARRIVALS, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== ADMIN OPERATIONS ====================

  // Create product (admin only)
  createProduct: async (productData) => {
    try {
      // productData: { name, description, base_price, category_id }
      const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update product (admin only)
  updateProduct: async (id, productData) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete product (admin only)
  deleteProduct: async (id) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // Get the lowest price from variants
  getLowestPrice: (product) => {
    if (!product.variants || product.variants.length === 0) {
      return product.base_price;
    }
    return Math.min(...product.variants.map(v => parseFloat(v.price)));
  },

  // Get the highest price from variants
  getHighestPrice: (product) => {
    if (!product.variants || product.variants.length === 0) {
      return product.base_price;
    }
    return Math.max(...product.variants.map(v => parseFloat(v.price)));
  },

  // Get price display string
  getPriceDisplay: (product) => {
    const min = productService.getLowestPrice(product);
    const max = productService.getHighestPrice(product);
    if (min === max) {
      return `৳${min.toLocaleString()}`;
    }
    return `৳${min.toLocaleString()} - ৳${max.toLocaleString()}`;
  },

  // Check if product is in stock
  isInStock: (product) => {
    if (!product.variants || product.variants.length === 0) return false;
    return product.variants.some(v => v.stock_quantity > 0);
  },

  // Get total stock count
  getTotalStock: (product) => {
    if (!product.variants) return 0;
    return product.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  },

  // Get primary image URL
  getPrimaryImage: (product) => {
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      if (variant.images && variant.images.length > 0) {
        return variant.images[0].image_url;
      }
    }
    return '/images/placeholder-product.jpg';
  },

  // Get all images for a product
  getAllImages: (product) => {
    const images = [];
    if (product.variants) {
      product.variants.forEach(variant => {
        if (variant.images) {
          variant.images.forEach(img => {
            images.push({
              ...img,
              variant_id: variant.variant_id,
              size: variant.size,
              color: variant.color,
            });
          });
        }
      });
    }
    return images;
  },
};

export default productService;
