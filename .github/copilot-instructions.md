---
name: folkmint-workspace
description: "FolkMint e-commerce platform workspace. Use when: coding backend APIs, building frontend components, debugging authentication/payments, managing product/order data. Includes architecture, builds, conventions, and common pitfalls."
applyTo: "**"
---

# FolkMint Workspace Instructions

## 🏗️ Project Overview

**FolkMint** is a full-stack e-commerce platform for handcrafted Bangladeshi products (clothing, jewelry, home decor, etc.).

### Architecture
```
Frontend (React/Vite)  ←→ Backend (Express.js) ←→ PostgreSQL
   Port 5173                 Port 5000/3000          Port 5432
```

- **Frontend**: React 19 + Vite, runs on port 5173
- **Backend**: Express.js REST API, runs on port 5000 (or port specified in `.env`)
- **Database**: PostgreSQL with connection pooling
- **Auth**: JWT-based (access token: 1hr, refresh token: 7 days), two roles: `customer` and `admin`

---

## 🚀 Quick Start Commands

### Backend (Node.js + Express + PostgreSQL)
```bash
cd Backend

# Development (watch mode with nodemon)
npm run start    # or npm run dev

# Database setup
npm run db:schema     # Load schema
npm run db:seed       # Add sample data
npm run db:reset      # Reset to clean state (schema + seed)

# Testing
npm run db:test       # Run test script
```

**Required `.env` variables:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=folkmint
DB_USER=postgres
DB_PASSWORD=yourpassword
PORT=5000
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
JWT_SECRET=your-secret
```

### Frontend (React + Vite)
```bash
cd Frontend/vite-project

# Development server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint check
npm run lint
```

**Required `.env` variables:**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🔍 Architecture Deep Dive

### Backend Request Flow
```
Client Request
    ↓
app.js (Global Middleware)
    ├─ securityHeaders (Helmet)
    ├─ CORS validation
    ├─ JSON parsing
    ├─ Request logger
    └─ Rate limiters (auth: 10/15min, upload: 20/hr, api: 100/15min)
    ↓
routes/index.js (Route Dispatcher)
    ↓
Specific Route File (e.g., productRoutes.js)
    ├─ Authenticate middleware
    └─ Authorize checks (isAdmin, owner-only, etc.)
    ↓
Controller (e.g., productController.js)
    ├─ Business logic
    └─ Database queries (parameterized SQL)
    ↓
PostgreSQL Response
    ↓
Error Handler (centralized 4-param middleware)
    ↓
