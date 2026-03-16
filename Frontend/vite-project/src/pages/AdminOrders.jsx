import { useEffect, useState } from 'react';
import { orderService } from '../services';
import './PageUI.css';

const ORDER_STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [editingStatusOrderId, setEditingStatusOrderId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  const loadOrders = async (page = pagination.page, requestedStatus = statusFilter) => {
    setLoading(true);
    setError('');

    try {
      const response = await orderService.getAllOrders({
        page,
        limit: pagination.limit,
        status: requestedStatus === 'all' ? undefined : requestedStatus,
      });

      const fetchedOrders = Array.isArray(response?.orders) ? response.orders : [];
      setOrders(fetchedOrders);
      setPagination(response?.pagination || { page, pages: 1, total: fetchedOrders.length, limit: pagination.limit });

      const initialStatuses = {};
      fetchedOrders.forEach((entry) => {
        initialStatuses[entry.order_id] = entry.status;
      });
      setStatusDrafts(initialStatuses);
      setEditingStatusOrderId(null);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1, 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    loadOrders(nextPage, statusFilter);
  };

  const applyStatusFilter = (nextStatus) => {
    setStatusFilter(nextStatus);
    loadOrders(1, nextStatus);
  };

  const handleStatusUpdate = async (orderId) => {
    const nextStatus = statusDrafts[orderId];
    if (!nextStatus) return;

    setSavingId(orderId);
    setError('');
    setActionMessage('');

    try {
      await orderService.updateOrderStatus(orderId, nextStatus);
      setActionMessage(`Order #${orderId} updated to ${orderService.getStatusLabel(nextStatus)}.`);
      setEditingStatusOrderId(null);
      await loadOrders(pagination.page, statusFilter);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to update order status.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm(`Cancel order #${orderId}?`);
    if (!confirmed) return;

    setSavingId(orderId);
    setError('');
    setActionMessage('');

    try {
      await orderService.cancelOrder(orderId);
      setActionMessage(`Order #${orderId} cancelled.`);
      await loadOrders(pagination.page, statusFilter);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to cancel order.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const confirmed = window.confirm(`Delete order #${orderId}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(orderId);
    setError('');
    setActionMessage('');

    try {
      await orderService.deleteOrder(orderId);
      setActionMessage(`Order #${orderId} deleted.`);
      const nextPage = orders.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await loadOrders(nextPage, statusFilter);
      if (expandedOrderId === orderId) {
        setExpandedOrderId(null);
      }
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to delete order.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleDetails = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);
    if (orderDetails[orderId]) {
      return;
    }

    setDetailLoadingId(orderId);
    try {
      const response = await orderService.getOrderById(orderId);
      setOrderDetails((prev) => ({
        ...prev,
        [orderId]: response?.order || null,
      }));
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to load order details.');
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <div className="page-shell admin-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin · Orders</h1>
          <p className="page-subtitle">Control fulfillment with filters, status transitions, and deep order inspection.</p>
        </div>
      </div>
      {actionMessage && <p className="msg-success">{actionMessage}</p>}
      {error && <p className="msg-error">{error}</p>}

      <section className="ui-card section">
        <div className="admin-card-head">
          <h3>Order Queue</h3>
          <p className="admin-muted">Total orders: {pagination.total}</p>
        </div>

        <div className="admin-toolbar compact">
          <select className="ui-select" value={statusFilter} onChange={(event) => applyStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{orderService.getStatusLabel(status)}</option>
            ))}
          </select>
          <p className="admin-muted">Page size: {pagination.limit}</p>
          <button className="ui-btn-ghost" type="button" onClick={() => loadOrders(pagination.page, statusFilter)}>Refresh</button>
        </div>

        {loading ? (
          <p className="msg-note">Loading orders...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td colSpan={6}>No orders found.</td>
                  </tr>
                ) : orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>
                      <strong className="mono">#{order.order_id}</strong>
                      <p className="admin-muted">Items: {order.item_count || 0}</p>
                    </td>
                    <td>
                      <strong>{order.username || `User #${order.user_id}`}</strong>
                      <p className="admin-muted">{order.email}</p>
                    </td>
                    <td>৳{Number(order.total_amount || 0).toLocaleString('en-BD')}</td>
                    <td>
                      <span className="status-pill" style={{ color: orderService.getStatusColor(order.status), borderColor: orderService.getStatusColor(order.status) }}>
                        {orderService.getStatusLabel(order.status)}
                      </span>
                      {editingStatusOrderId === order.order_id && (
                        <div style={{ marginTop: '.45rem' }}>
                          <select
                            className="ui-select"
                            value={statusDrafts[order.order_id] || order.status}
                            onChange={(event) => setStatusDrafts((prev) => ({ ...prev, [order.order_id]: event.target.value }))}
                          >
                            {ORDER_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{orderService.getStatusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                    <td>{orderService.formatOrderDate(order.created_at || order.order_date)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="ui-btn-ghost" type="button" onClick={() => toggleDetails(order.order_id)}>
                          {expandedOrderId === order.order_id ? 'Hide' : 'View'}
                        </button>
                        {editingStatusOrderId === order.order_id ? (
                          <>
                            <button className="ui-btn-ghost" type="button" disabled={savingId === order.order_id} onClick={() => handleStatusUpdate(order.order_id)}>
                              {savingId === order.order_id ? 'Saving...' : 'Save'}
                            </button>
                            <button className="ui-btn-ghost" type="button" onClick={() => setEditingStatusOrderId(null)}>
                              Cancel Edit
                            </button>
                          </>
                        ) : (
                          <button className="ui-btn-ghost" type="button" onClick={() => setEditingStatusOrderId(order.order_id)}>
                            Edit Status
                          </button>
                        )}
                        {order.status !== 'cancelled' && (
                          <button className="ui-btn-ghost" type="button" disabled={savingId === order.order_id} onClick={() => handleCancelOrder(order.order_id)}>
                            Cancel
                          </button>
                        )}
                        <button className="ui-btn-ghost danger-text" type="button" disabled={deletingId === order.order_id} onClick={() => handleDeleteOrder(order.order_id)}>
                          {deletingId === order.order_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                      {expandedOrderId === order.order_id && (
                        <div className="msg-note" style={{ marginTop: '.45rem' }}>
                          {detailLoadingId === order.order_id ? (
                            <p className="admin-muted">Loading details...</p>
                          ) : orderDetails[order.order_id] ? (
                            <div className="stack">
                              <p className="admin-muted">
                                Shipping: {orderDetails[order.order_id].street || 'N/A'}, {orderDetails[order.order_id].city || ''}, {orderDetails[order.order_id].country || ''}
                              </p>
                              <div className="stack">
                                {(orderDetails[order.order_id].items || []).map((item) => (
                                  <div key={item.order_item_id}>
                                    <p className="admin-muted">
                                      {item.product_name} × {item.quantity} · ৳{Number(item.unit_price || 0).toLocaleString('en-BD')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="admin-muted">No details available.</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-pagination">
          <p className="admin-muted">Page {pagination.page} of {pagination.pages || 1}</p>
          <div className="row-actions">
            <button className="ui-btn-ghost" type="button" disabled={pagination.page <= 1 || loading} onClick={() => goToPage(pagination.page - 1)}>Previous</button>
            <button className="ui-btn-ghost" type="button" disabled={pagination.page >= pagination.pages || loading} onClick={() => goToPage(pagination.page + 1)}>Next</button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default AdminOrders;
