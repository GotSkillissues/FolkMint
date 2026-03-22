# FolkMint Backend

This document explains how the backend works so that a new developer can read the codebase without guessing. It is written from the current code, not from an idealized version.

---

## 1. Backend purpose

The backend is a REST API built with:

- **Node.js**
- **Express**
- **PostgreSQL**
- **JWT authentication**
- **Cloudinary + multer** for image upload

Its job is to:

- authenticate users
- expose catalog APIs
- validate role-based access
- manage carts, orders, payments and reviews
- support admin operations
- translate HTTP requests into database reads/writes

---

## 2. Entry points

### `src/server.js`
Bootstraps the application.

Responsibilities:
- load environment variables
- connect to PostgreSQL
- start the HTTP server

### `src/app.js`
Builds the Express app.

Responsibilities:
- register CORS
- register JSON/body parsing
- apply security, request logging and rate limiting middleware
- mount all `/api` route groups
- provide a health endpoint at `/`
- apply 404 and global error handlers

---

## 3. Runtime flow

A typical request goes through this path:

```text
Client request
   ↓
Express app (`app.js`)
   ↓
Route file in `src/routes`
   ↓
Optional middleware (`authenticate`, `isAdmin`, limiters, etc.)
   ↓
Controller in `src/controllers`
   ↓
PostgreSQL queries through `config/database.js`
   ↓
JSON response
```

The backend does **not** currently separate controllers from database/repository logic. Controllers usually contain the main SQL logic and business rules.

---

## 4. Project structure

```text
Backend/src/
├── app.js
├── server.js
├── config/
│   ├── cloudinary.js
│   └── database.js
├── controllers/
│   ├── addressController.js
│   ├── analyticsController.js
│   ├── authController.js
│   ├── cartController.js
│   ├── categoryController.js
│   ├── notificationController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── productController.js
│   ├── reviewController.js
│   ├── uploadController.js
│   ├── userController.js
│   └── wishlistController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   ├── rateLimitMiddleware.js
│   ├── requestLoggerMiddleware.js
│   └── securityMiddleware.js
├── routes/
├── schema/
└── utils/
```

---

## 5. Configuration

### `config/database.js`
Creates the PostgreSQL connection utilities used by controllers and seed scripts.

### `config/cloudinary.js`
Configures Cloudinary for admin image upload/delete flows.

---

## 6. Middleware

### `authMiddleware.js`
Provides authentication and role checks.

Key middleware:
- `authenticate` — requires a valid user token
- `optionalAuth` — attaches a user if a valid token exists, but does not require it
- `isAdmin` — blocks non-admin users

### `securityMiddleware.js`
Applies security headers.

### `requestLoggerMiddleware.js`
Logs incoming requests for debugging and visibility.

### `rateLimitMiddleware.js`
Defines separate limiters for:
- authentication-sensitive routes
- upload routes
- general API traffic

### `errorMiddleware.js`
Centralizes:
- 404 responses
- uncaught route/controller errors

---

## 7. Route groups

All routes are mounted from `src/routes/index.js` under `/api`.

### `/api/auth`
File: `authRoutes.js`

Endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `GET /auth/me`

### `/api/users`
File: `userRoutes.js`

Endpoints:
- `GET /users` — admin only
- `GET /users/me/preferences`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id` — admin only

### `/api/addresses`
File: `addressRoutes.js`

Authenticated for all routes:
- `GET /addresses`
- `POST /addresses`
- `GET /addresses/:id`
- `PATCH /addresses/:id/default`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`

### `/api/categories`
File: `categoryRoutes.js`

Public:
- `GET /categories`
- `GET /categories/slug/:slug`
- `GET /categories/:id/children-with-products`
- `GET /categories/:id`

Admin:
- `POST /categories`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

Important note:
- `GET /categories?tree=true` returns the nested category tree

### `/api/products`
File: `productRoutes.js`

Public or partially public:
- `GET /products`
- `GET /products/top-rated`
- `GET /products/popular`
- `GET /products/:id`
- `GET /products/:id/similar`
- `GET /products/:id/you-may-also-like`
- `GET /products/:id/variants`
- `GET /products/:id/images`

Authenticated:
- `GET /products/recommended`
- `GET /products/:id/can-review`

Admin:
- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `POST /products/:id/variants`
- `PATCH /products/variants/:variantId`
- `DELETE /products/variants/:variantId`
- `POST /products/:id/images`
- `PATCH /products/images/:imageId/primary`
- `DELETE /products/images/:imageId`

### `/api/cart`
File: `cartRoutes.js`

Authenticated for all routes:
- `GET /cart`
- `POST /cart`
- `POST /cart/sync`
- `PATCH /cart/:variantId`
- `DELETE /cart/:variantId`
- `DELETE /cart`

### `/api/orders`
File: `orderRoutes.js`

Authenticated:
- `GET /orders`
- `POST /orders`
- `GET /orders/:id`
- `POST /orders/:id/cancel`

Admin only:
- `PATCH /orders/:id/status`

### `/api/payment-methods`
File: `paymentMethodRoutes.js`

