# 🚀 Quick Start Guide

## Get Your Frontend Running in 3 Steps!

### Step 1: Environment Setup
```bash
# Navigate to the frontend directory
cd "d:\L2-T1 Project\FolkMint\Frontend\vite-project"

# The .env file is already created with:
# VITE_API_BASE_URL=http://localhost:5000/api
```

### Step 2: Install & Start
```bash
# Dependencies are already installed, just run:
npm run dev
```

### Step 3: Open Browser
```
http://localhost:5173
```

---

## 📂 What You Got

### **Architecture**
```
✅ Config Layer     → API endpoints
✅ Service Layer    → Backend communication
✅ Context Layer    → State management
✅ Component Layer  → Reusable UI
✅ Page Layer       → Views/Routes
✅ Utils Layer      → Helpers & constants
```

### **Features**
- ✅ Authentication (Login/Register)
- ✅ Product Listing & Details
- ✅ Shopping Cart
- ✅ Protected Routes
- ✅ Responsive Design
- ✅ API Integration Ready

### **Pages Available**
- `/` - Home page
- `/login` - Login form
- `/register` - Registration form
- `/products/:id` - Product details
- `/cart` - Shopping cart

---

## 🔌 Backend Connection

### Your backend needs these endpoints:

**Authentication:**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

**Products:**
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

**Categories:**
- `GET /api/categories`
- `POST /api/categories`

**Orders:**
- `GET /api/orders`
- `POST /api/orders`

**Users:**
- `GET /api/users/profile`
- `PUT /api/users/profile`

---

## 💡 Usage Examples

### Import and Use Services
```javascript
import { productService, authService } from './services';

// Get products
const products = await productService.getAllProducts();

// Login user
await authService.login(email, password);
```

### Use Context Hooks
```javascript
import { useAuth, useCart } from './context';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  const { cartCount, addToCart } = useCart();
  
  // Use them!
}
```

---

## 📖 Documentation Files

- `README.md` - Full project documentation
- `STRUCTURE.md` - Architecture details
- `IMPLEMENTATION.md` - What was built
- `QUICKSTART.md` - This file

---

## 🎯 Next Actions

1. ✅ Frontend is ready
2. ⏩ Start your backend server
3. ⏩ Test the connection
4. ⏩ Customize styles
5. ⏩ Add more features

---

## 🛠️ File Structure

```
src/
├── config/           # API configuration
├── services/         # API calls (7 services)
├── context/          # State (Auth, Cart)
├── components/       # UI components
│   ├── Layout/       # Header, Footer
│   ├── Product/      # ProductCard
│   └── Common/       # Loading, ProtectedRoute
├── pages/            # Views (5 pages)
├── utils/            # Helpers & constants
└── App.jsx           # Main app with routing
```

---

## 🎨 Styling

- **Primary Color:** `#d4a574` (Gold)
- **Responsive:** Mobile-first design
- **Breakpoint:** 768px
- **Modern:** Box shadows, transitions, rounded corners

---

## 🔥 Cool Features

### Auto Token Management
The `api.service.js` automatically:
- Adds auth token to requests
- Handles 401 errors
- Redirects to login when needed

### Persistent Cart
Cart data saved in localStorage:
- Survives page refresh
- Real-time count in header
- Easy add/remove/update

### Protected Routes
Automatically redirects:
- Unauthenticated users to login
- Authenticated users away from login/register

---

## 📞 Need Help?

Check these files:
- `README.md` - Comprehensive guide
- `STRUCTURE.md` - Architecture details
- Code comments in service files

---

**Your modular frontend is ready to connect to your backend! 🎉**
