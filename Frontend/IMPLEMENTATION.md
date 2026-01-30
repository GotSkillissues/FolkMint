# 🎉 FolkMint Frontend - Complete Architecture

## ✅ Fully Configured for Backend Schema

This frontend is now **fully aligned with the backend PostgreSQL database schema**. All tables, relationships, and constraints are properly mapped.

---

## 📊 Database Tables → Frontend Mapping

| Database Table | Frontend Service | Hook | Type Definition |
|----------------|-----------------|------|-----------------|
| `users` | `userService` | - | `User` |
| `user_preferences` | `userService` | - | `UserPreferences` |
| `preference_category` | `userService` | - | `PreferenceCategory` |
| `address` | `addressService` | `useAddresses` | `Address` |
| `payment_method` | `paymentService` | `usePaymentMethods` | `PaymentMethod` |
| `payment` | `paymentService` | - | `Payment` |
| `category` | `categoryService` | `useCategories`, `useCategoryTree` | `Category` |
| `product` | `productService` | `useProducts`, `useProduct` | `Product` |
| `product_variant` | `variantService` | - | `ProductVariant` |
| `product_image` | `variantService` | - | `ProductImage` |
| `cart` | `cartService` | - | `Cart` |
| `cart_item` | `cartService` | - | `CartItem` |
| `orders` | `orderService` | `useOrders`, `useOrder` | `Order` |
| `order_item` | `orderService` | - | `OrderItem` |
| `review` | `reviewService` | `useReviews`, `useProductReviews` | `Review` |

---

## 📁 Project Structure

```
src/
├── config/
│   └── api.config.js          # All API endpoints (matches backend routes)
├── types/
│   └── index.js               # Type definitions for all database tables
├── services/
│   ├── index.js               # Service exports
│   ├── api.service.js         # Axios instance with interceptors
│   ├── auth.service.js        # Authentication (login, register, logout)
│   ├── user.service.js        # User profile & preferences
│   ├── product.service.js     # Products with variants
│   ├── variant.service.js     # Product variants & images
│   ├── category.service.js    # Categories with tree structure
│   ├── cart.service.js        # Cart (server & localStorage)
│   ├── order.service.js       # Orders & order items
│   ├── address.service.js     # User addresses
│   ├── payment.service.js     # Payment methods & processing
│   ├── review.service.js      # Product reviews
│   └── admin.service.js       # Admin operations
├── hooks/
│   ├── index.js               # Hook exports
│   ├── useProducts.js         # Product fetching hooks
│   ├── useCategories.js       # Category hooks
│   ├── useOrders.js           # Order management hooks
│   ├── useAddresses.js        # Address management
│   ├── usePaymentMethods.js   # Payment method hooks
│   ├── useReviews.js          # Review hooks
│   ├── useDebounce.js         # Debounce utility
│   └── useLocalStorage.js     # localStorage sync
├── context/
│   ├── AuthContext.jsx        # Authentication state
│   └── CartContext.jsx        # Shopping cart state
├── utils/
│   ├── constants.js           # App constants (matches DB constraints)
│   └── helpers.js             # Utility functions
├── components/
│   ├── Layout/
│   ├── Product/
│   └── Common/
└── pages/
    ├── Home.jsx
    ├── Login.jsx
    ├── Register.jsx
    ├── ProductDetail.jsx
    └── Cart.jsx
```

---

## 🔥 Key Database Features Supported

### 👤 Users & Authentication
- User registration with `customer` or `admin` roles
- Secure password authentication
- User preferences tracking (view count)
- Preferred categories per user

### 📍 Addresses
- Multiple addresses per user
- Bangladesh-specific formatting
- Address selection for checkout

### 💳 Payment Methods
- **Card payments** (with last 4 digits, expiry)
- **bKash** (mobile banking)
- **Nagad** (mobile banking)
- **Rocket** (mobile banking)
- **Cash on Delivery**

### 📦 Categories
- Hierarchical categories (parent/child)
- Root categories: Clothing, Accessories, Home Decor, Handicrafts, Jewelry
- Subcategories support
- Tree view utilities

