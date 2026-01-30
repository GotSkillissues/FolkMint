# 🛍️ FolkMint - E-Commerce Platform

> A full-stack e-commerce website for handcrafted Bangladeshi products (clothing, jewelry, home decor, etc.)

---

## 📖 What is This Project?

**FolkMint** is an online store (like Amazon, but smaller and for local artisan products). It has two main parts:

1. **Backend** - The "brain" that stores data and handles business logic
2. **Frontend** - The "face" that users see and interact with

---

## 🏗️ Project Architecture (The Big Picture)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│    FRONTEND     │ ◄─────► │     BACKEND     │ ◄─────► │    DATABASE     │
│   (React App)   │   API   │  (Express API)  │   SQL   │  (PostgreSQL)   │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
     Port 5173                  Port 3000                   Port 5432
```

**In simple terms:**
- User clicks a button on the website (Frontend)
- Frontend sends a request to the Backend
- Backend fetches/saves data from the Database
- Backend sends the data back to Frontend
- Frontend displays it to the user

---

## 🧰 Technologies Used (What Tools Are We Using?)

### Backend (Server-Side)
| Technology | What It Does |
|------------|--------------|
| **Node.js** | JavaScript runtime - lets you run JavaScript outside the browser |
| **Express.js** | Web framework - makes building APIs easy |
| **PostgreSQL** | Database - stores all your data (users, products, orders, etc.) |
| **pg** | Node.js driver - lets JavaScript talk to PostgreSQL |
| **dotenv** | Loads secret passwords from a `.env` file |
| **cors** | Allows Frontend to talk to Backend (cross-origin requests) |
| **nodemon** | Auto-restarts server when you change code |

### Frontend (Client-Side)
| Technology | What It Does |
|------------|--------------|
| **React 19** | UI library - builds the user interface with components |
| **Vite** | Build tool - super fast development server and bundler |
| **React Router** | Navigation - handles page routing (Home, Login, Product pages) |
| **Axios** | HTTP client - sends requests to the Backend API |
| **Context API** | State management - shares data across components (Auth, Cart) |

---

## 📁 Folder Structure Explained

### Backend Structure
```
Backend/
├── package.json          # 📦 Dependencies and scripts
├── src/
│   ├── app.js            # 🚀 Express app setup (middleware, routes)
│   ├── server.js         # 🌐 Starts the server on port 3000
│   ├── config/
│   │   └── database.js   # 🗄️ PostgreSQL connection setup
│   ├── controllers/      # 🎮 Business logic (what happens when you hit an API)
│   │   ├── authController.js     # Login/Register logic
│   │   ├── productController.js  # Product CRUD operations
│   │   ├── orderController.js    # Order management
│   │   └── ...
│   ├── middleware/
│   │   └── authMiddleware.js     # 🔒 Checks if user is logged in
│   ├── routes/           # 🛣️ URL endpoints (API routes)
│   │   ├── index.js      # Combines all routes
│   │   ├── authRoutes.js # /api/auth/login, /api/auth/register
│   │   ├── productRoutes.js # /api/products
│   │   └── ...
│   ├── schema/
│   │   ├── seed.sql      # 🌱 Sample data for testing
│   │   └── FolkMint.session.sql # 📊 Database table definitions
│   └── utils/
│       └── helpers.js    # 🔧 Reusable helper functions
```

### Frontend Structure
```
Frontend/vite-project/
├── package.json          # 📦 Dependencies and scripts
├── index.html            # 📄 Entry HTML file
├── vite.config.js        # ⚙️ Vite configuration
├── src/
│   ├── main.jsx          # 🚪 Entry point - renders React app
│   ├── App.jsx           # 🏠 Root component - defines routes
│   ├── App.css           # 🎨 Global styles
│   ├── components/       # 🧩 Reusable UI pieces
│   │   ├── Common/       # Shared components
│   │   │   ├── Loading.jsx       # Loading spinner
│   │   │   └── ProtectedRoute.jsx # Auth guard
│   │   ├── Layout/       # Page layout
│   │   │   ├── Header.jsx        # Navigation bar
│   │   │   ├── Footer.jsx        # Footer
│   │   │   └── Layout.jsx        # Page wrapper
│   │   └── Product/
│   │       └── ProductCard.jsx   # Product display card
│   ├── pages/            # 📑 Full pages (routes)
│   │   ├── Home.jsx      # Home page
│   │   ├── Login.jsx     # Login page
│   │   ├── Register.jsx  # Registration page
│   │   ├── ProductDetail.jsx # Single product page
│   │   └── Cart.jsx      # Shopping cart page
│   ├── context/          # 🧠 Global state management
│   │   ├── AuthContext.jsx   # User authentication state
│   │   └── CartContext.jsx   # Shopping cart state
│   ├── services/         # 📡 API calls to Backend
│   │   ├── api.service.js    # Base Axios config
│   │   ├── auth.service.js   # Login/Register API calls
│   │   ├── product.service.js # Product API calls
│   │   ├── cart.service.js   # Cart API calls
│   │   └── ...
│   ├── hooks/            # 🪝 Custom React hooks
│   │   ├── useProducts.js    # Fetch products hook
│   │   ├── useOrders.js      # Fetch orders hook
│   │   └── ...
│   └── config/
│       └── api.config.js     # API URL configuration
```

---

## 🔄 How Data Flows (Step-by-Step Example)

### Example: User Views Products on Home Page

```
1️⃣ User opens http://localhost:5173 (Frontend)
   └── App.jsx renders Home.jsx

2️⃣ Home.jsx component mounts
   └── useEffect() runs
   └── Calls productService.getAllProducts()

