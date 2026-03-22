# FolkMint

FolkMint is a full-stack e-commerce application for handcrafted South Asian products. The project has three major layers:

1. **PostgreSQL database** for persistent data
2. **Express/Node.js backend** for REST APIs and business logic
3. **React + Vite frontend** for the customer and admin interfaces

This repository is best understood by reading the project in this order:

1. `Backend/src/schema/FolkMint.schema.sql`
2. `Backend/src/routes/*.js`
3. `Backend/src/controllers/*.js`
4. `Frontend/vite-project/src/config/api.config.js`
5. `Frontend/vite-project/src/services/*.js`
6. `Frontend/vite-project/src/context/*.jsx`
7. `Frontend/vite-project/src/pages/*.jsx`

---

## 1. What the project does

FolkMint supports the main workflows of a small online marketplace:

- user registration and login
- product browsing by category
- product detail, variants, stock and images
- cart and wishlist
- checkout from cart into an order
- address management
- payment method management
- reviews for purchased products
- notifications
- admin tools for products, categories, orders, users, reviews, analytics and system notifications

The platform is split into two experiences:

- **Customer experience**: browse, buy, review, track orders
- **Admin experience**: manage catalog and operations

---

## 2. Big-picture architecture

```text
React pages/components
        │
        ▼
Frontend service layer
        │
        ▼
Axios API client
        │   HTTP / JSON
        ▼
Express routes
        │
        ▼
Controllers
        │
        ▼
PostgreSQL
```

### Frontend side
The frontend is designed around this flow:

**Page / Component → Service → `api.service.js` → Backend API**

This is the main pattern throughout the app. It keeps API details centralized and reduces duplicated request logic.

### Backend side
The backend is organized like this:

**Route → Middleware → Controller → Database queries**

The backend does not currently use a separate repository/service layer; most business logic and SQL access live in controllers.

---

## 3. Repository structure

```text
FolkMint/
├── README.md
├── Backend/
│   ├── package.json
│   ├── BACKEND.md
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── schema/
│       └── utils/
└── Frontend/
    ├── STRUCTURE.md
    ├── QUICKSTART.md
    ├── IMPLEMENTATION.md
    ├── FRONTEND_UPDATE.md
    └── vite-project/
        ├── package.json
        ├── vite.config.js
        └── src/
            ├── config/
            ├── context/
            ├── components/
            ├── hooks/
            ├── pages/
            ├── services/
            └── utils/
```

---

## 4. Core domain model

The main business entities are:

- **users**: customers and admins
- **categories**: hierarchical catalog structure
- **product**: master product record
- **product_variant**: size/stock records for a product
- **product_image**: product-level images
- **cart**: current authenticated user's cart
- **orders** and **order_item**
- **payment_method**
- **payment**
- **review**
- **wishlist**
- **notification**

A key design choice in this project is that:

- images are stored at the **product** level
- stock is tracked at the **variant** level
- categories support tree structure through both `parent_category` and a closure table

---

## 5. Request lifecycle example

### Example: customer opens a product page

1. React route `/products/:id` renders `ProductDetail.jsx`
2. The page uses frontend services and hooks to fetch:
   - product detail
   - variants
   - images
   - reviews
   - related products
3. `product.service.js` calls the centralized axios client in `api.service.js`
4. Axios sends requests to `/api/products/:id` and related endpoints
5. Express routes map the request to `productController.js`
6. The controller queries PostgreSQL and builds the response payload
7. The frontend receives JSON and renders product information

---

## 6. API groups

The backend mounts these route groups under `/api`:

- `/auth`
- `/users`
- `/addresses`
- `/categories`
- `/products`
- `/cart`
- `/orders`
- `/payment-methods`
- `/payments`
- `/reviews`
- `/wishlist`
- `/notifications`
- `/analytics`
- `/upload`

Each group is documented in `Backend/BACKEND.md`.

---

## 7. Authentication model

The app uses JWT-based authentication.

### Backend
- login issues an access token and refresh token
- protected routes use `authenticate`
- admin-only routes also use `isAdmin`

### Frontend
- `AuthContext.jsx` stores the current user session
- `api.service.js` injects the access token into requests
- the response interceptor attempts token refresh on `401`
- protected frontend routes are enforced with `ProtectedRoute` and `RequireAdmin`

---

## 8. How checkout works

Checkout is centered around the current cart.

1. User adds variants to cart
2. User selects or creates an address
3. User selects or creates a payment method
4. Frontend calls `POST /api/orders`
5. Backend creates an order from the cart
6. Order items and payment records are generated
7. Cart is cleared after successful order creation
8. Customer can view the new order in `/orders`

---

## 9. How to run the project

### Backend
From `Backend/`:

```bash
npm install
npm run db:schema
npm run db:seed
npm run start
```

The API starts on `http://localhost:5000`.

### Frontend
From `Frontend/vite-project/`:

```bash
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173`.

During development, requests to `/api` are proxied to `http://localhost:5000`.

---

## 10. Environment and external services

### Backend
The backend expects environment variables for:

- database connection
- JWT secrets
- Cloudinary upload credentials

### Frontend
The frontend can use:

- `VITE_API_BASE_URL`

If not set, it defaults to `/api`, which works with the Vite proxy in development.

---

## 11. Where to read next

- `Backend/BACKEND.md` — backend architecture, endpoints and responsibilities
- `Backend/src/schema/FolkMint_Schema_Guide.md` — database explanation
- `Backend/src/schema/Admin_add_product_guide.md` — product creation workflow
- `Frontend/STRUCTURE.md` — frontend folder layout and data flow
- `Frontend/QUICKSTART.md` — practical setup and first test flow
- `Frontend/IMPLEMENTATION.md` — what is implemented and how it behaves
- `Frontend/FRONTEND_UPDATE.md` — current frontend notes, conventions and cleanup items

---

## 12. New developer summary

If you are new to this project, the most important things to remember are:

- the **database schema is the source of truth for data shape**
- the **backend routes/controllers are the source of truth for API behavior**
- the **frontend should usually talk to the backend through services, not direct fetch calls**
- categories are hierarchical, products have variants, and orders are created from the cart
- admin functionality is built into the same frontend app under `/admin/*`

That mental model is enough to start reading the code with confidence.