Response to Client (JSON format)
```

### Middleware Stack Order (Backend)
1. **securityHeaders** — HTTP security headers (XSS, CSP, HSTS)
2. **cors** — Allowed origins: `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`, etc.
3. **express.json()** — Parse JSON request body
4. **express.urlencoded()** — Parse form-encoded body
5. **requestLogger** — Color-coded request logging
6. **uploadLimiter** — `/api/upload` only: 20 requests/hour
7. **authLimiter** — `/api/auth` only: 10 requests/15 min (failed only)
8. **apiLimiter** — `/api/*`: 100 requests/15 min
9. **routes** — Dispatcher
10. **notFoundHandler** — 404 for unmatched routes
11. **errorHandler** — Centralized error handling

### Authentication Pattern
- **JWT Tokens**: Access (1hr) + Refresh (7 days)
- **Header Format**: `Authorization: Bearer <access_token>`
- **Roles**: `customer`, `admin`
- **Middleware Usage**:
  - `authenticate` — Confirms logged-in user, attaches `req.user = { userId, email, role }`
  - `isAdmin` — Confirms admin role
  - `optionalAuth` — Allows both authenticated and public requests
- **Token Refresh**: `POST /api/auth/refresh-token` with refresh token in body

### Database Access Pattern
- **Parameterized SQL ONLY**: Use `$1, $2, ...` — never string interpolation
- **Connection Pooling**: `pg.Pool` reuses connections
- **Transactions**: Multi-table operations (orders, wishlist → cart) use explicit transactions
- **Constraints**: Backend handles: unique constraint (23505), foreign key (23503), not-null (23502), type mismatch (22P02)

### Response Format
```javascript
// Success
{ data: { ...results } }

// Error (from errorHandler)
{ error: "Description of what went wrong" }
```

### Frontend Architecture
- **Layering**: Config → Service → Context → Component → Page → Utils
- **State Management**: Context API (Auth, Cart)
- **HTTP Client**: Axios
- **Routing**: React Router
- **API Calls**: Centralized in `src/services/`
- **Environment**: VITE prefix for Vite env vars (e.g., `import.meta.env.VITE_API_BASE_URL`)

---

## 📝 Code Conventions

### Naming
- **Controllers**: `camelCase` function names (e.g., `async register(req, res, next)`)
- **Routes**: snake-case paths (e.g., `/api/payment-methods`, `/api/order-history`)
- **Database**: snake_case column names (e.g., `user_id`, `created_at`, `is_admin`)
- **Frontend**: PascalCase components (e.g., `CategoryMenu.jsx`), camelCase functions/hooks

### File Organization
**Backend** (`Backend/src/`):
- `controllers/` — Business logic, database queries
- `routes/` — API endpoints, middleware checks
- `middleware/` — Auth, errors, logging, rate limits, security
- `config/` — Database connection, external service setup
- `schema/` — SQL files for schema and seeds
- `utils/` — Helper functions

**Frontend** (`Frontend/vite-project/src/`):
- `components/` — Reusable UI components
- `pages/` — Page-level containers
- `services/` — API calls (Axios instances)
- `context/` — Context API providers
- `config/` — Constants, API URLs
- `types/` — TypeScript types (if using TS)
- `utils/` — Helper functions
- `data/` — Static data, constants

### Error Handling
**Backend**:
```javascript
try {
  const result = await pool.query(...);
  res.json({ data: result.rows });
} catch (error) {
  next(error); // Always pass to errorHandler
}
```

The centralized `errorHandler` catches:
- JWT errors (invalid/expired)
- PostgreSQL errors (constraint violations, type mismatches)
- Multer upload errors

**Frontend**:
- Use `try/catch` in async actions
- Display user-friendly error messages from `response.data.error`
- Log detailed errors to console for debugging

### Rate Limiting
- **Auth endpoints** (`/api/auth`): 10 requests / 15 minutes (failed attempts only)
- **Upload endpoint** (`/api/upload`): 20 requests / hour (very strict)
- **General API** (`/api/*`): 100 requests / 15 minutes
- **Bypass consideration**: Rate limiters can be adjusted in `middleware/rateLimitMiddleware.js`

---

## 🛠️ Common Patterns

### Adding a New API Endpoint
1. **Create controller function** in `Backend/src/controllers/<resource>Controller.js`:
   ```javascript
   export async function getOrder(req, res, next) {
     try {
       const { orderId } = req.params;
       const result = await pool.query(
         'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
         [orderId, req.user.userId]
       );
       if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
       res.json({ data: result.rows[0] });
     } catch (error) {
       next(error);
     }
   }
   ```

2. **Add route** in `Backend/src/routes/<resource>Routes.js`:
   ```javascript
   import { authenticate } from '../middleware/authMiddleware.js';
   import { getOrder } from '../controllers/orderController.js';
   
   router.get('/:orderId', authenticate, getOrder);
   export default router;
   ```

3. **Register route** in `Backend/src/routes/index.js`:
   ```javascript
   import orderRoutes from './orderRoutes.js';
   router.use('/api/orders', orderRoutes);
   ```

4. **Use in Frontend** via Axios:
   ```javascript
   const getOrder = async (orderId) => {
     const response = await apiClient.get(`/orders/${orderId}`);
     return response.data.data;
   };
   ```

### Adding a New Frontend Component
1. Create component in `src/components/` or `src/pages/`
2. Import and use in parent component
3. Add styles (CSS file or CSS-in-JS)
4. Use Context API for shared state (Auth, Cart)
5. Use `services/` for API calls

### Category Management (Special Implementation)
Categories use a **category closure table** with `sort_order` field.
- **NOT alphabetically ordered** — they follow explicit `sort_order` values
- **Hierarchical queries** via closure table (efficient for nested structures)
- **API endpoint**: `GET /api/categories/tree` returns full hierarchy
- **Frontend component**: `src/components/Common/CategoryMenu.jsx` displays collapsible tree
- **Database**: See `Backend/src/schema/categories.seed.sql` for structure

---

## ⚠️ Common Pitfalls & Best Practices

### Backend Pitfalls
- **SQL Injection**: Always use `$1, $2` — never string interpolation or template literals in SQL
- **Token Expiry**: Access tokens expire in 1 hour — always implement refresh token flow
- **CORS Failures**: If frontend can't reach backend, verify origin in allowed list
- **Rate Limiting**: Upload endpoint is very restrictive (20/hour) — test carefully
- **Connection Pool**: Don't open connections outside the pool; reuse the `pool` instance from `config/database.js`
- **Error Handling**: Unhandled promise rejections will crash the server — always use `try/catch` with `next(error)`

### Frontend Pitfalls
- **API Versioning**: Ensure requests match backend route structure (snake-case paths)
- **Token Management**: Store tokens securely; refresh before expiry
- **Cart Identity**: Backend uses numeric IDs; ensure consistent numeric handling
- **Field Normalization**: Map backend field names to frontend consistently (e.g., `product_id` → `productId`)
- **Environment Variables**: Use `import.meta.env.VITE_*` for Vite; prefix not matching causes undefined values
- **Hook Dependency Arrays**: Context consumers may have stale closures if dependencies not listed

### Database Pitfalls
- **Constraint Errors**: Handle 23505 (unique), 23503 (FK), 23502 (not-null), 22P02 (type mismatch) in error handler
- **Transactions**: Multi-table writes should use `BEGIN`/`COMMIT`/`ROLLBACK` transactions
- **Indexes**: Check slow queries; add indexes on `user_id`, `product_id`, `created_at`, etc.

---

## 📂 Related Area Customizations

Consider creating focused instructions for:

### Backend-Specific (`.github/instructions/backend.instructions.md`)
For: Database schema design, controller logic, API error responses, SQL optimization
Apply to: `Backend/src/**/*.js`

### Frontend-Specific (`.github/instructions/frontend.instructions.md`)
For: React component patterns, state management, Vite configuration, CSS conventions
Apply to: `Frontend/vite-project/src/**`

### Testing Suite (`.github/instructions/testing.instructions.md`)
For: Unit test patterns, integration test setup, test coverage targets
Apply to: `Backend/test/**`, `Frontend/**/*.test.js`

---

## ✅ Verification Checklist

Before starting development:
- [ ] Node.js installed (v18+ recommended)
- [ ] PostgreSQL running on `localhost:5432`
- [ ] `.env` files created with all required variables (see Quick Start)
- [ ] Backend dependencies installed: `cd Backend && npm install`
- [ ] Frontend dependencies installed: `cd Frontend/vite-project && npm install`
- [ ] Database initialized: `cd Backend && npm run db:reset`
- [ ] Backend starts: `npm run start` (should log on port 5000)
- [ ] Frontend starts: `npm run dev` (should log on port 5173)
- [ ] Verify CORS works: frontend can call backend API

---

## 📖 Documentation

- Root: `README.md` — Project overview
- Backend: `Backend/BACKEND.md` — Request lifecycle, middleware, controllers, database patterns
- Frontend: `Frontend/QUICKSTART.md`, `Frontend/IMPLEMENTATION.md` — React setup, components
- Categories: `CATEGORY_TREE_README.md` — Category hierarchy implementation

