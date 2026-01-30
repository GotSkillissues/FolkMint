// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // ==================== AUTH ====================
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  
  // ==================== USERS ====================
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    PREFERENCES: '/users/preferences',
    UPDATE_PREFERENCES: '/users/preferences',
  },

  // ==================== ADDRESS ====================
  ADDRESSES: {
    BASE: '/addresses',
    BY_ID: (id) => `/addresses/${id}`,
    USER_ADDRESSES: '/addresses/my-addresses',
  },

  // ==================== PAYMENT METHODS ====================
  PAYMENT_METHODS: {
    BASE: '/payment-methods',
    BY_ID: (id) => `/payment-methods/${id}`,
    USER_METHODS: '/payment-methods/my-methods',
  },

  // ==================== PAYMENTS ====================
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id) => `/payments/${id}`,
    PROCESS: '/payments/process',
  },

  // ==================== CATEGORIES ====================
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id) => `/categories/${id}`,
    TREE: '/categories/tree',
    SUBCATEGORIES: (id) => `/categories/${id}/subcategories`,
    ROOT: '/categories/root',
  },
  
  // ==================== PRODUCTS ====================
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id) => `/products/${id}`,
    BY_CATEGORY: (categoryId) => `/products/category/${categoryId}`,
    SEARCH: '/products/search',
    FEATURED: '/products/featured',
    NEW_ARRIVALS: '/products/new-arrivals',
  },

  // ==================== PRODUCT VARIANTS ====================
  VARIANTS: {
    BASE: '/variants',
    BY_ID: (id) => `/variants/${id}`,
    BY_PRODUCT: (productId) => `/products/${productId}/variants`,
    UPDATE_STOCK: (id) => `/variants/${id}/stock`,
    IMAGES: (id) => `/variants/${id}/images`,
  },

  // ==================== PRODUCT IMAGES ====================
  IMAGES: {
    BASE: '/images',
    BY_ID: (id) => `/images/${id}`,
    BY_VARIANT: (variantId) => `/variants/${variantId}/images`,
    UPLOAD: '/images/upload',
  },

  // ==================== CART ====================
  CART: {
    BASE: '/cart',
    GET: '/cart',
    ITEMS: '/cart/items',
    ADD_ITEM: '/cart/items',
    UPDATE_ITEM: (cartItemId) => `/cart/items/${cartItemId}`,
    REMOVE_ITEM: (cartItemId) => `/cart/items/${cartItemId}`,
    CLEAR: '/cart/clear',
    SYNC: '/cart/sync',
  },
  
  // ==================== ORDERS ====================
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    USER_ORDERS: '/orders/my-orders',
    ITEMS: (orderId) => `/orders/${orderId}/items`,
    UPDATE_STATUS: (id) => `/orders/${id}/status`,
    CANCEL: (id) => `/orders/${id}/cancel`,
  },

  // ==================== REVIEWS ====================
  REVIEWS: {
    BASE: '/reviews',
    BY_ID: (id) => `/reviews/${id}`,
    BY_PRODUCT: (productId) => `/products/${productId}/reviews`,
    USER_REVIEWS: '/reviews/my-reviews',
    CREATE: '/reviews',
    UPDATE: (id) => `/reviews/${id}`,
    DELETE: (id) => `/reviews/${id}`,
    CAN_REVIEW: (productId) => `/products/${productId}/can-review`,
  },

  // ==================== ADMIN ====================
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    ORDERS: '/admin/orders',
    PRODUCTS: '/admin/products',
    ANALYTICS: '/admin/analytics',
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