### 🛍️ Products
- Base product with description and price
- **Multiple variants** (size + color combinations)
- **Stock tracking** per variant
- **Multiple images** per variant
- Price ranges across variants

### 🛒 Cart
- Server-synced cart for logged-in users
- localStorage cart for guests
- Cart merge on login
- Real-time stock validation

### 📋 Orders
- Order status flow: `pending → paid → shipped → delivered`
- Cancellation support
- Order items with price-at-purchase
- Payment linkage

### ⭐ Reviews
- 1-5 star ratings
- Comments
- **Enforced purchase verification** (via order_item_id)
- One review per product per user

---

## 🔌 API Endpoints

```javascript
// All endpoints are configured in config/api.config.js

// Auth
POST /auth/login
POST /auth/register
POST /auth/logout
GET  /auth/me

// Users
GET  /users/profile
PUT  /users/profile
PUT  /users/change-password
GET  /users/preferences
PUT  /users/preferences

// Addresses
GET  /addresses/my-addresses
POST /addresses
PUT  /addresses/:id
DELETE /addresses/:id

// Payment Methods
GET  /payment-methods/my-methods
POST /payment-methods
DELETE /payment-methods/:id

// Categories
GET  /categories
GET  /categories/:id
GET  /categories/tree
GET  /categories/:id/subcategories

// Products
GET  /products
GET  /products/:id
GET  /products/category/:categoryId
GET  /products/search
GET  /products/featured
GET  /products/new-arrivals

// Variants
GET  /products/:productId/variants
PUT  /variants/:id
PATCH /variants/:id/stock

// Cart
GET  /cart
POST /cart/items
PUT  /cart/items/:cartItemId
DELETE /cart/items/:cartItemId
DELETE /cart/clear
POST /cart/sync

// Orders
GET  /orders/my-orders
GET  /orders/:id
POST /orders
POST /orders/:id/cancel

// Reviews
GET  /products/:productId/reviews
GET  /reviews/my-reviews
POST /reviews
PUT  /reviews/:id
DELETE /reviews/:id
GET  /products/:productId/can-review
```

---

## 💡 Constants (Matching Database Constraints)

```javascript
// User Roles (chk_user_role)
USER_ROLES = { CUSTOMER: 'customer', ADMIN: 'admin' }

// Order Status (chk_order_status)
ORDER_STATUS = { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }

// Payment Types (chk_payment_type)
PAYMENT_METHOD_TYPES = { CARD, BKASH, NAGAD, ROCKET, CASH_ON_DELIVERY }

// Rating Range (check constraint)
RATING_VALUES = [1, 2, 3, 4, 5]
```

---

## 🛠️ Usage Examples

### Fetching Products with Variants
```jsx
import { useProduct } from '../hooks';

function ProductPage({ productId }) {
  const { product, loading, error } = useProduct(productId);
  
  if (loading) return <Loading />;
  
  // Product includes variants with images
  const { name, description, base_price, variants } = product;
  
  // Get price range
  const priceRange = productService.getPriceRange(variants);
}
```

### Managing Cart
```jsx
import { cartService } from '../services';

// Add to cart (with variant)
await cartService.addToCart(variant_id, quantity);

// For guest users
cartService.addToLocalCart({ variant_id, quantity, price });
```

### Creating an Order
```jsx
import { orderService } from '../services';

const orderData = {
  address_id: selectedAddress.address_id,
  method_id: selectedPayment.method_id,
  items: cartItems.map(item => ({
    variant_id: item.variant_id,
    quantity: item.quantity
  }))
};

const order = await orderService.createOrder(orderData);
```

