# Frontend Structure Guide

This guide explains how the React frontend is organized and how data moves through it.

The frontend lives in `Frontend/vite-project/`.

---

## 1. Frontend purpose

The frontend provides two interfaces in one React app:

- **Customer storefront**
- **Admin dashboard**

It is built with:
- React
- Vite
- React Router
- Axios
- Context API

---

## 2. The core frontend pattern

The intended data flow is:

```text
Page / Component
   ↓
Hook or Service
   ↓
api.service.js (axios client)
   ↓
Backend API
```

In other words:
- pages render UI
- services know endpoint details
- `api.service.js` owns axios config, auth headers and token refresh behavior

---

## 3. Source tree

```text
Frontend/vite-project/src/
├── App.jsx
├── main.jsx
├── config/
├── context/
├── components/
├── hooks/
├── pages/
├── services/
└── utils/
```

Important folders:
- `config/` — endpoint definitions and API constants
- `context/` — auth and cart shared state
- `components/` — reusable UI pieces
- `hooks/` — reusable fetching/state logic
- `pages/` — route-level components
- `services/` — backend communication layer
- `utils/` — lightweight helpers

---

## 4. Key files to understand first

- `main.jsx` — React entry point
- `App.jsx` — application routes
- `config/api.config.js` — endpoint definitions
- `services/api.service.js` — shared axios client
- `context/AuthContext.jsx` — auth state and session lifecycle
- `context/CartContext.jsx` — cart state, guest/server logic and sync

---

## 5. Routing structure

### Public routes
- `/`
- `/products`
- `/categories/:id`
- `/products/:id`
- `/cart`
- `/about`
- `/terms`
- `/privacy`
- `/shipping`
- `/help`

### Auth-only-for-guests routes
- `/login`
- `/register`

### Authenticated customer routes
- `/checkout`
- `/account`
- `/orders`
- `/notifications`
- `/wishlist`

### Authenticated admin routes
- `/admin`
- `/admin/orders`
- `/admin/products`
- `/admin/users`
- `/admin/analytics`
- `/admin/categories`
- `/admin/reviews`
- `/admin/notifications`

---

## 6. Data flow examples

### Product listing page
1. `Products.jsx` loads
2. it uses hooks/service functions to request products
3. service calls `api.service.js`
4. axios requests `/api/products`
5. backend responds with product data
6. page renders a product grid

### Login flow
1. `Login.jsx` submits credentials
2. it calls `AuthContext.login`
3. `AuthContext` uses `auth.service.js`
4. backend returns tokens/user data
5. auth state updates
6. protected pages become accessible

### Add to cart
1. product page or card triggers cart action
2. `CartContext` decides whether to use guest cart or server cart flow
3. authenticated users hit cart API routes
4. guests store cart data locally
5. on login, local cart can be synced to the server

---

## 7. Development conventions

Prefer:

**Page → service → axios client**

Avoid:
- direct `fetch()` inside pages/components
- repeating endpoint strings across multiple files
- duplicating auth header logic

---

## 8. Reading order for new developers

1. `src/App.jsx`
2. `src/config/api.config.js`
3. `src/services/api.service.js`
4. `src/context/AuthContext.jsx`
5. `src/context/CartContext.jsx`
6. `src/pages/Products.jsx`
7. `src/pages/ProductDetail.jsx`
8. `src/pages/Checkout.jsx`
