# FolkMint Frontend Implementation Guide

This document explains what is implemented in the frontend and how the pieces work together.

---

## 1. Current frontend scope

Implemented areas include:

- public storefront pages
- authentication pages
- protected customer pages
- protected admin pages
- auth and cart context
- domain-based service layer
- axios-based API client
- route protection and admin guard logic

---

## 2. Route map

### Public storefront
- `Home`
- `Products`
- `CategoryLanding`
- `ProductDetail`
- `Cart`
- `About`
- `Terms`
- `Privacy`
- `Shipping`
- `Help`

### Auth pages
- `Login`
- `Register`

### Customer account pages
- `Checkout`
- `Account`
- `Orders`
- `Notifications`
- `Wishlist`

### Admin pages
- `AdminDashboard`
- `AdminOrders`
- `AdminProducts`
- `AdminUsers`
- `AdminAnalytics`
- `AdminCategories`
- `AdminReviews`
- `AdminNotifications`

---

## 3. Core architecture

```text
Pages / Components
   ↓
Context or Hooks
   ↓
Services
   ↓
api.service.js
   ↓
Backend API
```

This keeps responsibilities separated:
- pages focus on rendering and interaction
- hooks focus on reusable page logic
- contexts manage global app state
- services know backend contracts
- the axios client handles transport and authentication

---

## 4. Auth implementation

`AuthContext.jsx` is the central auth state manager.

It is responsible for:
- storing current user state
- hydrating user session on app load
- calling register/login/logout services
- exposing auth helpers to the rest of the app
- supporting protected routes

---

## 5. Cart implementation

`CartContext.jsx` handles:
- guest cart state in local storage
- server cart state for authenticated users
- syncing a guest cart into the backend after login
- cart totals and item counts
- add/update/remove logic

---

## 6. Service layer breakdown

- `api.service.js` — shared axios client
- `auth.service.js` — auth endpoints
- `product.service.js` — product catalog operations
- `category.service.js` — category operations
- `cart.service.js` — server cart CRUD and sync
- `order.service.js` — order creation and reading
- `address.service.js` — address CRUD and default selection
- `payment.service.js` — payment method and payment-related requests
- `review.service.js` — review CRUD
- `wishlist.service.js` — wishlist flows
- `notification.service.js` — notification flows
- `user.service.js` — user/profile/preferences-related requests
- `admin.service.js` — admin convenience and analytics helpers

---

## 7. What to learn first as a new developer

### Storefront behavior
1. `App.jsx`
2. `CartContext.jsx`
3. `product.service.js`
4. `Products.jsx`
5. `ProductDetail.jsx`
6. `Checkout.jsx`

### Auth/account behavior
1. `AuthContext.jsx`
2. `auth.service.js`
3. `ProtectedRoute.jsx`
4. `Login.jsx`
5. `Account.jsx`

### Admin behavior
1. `RequireAdmin`
2. `AdminLayout`
3. `admin.service.js`
4. `AdminDashboard.jsx`
5. `AdminProducts.jsx`
6. `AdminOrders.jsx`
