import { useEffect, useState } from 'react';
import { orderService } from '../services';
import './PageUI.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await orderService.getAllOrders({ page: 1, limit: 50 });
        setOrders(response?.orders || response?.data || []);
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load orders.');
      }
    };

    load();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin · Orders</h1>
          <p className="page-subtitle">Monitor and inspect customer orders.</p>
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}

      <div className="stack">
        {orders.map((order) => (
          <div key={order.order_id} className="list-row">
            <strong>Order #{order.order_id}</strong>
            <p style={{ margin: '0.25rem 0' }}>User: {order.username || order.user_id}</p>
            <p style={{ margin: '0.25rem 0' }}>Status: {order.status}</p>
            <p style={{ margin: '0.25rem 0' }}>Total: ${Number(order.total_amount || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
