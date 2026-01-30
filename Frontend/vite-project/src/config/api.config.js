// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  
  // Product endpoints
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id) => `/products/${id}`,
    BY_CATEGORY: (categoryId) => `/products/category/${categoryId}`,
    SEARCH: '/products/search',
  },
  
  // Category endpoints
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id) => `/categories/${id}`,
  },
  
  // Order endpoints
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    USER_ORDERS: '/orders/my-orders',
  },
  
  // User endpoints
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
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
