import { useEffect, useState, useCallback, useRef } from 'react';
import { userService } from '../services';
import { useAuth } from '../context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Avatar = ({ user }) => {
  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase()
    || user.email?.[0]?.toUpperCase() || '?';
  return <div className="au-avatar">{initials}</div>;
};

const RoleChip = ({ role }) => (
  <span className={`au-role-chip ${role === 'admin' ? 'au-role-admin' : 'au-role-customer'}`}>
    {role}
  </span>
);

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  if (!msg) return null;
  return (
    <div className={`au-toast au-toast-${type}`}>
      {type === 'error'
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {msg}
    </div>
  );
};

const EMPTY_NEW_USER = {
  first_name: '', last_name: '', email: '', password: '', role: 'customer',
};

const AdminUsers = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch]         = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser]       = useState(EMPTY_NEW_USER);
  const [creating, setCreating]     = useState(false);

  const [editingId, setEditingId]   = useState(null);
  const [editDraft, setEditDraft]   = useState({});
  const [savingId, setSavingId]     = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const loadMoreRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  /* ── fetch ── */
  const loadUsers = useCallback(async (page = 1, sq = appliedSearch, role = roleFilter, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await userService.getAllUsers({
        page,
        limit: 15,
        search: sq || undefined,
        role: role === 'all' ? undefined : role,
      });
      const fetched = Array.isArray(res?.users) ? res.users : [];
      setUsers((prev) => {
        if (!append) return fetched;
        const seen = new Set(prev.map((u) => u.user_id));
        const next = fetched.filter((u) => !seen.has(u.user_id));
        return [...prev, ...next];
      });
      setPagination(res?.pagination || { page, pages: 1, total: fetched.length });
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load users.', 'error');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [appliedSearch, roleFilter]);

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading || loadingMore) return;
        if (pagination.page >= pagination.pages) return;
        loadUsers(pagination.page + 1, appliedSearch, roleFilter, true);
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [appliedSearch, loadUsers, loading, loadingMore, pagination.page, pagination.pages, roleFilter]);

  /* ── search / filter ── */
  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    loadUsers(1, search.trim(), roleFilter);
  };

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    loadUsers(1, appliedSearch, role);
  };

  /* ── create ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(newUser.email)) {
      showToast('Please enter a valid email address.', 'error'); return;
    }
    if (!newUser.password || newUser.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error'); return;
    }
    setCreating(true);
    try {
      // Backend: POST /auth/register — only endpoint that creates users
      // For admin creation use createAdmin script; register creates customers.
      // We use the register endpoint and then patch role if admin is needed.
      const payload = {
        first_name: newUser.first_name.trim() || undefined,
        last_name:  newUser.last_name.trim()  || undefined,
        email:      newUser.email.trim(),
        password:   newUser.password,
      };
      const res = await userService.createUser(payload);
      // If admin role requested, patch the role after creation
      if (newUser.role === 'admin' && res?.user?.user_id) {
        await userService.updateUser(res.user.user_id, { role: 'admin' });
      }
      showToast('User created successfully.');
      setNewUser(EMPTY_NEW_USER);
      setShowCreate(false);
      await loadUsers(1, appliedSearch, roleFilter);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to create user.', 'error');
    } finally {
      setCreating(false);
    }
  };

  /* ── edit ── */
  const startEdit = (u) => {
    setEditingId(u.user_id);
    setEditDraft({ first_name: u.first_name || '', last_name: u.last_name || '', role: u.role });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const handleSave = async (userId) => {
    setSavingId(userId);
    try {
      await userService.updateUser(userId, {
        first_name: editDraft.first_name || undefined,
        last_name:  editDraft.last_name  || undefined,
        role:       editDraft.role,
      });
      showToast('User updated.');
      setEditingId(null);
      await loadUsers(pagination.page, appliedSearch, roleFilter);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to update user.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  /* ── delete ── */
  const handleDelete = async (userId) => {
    if (Number(userId) === Number(currentUser?.user_id)) {
      showToast('You cannot delete your own account.', 'error'); return;
    }
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeletingId(userId);
    try {
      await userService.deleteUser(userId);
      showToast('User deleted.');
      await loadUsers(1, appliedSearch, roleFilter);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete user.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const isSelf = (u) => Number(u.user_id) === Number(currentUser?.user_id);

  return (
    <div className="au-page">

      {/* ── HEAD ── */}
      <div className="au-head">
        <div>
          <p className="au-eyebrow">Admin</p>
          <h1 className="au-title">Users</h1>
        </div>
        <button className="au-create-btn" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? 'Cancel' : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add User
            </>
          )}
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      {/* ── CREATE FORM ── */}
      {showCreate && (
        <div className="au-create-card">
          <h3 className="au-card-title">New User</h3>
          <form className="au-create-form" onSubmit={handleCreate} noValidate>
            <div className="au-form-row">
              <div className="au-field">
                <label className="au-label">First name</label>
                <input className="au-input" type="text" placeholder="John"
                  value={newUser.first_name}
                  onChange={e => setNewUser(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="au-field">
                <label className="au-label">Last name</label>
                <input className="au-input" type="text" placeholder="Doe"
                  value={newUser.last_name}
                  onChange={e => setNewUser(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="au-form-row">
              <div className="au-field">
                <label className="au-label">Email <span className="au-req">*</span></label>
                <input className="au-input" type="email" placeholder="you@example.com" required
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="au-field">
                <label className="au-label">Password <span className="au-req">*</span></label>
                <input className="au-input" type="password" placeholder="Min 6 characters" required
                  value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <div className="au-form-row au-form-row-end">
              <div className="au-field au-field-narrow">
                <label className="au-label">Role</label>
                <select className="au-select" value={newUser.role}
                  onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="au-btn-primary" type="submit" disabled={creating}>
                {creating ? <><span className="au-spinner" /> Creating…</> : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="au-toolbar-card">
        <form className="au-toolbar" onSubmit={handleSearch}>
          <input
            className="au-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="au-role-filters">
            {['all', 'customer', 'admin'].map(r => (
              <button
                key={r}
                type="button"
                className={`au-filter-chip${roleFilter === r ? ' active' : ''}`}
                onClick={() => handleRoleFilter(r)}
              >
                {r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <button className="au-btn-primary" type="submit">Search</button>
        </form>
        <p className="au-count">{pagination.total} user{pagination.total !== 1 ? 's' : ''}</p>
      </div>

      {/* ── TABLE ── */}
      <div className="au-table-card">
        {loading ? (
          <div className="au-table-loading">
            <div className="au-spinner au-spinner-lg" />
            <p>Loading users…</p>
          </div>
        ) : !users.length ? (
          <div className="au-table-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>No users found.</p>
          </div>
        ) : (
          <div className="au-table-wrap">
            <table className="au-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isEditing = editingId === u.user_id;
                  return (
                    <tr key={u.user_id} className={isEditing ? 'au-row-editing' : ''}>

                      {/* User */}
                      <td>
                        <div className="au-user-cell">
                          <Avatar user={u} />
                          <div>
                            {isEditing ? (
                              <div className="au-edit-name-row">
                                <input className="au-input au-input-sm" placeholder="First name"
                                  value={editDraft.first_name}
                                  onChange={e => setEditDraft(p => ({ ...p, first_name: e.target.value }))} />
                                <input className="au-input au-input-sm" placeholder="Last name"
                                  value={editDraft.last_name}
                                  onChange={e => setEditDraft(p => ({ ...p, last_name: e.target.value }))} />
                              </div>
                            ) : (
                              <p className="au-user-name">
                                {u.first_name || u.last_name
                                  ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                  : <span className="au-muted">No name</span>}
                                {isSelf(u) && <span className="au-you-chip">You</span>}
                              </p>
                            )}
                            <p className="au-user-id">ID #{u.user_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td><span className="au-email">{u.email}</span></td>

                      {/* Role */}
                      <td>
                        {isEditing ? (
                          <select className="au-select au-select-sm" value={editDraft.role}
                            onChange={e => setEditDraft(p => ({ ...p, role: e.target.value }))}>
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <RoleChip role={u.role} />
                        )}
                      </td>

                      {/* Joined */}
                      <td>
                        <span className="au-date">
                          {new Date(u.created_at).toLocaleDateString('en-BD', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="au-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="au-action-btn au-action-save"
                                onClick={() => handleSave(u.user_id)}
                                disabled={savingId === u.user_id}
                              >
                                {savingId === u.user_id ? <span className="au-spinner" /> : 'Save'}
                              </button>
                              <button className="au-action-btn au-action-cancel" onClick={cancelEdit}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="au-action-btn au-action-edit"
                                onClick={() => startEdit(u)}
                              >
                                Edit
                              </button>
                              <button
                                className="au-action-btn au-action-delete"
                                onClick={() => handleDelete(u.user_id)}
                                disabled={deletingId === u.user_id || isSelf(u)}
                                title={isSelf(u) ? 'Cannot delete your own account' : ''}
                              >
                                {deletingId === u.user_id ? <span className="au-spinner" /> : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div ref={loadMoreRef} className="au-load-more" aria-hidden="true" />
        {loadingMore && <p className="au-muted">Loading more users…</p>}
      </div>

      <style>{`
        .au-page {
          width: 100%;
          padding: 40px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-alt);
          min-height: 100vh;
        }

        /* ── HEAD ── */
        .au-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 8px;
        }
        .au-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }
        .au-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
          margin: 0;
        }
        .au-create-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          transition: background .2s;
        }
        .au-create-btn:hover { background: var(--black); }

        /* ── TOAST ── */
        .au-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--r);
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid;
          animation: au-fade-in .2s ease;
        }
        @keyframes au-fade-in { from { opacity: 0; transform: translateY(-6px); } }
        .au-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .au-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        /* ── CREATE CARD ── */
        .au-create-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 28px 32px;
          animation: au-fade-in .2s ease;
        }
        .au-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin: 0 0 20px;
        }
        .au-create-form { display: flex; flex-direction: column; gap: 14px; }
        .au-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .au-form-row-end {
          align-items: flex-end;
          grid-template-columns: 1fr auto;
          gap: 14px;
        }
        .au-field { display: flex; flex-direction: column; gap: 6px; }
        .au-field-narrow { max-width: 180px; }

        /* ── TOOLBAR ── */
        .au-toolbar-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .au-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          flex: 1;
        }
        .au-toolbar .au-input { max-width: 280px; }
        .au-role-filters {
          display: flex;
          gap: 6px;
        }
        .au-filter-chip {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          transition: all .2s;
        }
        .au-filter-chip:hover { border-color: var(--gold); color: var(--gold); }
        .au-filter-chip.active {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--gold);
        }
        .au-count {
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
          margin: 0;
        }

        /* ── SHARED INPUTS ── */
        .au-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--text);
        }
        .au-req { color: #b91c1c; margin-left: 2px; }
        .au-input {
          padding: 10px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          font-size: 14px;
          color: var(--dark);
          font-family: inherit;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
          width: 100%;
        }
        .au-input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(196,146,42,.1);
        }
        .au-input-sm { padding: 7px 10px; font-size: 13px; }
        .au-select {
          padding: 10px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          font-size: 14px;
          color: var(--dark);
          font-family: inherit;
          cursor: pointer;
          box-sizing: border-box;
          width: 100%;
        }
        .au-select-sm { padding: 7px 10px; font-size: 13px; }
        .au-select:focus { outline: none; border-color: var(--gold); }

        /* ── BUTTONS ── */
        .au-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          white-space: nowrap;
          transition: background .2s;
        }
        .au-btn-primary:hover:not(:disabled) { background: var(--black); }
        .au-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        /* ── TABLE CARD ── */
        .au-table-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .au-table-loading,
        .au-table-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 56px 24px;
          color: var(--muted);
          font-size: 14px;
        }
        .au-table-wrap { overflow-x: auto; }
        .au-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }
        .au-table thead th {
          padding: 14px 16px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--muted);
          border-bottom: 1px solid var(--border);
          background: var(--bg-alt);
        }
        .au-table tbody td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
          font-size: 14px;
          color: var(--text);
        }
        .au-table tbody tr:last-child td { border-bottom: none; }
        .au-table tbody tr { transition: background .2s; }
        .au-table tbody tr:hover { background: var(--bg); }
        .au-row-editing { background: #fffbf0 !important; }

        /* ── USER CELL ── */
        .au-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .au-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--gold);
          color: var(--dark);
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .au-user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--dark);
          margin: 0 0 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .au-user-id {
          font-size: 11px;
          color: var(--muted);
          font-family: ui-monospace, monospace;
          margin: 0;
        }
        .au-email {
          font-size: 13.5px;
          color: var(--muted);
        }
        .au-date {
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
        }
        .au-muted { color: var(--muted); }
        .au-edit-name-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* ── YOU CHIP ── */
        .au-you-chip {
          display: inline-flex;
          align-items: center;
          padding: 1px 7px;
          border-radius: 999px;
          background: #e0e7ff;
          color: #3730a3;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .06em;
          border: 1px solid #c7d2fe;
        }

        /* ── ROLE CHIPS ── */
        .au-role-chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          border: 1px solid;
        }
        .au-role-admin    { background: #fff7e6; color: #b45309; border-color: #fcd9a0; }
        .au-role-customer { background: #f0faf3; color: #15803d; border-color: #bbe5c8; }

        /* ── ACTION BUTTONS ── */
        .au-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .au-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: calc(var(--r) - 2px);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .04em;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          white-space: nowrap;
        }
        .au-action-btn:disabled { opacity: .4; cursor: not-allowed; }
        .au-action-edit   { background: var(--bg); border-color: var(--border); color: var(--dark); }
        .au-action-edit:hover { border-color: var(--gold); color: var(--gold); }
        .au-action-save   { background: var(--dark); border-color: var(--dark); color: var(--gold); }
        .au-action-save:hover:not(:disabled) { background: var(--black); border-color: var(--black); }
        .au-action-cancel { background: var(--bg); border-color: var(--border); color: var(--muted); }
        .au-action-cancel:hover { border-color: var(--border-hover); color: var(--dark); }
        .au-action-delete { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }
        .au-action-delete:hover:not(:disabled) { background: #9f1239; border-color: #9f1239; color: #fff; }

        /* ── PAGINATION ── */
        .au-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
        }
        .au-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .au-pag-btns { display: flex; gap: 8px; }
        .au-pag-btn {
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
        .au-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .au-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── SPINNER ── */
        @keyframes au-spin { to { transform: rotate(360deg); } }
        .au-spinner {
          display: inline-block;
          width: 13px; height: 13px;
          border: 2px solid rgba(196,146,42,.3);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: au-spin .7s linear infinite;
          flex-shrink: 0;
        }
        .au-spinner-lg { width: 28px; height: 28px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 860px) {
          .au-page { padding: 24px 20px 48px; }
          .au-head { flex-direction: column; align-items: flex-start; }
          .au-form-row { grid-template-columns: 1fr; }
          .au-form-row-end { grid-template-columns: 1fr; }
          .au-field-narrow { max-width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AdminUsers;