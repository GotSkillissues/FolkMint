// ===========================================
// FolkMint App Constants
// Matches backend database schema exactly
// ===========================================

// App Info
export const APP_NAME = 'FolkMint';
export const APP_DESCRIPTION = 'Authentic Bangladeshi handcrafted products - Traditional craftsmanship meets modern style';
export const APP_TAGLINE = 'Handcrafted with Love';

// ===========================================
// DATABASE ENUM VALUES (from schema)
// ===========================================

// User Roles - matches chk_user_role constraint
export const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

// Order Status - matches chk_order_status constraint
export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Order Status Display Labels
export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Order Status Colors (for UI)
export const ORDER_STATUS_COLORS = {
  pending: '#f59e0b',    // Amber
  paid: '#3b82f6',       // Blue
  shipped: '#8b5cf6',    // Purple
  delivered: '#10b981',  // Green
  cancelled: '#ef4444',  // Red
};

// Payment Method Types - matches chk_payment_type constraint
export const PAYMENT_METHOD_TYPES = {
  CARD: 'card',
  BKASH: 'bkash',
  NAGAD: 'nagad',
  ROCKET: 'rocket',
  CASH_ON_DELIVERY: 'cash_on_delivery',
};

// Payment Method Display Labels
export const PAYMENT_METHOD_LABELS = {
  card: 'Credit/Debit Card',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  cash_on_delivery: 'Cash on Delivery',
};

// Payment Method Icons (for UI)
export const PAYMENT_METHOD_ICONS = {
  card: '💳',
  bkash: '📱',
  nagad: '📱',
  rocket: '📱',
  cash_on_delivery: '💵',
};

// ===========================================
// PRODUCT CATEGORIES (from seed data)
// ===========================================

// Root Categories
export const ROOT_CATEGORIES = {
  CLOTHING: { id: 1, name: 'Clothing' },
  ACCESSORIES: { id: 2, name: 'Accessories' },
  HOME_DECOR: { id: 3, name: 'Home Decor' },
  HANDICRAFTS: { id: 4, name: 'Handicrafts' },
  JEWELRY: { id: 5, name: 'Jewelry' },
};

// Category Hierarchy
export const CATEGORY_HIERARCHY = {
  // Clothing subcategories
  MEN: { id: 6, name: 'Men', parent: 1 },
  WOMEN: { id: 7, name: 'Women', parent: 1 },
  KIDS: { id: 8, name: 'Kids', parent: 1 },
  // Accessories subcategories
  BAGS: { id: 9, name: 'Bags', parent: 2 },
  SCARVES: { id: 10, name: 'Scarves', parent: 2 },
  // Home Decor subcategories
  WALL_ART: { id: 11, name: 'Wall Art', parent: 3 },
  CUSHIONS: { id: 12, name: 'Cushions', parent: 3 },
  RUGS: { id: 13, name: 'Rugs', parent: 3 },
  // Handicrafts subcategories
  POTTERY: { id: 14, name: 'Pottery', parent: 4 },
  WOODWORK: { id: 15, name: 'Woodwork', parent: 4 },
  TEXTILES: { id: 16, name: 'Textiles', parent: 4 },
  // Jewelry subcategories
  NECKLACES: { id: 17, name: 'Necklaces', parent: 5 },
  EARRINGS: { id: 18, name: 'Earrings', parent: 5 },
  BRACELETS: { id: 19, name: 'Bracelets', parent: 5 },
};

// ===========================================
// PRODUCT VARIANT OPTIONS
// ===========================================

// Common Sizes
export const PRODUCT_SIZES = {
  CLOTHING: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  ONE_SIZE: ['One Size'],
  BAGS: ['Small', 'Medium', 'Large'],
  HOME: ['16x16', '3x5 ft', '4x6 ft', '60 inch'],
};

// Common Colors
export const PRODUCT_COLORS = [
  'White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Pink',
  'Beige', 'Brown', 'Cream', 'Gold', 'Silver', 'Natural',
  'Terracotta', 'Multicolor',
];

// ===========================================
// REVIEW RATINGS
// ===========================================

export const RATING_VALUES = [1, 2, 3, 4, 5];

export const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

// ===========================================
// UI CONSTANTS
// ===========================================

// Pagination
export const ITEMS_PER_PAGE = 12;
export const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

// Image Dimensions
export const IMAGE_DIMENSIONS = {
  THUMBNAIL: { width: 100, height: 100 },
  CARD: { width: 300, height: 300 },
  DETAIL: { width: 600, height: 600 },
  FULL: { width: 1200, height: 1200 },
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'folkmint_token',
  USER: 'folkmint_user',
  CART: 'folkmint_cart',
  THEME: 'folkmint_theme',
  PREFERENCES: 'folkmint_preferences',
  RECENT_VIEWS: 'folkmint_recent_views',
};

// ===========================================
// VALIDATION RULES
// ===========================================

export const VALIDATION = {
  USERNAME: {
    MIN: 3,
    MAX: 50,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  EMAIL: {
    MAX: 100,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN: 6,
    MAX: 50,
  },
  NAME: {
    MIN: 2,
    MAX: 50,
  },
  ADDRESS: {
    STREET_MAX: 100,
    CITY_MAX: 50,
    POSTAL_MAX: 20,
    COUNTRY_MAX: 50,
  },
  REVIEW: {
    COMMENT_MAX: 1000,
    RATING_MIN: 1,
    RATING_MAX: 5,
  },
  PRODUCT: {
    NAME_MAX: 100,
    DESCRIPTION_MAX: 5000,
    PRICE_MAX: 99999999.99,
  },
};

// ===========================================
// API MESSAGES
// ===========================================

export const API_MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'Something went wrong. Please try again.',
  UNAUTHORIZED: 'Please login to continue',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please check your input and try again',
  SERVER_ERROR: 'Server error. Please try again later.',
};

// ===========================================
// ALERT/TOAST TYPES
// ===========================================

export const ALERT_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// ===========================================
// PLACEHOLDER IMAGES
// ===========================================

export const PLACEHOLDER_IMAGES = {
  PRODUCT: '/images/placeholder-product.jpg',
  CATEGORY: '/images/placeholder-category.jpg',
  USER: '/images/placeholder-user.jpg',
  LOGO: '/images/logo.png',
  BANNER: '/images/banner.jpg',
};

// ===========================================
// BANGLADESH SPECIFIC
// ===========================================

export const BANGLADESH_CITIES = [
  'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet',
  'Rangpur', 'Barisal', 'Comilla', 'Gazipur', 'Narayanganj',
];

export const DEFAULT_COUNTRY = 'Bangladesh';
export const CURRENCY = 'BDT';
export const CURRENCY_SYMBOL = '৳';

// Format price in BDT
export const formatPrice = (amount) => {
  return `${CURRENCY_SYMBOL}${parseFloat(amount).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

