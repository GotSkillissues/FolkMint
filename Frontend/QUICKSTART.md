# FolkMint Frontend Quickstart

This document is for a developer who wants to run the project and understand the first few things to test.

---

## 1. Prerequisites

Install these first:

- Node.js 18+
- npm
- PostgreSQL
- a running backend environment for FolkMint

---

## 2. Run the backend first

From `Backend/`:

```bash
npm install
npm run db:schema
npm run db:seed
npm run start
```

Expected backend URL:
- `http://localhost:5000`

---

## 3. Run the frontend

From `Frontend/vite-project/`:

```bash
npm install
npm run dev
```

Expected frontend URL:
- `http://localhost:5173`

---

## 4. How frontend-backend connection works in development

`vite.config.js` defines a proxy:

- requests starting with `/api`
- are forwarded to `http://localhost:5000`

`src/config/api.config.js` uses:
- `VITE_API_BASE_URL` if provided
- otherwise `/api`

---

## 5. First things to verify

Start with these pages in order:

1. `/`
2. `/products`
3. `/products/:id`
4. `/register` and `/login`
5. `/cart`
6. `/checkout`
7. `/account` and `/orders`
8. `/wishlist` and `/notifications`
9. `/admin/*`

---

## 6. Seed/admin setup

Useful backend scripts:

```bash
npm run db:seed
npm run db:create-admin
```

Use them so you have:
- sample catalog data
- an admin account for testing admin screens

---

## 7. Recommended manual smoke test

1. open `/products`
2. open one product page
3. add a variant to cart
4. register or log in
5. verify cart state
6. create/select address
7. create/select payment method
8. place order
9. open `/orders`
10. log in as admin and open `/admin`
