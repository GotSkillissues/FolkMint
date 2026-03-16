import { useEffect, useState } from 'react';
import { userService, orderService, productService } from '../services';
import { Link } from 'react-router-dom';
import './PageUI.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, orders: 0, products: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, ordersRes, productsRes] = await Promise.all([
          userService.getAllUsers({ page: 1, limit: 1 }),
          orderService.getAllOrders({ page: 1, limit: 1 }),
          productService.getAllProducts({ page: 1, limit: 1 }),
        ]);

        setStats({
          users: usersRes?.pagination?.total || usersRes?.users?.length || 0,
          orders: ordersRes?.pagination?.total || ordersRes?.orders?.length || 0,
          products: productsRes?.pagination?.total || productsRes?.total || productsRes?.data?.length || 0,
        });
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load admin stats.');
      }
    };

    load();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Overview of platform activity and management shortcuts.</p>
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}

      <div className="stats-grid">
        <div className="stat-box">
          <p>Users</p>
          <strong>{stats.users}</strong>
        </div>
        <div className="stat-box">
          <p>Orders</p>
          <strong>{stats.orders}</strong>
        </div>
        <div className="stat-box">
          <p>Products</p>
          <strong>{stats.products}</strong>
        </div>
      </div>

      <div className="row-actions" style={{ marginTop: '1rem' }}>
        <Link className="ui-btn-ghost" to="/admin/users">Manage Users</Link>
        <Link className="ui-btn-ghost" to="/admin/orders">Manage Orders</Link>
        <Link className="ui-btn-ghost" to="/admin/products">Manage Products</Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
