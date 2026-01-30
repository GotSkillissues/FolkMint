# 📁 Frontend Modular Structure Documentation

## Overview
The frontend has been completely restructured with a modular, scalable architecture that makes it easy to connect to your backend API.

## 📂 Directory Structure

```
Frontend/vite-project/
├── src/
│   ├── config/
│   │   └── api.config.js          # API endpoints and configuration
│   │
│   ├── services/                   # API Service Layer
│   │   ├── api.service.js          # Axios instance with interceptors
│   │   ├── auth.service.js         # Authentication API calls
│   │   ├── product.service.js      # Product API calls
│   │   ├── category.service.js     # Category API calls
│   │   ├── order.service.js        # Order API calls
│   │   ├── user.service.js         # User API calls
│   │   └── index.js                # Service exports
│   │
│   ├── context/                    # State Management
│   │   ├── AuthContext.jsx         # Authentication state & methods
│   │   ├── CartContext.jsx         # Shopping cart state & methods
│   │   └── index.js                # Context exports
│   │
│   ├── components/                 # Reusable Components
│   │   ├── Layout/
│   │   │   ├── Header.jsx          # Site header with navigation
│   │   │   ├── Header.css
│   │   │   ├── Footer.jsx          # Site footer
│   │   │   ├── Footer.css
│   │   │   ├── Layout.jsx          # Main layout wrapper
│   │   │   └── Layout.css
│   │   ├── Product/
│   │   │   ├── ProductCard.jsx     # Product card component
│   │   │   └── ProductCard.css
│   │   ├── Common/
│   │   │   ├── Loading.jsx         # Loading spinner
│   │   │   ├── Loading.css
│   │   │   └── ProtectedRoute.jsx  # Route protection HOC
│   │   └── index.js                # Component exports
│   │
│   ├── pages/                      # Page Components
│   │   ├── Home.jsx                # Homepage
│   │   ├── Home.css
│   │   ├── Login.jsx               # Login page
│   │   ├── Login.css
│   │   ├── Register.jsx            # Registration page
│   │   ├── ProductDetail.jsx       # Product detail page
│   │   ├── ProductDetail.css
│   │   ├── Cart.jsx                # Shopping cart page
│   │   ├── Cart.css
│   │   └── index.js                # Page exports
│   │
│   ├── utils/                      # Utility Functions
│   │   ├── helpers.js              # Helper functions
│   │   ├── constants.js            # App constants
│   │   └── index.js                # Utils exports
│   │
│   ├── App.jsx                     # Main App component with routing
│   ├── App.css                     # Global styles
│   ├── main.jsx                    # App entry point
│   └── index.css                   # Base styles
│
├── .env                            # Environment variables
├── .env.example                    # Environment template
├── package.json                    # Dependencies
└── README.md                       # Project documentation
```

## 🔧 How to Use

### 1. Environment Setup
Create a `.env` file with your backend API URL:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

## 🔌 Backend Integration

### API Services
All backend communication is handled through service modules:

```javascript
// Example: Using product service
import { productService } from './services';

// Get all products
const products = await productService.getAllProducts();

// Get single product
const product = await productService.getProductById(productId);

// Create product (admin)
const newProduct = await productService.createProduct(productData);
```

### Available Services:
- **authService**: Authentication (login, register, logout)
- **productService**: Product CRUD operations
- **categoryService**: Category management
- **orderService**: Order management
- **userService**: User profile management

### API Configuration
Edit [src/config/api.config.js](src/config/api.config.js) to add/modify endpoints:
```javascript
export const API_ENDPOINTS = {
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id) => `/products/${id}`,
  },
  // Add more endpoints
};
```

## 🔐 Authentication Flow

1. **Login**: User submits credentials → Token stored in localStorage
2. **Request Interceptor**: Token automatically added to all API requests
3. **Response Interceptor**: Handles 401 errors, auto-logout
4. **Protected Routes**: Routes check authentication before rendering