### Submitting a Review
```jsx
import { useProductReviews } from '../hooks';

const { canReview, reviewableOrderItems, createReview } = useProductReviews(productId);

if (canReview) {
  await createReview({
    rating: 5,
    comment: 'Great product!',
    order_item_id: reviewableOrderItems[0].order_item_id
  });
}
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAGES LAYER                               │
│  Home │ Login │ Register │ ProductDetail │ Cart │ Orders │ ...  │
└────────────────────────────┬────────────────────────────────────┘
                             │ uses
┌────────────────────────────▼────────────────────────────────────┐
│                      COMPONENTS LAYER                            │
│  Header │ Footer │ ProductCard │ Loading │ ReviewForm │ ...     │
└────────────────────────────┬────────────────────────────────────┘
                             │ uses
┌────────────────────────────▼────────────────────────────────────┐
│                        HOOKS LAYER                               │
│  useProducts │ useCategories │ useOrders │ useAddresses │ ...   │
└────────────────────────────┬────────────────────────────────────┘
                             │ calls
┌────────────────────────────▼────────────────────────────────────┐
│                      CONTEXT LAYER                               │
│              AuthContext │ CartContext                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ calls
┌────────────────────────────▼────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  authService │ productService │ orderService │ reviewService    │
│  addressService │ paymentService │ cartService │ adminService   │
└────────────────────────────┬────────────────────────────────────┘
                             │ uses
┌────────────────────────────▼────────────────────────────────────┐
│                      CONFIG LAYER                                │
│  API_ENDPOINTS │ API_BASE_URL │ Constants │ Types               │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                         │
│                          ↓                                       │
│              PostgreSQL Database                                 │
│  ┌─────────┬──────────────┬───────────────┬──────────────┐     │
│  │ users   │ products     │ orders        │ reviews      │     │
│  │ address │ variants     │ order_items   │ cart         │     │
│  │ payment │ categories   │ payment       │ cart_items   │     │
│  └─────────┴──────────────┴───────────────┴──────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ What Has Been Created

### 📁 **Configuration Layer**
- ✅ `config/api.config.js` - All API endpoints for all tables

### 📝 **Type Definitions**
- ✅ `types/index.js` - JSDoc types for all database tables

### 🔌 **Service Layer** (API Communication)
- ✅ `services/api.service.js` - Axios instance with interceptors
- ✅ `services/auth.service.js` - Authentication APIs
- ✅ `services/user.service.js` - User & preferences APIs
- ✅ `services/product.service.js` - Product APIs with utilities
- ✅ `services/variant.service.js` - Variant & image APIs
- ✅ `services/category.service.js` - Category APIs with tree utilities
- ✅ `services/cart.service.js` - Cart APIs (server + local)
- ✅ `services/order.service.js` - Order APIs
- ✅ `services/address.service.js` - Address APIs
- ✅ `services/payment.service.js` - Payment APIs
- ✅ `services/review.service.js` - Review APIs
- ✅ `services/admin.service.js` - Admin APIs

### 🪝 **Hooks Layer** (Data Fetching)
- ✅ `hooks/useProducts.js` - Product hooks
- ✅ `hooks/useCategories.js` - Category hooks
- ✅ `hooks/useOrders.js` - Order hooks
- ✅ `hooks/useAddresses.js` - Address hooks
- ✅ `hooks/usePaymentMethods.js` - Payment hooks
- ✅ `hooks/useReviews.js` - Review hooks
- ✅ `hooks/useDebounce.js` - Debounce utility
- ✅ `hooks/useLocalStorage.js` - localStorage sync

### 🔄 **Context Layer** (State Management)
- ✅ `context/AuthContext.jsx` - Authentication state
- ✅ `context/CartContext.jsx` - Shopping cart state

### 🛠️ **Utilities**
- ✅ `utils/constants.js` - All DB constraints as constants
- ✅ `utils/helpers.js` - Comprehensive helper functions

---

## 🚀 Quick Start

```bash
cd Frontend/vite-project
npm install
npm run dev
```

Make sure your `.env` file has:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📝 Notes

- All services include proper error handling
- Cart supports both authenticated (server) and guest (localStorage) users
- Categories support hierarchical tree structure
- Reviews are enforced to require a purchase (order_item_id)
- All price formatting uses BDT (৳) currency
- Payment methods support Bangladesh mobile banking (bKash, Nagad, Rocket)

---

**Frontend is now 100% configured for the FolkMint backend schema!** 🎉
- Service layer for all endpoints
- Automatic token management
- Error handling with interceptors

### 🔐 **Authentication System**
- Login/Register forms
- Token-based auth
- Protected routes
- Auto-logout on 401

### 🛒 **Shopping Cart**
- Add/remove products
- Update quantities
- Persistent storage
- Real-time cart count

### 📱 **Responsive Design**
- Mobile-first approach
- Breakpoint: 768px
- Touch-friendly
- Modern UI

---

## 🚀 How to Get Started

### 1️⃣ **Install Dependencies**
```bash
cd "d:\L2-T1 Project\FolkMint\Frontend\vite-project"
npm install
```

### 2️⃣ **Configure Environment**
Edit `.env` file with your backend URL:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3️⃣ **Start Development Server**
```bash
npm run dev
```

### 4️⃣ **Test the Connection**
The frontend will automatically connect to your backend APIs!

---

## 📖 Quick Usage Examples

### **Using Authentication**
```javascript
import { useAuth } from './context';

