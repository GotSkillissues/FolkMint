# WildBLOOM Frontend

Modern, modular React frontend for the WildBLOOM e-commerce platform - a handcrafted ceramics store.

## 🏗️ Project Structure

```
src/
├── config/           # Configuration files (API endpoints)
├── services/         # API service layer (axios instances)
├── context/          # React Context providers (Auth, Cart)
├── components/       # Reusable UI components
│   ├── Layout/       # Header, Footer, Layout
│   ├── Product/      # Product-related components
│   └── Common/       # Common components (Loading, ProtectedRoute)
├── pages/            # Page components (views)
├── utils/            # Utility functions and constants
└── assets/           # Static assets (images, fonts)
```

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns with organized folder structure
- **API Service Layer**: Centralized API calls with axios interceptors
- **State Management**: Context API for authentication and cart management
- **Protected Routes**: Authentication-based route protection
- **Responsive Design**: Mobile-first responsive layouts
- **Reusable Components**: DRY principle with component composition

## 📦 Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your API URL
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🔧 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔌 Backend Connection

The frontend is designed to easily connect with your Express backend. All API endpoints are configured in:
- `src/config/api.config.js` - API endpoints and configuration
- `src/services/` - Service modules for each resource

### API Services Available:
- **authService**: Login, register, logout, profile
- **productService**: CRUD operations for products
- **categoryService**: Category management
- **orderService**: Order creation and management
- **userService**: User profile and settings

## 🎨 Key Components

### Context Providers
- **AuthContext**: User authentication state and methods
- **CartContext**: Shopping cart state and operations

### Layout Components
- **Header**: Navigation bar with cart count
- **Footer**: Site footer with links
- **Layout**: Main layout wrapper

### Pages
- **Home**: Landing page with featured products
- **ProductDetail**: Individual product view
- **Cart**: Shopping cart with checkout
- **Login/Register**: Authentication forms

## 🔐 Authentication Flow

1. User logs in via `/login`
2. Token stored in localStorage
3. Token automatically added to API requests via interceptor
4. Protected routes check authentication status
5. Logout clears token and redirects

## 🛒 Cart Management

- Cart state managed via CartContext
- Persistent storage in localStorage
- Add, remove, update quantity operations
- Real-time cart count in header

## 📱 Responsive Design

All components are fully responsive with mobile-first approach:
- Breakpoint: 768px for mobile/desktop
- Flexible grid layouts
- Touch-friendly interactions

## 🔄 API Integration Example

```javascript
import { productService } from './services';

// Fetch all products
const products = await productService.getAllProducts();

// Get product by ID
const product = await productService.getProductById(id);

// Add product (admin)
const newProduct = await productService.createProduct(productData);
```

## 🎯 Next Steps

1. Connect to your backend API by updating `.env`
2. Customize styling in component CSS files
3. Add more pages as needed (Profile, Orders, Admin Dashboard)
4. Implement additional features (Search, Filters, Reviews)
5. Add payment integration in checkout flow

## 📚 Technologies Used

- React 19
- React Router DOM
- Axios
- Vite
- Context API
- CSS Modules

## 🤝 Contributing

This is a modular, maintainable codebase. When adding features:
- Follow the existing folder structure
- Create reusable components
- Use service layer for API calls
- Update context providers for global state
- Keep components focused and single-responsibility

---

Built with ❤️ for WildBLOOM