### Using Auth Context:
```javascript
import { useAuth } from './context';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Use auth methods and state
}
```

## 🛒 Cart Management

Cart state is managed globally with CartContext:

```javascript
import { useCart } from './context';

function ProductComponent({ product }) {
  const { addToCart, cartItems, cartCount } = useCart();
  
  const handleAdd = () => {
    addToCart(product, 1);
  };
}
```

### Cart Features:
- Persistent storage (localStorage)
- Add/remove/update quantity
- Real-time cart count in header
- Total calculation

## 🎨 Component Architecture

### Layout Components
- **Header**: Navigation, cart icon, auth buttons
- **Footer**: Site links, information
- **Layout**: Wraps all pages with consistent header/footer

### Reusable Components
- **ProductCard**: Display product in grid
- **Loading**: Loading spinner
- **ProtectedRoute**: Route access control

### Pages
- **Home**: Landing page with featured products
- **ProductDetail**: Single product view
- **Cart**: Shopping cart with checkout
- **Login/Register**: Authentication forms

## 📱 Styling

Each component has its own CSS file:
- Modular, component-scoped styles
- Responsive design (breakpoint: 768px)
- Consistent color scheme (primary: #d4a574)
- Mobile-first approach

## 🚀 Adding New Features

### Adding a New Page:
1. Create page in `src/pages/NewPage.jsx`
2. Export from `src/pages/index.js`
3. Add route in `src/App.jsx`

### Adding a New Service:
1. Create service in `src/services/new.service.js`
2. Export from `src/services/index.js`
3. Define endpoints in `src/config/api.config.js`

### Adding a New Context:
1. Create context in `src/context/NewContext.jsx`
2. Export from `src/context/index.js`
3. Wrap App in provider (App.jsx)

## 🔍 Key Files

### [src/services/api.service.js](src/services/api.service.js)
- Axios instance with base configuration
- Request interceptor (adds auth token)
- Response interceptor (handles errors)

### [src/context/AuthContext.jsx](src/context/AuthContext.jsx)
- Authentication state management
- Login/logout methods
- User data persistence

### [src/context/CartContext.jsx](src/context/CartContext.jsx)
- Shopping cart state
- Cart operations (add, remove, update)
- localStorage persistence

### [src/App.jsx](src/App.jsx)
- Route configuration
- Provider setup
- Layout integration

## 📊 Data Flow

```
User Action
    ↓
Component calls Context method
    ↓
Context method calls Service
    ↓
Service makes API request
    ↓
Response interceptor handles response
    ↓
Context updates state
    ↓
Components re-render with new data
```

## 🎯 Best Practices

1. **Always use services** for API calls, never axios directly
2. **Use context** for global state (auth, cart)
3. **Component state** for local UI state only
4. **Reusable components** in `/components`, page-specific in pages
5. **Export from index.js** for clean imports
6. **Protected routes** for authenticated pages
7. **Error handling** in try-catch blocks

## 🔗 Connecting to Your Backend

Your backend endpoints should match the structure in `api.config.js`:

```
Backend API Structure:
├── /api/auth
│   ├── POST /login
│   ├── POST /register
│   └── GET /me
├── /api/products
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   └── PUT /:id
├── /api/categories
├── /api/orders
└── /api/users
```

## 📦 Dependencies

- **react**: UI library
- **react-router-dom**: Routing
- **axios**: HTTP client
- **vite**: Build tool

## 🚀 Next Steps

1. ✅ Structure is ready
2. ⏩ Connect to backend API
3. ⏩ Customize styling
4. ⏩ Add more pages (Profile, Orders, Admin)
5. ⏩ Implement search & filters
6. ⏩ Add payment integration
7. ⏩ Add product reviews
8. ⏩ Add image upload

---

**The frontend is now fully modular and ready to connect to your backend!** 🎉
