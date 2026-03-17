import { useState } from 'react';
import { useOrders } from '../hooks';
import { orderService } from '../services';
import './PageUI.css';

const Orders = () => {
  const { orders, loading, error, cancelOrder, filterByStatus } = useOrders();
  const [actionMessage, setActionMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const handleCancel = async (orderId) => {
    setActionMessage('');
    const result = await cancelOrder(orderId);
    if (result.success) {
      setActionMessage(`Order #${orderId} cancelled.`);
    } else {
      setActionMessage(result.error || 'Failed to cancel order.');
    }
  };

  const applyFilter = (status, key) => {
    setActiveFilter(key);
    filterByStatus(status);
  };

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track and manage your order history in one place.</p>
        </div>
      </div>

      <div className="row-actions" style={{ marginBottom: '.8rem' }}>
        <button className={`ui-chip${activeFilter === 'all' ? ' active' : ''}`} type="button" onClick={() => applyFilter(undefined, 'all')}>All</button>
        <button className={`ui-chip${activeFilter === 'pending' ? ' active' : ''}`} type="button" onClick={() => applyFilter('pending', 'pending')}>Pending</button>
        <button className={`ui-chip${activeFilter === 'paid' ? ' active' : ''}`} type="button" onClick={() => applyFilter('paid', 'paid')}>Paid</button>
        <button className={`ui-chip${activeFilter === 'shipped' ? ' active' : ''}`} type="button" onClick={() => applyFilter('shipped', 'shipped')}>Shipped</button>
        <button className={`ui-chip${activeFilter === 'delivered' ? ' active' : ''}`} type="button" onClick={() => applyFilter('delivered', 'delivered')}>Delivered</button>
        <button className={`ui-chip${activeFilter === 'cancelled' ? ' active' : ''}`} type="button" onClick={() => applyFilter('cancelled', 'cancelled')}>Cancelled</button>
      </div>

      {actionMessage && <p className="msg-success">{actionMessage}</p>}
      {loading && <p className="msg-note">Loading orders...</p>}
      {error && <p className="msg-error">{error}</p>}
      {!loading && !error && !orders.length && <p className="msg-note">No orders yet.</p>}

      <div className="stack">
        {orders.map((order) => (
          <div key={order.order_id} className="list-row">
            <p style={{ margin: 0 }}><strong>Order #{order.order_id}</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Status: <span style={{ color: orderService.getStatusColor(order.status) }}>{orderService.getStatusLabel(order.status)}</span></p>
            <p style={{ margin: '0.25rem 0' }}>Amount: ৳{Number(order.total_amount || 0).toFixed(2)}</p>
            <p style={{ margin: '0.25rem 0' }}>Date: {orderService.formatOrderDate(order.created_at || order.order_date)}</p>

            {orderService.canCancelOrder(order) && (
              <button className="ui-btn-ghost" type="button" onClick={() => handleCancel(order.order_id)}>
                Cancel Order
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
