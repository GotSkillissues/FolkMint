import { useEffect, useState, useCallback } from 'react';
import { orderService } from '../services';

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_META = {
  pending:    { color: '#d97706', bg: '#fff7e6', border: '#fcd9a0' },
  confirmed:  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  processing: { color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd' },
  shipped:    { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  delivered:  { color: '#15803d', bg: '#f0faf3', border: '#bbe5c8' },
  cancelled:  { color: '#9f1239', bg: '#fff2f3', border: '#f5c2c7' },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  return (
    <span className="ao-badge" style={{ color: m.color, background: m.bg, borderColor: m.border }}>
      {orderService.getStatusLabel(status)}
    </span>
  );
};

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div className={`ao-toast ao-toast-${type}`}>
      {type === 'error'
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {msg}
    </div>
  );
};

const AdminOrders = () => {
  const [orders, setOrders]         = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]       = useState(false);

  const [expandedId, setExpandedId]   = useState(null);
  const [detailsMap, setDetailsMap]   = useState({});
  const [detailLoading, setDetailLoading] = useState(null);

  const [editingId, setEditingId]     = useState(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [savingId, setSavingId]       = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast  = (msg, type = 'success') => setToast({ msg, type });
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  /* ── fetch ── */
  const loadOrders = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrders({
        page,
        limit: 15,
        status: status === 'all' ? undefined : status,
      });
      const fetched = Array.isArray(res?.orders) ? res.orders : [];
      setOrders(fetched);
      setPagination(res?.pagination || { page, pages: 1, total: fetched.length });
      setEditingId(null);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadOrders(); }, []); // eslint-disable-line

  /* ── filter ── */
  const applyFilter = (status) => {
    setStatusFilter(status);
    loadOrders(1, status);
  };

  /* ── expand / detail ── */
  const toggleExpand = async (orderId) => {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);
    if (detailsMap[orderId]) return;
    setDetailLoading(orderId);
    try {
      const res = await orderService.getOrderById(orderId);
      setDetailsMap(prev => ({ ...prev, [orderId]: res?.order || null }));
    } catch {
      setDetailsMap(prev => ({ ...prev, [orderId]: null }));
    } finally {
      setDetailLoading(null);
    }
  };

  /* ── status update ── */
  const startEdit = (order) => {
    setEditingId(order.order_id);
    setStatusDraft(order.status);
  };
  const cancelEdit = () => { setEditingId(null); setStatusDraft(''); };

  const handleStatusUpdate = async (orderId) => {
    if (!statusDraft) return;
    setSavingId(orderId);
    try {
      // Backend: PATCH /orders/:id/status
      await orderService.updateOrderStatus(orderId, statusDraft);
      showToast(`Order #${orderId} updated to "${orderService.getStatusLabel(statusDraft)}".`);
      cancelEdit();
      // Refresh detail cache for this order
      setDetailsMap(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      await loadOrders(pagination.page, statusFilter);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to update status.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  /* ── cancel ── */
  const handleCancel = async (orderId) => {
    if (!window.confirm(`Cancel order #${orderId}? Stock will be restored.`)) return;
    setCancellingId(orderId);
    try {
      await orderService.cancelOrder(orderId);
      showToast(`Order #${orderId} cancelled.`);
      setDetailsMap(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      await loadOrders(pagination.page, statusFilter);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const fmt     = (n) => '৳' + Number(n || 0).toLocaleString('en-BD');
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="ao-page">

      {/* ── HEAD ── */}
      <div className="ao-head">
        <div>
          <p className="ao-eyebrow">Admin</p>
          <h1 className="ao-title">Orders</h1>
        </div>
        <button
          className="ao-refresh-btn"
          onClick={() => loadOrders(pagination.page, statusFilter)}
          disabled={loading}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      {/* ── STATUS FILTER TABS ── */}
      <div className="ao-filter-bar">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            type="button"
            className={`ao-filter-tab${statusFilter === s ? ' active' : ''}`}
            onClick={() => applyFilter(s)}
          >
            {s === 'all' ? 'All' : orderService.getStatusLabel(s)}
          </button>
        ))}
        <span className="ao-total-pill">{pagination.total} total</span>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="ao-table-card">
        {loading ? (
          <div className="ao-loading">
            <div className="ao-spinner ao-spinner-lg" />
            <p>Loading orders…</p>
          </div>
        ) : !orders.length ? (
          <div className="ao-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <p>No orders found{statusFilter !== 'all' ? ` with status "${orderService.getStatusLabel(statusFilter)}"` : ''}.</p>
          </div>
        ) : (
          <>
            <div className="ao-table-wrap">
              <table className="ao-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const isEditing   = editingId === order.order_id;
                    const isExpanded  = expandedId === order.order_id;
                    const detail      = detailsMap[order.order_id];
                    const isCancelled = order.status === 'cancelled';
                    const isDelivered = order.status === 'delivered';

                    return (
                      <>
                        <tr
                          key={order.order_id}
                          className={`ao-row${isExpanded ? ' ao-row-expanded' : ''}${isEditing ? ' ao-row-editing' : ''}`}
                        >
                          {/* Order */}
                          <td>
                            <p className="ao-order-id">#{order.order_id}</p>
                            <p className="ao-sub">{order.item_count || 0} item{order.item_count !== 1 ? 's' : ''}</p>
                          </td>

                          {/* Customer */}
                          <td>
                            <p className="ao-customer-name">
                              {order.first_name || order.last_name
                                ? `${order.first_name || ''} ${order.last_name || ''}`.trim()
                                : `User #${order.user_id}`}
                            </p>
                            <p className="ao-sub">{order.email}</p>
                          </td>

                          {/* Amount */}
                          <td>
                            <p className="ao-amount">{fmt(order.total_amount)}</p>
                          </td>

                          {/* Status */}
                          <td>
                            {isEditing ? (
                              <select
                                className="ao-select"
                                value={statusDraft}
                                onChange={e => setStatusDraft(e.target.value)}
                              >
                                {STATUS_OPTIONS.map(s => (
                                  <option key={s} value={s}>{orderService.getStatusLabel(s)}</option>
                                ))}
                              </select>
                            ) : (
                              <StatusBadge status={order.status} />
                            )}
                          </td>

                          {/* Date */}
                          <td>
                            <p className="ao-date">{fmtDate(order.created_at || order.order_date)}</p>
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="ao-actions">
                              <button
                                className="ao-action-btn ao-action-view"
                                onClick={() => toggleExpand(order.order_id)}
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                              </button>

                              {isEditing ? (
                                <>
                                  <button
                                    className="ao-action-btn ao-action-save"
                                    disabled={savingId === order.order_id}
                                    onClick={() => handleStatusUpdate(order.order_id)}
                                  >
                                    {savingId === order.order_id
                                      ? <span className="ao-spinner" />
                                      : 'Save'}
                                  </button>
                                  <button className="ao-action-btn ao-action-cancel-edit" onClick={cancelEdit}>
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                !isCancelled && !isDelivered && (
                                  <button
                                    className="ao-action-btn ao-action-edit"
                                    onClick={() => startEdit(order)}
                                  >
                                    Edit Status
                                  </button>
                                )
                              )}

                              {!isCancelled && !isDelivered && (
                                <button
                                  className="ao-action-btn ao-action-cancel-order"
                                  disabled={cancellingId === order.order_id}
                                  onClick={() => handleCancel(order.order_id)}
                                >
                                  {cancellingId === order.order_id
                                    ? <span className="ao-spinner" />
                                    : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── EXPANDED DETAIL ROW ── */}
                        {isExpanded && (
                          <tr key={`detail-${order.order_id}`} className="ao-detail-row">
                            <td colSpan={6}>
                              {detailLoading === order.order_id ? (
                                <div className="ao-detail-loading">
                                  <div className="ao-spinner" /> Loading details…
                                </div>
                              ) : !detail ? (
                                <p className="ao-detail-empty">Could not load order details.</p>
                              ) : (
                                <div className="ao-detail-panel">

                                  {/* Address */}
                                  <div className="ao-detail-section">
                                    <p className="ao-detail-section-label">Shipping Address</p>
                                    <p className="ao-detail-value">
                                      {[
                                        detail.street,
                                        detail.apartment,
                                        detail.city,
                                        detail.district,
                                        detail.postal_code,
                                        detail.country,
                                      ].filter(Boolean).join(', ') || 'No address on record'}
                                    </p>
                                  </div>

                                  {/* Payment */}
                                  <div className="ao-detail-section">
                                    <p className="ao-detail-section-label">Payment</p>
                                    <p className="ao-detail-value">
                                      {detail.payment_method_type
                                        ? detail.payment_method_type.toUpperCase()
                                        : 'N/A'}
                                      {detail.payment_status && (
                                        <span className="ao-payment-status"> · {detail.payment_status}</span>
                                      )}
                                    </p>
                                  </div>

                                  {/* Items */}
                                  <div className="ao-detail-section ao-detail-items">
                                    <p className="ao-detail-section-label">Items</p>
                                    <div className="ao-items-list">
                                      {(detail.items || []).map(item => (
                                        <div key={item.order_item_id} className="ao-item-row">
                                          <div className="ao-item-img-wrap">
                                            {item.primary_image
                                              ? <img src={item.primary_image} alt={item.product_name} className="ao-item-img" />
                                              : <div className="ao-item-img-placeholder">
                                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                                    <polyline points="21 15 16 10 5 21"/>
                                                  </svg>
                                                </div>
                                            }
                                          </div>
                                          <div className="ao-item-info">
                                            <p className="ao-item-name">{item.product_name}</p>
                                            {item.size && <p className="ao-item-meta">Size: {item.size}</p>}
                                            <p className="ao-item-meta">SKU: {item.sku || 'N/A'}</p>
                                          </div>
                                          <div className="ao-item-right">
                                            <p className="ao-item-price">{fmt(item.unit_price)}</p>
                                            <p className="ao-item-qty">× {item.quantity}</p>
                                            <p className="ao-item-subtotal">{fmt(Number(item.unit_price) * item.quantity)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Total */}
                                  <div className="ao-detail-total">
                                    <span>Order Total</span>
                                    <span className="ao-detail-total-val">{fmt(detail.total_amount)}</span>
                                  </div>

                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION ── */}
            {pagination.pages > 1 && (
              <div className="ao-pagination">
                <p className="ao-muted">Page {pagination.page} of {pagination.pages}</p>
                <div className="ao-pag-btns">
                  <button
                    className="ao-pag-btn"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => loadOrders(pagination.page - 1, statusFilter)}
                  >← Previous</button>
                  <button
                    className="ao-pag-btn"
                    disabled={pagination.page >= pagination.pages || loading}
                    onClick={() => loadOrders(pagination.page + 1, statusFilter)}
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .ao-page {
          width: 100%;
          padding: 40px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-alt);
          min-height: 100vh;
        }

        /* ── HEAD ── */
        .ao-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 4px;
        }
        .ao-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }
        .ao-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
          margin: 0;
        }
        .ao-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          cursor: pointer;
          transition: all .2s;
        }
        .ao-refresh-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ao-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ── TOAST ── */
        .ao-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--r);
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid;
          animation: ao-fade-in .2s ease;
        }
        @keyframes ao-fade-in { from { opacity: 0; transform: translateY(-6px); } }
        .ao-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ao-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        /* ── FILTER BAR ── */
        .ao-filter-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 12px 16px;
        }
        .ao-filter-tab {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          transition: all .2s;
          white-space: nowrap;
        }
        .ao-filter-tab:hover { color: var(--dark); border-color: var(--border); }
        .ao-filter-tab.active {
          background: var(--dark);
          color: var(--gold);
          border-color: var(--dark);
        }
        .ao-total-pill {
          margin-left: auto;
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
        }

        /* ── TABLE CARD ── */
        .ao-table-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .ao-loading, .ao-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 64px 24px;
          color: var(--muted);
          font-size: 14px;
        }

        /* ── TABLE ── */
        .ao-table-wrap { overflow-x: auto; }
        .ao-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 780px;
        }
        .ao-table thead th {
          padding: 14px 16px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--muted);
          border-bottom: 1px solid var(--border);
          background: var(--bg-alt);
          white-space: nowrap;
        }
        .ao-table tbody td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
          font-size: 14px;
        }
        .ao-row { transition: background .2s; }
        .ao-row:hover { background: var(--bg); }
        .ao-row-expanded { background: #fffbf0 !important; }
        .ao-row-editing  { background: #fffbf0 !important; }

        /* ── CELL CONTENT ── */
        .ao-order-id {
          font-family: ui-monospace, monospace;
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
          margin: 0 0 3px;
        }
        .ao-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
        }
        .ao-customer-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--dark);
          margin: 0 0 3px;
        }
        .ao-amount {
          font-size: 15px;
          font-weight: 700;
          color: var(--dark);
          margin: 0;
          white-space: nowrap;
        }
        .ao-date {
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
          margin: 0;
        }

        /* ── BADGE ── */
        .ao-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .04em;
          white-space: nowrap;
        }

        /* ── SELECT ── */
        .ao-select {
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--gold);
          border-radius: var(--r);
          font-size: 13px;
          color: var(--dark);
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(196,146,42,.1);
        }
        .ao-select:focus { outline: none; }

        /* ── ACTIONS ── */
        .ao-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ao-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: calc(var(--r) - 2px);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .04em;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          white-space: nowrap;
        }
        .ao-action-btn:disabled { opacity: .4; cursor: not-allowed; }
        .ao-action-view {
          background: var(--bg);
          border-color: var(--border);
          color: var(--dark);
        }
        .ao-action-view:hover { border-color: var(--gold); color: var(--gold); }
        .ao-action-edit {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }
        .ao-action-edit:hover { background: #dbeafe; }
        .ao-action-save {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--gold);
        }
        .ao-action-save:hover:not(:disabled) { background: var(--black); border-color: var(--black); }
        .ao-action-cancel-edit {
          background: var(--bg);
          border-color: var(--border);
          color: var(--muted);
        }
        .ao-action-cancel-edit:hover { color: var(--dark); border-color: var(--border-hover); }
        .ao-action-cancel-order {
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ao-action-cancel-order:hover:not(:disabled) {
          background: #9f1239;
          border-color: #9f1239;
          color: #fff;
        }

        /* ── DETAIL ROW ── */
        .ao-detail-row td { padding: 0 !important; border-bottom: 2px solid var(--gold) !important; }
        .ao-detail-panel {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr;
          gap: 0;
          background: #fffbf0;
          border-top: 1px solid #fcd9a0;
          animation: ao-fade-in .2s ease;
        }
        .ao-detail-section {
          padding: 20px 24px;
          border-right: 1px solid #fcd9a0;
        }
        .ao-detail-items {
          border-right: none;
        }
        .ao-detail-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0 0 8px;
        }
        .ao-detail-value {
          font-size: 13.5px;
          color: var(--dark);
          margin: 0;
          line-height: 1.6;
        }
        .ao-payment-status {
          text-transform: capitalize;
          color: var(--muted);
        }
        .ao-detail-total {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          padding: 14px 24px;
          border-top: 1px solid #fcd9a0;
          font-size: 14px;
          font-weight: 600;
          color: var(--muted);
        }
        .ao-detail-total-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--dark);
        }
        .ao-detail-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 24px;
          font-size: 13.5px;
          color: var(--muted);
        }
        .ao-detail-empty {
          padding: 20px 24px;
          font-size: 13.5px;
          color: var(--muted);
          margin: 0;
        }

        /* ── ITEMS LIST ── */
        .ao-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ao-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .ao-item-img-wrap { flex-shrink: 0; }
        .ao-item-img {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid var(--border);
        }
        .ao-item-img-placeholder {
          width: 48px;
          height: 48px;
          background: var(--bg-alt);
          border: 1px solid var(--border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
        }
        .ao-item-info { flex: 1; min-width: 0; }
        .ao-item-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--dark);
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ao-item-meta {
          font-size: 11.5px;
          color: var(--muted);
          margin: 0;
        }
        .ao-item-right {
          text-align: right;
          flex-shrink: 0;
        }
        .ao-item-price {
          font-size: 13px;
          color: var(--muted);
          margin: 0 0 1px;
        }
        .ao-item-qty {
          font-size: 12px;
          color: var(--muted);
          margin: 0 0 1px;
        }
        .ao-item-subtotal {
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
          margin: 0;
        }

        /* ── PAGINATION ── */
        .ao-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
        }
        .ao-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .ao-pag-btns { display: flex; gap: 8px; }
        .ao-pag-btn {
          padding: 8px 18px;
          border-radius: var(--r);
          border: 1px solid var(--border);
          background: var(--bg-card);
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          cursor: pointer;
          transition: all .2s;
        }
        .ao-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ao-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── SPINNER ── */
        @keyframes ao-spin { to { transform: rotate(360deg); } }
        .ao-spinner {
          display: inline-block;
          width: 13px; height: 13px;
          border: 2px solid rgba(196,146,42,.3);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: ao-spin .7s linear infinite;
          flex-shrink: 0;
        }
        .ao-spinner-lg { width: 28px; height: 28px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 860px) {
          .ao-page { padding: 24px 20px 48px; }
          .ao-head { flex-direction: column; align-items: flex-start; }
          .ao-detail-panel { grid-template-columns: 1fr; }
          .ao-detail-section { border-right: none; border-bottom: 1px solid #fcd9a0; }
        }
      `}</style>
    </div>
  );
};

export default AdminOrders;