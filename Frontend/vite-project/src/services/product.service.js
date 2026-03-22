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
      // Backend expects `category` (id or slug) and `search`.
      const query = { ...params };
      if (query.category_id && !query.category) {
        query.category = query.category_id;
      }
      delete query.category_id;
      delete query.include_descendants;

      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, { params: query });
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
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
        params: { ...params, category: categoryId },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Search products
  searchProducts: async (searchTerm, params = {}) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
        params: { search: searchTerm, ...params },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get featured products
  getFeaturedProducts: async (limit = 8) => {
    try {
      return await productService.getAllProducts({ limit, sort: 'newest' });
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get new arrivals
  getNewArrivals: async (limit = 8) => {
    try {
      return await productService.getAllProducts({ limit, sort: 'newest' });
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get popular products (most ordered)
  getPopularProducts: async (limit = 10, days = 30) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.POPULAR, {
        params: { limit, days },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get top-rated products
  getTopRatedProducts: async (limit = 10, minRating = 4.2, minReviews = 1) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.TOP_RATED, {
        params: { limit, min_rating: minRating, min_reviews: minReviews },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get personalised "For You" products (authenticated — sends JWT automatically)
  getRecommendedProducts: async (limit = 10) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.FOR_YOU, {
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
      const response = await apiClient.patch(API_ENDPOINTS.PRODUCTS.BY_ID(id), productData);
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


  // ==================== VARIANTS ====================

  // GET /api/products/:id/variants
  getVariants: async (productId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.VARIANTS(productId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // POST /api/products/:id/variants
  createVariant: async (productId, variantData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.VARIANTS(productId), variantData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/products/variants/:variantId
  updateVariant: async (variantId, variantData) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(variantId), variantData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // DELETE /api/products/variants/:variantId
  deleteVariant: async (variantId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.PRODUCTS.VARIANT_BY_ID(variantId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== IMAGES ====================

  // GET /api/products/:id/images
  getImages: async (productId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.IMAGES(productId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // POST /api/products/:id/images
  addImage: async (productId, imageData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.IMAGES(productId), imageData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // PATCH /api/products/images/:imageId/primary
  setPrimaryImage: async (imageId) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.PRODUCTS.SET_PRIMARY_IMAGE(imageId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // DELETE /api/products/images/:imageId
  deleteImage: async (imageId) => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.PRODUCTS.IMAGE_BY_ID(imageId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UPLOAD ====================

  // POST /api/upload/image — uploads to Cloudinary via backend, returns { url }
  uploadImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post(API_ENDPOINTS.UPLOAD.SINGLE_IMAGE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
  getSimilarProducts: async (productId, params = {}) => {
    try {
      const response = await apiClient.get(`/products/${productId}/similar`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getYouMayAlsoLike: async (productId, params = {}) => {
    try {
      const response = await apiClient.get(`/products/${productId}/you-may-also-like`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  canReview: async (productId) => {
    try {
      const response = await apiClient.get(`/products/${productId}/can-review`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};


export default productService;
