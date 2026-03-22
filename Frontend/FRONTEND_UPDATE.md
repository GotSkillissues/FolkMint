# Frontend Current-State Notes

This file explains the current frontend conventions and the most important things a new developer should know before changing code.

---

## 1. Source of truth order

When you are unsure how something works, use this order:

1. **Database schema** for data ownership and field names
2. **Backend routes/controllers** for actual API behavior
3. **`src/config/api.config.js`** for frontend endpoint mapping
4. **frontend service file** for the request contract
5. **page/component** for how the UI consumes it

---

## 2. Frontend architecture rule

The intended architecture is:

```text
Page / Component / Context / Hook
   ↓
Service layer
   ↓
api.service.js
   ↓
Backend API
```

Why this is the preferred pattern:
- endpoint paths stay centralized
- auth header logic stays centralized
- request/response behavior is easier to debug
- components remain focused on UI

---

## 3. Auth/session conventions

The frontend uses:
- `AuthContext.jsx` for auth state
- `auth.service.js` for auth requests
- `api.service.js` interceptors for token handling
- route guards for protected UI paths

---

## 4. Cart conventions

The cart has two modes:

### Guest mode
- local storage based

### Authenticated mode
- backend `/api/cart` based

On login, the app can sync local cart items into the server cart.

---

## 5. Product model conventions

The current schema and backend are centered around:

- **product**
- **product_variant**
- **product_image**

Important reminders:
- product images are product-level
- stock is variant-level
- cart and wishlist usually work with `variant_id`

---

## 6. Safe change strategy

When changing any API-backed UI feature:

1. confirm backend route actually exists
2. confirm request method is correct
3. confirm payload field names match backend/schema
4. update `api.config.js`
5. update the relevant service
6. test the page flow manually

---

## 7. Final summary

If you only remember three things, remember these:

1. trust live code over stale comments
2. keep API access inside services
3. verify data shape against the schema when in doubt
