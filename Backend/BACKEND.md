# FolkMint Backend — Complete Reference

## Table of Contents
1. [How It Works (Conceptual Overview)](#how-it-works)
2. [Request Lifecycle](#request-lifecycle)
3. [Middleware Stack](#middleware-stack)
4. [Controllers](#controllers)
5. [Routes](#routes)
6. [Database](#database)
7. [Completion Status](#completion-status)
8. [Known Issues](#known-issues)

---

## How It Works

FolkMint is a REST API built with **Express.js** and **PostgreSQL**. The architecture follows a simple layered pattern:

```
Client Request
     │
     ▼
┌─────────────────────────────────────┐
│            app.js                   │
│  (Global middleware, rate limits)   │
└─────────────┬───────────────────────┘
              │
     ▼
┌─────────────────────────────────────┐
│         routes/index.js             │
│   (Dispatches to route groups)      │
└─────────────┬───────────────────────┘
              │
     ▼
┌─────────────────────────────────────┐
│      Route File (e.g. orderRoutes)  │
│  (Auth check, admin check)          │
└─────────────┬───────────────────────┘
              │
     ▼
┌─────────────────────────────────────┐
│   Controller (e.g. orderController) │
│  (Business logic + DB queries)      │
└─────────────┬───────────────────────┘
              │
     ▼
┌─────────────────────────────────────┐
│         PostgreSQL (via pg Pool)    │
└─────────────────────────────────────┘
```

### Authentication Flow
- On login/register, two JWTs are issued: an **access token** (1 hour) and a **refresh token** (7 days).
- The client sends the access token as `Authorization: Bearer <token>` on every protected request.
- The `authenticate` middleware verifies the token and attaches `req.user = { userId, email, role }`.
- When the access token expires, the client calls `POST /api/auth/refresh-token` with the refresh token to get a new access token.

### Role System
Two roles exist: `customer` and `admin`.
- `authenticate` — confirms the user is logged in
- `isAdmin` — confirms the user has the `admin` role
- Most read endpoints are public. Write/delete endpoints are either owner-only or admin-only.

### Database Access Pattern
- All queries use **parameterized SQL** (`$1, $2, ...`) — no raw string interpolation, preventing SQL injection.
- **Connection pooling** via `pg.Pool` — connections are reused across requests.
- **Transactions** are used for operations that touch multiple tables (creating orders, cancelling orders, moving wishlist items to cart).

---

## Request Lifecycle

Every request passes through this stack in order:

```
1. securityHeaders   → Helmet sets secure HTTP headers (XSS, CSP, HSTS, etc.)
2. cors              → Validates request origin (allowed: localhost:5173, :3000, 127.0.0.1:5173)
3. express.json()    → Parses JSON request body
4. urlencoded()      → Parses form-encoded body
5. requestLogger     → Logs: METHOD /path STATUS Xms — IP  (colour-coded)
6. /uploads static   → Serves uploaded images directly from disk
7. authLimiter       → /api/auth only — 10 requests / 15 min (failed only)
8. uploadLimiter     → /api/upload only — 20 requests / hour
9. apiLimiter        → /api/* — 100 requests / 15 min
10. routes           → Dispatched to matching controller
11. notFoundHandler  → Catches any unmatched route → 404
12. errorHandler     → Catches any thrown error → structured JSON error response
```

---

## Middleware Stack

All middleware lives in `src/middleware/`.

### `authMiddleware.js`
| Export | Description |
|---|---|
| `authenticate` | Verifies JWT from `Authorization: Bearer <token>`. Sets `req.user`. Returns 401 if missing/invalid/expired. |
| `authorize(...roles)` | Checks `req.user.role` against allowed roles. Returns 403 if denied. |
| `isAdmin` | Shorthand for `authorize('admin')`. |
| `optionalAuth` | Like `authenticate` but silently continues if no token is present. Used on public endpoints that optionally personalise results. |

### `rateLimitMiddleware.js`
| Export | Window | Limit | Applied To |
|---|---|---|---|
| `authLimiter` | 15 min | 10 requests | `/api/auth` (failed only) |
| `apiLimiter` | 15 min | 100 requests | All `/api/*` |
| `uploadLimiter` | 1 hour | 20 requests | `/api/upload` |
| `sensitiveLimiter` | 1 hour | 5 requests | Available, not yet applied |

### `securityMiddleware.js`
| Export | Description |
|---|---|
| `securityHeaders` | Helmet configuration. Sets Content-Security-Policy, X-XSS-Protection, Referrer-Policy, and CORP headers. `crossOriginResourcePolicy` is set to `cross-origin` so the frontend can load images from `/uploads`. |

### `requestLoggerMiddleware.js`
| Export | Description |
|---|---|
| `requestLogger` | Intercepts `res.end` to capture status code and timing after response completes. Logs in format: `GET    /api/products 200 12ms — ::1`. Status codes are colour-coded (green/cyan/yellow/red). |

### `errorMiddleware.js`
| Export | Description |
|---|---|
| `errorHandler` | Catches all errors thrown via `next(err)` or uncaught Express errors. Handles: JWT errors, PostgreSQL constraint errors (23505, 23503, 23502, 22P02), Multer file errors, body-parser errors. Returns a clean `{ error: "..." }` JSON response. In production, hides stack traces. |
| `notFoundHandler` | Returns `404 { error: "Route METHOD /path not found" }` for any unmatched route. |

---

## Controllers

All controllers live in `src/controllers/`. Every function follows the same pattern:
- `async (req, res)` function
- `try/catch` block with a 500 fallback
- Parameterized SQL via `pool.query()`
- Consistent `{ error: "..." }` or `{ data }` JSON responses

### `authController.js`
| Function | Method | Description |
|---|---|---|
| `register` | POST | Creates user, hashes password with bcrypt, returns access + refresh tokens |
| `login` | POST | Verifies email + password, returns tokens |
| `logout` | POST | Stateless — returns 200 (client discards token) |
| `refreshToken` | POST | Validates refresh token, issues new access token |
| `getProfile` | GET | Returns authenticated user's profile + preferences |

### `userController.js`
| Function | Access | Description |
|---|---|---|
| `getUsers` | Admin | List all users with role and search filters, paginated |
| `getUserById` | Owner or Admin | Get single user profile |
| `createUser` | Admin | Create user directly (bypasses registration flow) |
| `updateUser` | Owner or Admin | Update profile fields; only admins can change roles |
| `deleteUser` | Owner or Admin | Delete user account |
| `getUserPreferences` | Owner | Get preferred categories |
| `updateUserPreferences` | Owner | Replace preferred category list |

### `productController.js`
| Function | Access | Description |
|---|---|---|
| `getProducts` | Public | List with filters (category, search, price range), sorting, pagination |
| `getProductById` | Public | Single product with variants, images, and review average |
| `getProductsByCategory` | Public | Products in a category, optionally including subcategories |
| `searchProducts` | Public | Full-text search across name and description |
| `getFeaturedProducts` | Public | Top products by review count and rating |
| `getNewArrivals` | Public | Most recently created products |
| `createProduct` | Admin | Create product with category assignment |
| `updateProduct` | Admin | Update product fields dynamically |
| `deleteProduct` | Admin | Delete product (cascades to variants and images) |
| `getProductVariants` | Public | List all variants for a product with images |
| `createVariant` | Admin | Add size/color/price/stock variant to a product |
| `updateVariant` | Admin | Update variant fields |
| `updateVariantStock` | Admin | PATCH stock quantity only |
| `deleteVariant` | Admin | Remove variant |
| `addVariantImage` | Admin | Attach an image URL to a variant |
| `deleteImage` | Admin | Remove image record |

### `categoryController.js`
| Function | Access | Description |
|---|---|---|
| `getCategories` | Public | All categories; pass `?tree=true` for hierarchical structure |
| `getCategoryById` | Public | Category with its parent and children |
| `createCategory` | Admin | Create with optional parent (hierarchical) |
| `updateCategory` | Admin | Update name/parent; prevents circular self-referencing |
| `deleteCategory` | Admin | Only allowed if no child categories and no products |
| `getCategoryProducts` | Public | Paginated products belonging to a category |

### `cartController.js`
| Function | Description |
|---|---|
| `getCart` | Auto-creates cart if none exists. Returns items with totals. |
| `addToCart` | Add variant to cart or increment quantity. Validates stock. |
| `updateCartItem` | Set quantity (0 removes the item). Validates stock. |
| `removeFromCart` | Remove a specific cart item |
| `clearCart` | Delete all items in cart |
| `syncCart` | Merge a guest cart (array of items) into the user's cart. Used at login. |

### `orderController.js`
| Function | Access | Description |
|---|---|---|
| `getOrders` | Owner or Admin | List orders. Users see own; admins see all. Paginated. |
| `getOrderById` | Owner or Admin | Order details with items, payment, address |
| `createOrder` | Authenticated | Creates order from current cart in a transaction. Deducts stock. Clears cart. |
| `updateOrder` | Admin | Update status. If cancelled, restores stock. |
| `cancelOrder` | Owner | Cancel a pending order. Restores stock. Updates payment status. |
| `deleteOrder` | Admin | Hard delete an order |

### `paymentController.js`
**Payment Methods:**
| Function | Description |
|---|---|
| `getPaymentMethods` | List user's saved payment methods |
| `getPaymentMethodById` | Get single method |
| `createPaymentMethod` | Add method: `card`, `bkash`, `nagad`, `rocket`, `cash_on_delivery` |
| `updatePaymentMethod` | Update method details |
| `deletePaymentMethod` | Delete; auto-reassigns default if needed |
| `setDefaultPaymentMethod` | Set as default, unsets previous default |

**Payments:**
| Function | Access | Description |
|---|---|---|
| `getPayments` | Owner or Admin | List payments |
| `getPaymentById` | Owner or Admin | Payment details |
| `processPayment` | Authenticated | Simulate payment processing; sets order to `confirmed` |
| `updatePaymentStatus` | Admin | Set status: `pending`, `completed`, `failed`, `refunded` |

### `reviewController.js`
| Function | Access | Description |
|---|---|---|
| `getReviews` | Public | All reviews, filterable by product/rating |
| `getReviewById` | Public | Single review with user and product info |
| `createReview` | Authenticated | Review requires a prior purchase of that product (enforced at DB and controller level) |
| `updateReview` | Owner or Admin | Edit rating and/or comment |
| `deleteReview` | Owner or Admin | Remove review |
| `getProductReviewSummary` | Public | Average rating + star distribution for a product |
| `getUserReviews` | Authenticated | All reviews written by the current user |

### `addressController.js`
| Function | Description |
|---|---|
| `getAddresses` | All addresses for current user, default first |
| `getAddressById` | Single address with ownership check |
| `createAddress` | Create address; first one is auto-set as default |
| `updateAddress` | Update address fields |
| `deleteAddress` | Delete; reassigns default to another if deleted was default |
| `setDefaultAddress` | Set as default, unsets previous |

### `couponController.js`
| Function | Access | Description |
|---|---|---|
| `getCoupons` | Admin | List all coupons, filterable by active status |
| `getCouponById` | Admin | Get single coupon details |
| `validateCoupon` | Authenticated | Check if a code is valid. Returns calculated discount amount. |
| `createCoupon` | Admin | Create `percentage` or `fixed` coupon with expiry, usage limit, min order |
| `updateCoupon` | Admin | Update any coupon field including activating/deactivating |
| `deleteCoupon` | Admin | Hard delete coupon |

### `wishlistController.js`
| Function | Description |
|---|---|
| `getWishlist` | User's wishlist with product details, paginated |
| `addToWishlist` | Add product; silently succeeds if already exists |
| `removeFromWishlist` | Remove by wishlist_id |
| `clearWishlist` | Delete all wishlist items |
| `moveToCart` | Transaction: add product to cart, remove from wishlist |
| `checkWishlist` | Returns `{ in_wishlist: true/false }` for a product |

### `analyticsController.js` *(Admin only)*
| Function | Description |
|---|---|
| `getDashboardStats` | KPIs: total revenue, orders, users, products, low-stock alerts |
| `getSalesReport` | Revenue and order count over time, grouped by `day`/`week`/`month` |
| `getTopProducts` | Best sellers by `revenue`, `quantity`, or `orders` |
| `getOrderStatusBreakdown` | Count and revenue per order status with percentages |
| `getLowStockProducts` | Variants where stock is below a threshold (default: 10) |
| `getRecentActivity` | Last N orders + last N new user registrations |
| `getCategoryPerformance` | Revenue and items sold per category |

### `notificationController.js`
| Function | Access | Description |
|---|---|---|
| `getNotifications` | Authenticated | User's notifications with unread count. Filter by `is_read`. |
| `getNotificationById` | Owner | Single notification |
| `markAsRead` | Owner | Mark one notification read |
| `markAllAsRead` | Owner | Bulk mark all as read |
| `deleteNotification` | Owner | Delete one notification |
| `deleteReadNotifications` | Owner | Bulk delete all already-read notifications |
| `createNotification` | Admin | Send a notification to any user |
| `createNotificationInternal` | Internal | Helper function for other controllers to create notifications (not an HTTP handler) |

### `uploadController.js` *(Admin only)*
| Function | Description |
|---|---|
| `upload` | Multer instance (disk storage, 5MB limit, images only: JPEG/PNG/WebP/GIF) |
| `uploadImage` | Single image upload → returns `{ filename, url, size, mimetype }` |
| `uploadImages` | Up to 10 images → returns array of image objects |
| `deleteImage` | Delete image file from disk by filename. Path traversal protected via `path.basename()`. |
| `handleUploadError` | Multer error handler (catches LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, etc.) |

---

## Routes

All routes are mounted under `/api` in `routes/index.js`.

| Prefix | Route File | Auth Required |
|---|---|---|
| `/api/auth` | authRoutes.js | Partial (login/register are public) |
| `/api/users` | userRoutes.js | Yes |
| `/api/products` | productRoutes.js | Partial (reads are public) |
| `/api/categories` | categoryRoutes.js | Partial (reads are public) |
| `/api/cart` | cartRoutes.js | Yes (all) |
| `/api/orders` | orderRoutes.js | Yes (all) |
| `/api/payments` | paymentRoutes.js | Yes (all) |
| `/api/payment-methods` | paymentMethodRoutes.js | Yes (all) |
| `/api/addresses` | addressRoutes.js | Yes (all) |
| `/api/reviews` | reviewRoutes.js | Partial (reads are public) |
| `/api/coupons` | couponRoutes.js | Yes (validate: user, rest: admin) |
| `/api/wishlist` | wishlistRoutes.js | Yes (all) |
| `/api/analytics` | analyticsRoutes.js | Admin only |
| `/api/notifications` | notificationRoutes.js | Yes (all) |
| `/api/upload` | uploadRoutes.js | Admin only |

---

## Database

**18 tables** in PostgreSQL:

| Table | Description |
|---|---|
| `users` | Accounts with role: `customer` or `admin` |
| `user_preferences` | Per-user settings (view count) |
| `preference_category` | Junction: user preferred categories |
| `address` | Shipping addresses per user |
| `payment_method` | Saved payment methods (card, bkash, nagad, rocket, COD) |
| `payment` | Payment transaction records |
| `category` | Hierarchical product categories (self-referencing) |
| `product` | Product master records |
| `product_variant` | Size/color/price/stock variants per product |
| `product_image` | Image URLs per variant |
| `cart` | One cart per user |
| `cart_item` | Items in a cart (variant + quantity) |
| `orders` | Order records with status tracking |
| `order_item` | Line items per order (price locked at purchase time) |
| `review` | Product reviews (enforced: must have purchased the item) |
| `coupon` | Discount codes (percentage or fixed) |
| `wishlist` | Saved products per user |
| `notification` | In-app notifications per user |

---

## Completion Status

### ✅ Complete

| Area | Status |
|---|---|
| Authentication (register, login, refresh, logout) | Complete |
| User management | Complete |
| Product catalog (CRUD, variants, images, search, filters) | Complete |
| Category management (hierarchical, with description) | Complete |
| Shopping cart (add, update, remove, sync) | Complete |
| Order management (create, cancel, status tracking, coupon support) | Complete |
| Payment processing (simulated) | Complete |
| Payment methods (CRUD, default, Bangladesh types) | Complete |
| Address management (CRUD, default, state field) | Complete |
| Product reviews (post-purchase verified, verified_purchase flag) | Complete |
| Coupon / discount system (wired into order creation) | Complete |
| Wishlist (add, remove, move to cart) | Complete |
| Admin analytics dashboard | Complete |
| In-app notifications (auto-triggered on order events) | Complete |
| Image upload (local disk, multer) | Complete |
| Rate limiting | Complete |
| Security headers (helmet) | Complete |
| Request logging | Complete |
| Centralized error handling | Complete |
| Schema aligned with controllers (all columns match) | Complete |

### ⚠️ Incomplete / Known Limitations

| Area | Issue | Priority |
|---|---|---|
| **Simulated payments** | `processPayment` simulates success — no real payment gateway (Bkash API, Stripe, etc.) integrated. | Depends on scope |
| **Analytics top products join** | `getTopProducts` joins `order_item` via `variant_id`, so variant-less products may be under-counted in analytics. | Low |

---

## Known Issues

All previously identified critical issues have been resolved:

- ✅ Product admin routes now have `authenticate + isAdmin` middleware
- ✅ Coupon validation is wired into `createOrder` (discount applied, `used_count` incremented)
- ✅ Notifications auto-triggered on order placed, confirmed, shipped, delivered, cancelled
- ✅ `sensitiveLimiter` applied to `/api/auth/refresh-token`
- ✅ `helpers.js` stubs removed
- ✅ Schema and controllers fully aligned (see Database section for final schema)

