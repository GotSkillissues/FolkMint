# FolkMint Frontend

This is the React frontend for FolkMint, a marketplace for handcrafted products.

It includes both the customer storefront and the admin interface in one Vite application.

---

## 1. Stack

- React
- Vite
- React Router
- Axios
- Context API

---

## 2. Main architectural idea

The frontend is organized around:

```text
Pages / Context / Hooks
   ↓
Services
   ↓
api.service.js
   ↓
Backend API
```

That means:
- pages should not usually know raw endpoint paths
- services should own request methods and payload structure
- `api.service.js` should own axios behavior and auth/session plumbing

---

## 3. Running locally

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 4. API connection

By default, the frontend uses `/api` as the base path.

In development, Vite proxies `/api` to:
- `http://localhost:5000`

If needed, you can override the API base URL with:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 5. New developer reading order

1. `src/App.jsx`
2. `src/config/api.config.js`
3. `src/services/api.service.js`
4. `src/context/AuthContext.jsx`
5. `src/context/CartContext.jsx`

Then move to the specific page or service you want to work on.
