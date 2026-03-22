import { useEffect, useState, useCallback, useRef } from 'react';
import { userService, notificationService } from '../services';

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div className={`ano-toast ano-toast-${type}`}>
      {type === 'error'
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {msg}
    </div>
  );
};

const EMPTY_FORM = { title: '', message: '', user_id: '', target: 'all' };

const AdminNotifications = () => {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [users, setUsers]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histLoadingMore, setHistLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [toast, setToast]     = useState({ msg: '', type: 'success' });
  const loadMoreRef = useRef(null);

  const showToast  = (msg, type = 'success') => setToast({ msg, type });
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  /* load users for the dropdown when 'specific user' is selected */
  useEffect(() => {
    if (form.target !== 'user') return;
    if (users.length) return;
    setUsersLoading(true);
    userService.getAllUsers({ limit: 200 })
      .then(res => setUsers(Array.isArray(res?.users) ? res.users : []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [form.target, users.length]);

  /* load recent system notifications */
  const loadHistory = useCallback(async (page = 1, append = false) => {
    if (append) setHistLoadingMore(true);
    else setHistLoading(true);
    try {
      const res = await notificationService.getSentLog({ page, limit: 15 });
      const fetched = Array.isArray(res?.notifications) ? res.notifications : [];
      setHistory((prev) => {
        if (!append) return fetched;
        const seen = new Set(prev.map((n) => n.notification_id));
        const next = fetched.filter((n) => !seen.has(n.notification_id));
        return [...prev, ...next];
      });
      setPagination(res?.pagination || { page, pages: 1, total: 0 });
    } catch {
      if (!append) setHistory([]);
    } finally {
      if (append) setHistLoadingMore(false);
      else setHistLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (histLoading || histLoadingMore) return;
        if (pagination.page >= pagination.pages) return;
        loadHistory(pagination.page + 1, true);
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [histLoading, histLoadingMore, loadHistory, pagination.page, pagination.pages]);

  /* send */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showToast('Title and message are required.', 'error'); return;
    }
    if (form.target === 'user' && !form.user_id) {
      showToast('Select a user to send to.', 'error'); return;
    }
    setSending(true);
    try {
      const payload = {
        title:   form.title.trim(),
        message: form.message.trim(),
        type:    'system',
      };
      if (form.target === 'user') {
        payload.user_id = Number(form.user_id);
      }
      // POST /api/notifications/system
      // If user_id provided → sends to that user only
      // If no user_id → broadcasts to all customers
      await notificationService.sendSystemNotification(payload);
      showToast(
        form.target === 'all'
          ? 'Notification broadcast to all customers.'
          : 'Notification sent to user.'
      );
      setForm(EMPTY_FORM);
      await loadHistory(1);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to send notification.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setHistory(prev => prev.map(n =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to mark as read.', 'error');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setHistory(prev => prev.filter(n => n.notification_id !== notificationId));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete notification.', 'error');
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-BD', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="ano-page">

      <div className="ano-head">
        <div>
          <p className="ano-eyebrow">Admin</p>
          <h1 className="ano-title">Notifications</h1>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      <div className="ano-layout">

        {/* ── SEND FORM ── */}
        <div className="ano-send-card">
          <h2 className="ano-card-title">Send System Notification</h2>
          <p className="ano-card-hint">
            Broadcast to all customers or send directly to a specific user.
            Notifications appear in the user's notification bell.
          </p>

          <form className="ano-form" onSubmit={handleSend} noValidate>

            {/* Target */}
            <div className="ano-field">
              <label className="ano-label">Send to</label>
              <div className="ano-target-group">
                <label className={`ano-target-opt${form.target === 'all' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="target"
                    value="all"
                    checked={form.target === 'all'}
                    onChange={() => setForm(p => ({ ...p, target: 'all', user_id: '' }))}
                  />
                  <div className="ano-target-opt-inner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                      <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    <div>
                      <p className="ano-target-title">All Customers</p>
                      <p className="ano-target-sub">Broadcasts to every customer account</p>
                    </div>
                  </div>
                </label>

                <label className={`ano-target-opt${form.target === 'user' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="target"
                    value="user"
                    checked={form.target === 'user'}
                    onChange={() => setForm(p => ({ ...p, target: 'user' }))}
                  />
                  <div className="ano-target-opt-inner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <div>
                      <p className="ano-target-title">Specific User</p>
                      <p className="ano-target-sub">Send to one customer only</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* User selector */}
            {form.target === 'user' && (
              <div className="ano-field">
                <label className="ano-label">Select user <span className="ano-req">*</span></label>
                {usersLoading ? (
                  <p className="ano-hint">Loading users…</p>
                ) : (
                  <select
                    className="ano-select"
                    value={form.user_id}
                    onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
                    required
                  >
                    <option value="">Choose a user…</option>
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.first_name || u.last_name
                          ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                          : u.email} — {u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Title */}
            <div className="ano-field">
              <label className="ano-label">Title <span className="ano-req">*</span></label>
              <input
                className="ano-input"
                placeholder="e.g. New collection available"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </div>

            {/* Message */}
            <div className="ano-field">
              <label className="ano-label">Message <span className="ano-req">*</span></label>
              <textarea
                className="ano-textarea"
                rows={4}
                placeholder="Write the notification message…"
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                required
              />
              <p className="ano-char-count">{form.message.length} characters</p>
            </div>

            {/* Preview */}
            {(form.title || form.message) && (
              <div className="ano-preview">
                <p className="ano-preview-label">Preview</p>
                <div className="ano-preview-card">
                  <div className="ano-preview-dot" />
                  <div>
                    <p className="ano-preview-title">{form.title || 'Notification title'}</p>
                    <p className="ano-preview-msg">{form.message || 'Notification message'}</p>
                  </div>
                </div>
              </div>
            )}

            <button className="ano-send-btn" type="submit" disabled={sending}>
              {sending ? (
                <><span className="ano-spinner" /> Sending…</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {form.target === 'all' ? 'Broadcast to All Customers' : 'Send to User'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── HISTORY ── */}
        <div className="ano-history-card">
          <div className="ano-history-head">
            <h2 className="ano-card-title">Sent Log</h2>
            <p className="ano-hint">{pagination.total} total</p>
          </div>

          {histLoading ? (
            <div className="ano-loading"><div className="ano-spinner ano-spinner-lg" /><p>Loading…</p></div>
          ) : !history.length ? (
            <div className="ano-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <p>No notifications sent yet.</p>
            </div>
          ) : (
            <>
              <div className="ano-notif-list">
                {history.map(n => (
                  <div key={n.notification_id} className="ano-notif-row">
                    <div className="ano-notif-dot ano-dot-read" />
                    <div className="ano-notif-body">
                      <div className="ano-notif-top">
                        <p className="ano-notif-title">{n.title}</p>
                        <span className="ano-notif-date">{fmtDate(n.created_at)}</span>
                      </div>
                      <p className="ano-notif-msg">{n.message}</p>
                      <div className="ano-notif-meta">
                        <span className="ano-type-chip">system</span>
                        <span className="ano-user-chip">Sent to {n.sent_to} user{n.sent_to !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div ref={loadMoreRef} className="ano-load-more" aria-hidden="true" />
              {histLoadingMore && <p className="ano-muted">Loading more notifications…</p>}
            </>
          )}
        </div>
      </div>

      <style>{`
        .ano-page {
          width: 100%; padding: 40px 48px 64px;
          display: flex; flex-direction: column; gap: 16px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .ano-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 4px;
        }
        .ano-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .ano-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .ano-toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--r);
          font-size: 13.5px; font-weight: 500; border: 1px solid;
          animation: ano-fade .2s ease;
        }
        @keyframes ano-fade { from { opacity: 0; transform: translateY(-6px); } }
        .ano-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ano-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        .ano-layout {
          display: grid;
          grid-template-columns: 480px 1fr;
          gap: 20px;
          align-items: start;
        }

        /* ── SEND CARD ── */
        .ano-send-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 28px 32px;
          position: sticky; top: 20px;
        }
        .ano-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600; color: var(--dark); margin: 0 0 6px;
        }
        .ano-card-hint {
          font-size: 13px; color: var(--muted); margin: 0 0 24px; line-height: 1.6;
        }
        .ano-form { display: flex; flex-direction: column; gap: 18px; }
        .ano-field { display: flex; flex-direction: column; gap: 7px; }
        .ano-label {
          font-size: 11px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: var(--text);
        }
        .ano-req { color: #b91c1c; margin-left: 2px; }
        .ano-hint { font-size: 12.5px; color: var(--muted); margin: 0; }
        .ano-input {
          padding: 10px 14px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 13.5px; color: var(--dark); font-family: inherit;
          box-sizing: border-box; width: 100%; transition: border-color .2s;
        }
        .ano-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(196,146,42,.1); }
        .ano-textarea {
          padding: 10px 14px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 13.5px; color: var(--dark); font-family: inherit;
          box-sizing: border-box; width: 100%; resize: vertical;
          line-height: 1.6; transition: border-color .2s;
        }
        .ano-textarea:focus { outline: none; border-color: var(--gold); }
        .ano-select {
          padding: 10px 14px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 13.5px; color: var(--dark); font-family: inherit;
          cursor: pointer; box-sizing: border-box; width: 100%;
        }
        .ano-select:focus { outline: none; border-color: var(--gold); }
        .ano-char-count { font-size: 11.5px; color: var(--muted); margin: 0; text-align: right; }

        /* target options */
        .ano-target-group { display: flex; flex-direction: column; gap: 8px; }
        .ano-target-opt {
          display: block; cursor: pointer;
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          background: var(--bg); transition: all .2s; overflow: hidden;
        }
        .ano-target-opt input[type="radio"] { display: none; }
        .ano-target-opt.selected {
          border-color: var(--gold);
          background: #fffbf0;
          box-shadow: 0 0 0 3px rgba(196,146,42,.1);
        }
        .ano-target-opt-inner {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; color: var(--dark);
        }
        .ano-target-opt-inner svg { color: var(--gold); flex-shrink: 0; }
        .ano-target-title { font-size: 14px; font-weight: 600; margin: 0 0 2px; }
        .ano-target-sub { font-size: 12px; color: var(--muted); margin: 0; }

        /* preview */
        .ano-preview { animation: ano-fade .2s ease; }
        .ano-preview-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--muted); margin: 0 0 8px;
        }
        .ano-preview-card {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px 16px;
          background: var(--bg-alt); border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
        }
        .ano-preview-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--gold); flex-shrink: 0; margin-top: 4px;
        }
        .ano-preview-title {
          font-size: 13.5px; font-weight: 600; color: var(--dark); margin: 0 0 3px;
        }
        .ano-preview-msg {
          font-size: 12.5px; color: var(--muted); margin: 0; line-height: 1.5;
        }

        /* send button */
        .ano-send-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 13px 24px;
          background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; transition: background .2s;
        }
        .ano-send-btn:hover:not(:disabled) { background: var(--black); }
        .ano-send-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ── HISTORY ── */
        .ano-history-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
        }
        .ano-history-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid var(--border);
        }
        .ano-history-head .ano-card-title { margin: 0; }
        .ano-loading, .ano-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 48px 24px; color: var(--muted); font-size: 14px;
        }
        .ano-notif-list { display: flex; flex-direction: column; }
        .ano-notif-row {
          display: flex; gap: 14px; padding: 16px 20px;
          border-bottom: 1px solid var(--border); transition: background .2s;
        }
        .ano-notif-row:last-child { border-bottom: none; }
        .ano-notif-row:hover { background: var(--bg); }
        .ano-notif-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px;
        }
        .ano-dot-unread { background: var(--gold); }
        .ano-dot-read   { background: var(--border); }
        .ano-notif-body { flex: 1; min-width: 0; }
        .ano-notif-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px; margin-bottom: 4px;
        }
        .ano-notif-title {
          font-size: 14px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .ano-notif-date { font-size: 11.5px; color: var(--muted); white-space: nowrap; flex-shrink: 0; }
        .ano-notif-msg {
          font-size: 13px; color: var(--muted); margin: 0 0 8px; line-height: 1.5;
        }
        .ano-notif-meta { display: flex; gap: 6px; flex-wrap: wrap; }
        .ano-type-chip, .ano-user-chip, .ano-read-chip, .ano-unread-chip {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 999px;
          font-size: 10.5px; font-weight: 700; letter-spacing: .04em; border: 1px solid;
        }
        .ano-type-chip  { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }
        .ano-user-chip  { background: #fff7e6; color: #b45309; border-color: #fcd9a0; }
        .ano-read-chip  { background: var(--bg-alt); color: var(--muted); border-color: var(--border); }
        .ano-unread-chip { background: #f0faf3; color: #15803d; border-color: #bbe5c8; }

        .ano-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-top: 1px solid var(--border);
        }
        .ano-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .ano-pag-btns { display: flex; gap: 8px; }
        .ano-pag-btn {
          padding: 7px 16px; border-radius: var(--r);
          border: 1px solid var(--border); background: var(--bg-card);
          font-size: 13px; font-weight: 600; color: var(--dark); cursor: pointer; transition: all .2s;
        }
        .ano-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ano-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        @keyframes ano-spin { to { transform: rotate(360deg); } }
        .ano-spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(196,146,42,.3); border-top-color: var(--gold);
          border-radius: 50%; animation: ano-spin .7s linear infinite; flex-shrink: 0;
        }
        .ano-spinner-lg { width: 28px; height: 28px; }

        @media (max-width: 1100px) {
          .ano-layout { grid-template-columns: 1fr; }
          .ano-send-card { position: static; }
        }
        @media (max-width: 860px) {
          .ano-page { padding: 24px 20px 48px; }
          .ano-head { flex-direction: column; align-items: flex-start; }
        }
        .ano-action-btn {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 999px;
          font-size: 10.5px; font-weight: 700;
          letter-spacing: .04em; border: 1px solid;
          cursor: pointer; transition: all .2s;
          background: none;
        }
        .ano-btn-read {
          background: #f0f9ff; color: #0369a1; border-color: #bae6fd;
        }
        .ano-btn-read:hover { background: #0369a1; color: #fff; border-color: #0369a1; }
        .ano-btn-delete {
          background: #fff2f3; color: #9f1239; border-color: #f5c2c7;
        }
        .ano-btn-delete:hover { background: #9f1239; color: #fff; border-color: #9f1239; }
      `}</style>
    </div>
  );
};

export default AdminNotifications;