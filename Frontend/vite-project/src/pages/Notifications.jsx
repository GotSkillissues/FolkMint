import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationService } from '../services';
import { useAuth } from '../context';

const IconBell      = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IconCheck     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconTrash     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;

const TYPE_META = {
  order_placed:     { label: 'Order Placed',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb' },
  order_confirmed:  { label: 'Confirmed',        color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd', dot: '#0891b2' },
  order_shipped:    { label: 'Shipped',          color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', dot: '#7c3aed' },
  order_delivered:  { label: 'Delivered',        color: '#15803d', bg: '#f0faf3', border: '#bbe5c8', dot: '#15803d' },
  order_cancelled:  { label: 'Cancelled',        color: '#9f1239', bg: '#fff2f3', border: '#f5c2c7', dot: '#9f1239' },
  back_in_stock:    { label: 'Back in Stock',    color: '#b45309', bg: '#fff7e6', border: '#fcd9a0', dot: '#D4AF37' },
  system:           { label: 'System',           color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dot: '#64748b' },
};

const fmtDate = (d) => {
  const date = new Date(d);
  const now  = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return date.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' });
};

const Spin = () => (
  <span style={{
    display: 'inline-block', width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(212,175,55,.2)', borderTopColor: 'var(--gold)',
    animation: 'notif-spin .65s linear infinite', flexShrink: 0,
  }} />
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div className={`notif-toast notif-toast-${type}`}>
      <span style={{ flex: 1, fontWeight: 500 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .6, padding: 0 }}>✕</button>
    </div>
  );
};

const Notifications = () => {
  const { isAuthenticated } = useAuth();

  const [items, setItems]           = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter]         = useState('all'); // 'all' | 'unread'
  const [toast, setToast]           = useState({ msg: '', type: 'success' });
  const [busyId, setBusyId]         = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);
  const loadMoreRef = useRef(null);

  const showToast  = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const load = useCallback(async (page = 1, f = filter, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (f === 'unread') params.is_read = false;
      const res = await notificationService.getNotifications(params);
      const fetched = Array.isArray(res?.notifications) ? res.notifications : [];
      setItems((prev) => {
        if (!append) return fetched;
        const seen = new Set(prev.map((n) => n.notification_id));
        const next = fetched.filter((n) => !seen.has(n.notification_id));
        return [...prev, ...next];
      });
      setUnreadCount(res?.unread_count || 0);
      setPagination(res?.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load notifications.', 'error');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const applyFilter = (f) => {
    setFilter(f);
    load(1, f);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading || loadingMore) return;
        if (pagination.page >= pagination.pages) return;
        load(pagination.page + 1, filter, true);
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filter, isAuthenticated, load, loading, loadingMore, pagination.page, pagination.pages]);

  const handleMarkRead = async (notificationId) => {
    setBusyId(notificationId);
    try {
      await notificationService.markAsRead(notificationId);
      setItems(prev => prev.map(n =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to mark as read.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (notificationId) => {
    setBusyId(notificationId);
    try {
      const wasUnread = items.find(n => n.notification_id === notificationId)?.is_read === false;
      await notificationService.deleteNotification(notificationId);
      setItems(prev => prev.filter(n => n.notification_id !== notificationId));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read.');
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed.', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm('Delete all read notifications?')) return;
    setClearingRead(true);
    try {
      await notificationService.deleteReadNotifications();
      setItems(prev => prev.filter(n => !n.is_read));
      showToast('Read notifications cleared.');
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed.', 'error');
    } finally {
      setClearingRead(false);
    }
  };

  return (
    <div className="notif-page">

      {/* Head */}
      <div className="notif-head">
        <div>
          <p className="notif-eyebrow">Your Account</p>
          <h1 className="notif-title">
            Notifications
            {unreadCount > 0 && <span className="notif-head-badge">{unreadCount}</span>}
          </h1>
        </div>
        <div className="notif-head-actions">
          {unreadCount > 0 && (
            <button className="notif-btn-ghost" disabled={markingAll} onClick={handleMarkAllRead}>
              {markingAll ? <Spin /> : <IconCheck />}
              Mark all read
            </button>
          )}
          <button className="notif-btn-ghost notif-btn-danger" disabled={clearingRead} onClick={handleClearRead}>
            {clearingRead ? <Spin /> : <IconTrash />}
            Clear read
          </button>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />

      {/* Filter tabs */}
      <div className="notif-filter-bar">
        {[['all', 'All'], ['unread', 'Unread']].map(([key, label]) => (
          <button
            key={key}
            className={`notif-filter-tab${filter === key ? ' active' : ''}`}
            onClick={() => applyFilter(key)}
          >
            {label}
            {key === 'unread' && unreadCount > 0 && (
              <span className="notif-tab-count">{unreadCount}</span>
            )}
          </button>
        ))}
        <span className="notif-total-pill">{pagination.total} total</span>
      </div>

      {/* List */}
      <div className="notif-card">
        {loading ? (
          <div className="notif-loading"><Spin /> Loading notifications…</div>
        ) : !isAuthenticated ? (
          <div className="notif-empty">
            <div className="notif-empty-ico"><IconBell /></div>
            <p className="notif-empty-title">Sign in to view notifications</p>
          </div>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-ico"><IconBell /></div>
            <p className="notif-empty-title">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="notif-empty-sub">Order updates, back-in-stock alerts, and system messages will appear here.</p>
            {filter === 'unread' && (
              <button className="notif-btn-ghost" onClick={() => applyFilter('all')}>View all</button>
            )}
          </div>
        ) : (
          <>
            <div className="notif-list">
              {items.map(n => {
                const meta   = TYPE_META[n.type] || TYPE_META.system;
                const isBusy = busyId === n.notification_id;

                return (
                  <div key={n.notification_id} className={`notif-row${n.is_read ? ' is-read' : ''}`}>
                    {/* Unread dot */}
                    <div className="notif-dot-wrap">
                      <span
                        className="notif-dot"
                        style={{ background: n.is_read ? 'var(--border)' : meta.dot }}
                      />
                    </div>

                    {/* Content */}
                    <div className="notif-content">
                      <div className="notif-content-top">
                        <span
                          className="notif-type-chip"
                          style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                        >
                          {meta.label}
                        </span>
                        <span className="notif-date">{fmtDate(n.created_at)}</span>
                      </div>
                      <p className="notif-title-text">{n.title}</p>
                      <p className="notif-message">{n.message}</p>

                      {/* Related link */}
                      {n.related_type === 'order' && n.related_id && (
                        <Link to={`/orders`} className="notif-related-link">
                          View order details →
                        </Link>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="notif-row-actions">
                      {!n.is_read && (
                        <button
                          className="notif-action-btn notif-action-read"
                          disabled={isBusy}
                          onClick={() => handleMarkRead(n.notification_id)}
                          title="Mark as read"
                        >
                          {isBusy ? <Spin /> : <IconCheck />}
                        </button>
                      )}
                      <button
                        className="notif-action-btn notif-action-delete"
                        disabled={isBusy}
                        onClick={() => handleDelete(n.notification_id)}
                        title="Delete"
                      >
                        {isBusy ? <Spin /> : <IconTrash />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div ref={loadMoreRef} className="notif-load-more" aria-hidden="true" />
            {loadingMore && <p className="notif-muted">Loading more notifications…</p>}
          </>
        )}
      </div>

      <style>{`
        @keyframes notif-spin { to { transform: rotate(360deg); } }
        @keyframes notif-fade { from { opacity: 0; transform: translateY(-4px); } }

        .notif-page {
            width: 100%; padding: 32px 48px 64px;
        }

        /* Head */
        .notif-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 4px;
        }
        .notif-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .notif-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
          display: flex; align-items: center; gap: 12px;
        }
        .notif-head-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 24px; height: 24px; padding: 0 7px;
          background: var(--gold); color: var(--dark);
          border-radius: 999px; font-size: 12px; font-weight: 800;
          font-family: 'Outfit', sans-serif;
        }
        .notif-head-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        /* Toast */
        .notif-toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--r); border: 1px solid;
          font-size: 13.5px; animation: notif-fade .2s ease;
        }
        .notif-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .notif-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        /* Filter bar */
        .notif-filter-bar {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 12px 16px;
        }
        .notif-filter-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid transparent; background: transparent;
          font-size: 12.5px; font-weight: 600; color: var(--muted);
          cursor: pointer; transition: all .2s;
        }
        .notif-filter-tab:hover { color: var(--dark); border-color: var(--border); }
        .notif-filter-tab.active { background: var(--dark); color: var(--gold); border-color: var(--dark); }
        .notif-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; padding: 0 5px;
          background: var(--gold); color: var(--dark);
          border-radius: 999px; font-size: 10px; font-weight: 800;
        }
        .notif-filter-tab.active .notif-tab-count { background: var(--gold); color: var(--dark); }
        .notif-total-pill { margin-left: auto; font-size: 12px; color: var(--muted); font-weight: 600; }

        /* Card */
        .notif-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
        }
        .notif-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 48px 24px; color: var(--muted); font-size: 13.5px;
        }

        /* Empty */
        .notif-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 64px 24px; text-align: center; color: var(--muted);
        }
        .notif-empty-ico {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--bg-alt); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); margin-bottom: 8px;
        }
        .notif-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .notif-empty-sub { font-size: 13.5px; color: var(--muted); margin: 0 0 8px; max-width: 300px; line-height: 1.6; }

        /* List */
        .notif-list { display: flex; flex-direction: column; }
        .notif-row {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 18px 20px; border-bottom: 1px solid var(--border); transition: background .2s;
        }
        .notif-row:last-child { border-bottom: none; }
        .notif-row:hover { background: var(--bg); }
        .notif-row.is-read { opacity: .7; }

        /* Dot */
        .notif-dot-wrap { padding-top: 4px; flex-shrink: 0; }
        .notif-dot {
          display: block; width: 9px; height: 9px;
          border-radius: 50%; transition: background .2s;
        }

        /* Content */
        .notif-content { flex: 1; min-width: 0; }
        .notif-content-top {
          display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;
        }
        .notif-type-chip {
          display: inline-flex; align-items: center;
          padding: 2px 9px; border-radius: 999px;
          font-size: 10.5px; font-weight: 700; letter-spacing: .04em; border: 1px solid;
        }
        .notif-date { font-size: 11.5px; color: var(--muted); margin-left: auto; white-space: nowrap; }
        .notif-title-text {
          font-size: 14px; font-weight: 600; color: var(--dark); margin: 0 0 4px; line-height: 1.4;
        }
        .notif-message { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.6; }
        .notif-related-link {
          display: inline-block; margin-top: 8px;
          font-size: 12.5px; font-weight: 600; color: var(--gold); text-decoration: none;
          transition: color .15s;
        }
        .notif-related-link:hover { color: var(--dark); }

        /* Row actions */
        .notif-row-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: flex-start; padding-top: 2px; }
        .notif-action-btn {
          width: 28px; height: 28px; border-radius: calc(var(--r) - 2px);
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all .15s;
        }
        .notif-action-btn:disabled { opacity: .45; cursor: not-allowed; }
        .notif-action-read:hover:not(:disabled) { border-color: #bbe5c8; color: #15803d; background: #f0faf3; }
        .notif-action-delete:hover:not(:disabled) { border-color: #f5c2c7; color: #9f1239; background: #fff2f3; }

        /* Buttons */
        .notif-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 12.5px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: border-color .2s, color .2s; white-space: nowrap;
        }
        .notif-btn-ghost:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .notif-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
        .notif-btn-danger:hover:not(:disabled) { border-color: #f5c2c7; color: #9f1239; }

        /* Pagination */
        .notif-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-top: 1px solid var(--border);
        }
        .notif-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .notif-pag-btns { display: flex; gap: 8px; }
        .notif-pag-btn {
          padding: 7px 16px; border-radius: var(--r);
          border: 1px solid var(--border); background: var(--bg-card);
          font-size: 13px; font-weight: 600; color: var(--dark); cursor: pointer; transition: all .2s;
        }
        .notif-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .notif-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* Responsive */
        @media (max-width: 1100px) { .notif-page { padding: 88px 28px 56px; } }
        @media (max-width: 860px) {
          .notif-page { padding: 80px 20px 48px; }
          .notif-head { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default Notifications;