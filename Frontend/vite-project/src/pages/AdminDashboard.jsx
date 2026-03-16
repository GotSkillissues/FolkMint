import { useEffect, useState } from 'react';
import { userService, orderService, productService } from '../services';
import { Link } from 'react-router-dom';
import './PageUI.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    orders: 0,
    products: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, ordersRes, productsRes, productsFullRes] = await Promise.all([
          userService.getAllUsers({ page: 1, limit: 1 }),
          orderService.getAllOrders({ page: 1, limit: 10 }),
          productService.getAllProducts({ page: 1, limit: 1 }),
          productService.getAllProducts({ page: 1, limit: 100 }),
        ]);

        const orders = ordersRes?.orders || [];
        const allProducts = productsFullRes?.products || [];

        const pendingOrders = orders.filter((order) => ['pending', 'confirmed', 'processing'].includes(order.status)).length;
        const revenue = orders
          .filter((order) => order.status !== 'cancelled')
          .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

        const lowStockList = allProducts.filter((product) => Number(product?.stock ?? product?.stock_quantity ?? 0) <= 5);

        setStats({
          users: usersRes?.pagination?.total || usersRes?.users?.length || 0,
          orders: ordersRes?.pagination?.total || ordersRes?.orders?.length || 0,
          products: productsRes?.pagination?.total || productsRes?.total || productsRes?.data?.length || 0,
          pendingOrders,
          lowStockProducts: lowStockList.length,
          revenue,
        });

        setRecentOrders(orders.slice(0, 6));
        setLowStockItems(lowStockList.slice(0, 6));
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load admin stats.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="page-shell admin-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Operations overview for customers, orders, inventory, and daily actions.</p>
        </div>
        <div className="row-actions">
          <Link className="ui-btn-ghost" to="/admin/users">Users</Link>
          <Link className="ui-btn-ghost" to="/admin/orders">Orders</Link>
          <Link className="ui-btn-ghost" to="/admin/products">Products</Link>
        </div>
      </div>

      {error && <p className="msg-error">{error}</p>}
      {loading && <p className="msg-note">Loading dashboard...</p>}

      <div className="admin-kpis">
        <div className="admin-kpi">
          <p>Users</p>
          <strong>{stats.users}</strong>
        </div>
        <div className="admin-kpi">
          <p>Orders</p>
          <strong>{stats.orders}</strong>
        </div>
        <div className="admin-kpi">
          <p>Products</p>
          <strong>{stats.products}</strong>
        </div>
        <div className="admin-kpi">
          <p>Pending Pipeline</p>
          <strong>{stats.pendingOrders}</strong>
        </div>
        <div className="admin-kpi">
          <p>Low Stock (≤5)</p>
          <strong>{stats.lowStockProducts}</strong>
        </div>
        <div className="admin-kpi">
          <p>Recent Revenue</p>
          <strong>৳{stats.revenue.toLocaleString('en-BD')}</strong>
        </div>
      </div>

      <div className="split-two">
        <section className="ui-card section">
          <div className="admin-card-head">
            <h3>Recent Orders</h3>
            <Link className="ui-btn-ghost" to="/admin/orders">Open Orders</Link>
          </div>

          {!recentOrders.length ? (
            <p className="admin-muted">No orders found.</p>
          ) : (
            <div className="stack">
              {recentOrders.map((order) => (
                <div key={order.order_id} className="list-row">
                  <strong>Order #{order.order_id}</strong>
                  <p className="admin-muted">{order.username} · {order.email}</p>
                  <p className="admin-muted">
                    Status: <span style={{ color: orderService.getStatusColor(order.status) }}>{orderService.getStatusLabel(order.status)}</span>
                  </p>
                  <p className="admin-muted">Total: ৳{Number(order.total_amount || 0).toLocaleString('en-BD')}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ui-card section">
          <div className="admin-card-head">
            <h3>Low Stock Alerts</h3>
            <Link className="ui-btn-ghost" to="/admin/products">Open Products</Link>
          </div>

          {!lowStockItems.length ? (
            <p className="admin-muted">Inventory looks healthy.</p>
          ) : (
            <div className="stack">
              {lowStockItems.map((product) => (
                <div key={product.product_id} className="list-row">
                  <strong>{product.name}</strong>
                  <p className="admin-muted">Category: {product.category_name || product.category?.name || 'N/A'}</p>
                  <p className="admin-muted danger-text">Stock: {Number(product?.stock ?? product?.stock_quantity ?? 0)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