3️⃣ productService.js makes HTTP GET request
   └── axios.get('http://localhost:3000/api/products')

4️⃣ Backend receives request at /api/products
   └── productRoutes.js → productController.js

5️⃣ productController.js queries PostgreSQL database
   └── SELECT * FROM product JOIN product_variant...

6️⃣ Database returns product data

7️⃣ Backend sends JSON response to Frontend
   └── { products: [...], total: 18 }

8️⃣ Frontend receives data
   └── setProducts(data.products)

9️⃣ React re-renders with product data
   └── ProductCard components display products
```

---

## 🗄️ Database Schema (What Data We Store)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   product    │     │    orders    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ username     │     │ name         │     │ user_id (FK) │
│ email        │     │ description  │     │ total_amount │
│ password_hash│     │ base_price   │     │ status       │
│ first_name   │     │ category_id  │     │ created_at   │
│ last_name    │     └──────────────┘     └──────────────┘
│ role         │            │
└──────────────┘            ▼
                   ┌────────────────┐
                   │ product_variant│
                   ├────────────────┤
                   │ id             │
                   │ product_id(FK) │
                   │ size           │
                   │ color          │
                   │ stock_quantity │
                   │ price          │
                   └────────────────┘
```

**Other tables:** `category`, `cart`, `cart_item`, `order_item`, `review`, `address`, `payment_method`

---

## 🚀 How to Run This Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) (v14 or higher)
- A code editor (VS Code recommended)

### Step 1: Set Up the Database

```bash
# 1. Open PostgreSQL and create the database
CREATE DATABASE folkmint;

# 2. Run the schema to create tables
cd Backend
npm run db:schema

# 3. Seed sample data
npm run db:seed
```

### Step 2: Set Up the Backend

```bash
# 1. Navigate to Backend folder
cd Backend

# 2. Install dependencies
npm install

# 3. Create a .env file with your database credentials
# (Create a file named ".env" in Backend folder)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=folkmint
DB_USER=postgres
DB_PASSWORD=your_password_here

# 4. Start the server
npm start

# ✅ You should see: "Server running on port 3000"
```

### Step 3: Set Up the Frontend

```bash
# 1. Navigate to Frontend folder
cd Frontend/vite-project

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# ✅ Open http://localhost:5173 in your browser
```

---

## 🔗 API Endpoints (Backend URLs)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/login` | Login and get token |
| `GET` | `/api/products` | Get all products |
| `GET` | `/api/products/:id` | Get single product |
| `GET` | `/api/categories` | Get all categories |
| `GET` | `/api/users/:id` | Get user profile |
| `POST` | `/api/orders` | Create new order |
| `GET` | `/api/orders/:id` | Get order details |

---

## 🧩 Key Concepts Explained

### 1. What is an API?
An **API** (Application Programming Interface) is like a waiter in a restaurant:
- You (Frontend) tell the waiter (API) what you want
- The waiter goes to the kitchen (Database)
- The waiter brings back your food (Data)

### 2. What is a Component?
A **component** is a reusable piece of UI. Think of it like LEGO blocks:
- `Header` component = Navigation bar
- `ProductCard` component = One product display
- `Button` component = A clickable button

You can use the same component multiple times with different data!

### 3. What is State?
**State** is data that can change over time:
- `products` = list of products (changes when you filter)
- `user` = logged in user (changes when you login/logout)
- `cart` = items in cart (changes when you add/remove)

### 4. What is Context?
**Context** is a way to share state across many components without passing props down manually:
- `AuthContext` = Shares user login state everywhere
- `CartContext` = Shares shopping cart everywhere

### 5. What is a Route?
A **route** maps a URL to a page:
- `/` → Home page
- `/login` → Login page
- `/products/5` → Product with ID 5

### 6. What is Middleware?
**Middleware** is code that runs BEFORE your main logic:
- `authMiddleware` checks if user is logged in before allowing access
- Like a security guard checking your ID before entering a club

---

## 🐛 Common Issues & Fixes

### "CORS Error"
```
Access-Control-Allow-Origin error
```
**Fix:** Make sure Backend is running and CORS is configured in `app.js`

### "Connection Refused"
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Fix:** Start the Backend server (`npm start` in Backend folder)

### "Database Connection Failed"
```
Error: password authentication failed
```
**Fix:** Check your `.env` file has correct database password

### "Module Not Found"
```
Cannot find module 'express'
```
**Fix:** Run `npm install` in the folder that shows the error

---

## 📝 Available Scripts

### Backend
```bash
npm start        # Start server with nodemon (auto-restart)
npm run dev      # Same as start
npm run db:schema # Create database tables
npm run db:seed   # Add sample data
npm run db:reset  # Reset database (schema + seed)
```

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check code for errors
```

---

## 🎯 What's Currently Working?

- ✅ Home page with products
- ✅ Product detail page
- ✅ User registration
- ✅ User login/logout
- ✅ Shopping cart (add/remove items)
- ✅ Product categories
- ✅ Responsive design

## 🚧 What Needs Work?

- ⬜ Checkout process
- ⬜ Order history
- ⬜ Admin dashboard
- ⬜ Search functionality
- ⬜ User profile page
- ⬜ Payment integration

---

## 📚 Learning Resources

- [React Docs](https://react.dev/) - Learn React basics
- [Express.js Guide](https://expressjs.com/en/guide/routing.html) - Backend routing
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) - SQL basics
- [Axios Docs](https://axios-http.com/docs/intro) - HTTP requests
- [Vite Guide](https://vitejs.dev/guide/) - Build tool docs

---

## 🤝 Contributing

1. Make your changes
2. Test that everything works
3. Commit with a clear message

---

Made with ❤️ for L2-T1 Project