Authenticated:
- `GET /payment-methods`
- `POST /payment-methods`
- `GET /payment-methods/:id`
- `PATCH /payment-methods/:id/default`
- `PATCH /payment-methods/:id`
- `DELETE /payment-methods/:id`

### `/api/payments`
File: `paymentRoutes.js`

Authenticated:
- `GET /payments`
- `GET /payments/:id`

Admin only:
- `PATCH /payments/:id/status`

### `/api/reviews`
File: `reviewRoutes.js`

Admin:
- `GET /reviews`

Public:
- `GET /reviews/product/:productId`

Authenticated:
- `GET /reviews/my-reviews`
- `POST /reviews`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`

### `/api/wishlist`
File: `wishlistRoutes.js`

Authenticated:
- `GET /wishlist`
- `POST /wishlist`
- `DELETE /wishlist`
- `GET /wishlist/check/:variantId`
- `DELETE /wishlist/variant/:variantId`
- `POST /wishlist/:wishlistId/move-to-cart`
- `DELETE /wishlist/:wishlistId`

### `/api/notifications`
File: `notificationRoutes.js`

Authenticated:
- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/read-all`
- `GET /notifications/:id`
- `PATCH /notifications/:id/read`
- `DELETE /notifications/:id`
- `DELETE /notifications/read`

Admin:
- `POST /notifications/system`
- `GET /notifications/sent-log`

### `/api/analytics`
File: `analyticsRoutes.js`

Admin only:
- `GET /analytics`
- `GET /analytics/dashboard`
- `GET /analytics/sales`
- `GET /analytics/top-products`
- `GET /analytics/orders/status-breakdown`
- `GET /analytics/low-stock`
- `GET /analytics/categories`
- `GET /analytics/recent-activity`
- `GET /analytics/reviews`

### `/api/upload`
File: `uploadRoutes.js`

Admin only:
- `POST /upload/image`
- `POST /upload/images`
- `DELETE /upload/image/:publicId`

---

## 8. Route-ordering rules

Several route files intentionally place named routes **before** dynamic `/:id` routes.

Examples:
- `/products/top-rated` before `/products/:id`
- `/notifications/unread-count` before `/notifications/:id`
- `/categories/slug/:slug` before `/categories/:id`

This is important in Express. If you change route order carelessly, words like `top-rated` or `unread-count` can be mistaken for IDs.

---

## 9. Database model assumptions used by backend

The backend is built around these schema choices:

- a product belongs to one category
- a product can have many variants
- a product can have many images
- stock is stored per variant
- reviews are tied to user + product
- orders are created from the current authenticated user's cart
- notifications belong to users, but admin can create system notifications
- category hierarchy uses a closure table for tree traversal

---

## 10. Controller responsibilities

- `authController.js`: register, login, logout, refresh, current user
- `userController.js`: user listing, retrieval, update, delete, preferences
- `addressController.js`: address CRUD and default selection
- `categoryController.js`: flat/tree category reads and admin CRUD
- `productController.js`: product listing/detail, related data, product/variant/image CRUD, can-review checks
- `cartController.js`: cart fetch, add, update, remove, clear, sync
- `orderController.js`: create orders from cart, list orders, read single order, cancel, admin status update
- `paymentController.js`: payment listing/detail/status update
- `reviewController.js`: product reviews, my reviews, admin review list, CRUD
- `wishlistController.js`: wishlist CRUD and move-to-cart
- `notificationController.js`: notifications, mark read, delete read, system notifications, sent log
- `analyticsController.js`: dashboard and operational analytics
- `uploadController.js`: file upload/delete and upload error handling

---

## 11. Authentication and authorization

- Public catalog routes need no login
- Customer account/cart/order routes require `authenticate`
- Admin routes require both `authenticate` and `isAdmin`

The frontend refreshes access tokens through `/auth/refresh-token` when needed.

---

## 12. Order and payment workflow

1. customer builds cart
2. customer submits checkout
3. backend creates the order from cart contents
4. order items and payment records are inserted
5. inventory and order status rules are enforced in backend logic
6. customer later views order/payment history through dedicated endpoints

---

## 13. Upload workflow

Image upload is conceptually two-step:

1. upload physical image files to Cloudinary through `/api/upload/*`
2. store the returned image URL in `product_image` using `/api/products/:id/images`

This keeps file hosting separate from product-image metadata.

---

## 14. Useful backend scripts

From `Backend/package.json`:

- `npm run start` — run with nodemon on `src/server.js`
- `npm run dev` — alternate watch command
- `npm run db:schema` — apply schema SQL to the `folkmint` database
- `npm run db:seed` — run the seed script
- `npm run db:create-admin` — create an admin user
- `npm run db:reset` — reapply schema and seed

---

## 15. New developer checklist

Read these in order:

1. `src/app.js`
2. `src/routes/index.js`
3. `src/routes/productRoutes.js`
4. `src/controllers/productController.js`
5. `src/controllers/orderController.js`
6. `src/schema/FolkMint.schema.sql`

If those make sense, most of the backend will make sense.
