# FolkMint Backend — Complete Reference

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [How a Request Travels Through the System](#6-how-a-request-travels-through-the-system)
7. [Database](#7-database)
8. [Middleware](#8-middleware)
9. [Config](#9-config)
10. [Controllers — Full Reference](#10-controllers--full-reference)
    - [authController](#authcontrollerjs)
    - [userController](#usercontrollerjs)
    - [addressController](#addresscontrollerjs)
    - [categoryController](#categorycontrollerjs)
    - [productController](#productcontrollerjs) ← detailed
    - [cartController](#cartcontrollerjs)
    - [orderController](#ordercontrollerjs)
    - [paymentController](#paymentcontrollerjs)
    - [reviewController](#reviewcontrollerjs)
    - [wishlistController](#wishlistcontrollerjs)
    - [notificationController](#notificationcontrollerjs)
    - [analyticsController](#analyticscontrollerjs)
    - [uploadController](#uploadcontrollerjs)
11. [Routes — Full Reference](#11-routes--full-reference)
    - [productRoutes](#productroutesjs) ← detailed
    - [All Other Routes](#all-other-routes)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Money Handling](#13-money-handling)
14. [Error Handling](#14-error-handling)
15. [Key Design Decisions](#15-key-design-decisions)

---

## 1. Project Overview

FolkMint is a Bangladesh folk art e-commerce platform. This document covers the backend API — a REST service built with **Node.js**, **Express**, and **PostgreSQL**.

The backend handles:
- Customer accounts, login, and JWT authentication
- Product catalog with hierarchical categories, variants (sizes), and images
- Shopping cart with guest-to-server sync on login
- Order placement with real-time stock locking
- Payment method management
- Product reviews (purchase-verified)
- Wishlist with back-in-stock notifications
- Admin analytics dashboard
- Image uploads to Cloudinary

---

## 2. Tech Stack & Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP framework |
| `pg` | ^8.17.2 | PostgreSQL client — connection pooling and parameterized queries |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT access and refresh token generation and verification |
| `cloudinary` | ^2.8.0 | Cloud image hosting — upload, store, and delete images |
| `multer` | ^2.0.2 | Multipart form handling — parses file uploads before Cloudinary upload |
| `dotenv` | ^17.2.3 | Loads `.env` file into `process.env` |
| `cors` | ^2.8.6 | Cross-Origin Resource Sharing — controls which frontend origins can call the API |
| `helmet` | ^8.1.0 | Sets secure HTTP response headers automatically |
| `express-rate-limit` | ^8.2.1 | Rate limiting to prevent brute force and abuse |
| `nodemon` | ^3.1.11 | Dev tool — restarts the server automatically when files change |

---

## 3. Project Structure

```
src/
├── server.js               Entry point — loads .env, connects DB, starts Express
├── app.js                  Express app setup — middleware stack, routes, error handlers
│
├── config/
│   ├── database.js         PostgreSQL pool setup and connectDB() function
│   └── cloudinary.js       Cloudinary SDK configuration and ensureCloudinaryConfigured()
│
├── middleware/
│   ├── authMiddleware.js         JWT verification, isAdmin check, optionalAuth
│   ├── rateLimitMiddleware.js    Rate limiters for auth, API, uploads, sensitive actions
│   ├── securityMiddleware.js     Helmet security headers
│   ├── requestLoggerMiddleware.js  Colour-coded request logging
│   └── errorMiddleware.js        Global error handler and 404 handler
│
├── controllers/            Business logic + database queries
│   ├── authController.js
│   ├── userController.js
│   ├── addressController.js
│   ├── categoryController.js
│   ├── productController.js   ← most complex — handles products, variants, images
│   ├── cartController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── reviewController.js
│   ├── wishlistController.js
│   ├── notificationController.js
│   ├── analyticsController.js
│   └── uploadController.js
│
├── routes/                 URL routing — wires HTTP methods + paths to controller functions
│   ├── index.js            Master router — mounts all route groups under /api
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── addressRoutes.js
│   ├── categoryRoutes.js
│   ├── productRoutes.js    ← most complex — careful ordering to avoid Express param conflicts
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   ├── paymentMethodRoutes.js
│   ├── paymentRoutes.js
│   ├── reviewRoutes.js
│   ├── wishlistRoutes.js
│   ├── notificationRoutes.js
│   ├── analyticsRoutes.js
│   └── uploadRoutes.js
│
├── schema/
│   ├── FolkMint.schema.sql       Full PostgreSQL schema — run this first
│   ├── FolkMint_Schema_Guide.md  Detailed rules for every table
│   ├── Admin_add_product_guide.md Admin product creation flow
│   ├── categories.seed.sql       Seed data for categories
│   ├── seed.sql                  Seed data for testing
│   └── runSeed.js                Node script to run seeds
│
└── utils/
    └── helpers.js          Empty — all helpers live in their respective controllers
```

---

## 4. Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- A Cloudinary account (free tier works)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create the database
psql -U postgres -c "CREATE DATABASE folkmint;"

# 3. Run the schema (creates all tables, triggers, indexes)
npm run db:schema

# 4. Seed categories (optional but recommended)
npm run db:seed

# 5. Copy .env.example to .env and fill in your values
cp .env.example .env

# 6. Start the server
npm start
```

On successful start you will see:
```
✓ PostgreSQL Database connected successfully
✓ Connected to database: folkmint
✓ FolkMint Server is running on port 5000
```

### NPM Scripts

| Script | What it does |
|---|---|
| `npm start` | Starts server with nodemon (auto-restarts on file changes) |
| `npm run db:schema` | Runs the SQL schema file against the folkmint database |
| `npm run db:seed` | Runs the seed script to insert test data |
| `npm run db:reset` | Runs schema then seed (full reset) |
| `npm run db:test` | Runs test.js — manual testing script |

---

## 5. Environment Variables

All variables live in `.env` at the project root. The file is never committed to git.

```dotenv
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=folkmint
DB_USER=postgres
DB_PASSWORD=your_db_password

# Server
PORT=5000
NODE_ENV=development

# JWT — generate with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-byte random hex>
JWT_REFRESH_SECRET=<64-byte random hex>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=12

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=folkmint
```

**Important:** `JWT_SECRET` and `JWT_REFRESH_SECRET` must be set before starting the server. Both `authController.js` and `authMiddleware.js` throw an error at module load time if these are missing — the server will not start.

---

## 6. How a Request Travels Through the System

Here is what happens when the frontend calls `POST /api/orders`:

```
1. server.js         Receives the TCP connection
2. app.js            Passes through global middleware in order:
   a. securityHeaders   Sets HTTP security headers (helmet)
   b. cors              Checks the Origin header against the allowed list
   c. express.json()    Parses the JSON request body into req.body
   d. urlencoded()      Parses form-encoded bodies if any
   e. requestLogger     Records the start time for response timing
   f. uploadLimiter     Skips (not /api/upload)
   g. apiLimiter        Checks request count for this IP
3. routes/index.js   Matches /orders → mounts orderRoutes
4. orderRoutes.js    POST / → runs [authenticate, createOrder]
   a. authenticate      Verifies the JWT from Authorization header
                        Sets req.user = { userId, email, role }
   b. createOrder       Runs the business logic
5. orderController   createOrder():
   a. Reads address_id and payment_method_id from req.body
   b. Opens a DB transaction
   c. Verifies address belongs to this user
   d. Fetches cart items
   e. Locks variant rows with FOR UPDATE
   f. Validates stock for every item
   g. Calculates total using integer cents arithmetic
   h. Inserts orders row
   i. Inserts order_item rows, decrements stock
   j. Inserts payment row
   k. Clears the cart
   l. Commits the transaction
   m. Fires order_placed notification (non-blocking)
   n. Returns 201 { order }
6. requestLogger     Logs: POST /api/orders 201 47ms — ::1
7. Client receives the response
```

If anything throws at step 5, Express passes the error to `errorHandler` which returns a clean `{ error: "..." }` JSON response.

---

## 7. Database

### Tables

| Table | Description |
|---|---|
| `users` | Accounts. Role is `customer` or `admin`. Login by email only. |
| `address` | Shipping addresses per user. Soft-deleted with `is_deleted` when linked to orders. |
| `payment_method` | Saved payment methods: `cod`, `bkash`, `visa`, `mastercard`, `amex`. |
| `category` | Hierarchical product categories. Self-referencing via `parent_category`. |
| `category_closure` | Precomputed ancestor/descendant pairs. Managed by DB trigger — never touch manually. |
| `product` | Product master record. Price and SKU live here. |
| `product_variant` | One row per size. `size = NULL` for unsized products. Stock tracked per variant. |
| `product_image` | Cloudinary URLs for a product. One image marked `is_primary`. |
| `cart` | One row per variant per user. Merged cart + cart_item design. |
| `orders` | Order header: status, total, user, shipping address. |
| `order_item` | Line items per order. `unit_price` is snapshotted at purchase time. |
| `payment` | One payment per order. Status: `pending`, `completed`, `failed`, `refunded`. |
| `review` | Product reviews. One per user per product. Purchase enforced by backend. |
| `wishlist` | Out-of-stock items saved for restock notifications. |
| `notification` | In-app notifications per user. |

### Automatic Database Triggers

Two triggers run automatically — you never call these manually:

**1. Category tree trigger** (`category_tree_after_change`)
Fires on every INSERT, UPDATE, or DELETE on `category`. Calls `rebuild_category_tree()` which:
- Computes `category_slug`, `depth`, and `full_path` for every category
- Rebuilds the entire `category_closure` table

This means when you insert "Panjabi" under "Menswear", the trigger automatically sets `category_slug = 'panjabi'`, `depth = 2`, `full_path = '/clothing/menswear/panjabi'`, and adds the closure rows linking Panjabi to all its ancestors.

**2. Default variant trigger** (`product_after_insert`)
Fires on every INSERT into `product`. Automatically inserts one row into `product_variant` with `size = NULL` and `stock_quantity = 0`. This is the default variant for unsized products. For sized products, the admin adds explicit size variants and this default NULL variant gets deleted.

### SKU Generation

SKUs are generated in the backend immediately after product insert:

```js
const sku = 'FM-' + String(product.product_id).padStart(6, '0');
// product_id = 42 → sku = 'FM-000042'
```

This is guaranteed unique because `product_id` is a SERIAL (auto-incrementing integer) — no two products can share an ID.

### Money Storage

All monetary values (`price`, `total_amount`, `unit_price`, `amount`) are stored as `DECIMAL(10,2)` in PostgreSQL. JavaScript floats cannot represent decimal values accurately — `0.1 + 0.2 = 0.30000000000000004`. To avoid this:

- Prices are validated as strings matching `/^\d+(\.\d{1,2})?$/` before insert
- Totals are calculated using integer cents: `500.75 → 50075 cents`, arithmetic in integers, then back to `"500.75"`
- All money values are returned as strings in API responses

---

## 8. Middleware

All middleware lives in `src/middleware/`. They run in the order registered in `app.js`.

### `authMiddleware.js`

Exports four functions:

**`authenticate`** — Required for all protected routes.
1. Reads `Authorization: Bearer <token>` from the request header
2. Verifies the token using `JWT_SECRET`
3. Decodes `{ userId, email, role }` from the payload
4. Attaches as `req.user` and calls `next()`
5. Returns 401 if missing, malformed, expired, or invalid

**`isAdmin`** — Used on admin-only routes after `authenticate`.
Checks `req.user.role === 'admin'`. Returns 403 if not.

**`authorize(...roles)`** — Factory function for role-based access.
`authorize('admin', 'moderator')` creates middleware that allows those roles through.
`isAdmin` is just `authorize('admin')`.

**`optionalAuth`** — For routes that are public but behave differently when logged in.
Tries to decode the token silently. If valid, sets `req.user`. If missing or invalid, continues as guest without error. Currently not used in routes but available for future personalised public endpoints.

### `rateLimitMiddleware.js`

| Limiter | Window | Max Requests | Applied To | Notes |
|---|---|---|---|---|
| `authLimiter` | 15 min | 10 | `POST /api/auth/register`, `POST /api/auth/login` | Only counts failed attempts (`skipSuccessfulRequests: true`) |
| `apiLimiter` | 15 min | 100 | All `/api/*` | Skips public catalog reads (`GET /products`, `GET /categories`) |
| `uploadLimiter` | 1 hour | 20 | `/api/upload` | Applied before `apiLimiter` in app.js |
| `sensitiveLimiter` | 1 hour | 5 | `POST /api/auth/refresh-token` | Token farming prevention |

### `securityMiddleware.js`

Wraps Helmet — sets these HTTP headers on every response:
- `Content-Security-Policy` — restricts resource loading to same origin
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: no-referrer` — no referrer header on outbound requests
- `Cross-Origin-Resource-Policy: cross-origin` — allows frontend to load Cloudinary images

### `requestLoggerMiddleware.js`

Intercepts `res.end` to log after the response completes (so the status code is known). Output format:
```
GET     /api/products 200 12ms — ::1
POST    /api/orders 201 47ms — ::1
GET     /api/products/999 404 3ms — ::1
```
Status codes are colour-coded: green (2xx), cyan (3xx), yellow (4xx), red (5xx).

### `errorMiddleware.js`

**`errorHandler`** — Four-parameter Express error handler `(err, req, res, next)`. Handles:
- JWT errors → 401
- Multer file size/count errors → 400
- PostgreSQL constraint errors:
  - `23505` unique violation → 409
  - `23503` foreign key violation → 400
  - `23502` not null violation → 400
  - `22P02` invalid type → 400
- JSON parse errors → 400
- Everything else → 500 (message hidden in production)

**`notFoundHandler`** — Catches any route that matched nothing. Returns:
```json
{ "error": "Route GET /api/xyz not found" }
```

---

## 9. Config

### `config/database.js`

Creates a `pg.Pool` with up to (default) 10 concurrent database connections. Every controller imports `{ pool }` from here and calls `pool.query()` for simple queries or `pool.connect()` for transactions.

```js
// Simple query
const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);

// Transaction
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO orders ...', [...]);
  await client.query('UPDATE product_variant SET stock_quantity = ...', [...]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release(); // always return the connection to the pool
}
```

`connectDB()` is called once at startup by `server.js` to verify the connection before accepting requests.

### `config/cloudinary.js`

Configures the Cloudinary SDK if all three env variables are present. Exports:
- `cloudinary` — the configured SDK instance used by `uploadController`
- `ensureCloudinaryConfigured()` — throws a 500 error if called when Cloudinary is not configured. Called inside upload handlers so the server starts fine without Cloudinary, but upload attempts fail cleanly.

---

## 10. Controllers — Full Reference

Every controller follows the same pattern:
- `async (req, res)` handler
- Input validation at the top
- `try/catch` with a 500 fallback
- Parameterized SQL (`$1, $2, ...`) — never string interpolation
- Consistent `{ error: "..." }` or `{ data }` JSON responses
- Money values always returned as strings

### `authController.js`

Handles registration, login, token refresh, and profile fetch.

| Function | Method + Path | Description |
|---|---|---|
| `register` | POST /api/auth/register | Validates email format and password strength (min 6 chars, 1 uppercase, 1 number). Hashes password with bcrypt. Inserts user. Returns access + refresh tokens. |
| `login` | POST /api/auth/login | Normalizes email to lowercase. Fetches user by email. Compares password hash. Returns tokens. Uses same error message for wrong email or wrong password to prevent user enumeration. |
| `logout` | POST /api/auth/logout | Stateless — returns 200. Client is responsible for discarding tokens. True revocation would require a token blacklist table which is not in this schema. |
| `refreshToken` | POST /api/auth/refresh-token | Verifies the refresh token with `JWT_REFRESH_SECRET`. Fetches the user to ensure they still exist. Issues a new access token. |
| `getMe` | GET /api/auth/me | Returns the authenticated user's profile. Reads `req.user.userId` set by `authenticate` middleware. |

**Token structure:**
```js
// Access token payload
{ userId: 1, email: "user@example.com", role: "customer" }
// Expires: 1h

// Refresh token payload
{ userId: 1 }
// Expires: 7d
```

### `userController.js`

| Function | Access | Description |
|---|---|---|
| `getUsers` | Admin | Paginated list with optional `role` and `search` filters. |
| `getUserById` | Owner or Admin | Admin fetches any user. Customer can only fetch their own. Authorization check is in the controller. |
| `updateUser` | Owner or Admin | Updates `first_name`, `last_name`, `password`. Only admin can change `role`. Uses `hasOwnProperty` to distinguish "field not sent" from "field sent as empty". |
| `deleteUser` | Admin | Blocked if user has order or review history. Admin cannot delete their own account via this endpoint. |
| `getUserPreferences` | Authenticated | Computes preferred categories from activity signals using a CTE. Signals: purchases (weighted by quantity), wishlisted items, cart items, reviews. Returns top 10 categories by score. |

### `addressController.js`

| Function | Description |
|---|---|
| `getAddresses` | Returns all non-deleted addresses for the logged-in user, default first. |
| `getAddressById` | Ownership-scoped fetch. |
| `createAddress` | First address auto-set as default. Uses a transaction to atomically unset old default and insert new one. |
| `updateAddress` | Rejects `is_default` field — use the dedicated endpoint instead. |
| `setDefaultAddress` | Transaction: unsets all defaults for user, sets new default. |
| `deleteAddress` | Checks for order references. If any exist → soft delete (`is_deleted = true`). If none → hard delete. Promotes next most recent address as default if deleted was default. |

### `categoryController.js`

| Function | Description |
|---|---|
| `getCategories` | Flat list or nested tree (`?tree=true`). Tree is built in JS from flat result. `ORDER BY depth ASC` ensures parents always come before children. |
| `getCategoryById` | Returns category with its `parent_name` and an array of direct `children` using `json_agg`. |
| `getCategoryBySlug` | Resolves a slug (e.g. `menswear`) to a full category object. Used when frontend passes category as slug in URL params. |
| `createCategory` | Only provide `name`, `parent_category`, `description`, `sort_order`. Trigger auto-computes slug, depth, full_path, closure. |
| `updateCategory` | Checks for circular reference using the closure table before allowing parent change. Trigger recomputes tree on update. |
| `deleteCategory` | Blocked if category has child categories or has products. |

### `productController.js`

This is the largest and most complex controller. It handles five separate concerns: public product queries, recommendation segments, product CRUD, variant CRUD, and image CRUD.

#### Helper Functions (module-level, not exported)

**`parsePositiveInt(value)`**
Parses a value to a positive integer. Returns `null` if invalid. Used for all ID params from URLs and request bodies to prevent SQL injection via type coercion.

**`normalizeText(value)`**
Trims whitespace from a string. Used for required text fields.

**`normalizeOptionalText(value)`**
Trims whitespace. Returns `null` if the result is empty. Used for optional fields like `description` — prevents empty strings being stored in the database.

**`validateMoneyString(value)`**
Validates that a value matches `/^\d+(\.\d{1,2})?$/`. Returns the string if valid, `null` if not. Used for price input to ensure only valid decimal values reach the database.

**`normalizeSize(value)`**
Trims and uppercases a size label. Returns `null` if empty. Ensures `M` and `m` are treated as the same size — prevents duplicate variants through case differences.

**`buildProductResponse(row)`**
Shapes a database row into a consistent API response object. Ensures `price` is always returned as a string (not a float), and optional join fields like `category_name` default to `null` if not present.

**`SIZE_SORT_SQL`**
A SQL CASE expression constant used in `ORDER BY` clauses to sort sizes in logical order (XS, S, M, L, XL, XXL) rather than alphabetical. Reused in `getProductById`, `getVariants`, etc.

**`fireRestockNotifications(variantId)`**
An internal async function called non-blocking when variant stock crosses from 0 to positive. Queries all wishlist users for that variant and bulk-inserts notifications in a single SQL statement. Wrapped in `.catch(() => {})` so a notification failure never breaks the stock update.

```js
// Called like this — never awaited, never blocking
fireRestockNotifications(variantId).catch(() => {});
```

#### Public Product Endpoints

**`getProducts`** — `GET /api/products`

The main product listing endpoint. Supports:
- `?category=menswear` — filter by slug (resolves to ID then uses closure table to include all descendants)
- `?category=5` — filter by ID directly
- `?search=nakshi` — ILIKE search on name, description, and SKU
- `?sort=price_asc|price_desc|name_asc|name_desc|newest|oldest`
- `?page=1&limit=20` — pagination

Category resolution is careful: if `?category` is provided but resolves to nothing (invalid slug or inactive category), returns an empty result set instead of all products. This prevents a bad URL param from accidentally returning the full catalog.

The query uses the `category_closure` table to find all descendant categories:
```sql
p.category_id IN (
  SELECT descendant_category_id
  FROM category_closure
  WHERE ancestor_category_id = $1
)
```
This means clicking "Clothing" returns products from Menswear, Womenswear, Panjabi, Saree etc. all in one query — no recursion needed at query time because the closure table precomputed all relationships.

Each product in the response includes `primary_image` (subquery) and `total_stock` (sum of all variants) to avoid N+1 queries.

**`getProductById`** — `GET /api/products/:id`

Returns a single product with:
- All variants, ordered by `SIZE_SORT_SQL`
- All images, primary first
- Review count and average rating

Runs four queries: product, variants, images, review summary. These could be combined into one but are kept separate for clarity.

**`getSimilarProducts`** — `GET /api/products/:id/similar`

Products from the same category, excluding the current product. Ordered by newest first. Limit defaults to 8, max 20.

**`getYouMayAlsoLike`** — `GET /api/products/:id/you-may-also-like`

Products from sibling categories (categories that share the same parent). If the product's category has no parent (root-level), returns an empty array — there are no siblings. Uses `ORDER BY RANDOM()` so the result varies on each load. Limit defaults to 8.

**`getTopRatedProducts`** — `GET /api/products/top-rated`

Products with 10 or more reviews and an average rating of 4.2 or above. Thresholds prevent a single 5-star review from dominating. Ordered by average rating descending, then review count descending.

**`getPopularProducts`** — `GET /api/products/popular`

Products with 10 or more units sold in the last 30 days, from non-cancelled orders only. Ordered by units sold descending.

**`getRecommendedProducts`** — `GET /api/products/recommended` *(authenticated)*

Personalised recommendations using a two-phase approach:

**Phase A — No purchase history:** Falls back to `getTopRatedProducts` logic. New users with no delivered orders see the same well-rated products as everyone else.

**Phase B — Has purchase history:** Scores categories from user signals with different weights:
- Purchases: 10 points × quantity ordered
- Reviews: 4 points
- Wishlist items: 3 points
- Cart items: 2 points × quantity in cart

Categories are ranked by total score. Products from the highest-scoring categories are returned, excluding products the user has already purchased. This is computed fresh on every request from existing table data — no separate scoring table needed.

**`canReview`** — `GET /api/products/:id/can-review` *(authenticated)*

Checks two things:
1. Has the user already reviewed this product? → `can_review: false, reason: "Already reviewed"`
2. Does the user have a delivered order containing this product? → `can_review: true` or `can_review: false, reason: "No delivered order found"`

The frontend calls this to decide whether to show the "Write a Review" button.

#### Product CRUD (Admin Only)

**`createProduct`** — `POST /api/products`

Creates a new product as a draft (`is_active = false` by default). The flow:
1. Validates `name`, `price` (money string format), `category_id`
2. Opens a transaction
3. Verifies category is active
4. Inserts the product row (DB trigger auto-creates the default NULL variant)
5. Generates SKU as `FM-000001` from `product_id` and updates the row
6. Commits

The product is created inactive. The admin must add variants and images, then explicitly publish by calling `PATCH /products/:id` with `{ is_active: true }`.

**`updateProduct`** — `PATCH /api/products/:id`

Dynamically updates only the fields provided in the request body. Uses `hasOwnProperty` to distinguish between a field being absent vs set to an empty string.

**Publish guard:** When `is_active: true` is sent, the controller first checks that the product has at least one variant and one image. Publishing a product with no images or no stock makes no sense — this prevents it:

```js
if (body.is_active === true) {
  const check = await pool.query(
    `SELECT
       EXISTS(SELECT 1 FROM product_variant WHERE product_id = $1) AS has_variants,
       EXISTS(SELECT 1 FROM product_image WHERE product_id = $1) AS has_images`,
    [productId]
  );
  if (!check.rows[0].has_variants || !check.rows[0].has_images) {
    return res.status(400).json({ error: 'Cannot publish without variants and images.' });
  }
}
```

**`deleteProduct`** — `DELETE /api/products/:id`

- Has order history → soft delete: `is_active = false`. Product disappears from all public listings but order history is preserved.
- No order history → hard delete. Cascade removes variants and images automatically.

#### Variant CRUD (Admin Only)

**`getVariants`** — `GET /api/products/:id/variants`

Returns all variants for a product ordered by `SIZE_SORT_SQL`.

**`createVariant`** — `POST /api/products/:id/variants`

Adds a new size variant. Size is normalized to uppercase via `normalizeSize()`.

Two safety checks before insert:
1. If `size` is `null` and sized variants exist → blocked (mixed state prevention)
2. If `size` is not `null` and this is the first sized variant → deletes the auto-created NULL default variant (but only if it has no order history and is the only variant)

**`updateVariant`** — `PATCH /api/products/variants/:variantId`

Updates `size` and/or `stock_quantity`.

Fetches `stock_quantity` and `product_id` **before** updating so it can:
- Detect the 0 → positive crossing for restock notifications
- Validate the NULL size guard against other variants

If `stock_quantity` goes from 0 to any positive value, calls `fireRestockNotifications(variantId)` non-blocking.

**`deleteVariant`** — `DELETE /api/products/variants/:variantId`

Blocked if this is the last variant. A product must always have at least one. The schema uses `ON DELETE SET NULL` on `order_item.variant_id` so deleting a variant that has been ordered is allowed — historical order items will have `variant_id = NULL` but retain the `product_id`.

#### Image CRUD (Admin Only)

**`getImages`** — `GET /api/products/:id/images`

Returns all images for a product, primary first.

**`addImage`** — `POST /api/products/:id/images`

Receives an `image_url` (the Cloudinary URL returned from the upload step) and an optional `is_primary` flag. The first image added is always set as primary automatically. If `is_primary: true` is sent for a subsequent image, all other images for the product are unset first — ensures exactly one primary at all times.

**`setPrimaryImage`** — `PATCH /api/products/images/:imageId/primary`

Transaction: unsets all primaries for the product, then sets the target image as primary.

**`deleteImage`** — `DELETE /api/products/images/:imageId`

Blocked if this is the last image. If the deleted image was the primary, the next oldest image is automatically promoted to primary.

---

### `cartController.js`

| Function | Description |
|---|---|
| `getCart` | Joins cart → product_variant → product. Returns items with price, subtotal (calculated using integer cents), and primary image. Returns total_amount and total_items. Only includes items where the product is active — deactivated products silently disappear from cart. |
| `addToCart` | Accepts `variant_id` directly OR `product_id + size` for convenience. Resolves to a concrete variant using `resolveVariantForCart()`. Blocked if `stock_quantity = 0` (add to wishlist instead). If variant already in cart, increments quantity. All operations inside a transaction with `FOR UPDATE` locks. Returns full enriched cart item. |
| `updateCartItem` | `quantity = 0` removes the item. Otherwise validates against current stock and updates. Uses `FOR UPDATE` to prevent race conditions. |
| `removeFromCart` | Deletes a specific variant from the user's cart. |
| `clearCart` | Deletes all rows from cart for this user. |
| `syncCart` | Merges a guest cart (array of `{ variant_id, quantity }` or `{ product_id, size, quantity }`) into the server cart on login. Skips out-of-stock items. Caps quantities at available stock. Runs in a single transaction. Returns synced/skipped counts. |

`resolveVariantForCart` handles three input shapes:
- `{ variant_id }` — direct lookup
- `{ product_id, size }` — resolves the variant matching that size
- `{ product_id }` (no size) — only works for unsized products (single NULL variant, no sized variants exist). Errors with a helpful message for sized products.

### `orderController.js`

| Function | Description |
|---|---|
| `getOrders` | Admin sees all orders. Customers see only their own. Supports `?status=pending` filter. Each order includes address snapshot and item count. |
| `getOrderById` | Full order detail: items with product name/SKU/size/image, payment info. Authorization check: admin any, customer own only. |
| `createOrder` | Full transactional checkout — see flow below. |
| `updateOrderStatus` | Admin only. Enforces forward-only transitions using `VALID_FORWARD_TRANSITIONS` map. Cancellation allowed from any non-final status. On cancel: restores stock, marks payment refunded. On deliver: marks COD payment completed. Fires notification after commit. |
| `cancelOrder` | Customer only. Can only cancel `pending` orders. Restores stock and marks payment refunded. Fires notification. |

**`createOrder` transaction flow:**
```
BEGIN
  1. Verify address belongs to user and is not deleted
  2. Verify payment method belongs to user (if provided)
  3. Fetch cart items (active products only)
  4. Count total cart rows — if active count < total count, block checkout
     (some items became inactive — force user to review cart first)
  5. Check for duplicate products in cart (schema constraint: one product per order)
  6. Lock all variant rows: SELECT ... FOR UPDATE
  7. Validate stock for every item
  8. Calculate total using integer cents arithmetic
  9. INSERT orders
  10. For each cart item:
      INSERT order_item (with unit_price snapshot)
      UPDATE product_variant SET stock_quantity = stock_quantity - quantity
  11. INSERT payment (status = 'pending')
  12. DELETE FROM cart WHERE user_id = $1
COMMIT
→ Fire order_placed notification (non-blocking, after commit)
```

### `paymentController.js`

**Payment Methods:**

| Function | Description |
|---|---|
| `getPaymentMethods` | All methods for current user, default first. |
| `getPaymentMethodById` | Ownership-scoped. |
| `createPaymentMethod` | First method auto-set as default. Transaction to unset old default then insert. |
| `setDefaultPaymentMethod` | Transaction: unset all, set new default. |
| `deletePaymentMethod` | Blocked if linked to a pending payment. Promotes next method as default if deleted was default. Schema `ON DELETE SET NULL` preserves historical payment records. |

**Payments:**

| Function | Description |
|---|---|
| `getPayments` | Admin sees all. Customer sees own (via orders join). Filter by `?status=`. |
| `getPaymentById` | Authorization: admin any, customer own only. |
| `updatePaymentStatus` | Admin only. Used for bKash/card gateway callbacks or manual corrections. No `createPayment` endpoint — payments are always created inside `createOrder`. |

### `reviewController.js`

| Function | Description |
|---|---|
| `getProductReviews` | Public. Paginated with full rating distribution summary (1–5 star counts). Includes reviewer name (first + last, or "Anonymous"). |
| `getMyReviews` | Authenticated. User's own reviews with product name and image. |
| `createReview` | Purchase check happens **before** duplicate check. Better UX — you learn you cannot review before you learn you already have. DB unique constraint `(user_id, product_id)` is a fallback for race conditions. |
| `updateReview` | Owner only. Only `rating` and `comment` are editable. |
| `deleteReview` | Owner or admin. Admin can delete any review for moderation. |

### `wishlistController.js`

| Function | Description |
|---|---|
| `getWishlist` | Paginated. Joins through variant to product — wishlist only stores `variant_id`. |
| `checkWishlist` | `GET /wishlist/check/:variantId` — returns `{ in_wishlist, wishlist_id }`. Frontend uses this to show filled/empty heart icon. |
| `addToWishlist` | Blocked if `stock_quantity > 0` — in-stock items should go to cart, not wishlist. |
| `removeFromWishlist` | By `wishlist_id`. Used on the wishlist page. |
| `removeFromWishlistByVariant` | By `variant_id`. Used on the product page where only variant_id is known. |
| `clearWishlist` | Deletes all wishlist rows for the user. |
| `moveToCart` | Transaction: verifies item is now in stock, upserts into cart, deletes from wishlist. Stock is checked again at move time — another user may have bought the last item after the notification fired. |

### `notificationController.js`

| Function | Description |
|---|---|
| `getNotifications` | Paginated. Filter by `?is_read=true/false`. Always returns `unread_count` alongside results. |
| `getUnreadCount` | Lightweight — single COUNT query. Frontend polls this for the bell badge. |
| `getNotificationById` | Ownership-scoped. |
| `markAsRead` | Single notification. |
| `markAllAsRead` | Bulk update. Returns `updated_count`. |
| `deleteNotification` | Single delete. |
| `deleteReadNotifications` | Bulk delete of all read notifications. Cleanup endpoint. |
| `sendSystemNotification` | Admin only. Send to a specific `user_id` or broadcast to all customers using `INSERT INTO ... SELECT`. |
| `createNotificationInternal` | **Not an HTTP handler.** Internal helper exported for other controllers. Validates notification type against the allowed list before inserting. Silent no-op on invalid type. Other controllers import this to fire notifications. |

Notification types: `order_placed`, `order_confirmed`, `order_shipped`, `order_delivered`, `order_cancelled`, `back_in_stock`, `system`.

### `analyticsController.js`

All endpoints are admin-only. The router applies `authenticate + isAdmin` at the router level.

| Function | Path | Description |
|---|---|---|
| `getDashboardStats` | GET /analytics/dashboard | 6 parallel queries via `Promise.all`: revenue (total + 30d + 7d), order counts, customer counts, product counts, pending orders alert, low-stock count. |
| `getSalesReport` | GET /analytics/sales | Revenue and order count grouped by `day`, `week`, or `month` using `DATE_TRUNC`. `?period=daily&days=30`. |
| `getTopProducts` | GET /analytics/top-products | Ranked by `revenue`, `quantity`, or `orders`. `?sort_by=revenue&limit=10`. |
| `getOrderStatusBreakdown` | GET /analytics/orders/status-breakdown | Count and percentage per status. |
| `getLowStockProducts` | GET /analytics/low-stock | Variants below threshold. `?threshold=5`. Paginated. |
| `getCategoryPerformance` | GET /analytics/categories | Revenue and items sold per category. |
| `getRecentActivity` | GET /analytics/recent-activity | Last N orders and last N new users in parallel. |
| `getReviewStats` | GET /analytics/reviews | Overall stats, top reviewed products, lowest rated products (min 3 reviews). |

### `uploadController.js`

Handles the Cloudinary upload step. This is separate from the product image endpoints in `productController` — the admin uploads a file here first, gets back a URL, then passes that URL to `POST /products/:id/images`.

| Export | Description |
|---|---|
| `upload` | Multer instance configured with memory storage (file held in RAM, not disk), 5MB file size limit, 10 files max, JPEG/PNG/WebP only. |
| `uploadImage` | `POST /upload/image` — single file upload. Streams buffer to Cloudinary. Returns `{ url, public_id, width, height, size }`. |
| `uploadImages` | `POST /upload/images` — up to 10 files in parallel via `Promise.all`. Returns array of image objects. |
| `deleteCloudinaryImage` | `DELETE /upload/image/:publicId` — deletes from Cloudinary by `public_id`. Call this when deleting a product image to avoid orphaned files. |
| `handleUploadError` | Error handler middleware for Multer errors. Registered as fourth argument on upload routes. |

---

## 11. Routes — Full Reference

All routes are mounted under `/api` in `routes/index.js`. The full URL is always `/api/<prefix>/<path>`.

### `productRoutes.js`

This is the most complex route file because of Express's greedy parameter matching. The rule is: **static named routes must always be registered before parameterized routes** (`/:id`), otherwise Express will try to match the static name as an ID value.

```
WRONG ORDER:
  router.get('/:id', getProductById);       ← registered first
  router.get('/top-rated', getTopRated);    ← never reached, 'top-rated' matches /:id

CORRECT ORDER:
  router.get('/top-rated', getTopRated);    ← static first
  router.get('/:id', getProductById);       ← param route after
```

The file is organized into sections in this deliberate order:

**Section 1 — Named public routes (before `/:id`)**
```
GET  /top-rated          → getTopRatedProducts   (public)
GET  /popular            → getPopularProducts     (public)
GET  /recommended        → getRecommendedProducts (authenticated)
```

**Section 2 — Standalone variant routes (before `/:id`)**

These use `/variants/:variantId` as their first segment. Without registering them before `/:id`, the word `variants` would be matched as a product ID.
```
PATCH  /variants/:variantId  → updateVariant  (admin)
DELETE /variants/:variantId  → deleteVariant  (admin)
```

**Section 3 — Standalone image routes (before `/:id`)**

Same reason as variants — `images` must not be matched as a product ID.
```
PATCH  /images/:imageId/primary  → setPrimaryImage  (admin)
DELETE /images/:imageId          → deleteImage       (admin)
```

**Section 4 — Product CRUD**
```
GET  /   → getProducts    (public)
POST /   → createProduct  (admin)
```

**Section 5 — Product by ID and nested routes**

These come after all static routes. `/:id/similar` and `/:id/you-may-also-like` are safe to register after `/:id` because the second path segment distinguishes them.
```
GET    /:id                     → getProductById      (public)
PATCH  /:id                     → updateProduct       (admin)
DELETE /:id                     → deleteProduct       (admin)
GET    /:id/similar             → getSimilarProducts  (public)
GET    /:id/you-may-also-like   → getYouMayAlsoLike   (public)
GET    /:id/can-review          → canReview           (authenticated)
```

**Section 6 — Variant routes with product context**
```
GET  /:id/variants  → getVariants     (public)
POST /:id/variants  → createVariant   (admin)
```

**Section 7 — Image routes with product context**
```
GET  /:id/images  → getImages  (public)
POST /:id/images  → addImage   (admin)
```

### All Other Routes

#### `authRoutes.js` — `/api/auth`
```
POST /register      → register       (public, authLimiter)
POST /login         → login          (public, authLimiter)
POST /logout        → logout         (authenticated)
POST /refresh-token → refreshToken   (public, sensitiveLimiter)
GET  /me            → getMe          (authenticated)
```

#### `userRoutes.js` — `/api/users`
```
GET    /me/preferences  → getUserPreferences  (authenticated) ← before /:id
GET    /                → getUsers            (admin)
GET    /:id             → getUserById         (authenticated, owner/admin check in controller)
PATCH  /:id             → updateUser          (authenticated, owner/admin check in controller)
DELETE /:id             → deleteUser          (admin)
```

#### `addressRoutes.js` — `/api/addresses`
All routes require authentication via `router.use(authenticate)`.
```
GET    /            → getAddresses
POST   /            → createAddress
GET    /:id         → getAddressById
PATCH  /:id         → updateAddress
PATCH  /:id/default → setDefaultAddress
DELETE /:id         → deleteAddress
```

#### `categoryRoutes.js` — `/api/categories`
```
GET    /           → getCategories      (public, ?tree=true for nested)
GET    /slug/:slug → getCategoryBySlug  (public) ← before /:id
GET    /:id        → getCategoryById    (public)
POST   /           → createCategory     (admin)
PATCH  /:id        → updateCategory     (admin)
DELETE /:id        → deleteCategory     (admin)
```

#### `cartRoutes.js` — `/api/cart`
All routes require authentication via `router.use(authenticate)`.
```
GET    /            → getCart
POST   /            → addToCart
POST   /sync        → syncCart         ← before /:variantId
DELETE /            → clearCart        ← before /:variantId
PATCH  /:variantId  → updateCartItem
DELETE /:variantId  → removeFromCart
```

#### `orderRoutes.js` — `/api/orders`
```
GET    /            → getOrders         (authenticated, admin/owner in controller)
POST   /            → createOrder       (authenticated)
GET    /:id         → getOrderById      (authenticated, admin/owner in controller)
PATCH  /:id/status  → updateOrderStatus (admin)
POST   /:id/cancel  → cancelOrder       (authenticated, owner check in controller)
```

#### `paymentMethodRoutes.js` — `/api/payment-methods`
All routes require authentication via `router.use(authenticate)`.
```
GET    /            → getPaymentMethods
POST   /            → createPaymentMethod
GET    /:id         → getPaymentMethodById
PATCH  /:id/default → setDefaultPaymentMethod
DELETE /:id         → deletePaymentMethod
```

#### `paymentRoutes.js` — `/api/payments`
```
GET   /            → getPayments        (authenticated, admin/owner in controller)
GET   /:id         → getPaymentById     (authenticated, admin/owner in controller)
PATCH /:id/status  → updatePaymentStatus (admin)
```

#### `reviewRoutes.js` — `/api/reviews`
```
GET    /product/:productId  → getProductReviews  (public) ← before /:id
GET    /my-reviews          → getMyReviews       (authenticated) ← before /:id
POST   /                    → createReview       (authenticated)
PATCH  /:id                 → updateReview       (authenticated, owner check in controller)
DELETE /:id                 → deleteReview       (authenticated, owner/admin in controller)
```

#### `wishlistRoutes.js` — `/api/wishlist`
All routes require authentication via `router.use(authenticate)`.
```
GET    /                        → getWishlist
POST   /                        → addToWishlist
DELETE /                        → clearWishlist             ← before /:wishlistId
GET    /check/:variantId        → checkWishlist             ← before /:wishlistId
DELETE /variant/:variantId      → removeFromWishlistByVariant ← before /:wishlistId
POST   /:wishlistId/move-to-cart → moveToCart
DELETE /:wishlistId             → removeFromWishlist
```

#### `notificationRoutes.js` — `/api/notifications`
All routes require authentication via `router.use(authenticate)`.
```
GET    /              → getNotifications
GET    /unread-count  → getUnreadCount          ← before /:id
PATCH  /read-all      → markAllAsRead           ← before /:id
DELETE /read          → deleteReadNotifications  ← before /:id
POST   /system        → sendSystemNotification   (admin) ← before /:id
GET    /:id           → getNotificationById
PATCH  /:id/read      → markAsRead
DELETE /:id           → deleteNotification
```

#### `analyticsRoutes.js` — `/api/analytics`
All routes require `router.use(authenticate, isAdmin)`.
```
GET /dashboard               → getDashboardStats
GET /sales                   → getSalesReport
GET /top-products            → getTopProducts
GET /orders/status-breakdown → getOrderStatusBreakdown
GET /low-stock               → getLowStockProducts
GET /categories              → getCategoryPerformance
GET /recent-activity         → getRecentActivity
GET /reviews                 → getReviewStats
```

#### `uploadRoutes.js` — `/api/upload`
All routes require `router.use(authenticate, isAdmin)`.
```
POST   /image           → upload.single('image'), uploadImage, handleUploadError
POST   /images          → upload.array('images', 10), uploadImages, handleUploadError
DELETE /image/:publicId → deleteCloudinaryImage
```

---

## 12. Authentication & Authorization

### Flow

1. Client calls `POST /api/auth/login` with `{ email, password }`
2. Server returns `{ token, refreshToken }`
3. Client stores both (typically `localStorage` or `sessionStorage`)
4. Client sends `Authorization: Bearer <token>` on every protected request
5. When token expires (1h), client calls `POST /api/auth/refresh-token` with `{ refreshToken }`
6. Server returns a new `{ token }`
7. If refresh token is also expired (7d), client must log in again

### Three Levels of Access

| Level | Middleware | Used On |
|---|---|---|
| Public | None | Product catalog, category list, product reviews |
| Authenticated | `authenticate` | Cart, orders, wishlist, notifications, own profile |
| Admin | `authenticate` + `isAdmin` | User management, product CRUD, analytics, uploads |

### Owner-Level Authorization

Some endpoints allow both the owner and admins but not other users. This check happens inside the controller, not the route:

```js
// Example from orderController
if (!isAdmin && order.user_id !== userId) {
  return res.status(403).json({ error: 'Access denied' });
}
```

Routes that use this pattern: `GET /users/:id`, `PATCH /users/:id`, `GET /orders/:id`, `GET /payments/:id`.

---

## 13. Money Handling

JavaScript floats cannot reliably represent decimal values:
```js
0.1 + 0.2 === 0.30000000000000004  // true
```

To avoid this in financial calculations, the backend uses integer cents:

```js
// String to cents
"500.75" → 50075

// Arithmetic in integers
50075 * 2 = 100150  // exact

// Cents back to string
100150 → "1001.50"
```

The helper functions `moneyStringToCents` and `centsToMoneyString` in `cartController` and `orderController` implement this. All money values in API responses are returned as strings (`"1500.00"` not `1500`).

---

## 14. Error Handling

### Response Format

All errors return a JSON object with a single `error` key:
```json
{ "error": "Description of what went wrong" }
```

### HTTP Status Codes Used

| Code | When |
|---|---|
| 200 | Success (GET, PATCH, DELETE) |
| 201 | Resource created (POST) |
| 400 | Bad request — missing fields, invalid values, business rule violation |
| 401 | Not authenticated — no token, expired token, invalid token |
| 403 | Not authorized — authenticated but not allowed (wrong user, not admin) |
| 404 | Resource not found |
| 409 | Conflict — unique constraint, resource has dependencies blocking the action |
| 429 | Rate limit exceeded |
| 500 | Server error — unexpected failure |

### Error Flow

1. Controller throws or returns an error response directly
2. For unexpected errors (DB down, unhandled exception), the controller's `catch` block calls `return res.status(500).json({ error: '...' })` or the error propagates to `errorHandler`
3. `errorHandler` in `errorMiddleware.js` catches anything passed via `next(err)` and returns a structured response
4. In production, 500 error messages are hidden from the client to prevent information leakage

---

## 15. Key Design Decisions

**No username** — Login is by email only. Simpler and reduces the chance of enumeration attacks.

**No user preferences table** — Preferences are computed fresh from activity signals (purchases, wishlist, cart, reviews) on every request. No extra table to maintain or sync.

**Merged cart table** — The `cart` table serves as both the cart container and line items. Simpler schema, one less join.

**`order_item` uses `UNIQUE (order_id, product_id)` not `(order_id, variant_id)`** — PostgreSQL treats `NULL != NULL`, so two rows with `variant_id = NULL` for the same order would not be caught by a unique constraint on `variant_id`. Using `product_id` (which is never null) prevents one product appearing on an order twice via different variants.

**Soft delete for addresses and products** — Addresses linked to orders and products with order history are never hard deleted. They are flagged `is_deleted = true` or `is_active = false` to preserve order history integrity.

**Category closure table** — Precomputed ancestor/descendant pairs allow fetching "all products under Clothing (including all subcategories)" with a single flat JOIN instead of a recursive query. The DB trigger keeps it in sync automatically.

**Price stored on product, not variant** — All sizes of a product share one price. This is intentional for FolkMint — a folk art Panjabi in size S costs the same as in size XL.

**Restock notifications are non-blocking** — `fireRestockNotifications(variantId).catch(() => {})`. A notification insertion failure should never cause a stock update to fail or return a 500 to the admin.

**Image upload is two steps** — Admin uploads the file to Cloudinary first (`POST /upload/image` → gets back URL), then registers the URL with the product (`POST /products/:id/images`). This keeps image storage (Cloudinary) decoupled from product management (PostgreSQL). The `productController` never touches files or Cloudinary.