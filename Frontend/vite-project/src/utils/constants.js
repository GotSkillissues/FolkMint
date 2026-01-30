// App Constants
export const APP_NAME = 'WildBLOOM';
export const APP_DESCRIPTION = 'Handcrafted ceramics inspired by nature';

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Payment Methods
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  CASH_ON_DELIVERY: 'cash_on_delivery',
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

// Product Categories (can be dynamic from API)
export const PRODUCT_CATEGORIES = {
  MUGS_CUPS: 'mugs-cups',
  PLATES_BOWLS: 'plates-bowls',
  HOME_DECOR: 'home-decor',
  VASES: 'vases',
  CANDLE_HOLDERS: 'candle-holders',
};

// Pagination
export const ITEMS_PER_PAGE = 12;

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  CART: 'cart',
  THEME: 'theme',
};

// API Response Messages
export const API_MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'Something went wrong',
  UNAUTHORIZED: 'Please login to continue',
  NOT_FOUND: 'Resource not found',
  NETWORK_ERROR: 'Network error. Please check your connection',
};

// Form Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 50,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
};

// Toast/Alert Types
export const ALERT_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Image Placeholders
export const PLACEHOLDER_IMAGES = {
  PRODUCT: '/placeholder-product.jpg',
  USER: '/placeholder-user.jpg',
  LOGO: '/logo.png',
};
