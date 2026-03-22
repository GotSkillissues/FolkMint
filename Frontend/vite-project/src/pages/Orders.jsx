import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { orderService } from '../services';

const STATUS_META = {
  pending:    { label: 'Pending',    color: '#d97706', bg: '#fff7e6', border: '#fcd9a0' },
  confirmed:  { label: 'Confirmed',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  processing: { label: 'Processing', color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd' },
  shipped:    { label: 'Shipped',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  delivered:  { label: 'Delivered',  color: '#15803d', bg: '#f0faf3', border: '#bbe5c8' },
  cancelled:  { label: 'Cancelled',  color: '#9f1239', bg: '#fff2f3', border: '#f5c2c7' },
};

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const Spin = ({ s = 32 }) => (
  <span style={{ display: 'inline-block', width: s, height: s, borderRadius: '50%', border: '2px solid rgba(212,175,55,.2)', borderTopColor: 'var(--gold)', animation: 'or-spin .65s linear infinite' }} />
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      border: `1px solid ${m.border}`, background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '.04em', whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
};

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div className={`or-toast or-toast-${type}`}>
      <span style={{ flex: 1, fontWeight: 500 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .6, padding: 0 }}>✕</button>
    </div>
  );
};

const Orders = () => {
  const location = useLocation();
  const [orders, setOrders]         = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [detailsMap, setDetailsMap] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);
  const [cancellingId, setCancellingId]   = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const loadMoreRef = useRef(null);

  const showToast  = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const load = useCallback(async (page = 1, status = statusFilter, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await orderService.getUserOrders({
        page, limit: 10,
        status: status === 'all' ? undefined : status,
      });
      const fetched = Array.isArray(res?.orders) ? res.orders : [];
      setOrders((prev) => {
        if (!append) return fetched;
        const seen = new Set(prev.map((o) => o.order_id));
        const next = fetched.filter((o) => !seen.has(o.order_id));
        return [...prev, ...next];
      });
      setPagination(res?.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load orders.', 'error');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => { load(); }, []);

  // Highlight new order if coming from checkout
  useEffect(() => {
    const newId = location.state?.newOrderId;
    if (newId) setExpandedId(newId);
  }, [location.state]);

  const applyFilter = (status) => {
    setStatusFilter(status);
    setExpandedId(null);
    setDetailsMap({});
    load(1, status);
  };

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading || loadingMore) return;
        if (pagination.page >= pagination.pages) return;
        load(pagination.page + 1, statusFilter, true);
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load, loading, loadingMore, pagination.page, pagination.pages, statusFilter]);

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

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order? Stock will be restored.')) return;
    setCancellingId(orderId);
    try {
      await orderService.cancelOrder(orderId);
      showToast('Order cancelled.');
      setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: 'cancelled' } : o));
      setDetailsMap(prev => { const n = { ...prev }; delete n[orderId]; return n; });
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const fmtDate = d => new Date(d).toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtTime = d => new Date(d).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });

  const getDisplayOrderNumber = (idx) => {
    const total = Number(pagination?.total || orders.length || 0);
    const page = Number(pagination?.page || 1);
    const limit = Number(pagination?.limit || 10);
    const value = total - ((page - 1) * limit) - idx;
    return value > 0 ? value : (orders.length - idx);
  };

  return (
    <div className="or-page">

      <div className="or-head">
        <div>
          <p className="or-eyebrow">Your Account</p>
          <h1 className="or-title">My Orders</h1>
        </div>
        <button className="or-refresh-btn" onClick={() => load(pagination.page, statusFilter)} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />

      {/* Filter tabs */}
      <div className="or-filter-bar">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            className={`or-filter-tab${statusFilter === s ? ' active' : ''}`}
            onClick={() => applyFilter(s)}
          >
            {s === 'all' ? 'All Orders' : STATUS_META[s]?.label || s}
          </button>
        ))}
        <span className="or-total-pill">{pagination.total} order{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      <div className="or-card">
        {loading ? (
          <div className="or-loading"><Spin /><p>Loading orders…</p></div>
        ) : !orders.length ? (
          <div className="or-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <p className="or-empty-title">
              {statusFilter === 'all' ? 'No orders yet' : `No ${STATUS_META[statusFilter]?.label?.toLowerCase()} orders`}
            </p>
            <p className="or-empty-sub">
              {statusFilter === 'all'
                ? 'Your completed orders will appear here.'
                : <button className="or-btn-link" onClick={() => applyFilter('all')}>View all orders</button>
              }
            </p>
            {statusFilter === 'all' && <Link to="/products" className="or-btn-primary">Start Shopping</Link>}
          </div>
        ) : (
          <>
            {orders.map((order, idx) => {
              const isExpanded  = expandedId === order.order_id;
              const detail      = detailsMap[order.order_id];
              const canCancel   = order.status === 'pending';
              const isCancelling = cancellingId === order.order_id;

              return (
                <div key={order.order_id} className={`or-order-block${isExpanded ? ' expanded' : ''}`}>
                  {/* Order header row */}
                  <div className="or-order-row" onClick={() => toggleExpand(order.order_id)}>
                    <div className="or-order-left">
                      <p className="or-order-id">Order #{getDisplayOrderNumber(idx)}</p>
                      <p className="or-order-date">{fmtDate(order.created_at)} at {fmtTime(order.created_at)}</p>
                    </div>
                    <div className="or-order-center">
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="or-order-right">
                      <p className="or-order-amount">৳{Number(order.total_amount || 0).toLocaleString('en-BD')}</p>
                      <p className="or-order-items">{order.item_count || 0} item{order.item_count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="or-order-chevron" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="or-detail">
                      {detailLoading === order.order_id ? (
                        <div className="or-detail-loading"><Spin s={18} /> Loading details…</div>
                      ) : !detail ? (
                        <p className="or-detail-empty">Could not load order details.</p>
                      ) : (
                        <div className="or-detail-inner">

                          {/* Items */}
                          <div className="or-detail-section">
                            <p className="or-detail-label">Items</p>
                            <div className="or-items-list">
                              {(detail.items || []).map(item => (
                                <div key={item.order_item_id} className="or-item-row">
                                  <div className="or-item-img-wrap">
                                    {item.primary_image
                                      ? <img src={item.primary_image} alt={item.product_name} className="or-item-img" />
                                      : <div className="or-item-img-ph" />
                                    }
                                  </div>
                                  <div className="or-item-info">
                                    <Link to={`/products/${item.product_id}`} className="or-item-name">{item.product_name}</Link>
                                    {item.size && <p className="or-item-meta">Size: {item.size}</p>}
                                    <p className="or-item-meta">SKU: {item.sku || 'N/A'}</p>
                                  </div>
                                  <div className="or-item-right">
                                    <p className="or-item-price">৳{Number(item.unit_price || 0).toLocaleString('en-BD')}</p>
                                    <p className="or-item-qty">× {item.quantity}</p>
                                    <p className="or-item-subtotal">৳{(Number(item.unit_price) * item.quantity).toLocaleString('en-BD')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipping + Payment */}
                          <div className="or-detail-meta">
                            <div className="or-detail-section">
                              <p className="or-detail-label">Shipping Address</p>
                              <p className="or-detail-val">
                                {[detail.address?.street, detail.address?.city, detail.address?.postal_code, detail.address?.country].filter(Boolean).join(', ') || 'N/A'}
                              </p>
                            </div>
                            <div className="or-detail-section">
                              <p className="or-detail-label">Payment</p>
                              <p className="or-detail-val">
                                {detail.payment?.payment_type?.toUpperCase() || 'N/A'}
                                {detail.payment?.status && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {detail.payment.status}</span>}
                              </p>
                            </div>
                            <div className="or-detail-section">
                              <p className="or-detail-label">Order Total</p>
                              <p className="or-detail-total">৳{Number(detail.total_amount || 0).toLocaleString('en-BD')}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="or-detail-actions">
                            {canCancel && (
                              <button
                                className="or-btn-cancel"
                                disabled={isCancelling}
                                onClick={() => handleCancel(order.order_id)}
                              >
                                {isCancelling ? <><Spin s={13} /> Cancelling…</> : 'Cancel Order'}
                              </button>
                            )}
                            {order.status === 'delivered' && (
                              <Link to={`/products`} className="or-btn-ghost">Buy Again</Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={loadMoreRef} className="or-load-more" aria-hidden="true" />
            {loadingMore && <p className="or-muted">Loading more orders…</p>}
          </>
        )}
      </div>

      <style>{`
        @keyframes or-spin { to { transform: rotate(360deg); } }

        .or-page {
          width: 100%; padding: 100px 48px 64px;
          display: flex; flex-direction: column; gap: 16px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .or-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 4px;
        }
        .or-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .or-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .or-refresh-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: all .2s;
        }
        .or-refresh-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .or-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* Toast */
        .or-toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--r); border: 1px solid;
          font-size: 13.5px; animation: or-fade .2s ease;
        }
        @keyframes or-fade { from { opacity:0; transform:translateY(-4px); } }
        .or-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .or-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        /* Filter bar */
        .or-filter-bar {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 12px 16px;
        }
        .or-filter-tab {
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid transparent; background: transparent;
          font-size: 12.5px; font-weight: 600; color: var(--muted);
          cursor: pointer; transition: all .2s; white-space: nowrap;
        }
        .or-filter-tab:hover { color: var(--dark); border-color: var(--border); }
        .or-filter-tab.active { background: var(--dark); color: var(--gold); border-color: var(--dark); }
        .or-total-pill { margin-left: auto; font-size: 12px; color: var(--muted); font-weight: 600; }

        /* Main card */
        .or-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
        }
        .or-loading, .or-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 64px 24px; color: var(--muted); font-size: 14px;
        }
        .or-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .or-empty-sub { font-size: 13.5px; color: var(--muted); margin: 0; }

        /* Order block */
        .or-order-block { border-bottom: 1px solid var(--border); }
        .or-order-block:last-child { border-bottom: none; }
        .or-order-block.expanded { background: #fffbf0; }

        .or-order-row {
          display: grid; grid-template-columns: 1fr auto auto auto;
          gap: 16px; align-items: center;
          padding: 18px 24px; cursor: pointer;
          transition: background .15s;
        }
        .or-order-row:hover { background: var(--bg); }
        .or-order-block.expanded .or-order-row { background: #fffbf0; }

        .or-order-id { font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; color: var(--dark); margin: 0 0 3px; }
        .or-order-date { font-size: 12px; color: var(--muted); margin: 0; }
        .or-order-center { display: flex; align-items: center; }
        .or-order-right { text-align: right; }
        .or-order-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 700; color: var(--dark); margin: 0 0 2px;
        }
        .or-order-items { font-size: 12px; color: var(--muted); margin: 0; }
        .or-order-chevron { display: flex; align-items: center; color: var(--muted); flex-shrink: 0; }

        /* Detail */
        .or-detail {
          border-top: 1px solid #fcd9a0;
          background: #fffbf0; animation: or-fade .2s ease;
        }
        .or-detail-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 24px; font-size: 13.5px; color: var(--muted);
        }
        .or-detail-empty { padding: 20px 24px; font-size: 13.5px; color: var(--muted); margin: 0; }
        .or-detail-inner { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }

        /* Items list */
        .or-detail-label {
          font-size: 10px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--muted); margin: 0 0 10px;
        }
        .or-items-list { display: flex; flex-direction: column; gap: 10px; }
        .or-item-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
        }
        .or-item-img-wrap { flex-shrink: 0; }
        .or-item-img { width: 52px; height: 52px; object-fit: cover; border-radius: calc(var(--r) - 2px); border: 1px solid var(--border); }
        .or-item-img-ph { width: 52px; height: 52px; background: var(--bg-alt); border-radius: calc(var(--r) - 2px); border: 1px solid var(--border); }
        .or-item-info { flex: 1; min-width: 0; }
        .or-item-name { font-size: 13.5px; font-weight: 600; color: var(--dark); margin: 0 0 2px; text-decoration: none; display: block; }
        .or-item-name:hover { color: var(--gold); }
        .or-item-meta { font-size: 11.5px; color: var(--muted); margin: 0; }
        .or-item-right { text-align: right; flex-shrink: 0; }
        .or-item-price { font-size: 12.5px; color: var(--muted); margin: 0; }
        .or-item-qty   { font-size: 12px; color: var(--muted); margin: 0; }
        .or-item-subtotal { font-size: 14px; font-weight: 700; color: var(--dark); margin: 0; }

        /* Detail meta */
        .or-detail-meta {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; border: 1px solid var(--border); border-radius: var(--r); overflow: hidden;
        }
        .or-detail-section { padding: 14px 18px; border-right: 1px solid var(--border); }
        .or-detail-section:last-child { border-right: none; }
        .or-detail-val { font-size: 13.5px; color: var(--dark); margin: 0; line-height: 1.5; }
        .or-detail-total {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 700; color: var(--dark); margin: 0;
        }

        /* Detail actions */
        .or-detail-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .or-btn-cancel {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; background: #fff2f3; color: #9f1239;
          border: 1px solid #f5c2c7; border-radius: var(--r);
          font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s;
        }
        .or-btn-cancel:hover:not(:disabled) { background: #9f1239; border-color: #9f1239; color: #fff; }
        .or-btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
        .or-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; text-decoration: none; transition: border-color .2s, color .2s;
        }
        .or-btn-ghost:hover { border-color: var(--gold); color: var(--gold); }
        .or-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; text-decoration: none; transition: background .2s;
        }
        .or-btn-primary:hover { background: var(--black); }
        .or-btn-link {
          background: none; border: none; padding: 0;
          font-size: 13.5px; font-weight: 600; color: var(--gold);
          cursor: pointer; transition: color .15s;
        }
        .or-btn-link:hover { color: var(--dark); }

        /* Pagination */
        .or-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-top: 1px solid var(--border);
        }
        .or-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .or-pag-btns { display: flex; gap: 8px; }
        .or-pag-btn {
          padding: 7px 16px; border-radius: var(--r);
          border: 1px solid var(--border); background: var(--bg-card);
          font-size: 13px; font-weight: 600; color: var(--dark); cursor: pointer; transition: all .2s;
        }
        .or-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .or-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 1100px) { .or-page { padding: 88px 28px 56px; } }
        @media (max-width: 860px) {
          .or-page { padding: 80px 20px 48px; }
          .or-head { flex-direction: column; align-items: flex-start; }
          .or-order-row { grid-template-columns: 1fr auto auto; }
          .or-order-center { display: none; }
          .or-detail-meta { grid-template-columns: 1fr; }
          .or-detail-section { border-right: none; border-bottom: 1px solid var(--border); }
          .or-detail-section:last-child { border-bottom: none; }
        }
        @media (max-width: 560px) {
          .or-order-row { grid-template-columns: 1fr auto; }
          .or-order-right { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Orders;