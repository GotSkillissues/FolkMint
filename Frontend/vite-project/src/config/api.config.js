// API Configuration (single source of truth)
// In development Vite proxies /api -> http://localhost:5000/api (see vite.config.js).
// Override with VITE_API_BASE_URL in production/custom deployments.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const API_ENDPOINTS = {
  // ==================== AUTH ====================
  // Backend routes: /api/auth/*
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh-token',
    ME: '/auth/me',
  },

  // ==================== USERS ====================
  // Backend routes:
  // - GET /api/users (admin)
  // - GET/PATCH/DELETE /api/users/:id
  // - GET /api/users/me/preferences
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,

    // Preferred current constants
    MY_PREFERENCES: '/users/me/preferences',

    // Compatibility aliases for legacy service calls
    PROFILE: '/auth/me',
    // Alias only: valid when backend PATCH /users/:id accepts profile fields.
    UPDATE_PROFILE: (id) => `/users/${id}`,
    // Alias only: backend changes password via PATCH /users/:id with { password }.
    // Callers must resolve current user id before using this path.
    CHANGE_PASSWORD: (id) => `/users/${id}`,
    PREFERENCES: '/users/me/preferences',
    // Alias only: valid when backend PATCH /users/:id handles preference payload updates.
    UPDATE_PREFERENCES: (id) => `/users/${id}`,
  },

  // ==================== ADDRESS ====================
  // Backend routes: /api/addresses, /api/addresses/:id, /api/addresses/:id/default
  ADDRESSES: {
    BASE: '/addresses',
    BY_ID: (id) => `/addresses/${id}`,
    SET_DEFAULT: (id) => `/addresses/${id}/default`,
    USER_ADDRESSES: '/addresses',
  },

  // ==================== PAYMENT METHODS ====================
  // Backend routes: /api/payment-methods, /api/payment-methods/:id, /api/payment-methods/:id/default
  PAYMENT_METHODS: {
    BASE: '/payment-methods',
    BY_ID: (id) => `/payment-methods/${id}`,
    SET_DEFAULT: (id) => `/payment-methods/${id}/default`,
    USER_METHODS: '/payment-methods',
  },

  // ==================== PAYMENTS ====================
  // Backend routes: /api/payments, /api/payments/:id, /api/payments/:id/status
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id) => `/payments/${id}`,
    UPDATE_STATUS: (id) => `/payments/${id}/status`,

    // Compatibility alias only:
    // current checkout creates payment indirectly via POST /orders.
    // This is not a direct payment-processing endpoint.
    PROCESS: '/orders',
  },

  // ==================== CATEGORIES ====================
  // Backend routes: /api/categories, /api/categories/:id, /api/categories/slug/:slug
  // For tree response use GET /api/categories?tree=true
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id) => `/categories/${id}`,
    BY_SLUG: (slug) => `/categories/slug/${slug}`,
    CHILDREN_WITH_PRODUCTS: (id) => `/categories/${id}/children-with-products`,

    // Helper URL strings with query params
    TREE: '/categories?tree=true',

    // Compatibility aliases
    SUBCATEGORIES: (id) => `/categories/${id}`,
    ROOT: '/categories?tree=true',
  },

  // ==================== PRODUCTS ====================
  // Backend routes:
  // - GET /api/products
  // - GET /api/products/top-rated
  // - GET /api/products/popular
  // - GET /api/products/recommended (auth)
  // - GET/PATCH/DELETE /api/products/:id
  // - GET /api/products/:id/similar
  // - GET /api/products/:id/you-may-also-like
  // - GET /api/products/:id/can-review (auth)
  // - GET/POST /api/products/:id/variants
  // - PATCH/DELETE /api/products/variants/:variantId
  // - GET/POST /api/products/:id/images
  // - PATCH /api/products/images/:imageId/primary
  // - DELETE /api/products/images/:imageId
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id) => `/products/${id}`,

    // Query helpers (resolved by GET /products with query params)
    BY_CATEGORY: (category) => `/products?category=${encodeURIComponent(category)}`,
    SEARCH: '/products',
    // Naming aliases only; service must append explicit query params for intended behavior.
    FEATURED: '/products',
    // Naming aliases only; service must append explicit query params for intended behavior.
    NEW_ARRIVALS: '/products',

    POPULAR: '/products/popular',
    TOP_RATED: '/products/top-rated',
    FOR_YOU: '/products/recommended',
    RECOMMENDED: '/products/recommended',

    SIMILAR: (id) => `/products/${id}/similar`,
    YOU_MAY_ALSO_LIKE: (id) => `/products/${id}/you-may-also-like`,
    CAN_REVIEW: (id) => `/products/${id}/can-review`,

    VARIANTS: (id) => `/products/${id}/variants`,
    VARIANT_BY_ID: (variantId) => `/products/variants/${variantId}`,

    IMAGES: (id) => `/products/${id}/images`,
    IMAGE_BY_ID: (imageId) => `/products/images/${imageId}`,
    SET_PRIMARY_IMAGE: (imageId) => `/products/images/${imageId}/primary`,
  },

  // ==================== PRODUCT VARIANTS ====================
  // Mapped to products router (there is no standalone /variants router)
  VARIANTS: {
    BASE: '/products',
    BY_ID: (id) => `/products/variants/${id}`,
    BY_PRODUCT: (productId) => `/products/${productId}/variants`,

    // Compatibility alias (no dedicated stock endpoint in current backend)
    UPDATE_STOCK: (id) => `/products/variants/${id}`,

    // Images are product-level in current schema
    IMAGES: (productId) => `/products/${productId}/images`,
  },

  // ==================== PRODUCT IMAGES ====================
  // Product images are handled via /products routes and upload service routes
  IMAGES: {
    BASE: '/products',
    BY_ID: (id) => `/products/images/${id}`,
    BY_PRODUCT: (productId) => `/products/${productId}/images`,
    SET_PRIMARY: (id) => `/products/images/${id}/primary`,

    // Compatibility alias (schema is product-level images, not variant-level)
    BY_VARIANT: (variantId) => `/products/variants/${variantId}`,

    // Legacy alias -> upload router
    UPLOAD: '/upload/image',
  },

  // ==================== CART ====================
  // Backend routes: /api/cart, /api/cart/sync, /api/cart/:variantId
  CART: {
    BASE: '/cart',
    GET: '/cart',
    ADD_ITEM: '/cart',
    UPDATE_ITEM: (variantId) => `/cart/${variantId}`,
    REMOVE_ITEM: (variantId) => `/cart/${variantId}`,
    CLEAR: '/cart',
    SYNC: '/cart/sync',
  },

  // ==================== ORDERS ====================
  // Backend routes: /api/orders, /api/orders/:id, /api/orders/:id/status, /api/orders/:id/cancel
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    USER_ORDERS: '/orders',
    ITEMS: (orderId) => `/orders/${orderId}`,
    UPDATE_STATUS: (id) => `/orders/${id}/status`,
    CANCEL: (id) => `/orders/${id}/cancel`,
  },

  // ==================== WISHLIST ====================
  // Backend routes:
  // - /api/wishlist
  // - /api/wishlist/check/:variantId
  // - /api/wishlist/variant/:variantId
  // - /api/wishlist/:wishlistId
  // - /api/wishlist/:wishlistId/move-to-cart
  WISHLIST: {
    BASE: '/wishlist',
    BY_ID: (wishlistId) => `/wishlist/${wishlistId}`,
    // Clear is valid only when used with DELETE /wishlist.
    CLEAR: '/wishlist',
    CHECK: (variantId) => `/wishlist/check/${variantId}`,
    REMOVE_BY_VARIANT: (variantId) => `/wishlist/variant/${variantId}`,
    MOVE_TO_CART: (wishlistId) => `/wishlist/${wishlistId}/move-to-cart`,
  },

  // ==================== REVIEWS ====================
  // Backend routes:
  // - GET /api/reviews/product/:productId
  // - GET /api/reviews/my-reviews
  // - POST /api/reviews
  // - PATCH/DELETE /api/reviews/:id
  // - GET /api/products/:id/can-review
  REVIEWS: {
    BASE: '/reviews',
    BY_ID: (id) => `/reviews/${id}`,
    BY_PRODUCT: (productId) => `/reviews/product/${productId}`,
    USER_REVIEWS: '/reviews/my-reviews',
    CREATE: '/reviews',
    UPDATE: (id) => `/reviews/${id}`,
    DELETE: (id) => `/reviews/${id}`,
    CAN_REVIEW: (productId) => `/products/${productId}/can-review`,
  },

  // ==================== NOTIFICATIONS ====================
  // Backend routes: /api/notifications/*
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id) => `/notifications/${id}`,
    UNREAD_COUNT: '/notifications/unread-count',
    READ_ALL: '/notifications/read-all',
    MARK_READ: (id) => `/notifications/${id}/read`,
    DELETE_READ: '/notifications/read',
    SEND_SYSTEM: '/notifications/system',
  },

  // ==================== ANALYTICS ====================
  // Backend routes: /api/analytics/* (admin)
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    SALES: '/analytics/sales',
    TOP_PRODUCTS: '/analytics/top-products',
    ORDER_STATUS_BREAKDOWN: '/analytics/orders/status-breakdown',
    LOW_STOCK: '/analytics/low-stock',
    CATEGORIES: '/analytics/categories',
    RECENT_ACTIVITY: '/analytics/recent-activity',
    REVIEWS: '/analytics/reviews',
  },

  // ==================== UPLOAD ====================
  // Backend routes: /api/upload/image, /api/upload/images, /api/upload/image/:publicId
  UPLOAD: {
    SINGLE_IMAGE: '/upload/image',
    MULTIPLE_IMAGES: '/upload/images',
    DELETE_IMAGE: (publicId) => `/upload/image/${publicId}`,
  },

  // ==================== ADMIN ====================
  // Legacy alias block kept for compatibility with old services.
  // Prefer API_ENDPOINTS.ANALYTICS and resource-level routes above.
  ADMIN: {
    DASHBOARD: '/analytics/dashboard',
    USERS: '/users',
    ORDERS: '/orders',
    PRODUCTS: '/products',
    ANALYTICS: '/analytics',
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