function MyComponent() {
  const { login, user, isAuthenticated, logout } = useAuth();
  
  const handleLogin = async () => {
    await login(email, password);
  };
}
```

### **Using Cart**
```javascript
import { useCart } from './context';

function ProductCard({ product }) {
  const { addToCart, cartCount } = useCart();
  
  const handleAdd = () => {
    addToCart(product, 1);
  };
}
```

### **Using Services**
```javascript
import { productService } from './services';

// Get all products
const products = await productService.getAllProducts();

// Get single product
const product = await productService.getProductById(id);

// Create product
const newProduct = await productService.createProduct(data);
```

---

## 🎯 Backend API Requirements

Your backend should have these endpoints:

### **Auth Endpoints**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### **Product Endpoints**
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### **Category Endpoints**
- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### **Order Endpoints**
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `GET /api/orders/my-orders`

### **User Endpoints**
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PUT /api/users/change-password`

---

## 📁 Final Structure

```
Frontend/vite-project/
├── src/
│   ├── config/              ← API configuration
│   ├── services/            ← API calls
│   ├── context/             ← Global state
│   ├── components/          ← Reusable UI
│   │   ├── Layout/
│   │   ├── Product/
│   │   └── Common/
│   ├── pages/               ← Views
│   ├── utils/               ← Helpers
│   └── App.jsx              ← Main app
├── .env                     ← Environment
├── package.json
└── README.md
```

---

## ✅ Benefits of This Architecture

1. **🔍 Easy to Navigate** - Clear folder structure
2. **🔧 Easy to Maintain** - Modular components
3. **🚀 Easy to Scale** - Add new features easily
4. **🔌 Easy to Connect** - Service layer for backend
5. **🎨 Easy to Customize** - Component-based styling
6. **📦 Easy to Test** - Isolated modules
7. **👥 Easy to Collaborate** - Clear responsibilities

---

## 🎨 Design System

**Colors:**
- Primary: `#d4a574` (Gold)
- Text: `#333` (Dark gray)
- Secondary: `#666` (Medium gray)
- Background: `#f5f5f5` (Light gray)
- White: `#fff`

**Typography:**
- Headings: 400-600 weight
- Body: Regular weight
- Letter spacing for buttons/nav

**Components:**
- Rounded corners (8-12px)
- Box shadows for depth
- Hover transitions (0.3s)
- Responsive grids

---

## 🔮 Next Steps

**Ready to implement:**
- ✅ Product listing
- ✅ Product details
- ✅ Shopping cart
- ✅ User authentication
- ✅ Responsive design

**Can be added:**
- ⏩ Search functionality
- ⏩ Product filters
- ⏩ User profile page
- ⏩ Order history
- ⏩ Admin dashboard
- ⏩ Payment integration
- ⏩ Product reviews
- ⏩ Wishlist

---

## 📚 Documentation

- `README.md` - Project overview and setup
- `STRUCTURE.md` - Detailed architecture documentation
- `IMPLEMENTATION.md` - This file

---

## 🎉 You're All Set!

Your frontend is now:
- ✅ Fully modular
- ✅ Easy to connect to backend
- ✅ Scalable and maintainable
- ✅ Production-ready structure
- ✅ Well-documented

**Just start your backend API and the frontend will connect automatically!**

---

**Happy Coding! 🚀**
