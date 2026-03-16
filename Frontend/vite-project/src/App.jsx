import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, CartProvider } from './context';
import { Layout, ProtectedRoute, RequireAdmin } from './components';
import {
  Home,
  Login,
  Register,
  ProductDetail,
  Cart,
  Products,
  Checkout,
  Account,
  Orders,
  Wishlist,
  About,
  Terms,
  Privacy,
  Shipping,
  Help,
  AdminDashboard,
  AdminUsers,
  AdminOrders,
  AdminProducts,
} from './pages';
import './App.css';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/shipping" element={<Shipping />} />
              <Route path="/help" element={<Help />} />
              
              {/* Auth Routes - Only for non-authenticated users */}
              <Route 
                path="/login" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Login />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Register />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected Routes - Require authentication */}
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <RequireAdmin>
                      <AdminUsers />
                    </RequireAdmin>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute>
                    <RequireAdmin>
                      <AdminOrders />
                    </RequireAdmin>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute>
                    <RequireAdmin>
                      <AdminProducts />
                    </RequireAdmin>
                  </ProtectedRoute>
                }
              />
              
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
