/**
 * FolkMint Type Definitions
 * =========================================
 * These type definitions mirror the backend database schema exactly.
 * Use these as reference for data structures throughout the application.
 * 
 * Database Tables:
 * - users, user_preferences, preference_category
 * - address, payment_method, payment
 * - category, product, product_variant, product_image
 * - cart, cart_item
 * - orders, order_item
 * - review
 */

// ==================== USER TYPES ====================

/**
 * @typedef {Object} User
 * @property {number} user_id - Primary key
 * @property {string} username - Unique, max 50 chars
 * @property {string} email - Unique, max 100 chars
 * @property {string} password_hash - Hashed password
 * @property {string|null} first_name - Max 50 chars
 * @property {string|null} last_name - Max 50 chars
 * @property {'customer'|'admin'} role - User role
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 */

/**
 * @typedef {Object} UserPreferences
 * @property {number} preference_id - Primary key
 * @property {number} view_count - Non-negative integer
 * @property {number} user_id - Foreign key to users
 */

/**
 * @typedef {Object} PreferenceCategory
 * @property {number} preference_id - Foreign key to user_preferences
 * @property {number} category_id - Foreign key to category
 */

// ==================== ADDRESS & PAYMENT TYPES ====================

/**
 * @typedef {Object} Address
 * @property {number} address_id - Primary key
 * @property {string} street - Max 100 chars
 * @property {string} city - Max 50 chars
 * @property {string|null} postal_code - Max 20 chars
 * @property {string} country - Max 50 chars
 * @property {number} user_id - Foreign key to users
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {'card'|'bkash'|'nagad'|'rocket'|'cash_on_delivery'} PaymentMethodType
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {number} method_id - Primary key
 * @property {string|null} card_last4 - Last 4 digits (for cards)
 * @property {PaymentMethodType} type - Payment type
 * @property {string|null} expiry_date - Card expiry (ISO date)
 * @property {number} user_id - Foreign key to users
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} Payment
 * @property {number} payment_id - Primary key
 * @property {number} amount - Decimal(10,2), non-negative
 * @property {string} payment_date - ISO timestamp
 * @property {number} method_id - Foreign key to payment_method
 */

// ==================== CATEGORY TYPES ====================

/**
 * @typedef {Object} Category
 * @property {number} category_id - Primary key
 * @property {string} name - Max 50 chars
 * @property {number|null} parent_category - Self-referencing FK (null = root)
 * @property {Category[]} [subcategories] - Nested subcategories (frontend use)
 */

// ==================== PRODUCT TYPES ====================

/**
 * @typedef {Object} Product
 * @property {number} product_id - Primary key
 * @property {string} name - Max 100 chars
 * @property {string|null} description - Text field
 * @property {number} base_price - Decimal(10,2), non-negative
 * @property {number} category_id - Foreign key to category
 * @property {string} created_at - ISO timestamp
 * @property {ProductVariant[]} [variants] - Product variants
 * @property {Category} [category] - Category info
 * @property {Review[]} [reviews] - Product reviews
 */

/**
 * @typedef {Object} ProductVariant
 * @property {number} variant_id - Primary key
 * @property {string|null} size - Max 20 chars
 * @property {string|null} color - Max 20 chars
 * @property {number} stock_quantity - Non-negative integer
 * @property {number} price - Decimal(10,2), non-negative
 * @property {number} product_id - Foreign key to product
 * @property {ProductImage[]} [images] - Variant images
 */

/**
 * @typedef {Object} ProductImage
 * @property {number} image_id - Primary key
 * @property {string} image_url - Image URL (text)
 * @property {number} variant_id - Foreign key to product_variant
 */

// ==================== CART TYPES ====================

/**
 * @typedef {Object} Cart
 * @property {number} cart_id - Primary key
 * @property {number} user_id - Foreign key to users (unique)
 * @property {string} created_at - ISO timestamp
 * @property {CartItem[]} [items] - Cart items
 */

/**
 * @typedef {Object} CartItem
 * @property {number} cart_item_id - Primary key
 * @property {number} quantity - Positive integer
 * @property {number} cart_id - Foreign key to cart
 * @property {number} variant_id - Foreign key to product_variant
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 * @property {ProductVariant} [variant] - Variant details
 * @property {Product} [product] - Product details
 */

// ==================== ORDER TYPES ====================

/**
 * @typedef {'pending'|'paid'|'shipped'|'delivered'|'cancelled'} OrderStatus
 */

/**
 * @typedef {Object} Order
 * @property {number} order_id - Primary key
 * @property {string} order_date - ISO timestamp
 * @property {number} total_amount - Decimal(10,2), non-negative
 * @property {OrderStatus} status - Order status
 * @property {number} user_id - Foreign key to users
 * @property {number} address_id - Foreign key to address
 * @property {number|null} payment_id - Foreign key to payment (unique)
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 * @property {OrderItem[]} [items] - Order items
 * @property {Address} [address] - Shipping address
 * @property {Payment} [payment] - Payment info
 */

/**
 * @typedef {Object} OrderItem
 * @property {number} order_item_id - Primary key
 * @property {number} quantity - Positive integer
 * @property {number} price_at_purchase - Decimal(10,2)
 * @property {number} order_id - Foreign key to orders
 * @property {number} variant_id - Foreign key to product_variant
 * @property {ProductVariant} [variant] - Variant details
 * @property {Product} [product] - Product details
 */

// ==================== REVIEW TYPES ====================

/**
 * @typedef {Object} Review
 * @property {number} review_id - Primary key
 * @property {1|2|3|4|5} rating - Rating 1-5
 * @property {string|null} comment - Text field
 * @property {number} user_id - Foreign key to users
 * @property {number} product_id - Foreign key to product
 * @property {number} order_item_id - Foreign key to order_item (unique)
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 * @property {User} [user] - Reviewer info
 */

// ==================== FORM/INPUT TYPES ====================

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} RegisterData
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string} [first_name]
 * @property {string} [last_name]
 */

/**
 * @typedef {Object} AddressInput
 * @property {string} street
 * @property {string} city
 * @property {string} [postal_code]
 * @property {string} country
 */

/**
 * @typedef {Object} CreateOrderInput
 * @property {number} address_id
 * @property {number} [method_id]
 * @property {{variant_id: number, quantity: number}[]} items
 */

/**
 * @typedef {Object} CreateReviewInput
 * @property {number} rating
 * @property {string} [comment]
 * @property {number} product_id
 * @property {number} order_item_id
 */

// Export empty object to make this a module
export {};
