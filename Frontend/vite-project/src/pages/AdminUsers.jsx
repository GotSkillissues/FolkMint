import { useEffect, useState } from 'react';
import { userService } from '../services';
import { useAuth } from '../context';
import './PageUI.css';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editing, setEditing] = useState({});
  const [actionMessage, setActionMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    role: 'customer',
  });

  const loadUsers = async (page = pagination.page, requestedQuery = query, requestedRole = roleFilter) => {
    setLoading(true);
    setError('');

    try {
      const response = await userService.getAllUsers({
        page,
        limit: pagination.limit,
        search: requestedQuery || undefined,
        role: requestedRole === 'all' ? undefined : requestedRole,
      });

      const fetchedUsers = Array.isArray(response?.users) ? response.users : [];
      setUsers(fetchedUsers);
      setPagination(response?.pagination || { page, pages: 1, total: fetchedUsers.length, limit: pagination.limit });

      const initialEditState = {};
      fetchedUsers.forEach((item) => {
        initialEditState[item.user_id] = {
          first_name: item.first_name || '',
          last_name: item.last_name || '',
          username: item.username || '',
          role: item.role || 'customer',
        };
      });
      setEditing(initialEditState);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1, '', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(search.trim());
    loadUsers(1, search.trim(), roleFilter);
  };

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    loadUsers(1, query, role);
  };

  const setEditValue = (userId, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleUpdateUser = async (userId) => {
    const draft = editing[userId];
    if (!draft?.username?.trim()) {
      setError('Username is required to save user changes.');
      return;
    }

    setSavingId(userId);
    setError('');
    setActionMessage('');

    try {
      await userService.updateUser(userId, {
        first_name: draft.first_name,
        last_name: draft.last_name,
        username: draft.username,
        role: draft.role,
      });
      setActionMessage(`User #${userId} updated successfully.`);
      await loadUsers(pagination.page, query, roleFilter);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to update user.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (Number(userId) === Number(currentUser?.user_id)) {
      setError('You cannot delete your own admin account from this panel.');
      return;
    }

    const confirmed = window.confirm(`Delete user #${userId}? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(userId);
    setError('');
    setActionMessage('');

    try {
      await userService.deleteUser(userId);
      setActionMessage(`User #${userId} deleted.`);

      const nextPage = users.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await loadUsers(nextPage, query, roleFilter);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setError('Username, email, and password are required.');
      return;
    }

    setCreating(true);
    setError('');
    setActionMessage('');

    try {
      await userService.createUser(newUser);
      setActionMessage('User created successfully.');
      setNewUser({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        password: '',
        role: 'customer',
      });
      await loadUsers(1, query, roleFilter);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    loadUsers(nextPage, query, roleFilter);
  };

  return (
    <div className="page-shell admin-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin · Users</h1>
          <p className="page-subtitle">Manage customers/admins with search, role updates, and account maintenance.</p>
        </div>
      </div>
      {actionMessage && <p className="msg-success">{actionMessage}</p>}
      {error && <p className="msg-error">{error}</p>}

      <section className="ui-card section">
        <div className="admin-card-head">
          <h3>Create User</h3>
        </div>
        <form className="admin-inline-form" onSubmit={handleCreateUser}>
          <input className="ui-input" placeholder="First name" value={newUser.first_name} onChange={(e) => setNewUser((prev) => ({ ...prev, first_name: e.target.value }))} />
          <input className="ui-input" placeholder="Last name" value={newUser.last_name} onChange={(e) => setNewUser((prev) => ({ ...prev, last_name: e.target.value }))} />
          <input className="ui-input" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))} required />
          <input className="ui-input" type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} required />
          <input className="ui-input" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} required />
          <select className="ui-select" value={newUser.role} onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="ui-btn" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create User'}</button>
        </form>
      </section>

      <section className="ui-card section">
        <div className="admin-card-head">
          <h3>User Directory</h3>
          <p className="admin-muted">Total users: {pagination.total}</p>
        </div>

        <form className="admin-toolbar compact" onSubmit={handleSearchSubmit}>
          <input
            className="ui-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username, email, or first name"
          />
          <select className="ui-select" value={roleFilter} onChange={(event) => handleRoleFilter(event.target.value)}>
            <option value="all">All roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="ui-btn" type="submit">Apply</button>
        </form>

        {loading ? (
          <p className="msg-note">Loading users...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                {!users.length ? (
                  <tr>
                    <td colSpan={5}>No users found.</td>
                  </tr>
                ) : users.map((entry) => {
                  const edit = editing[entry.user_id] || {};
                  return (
                    <tr key={entry.user_id}>
                      <td>
                        <div className="stack">
                          <input className="ui-input" value={edit.first_name || ''} onChange={(e) => setEditValue(entry.user_id, 'first_name', e.target.value)} placeholder="First name" />
                          <input className="ui-input" value={edit.last_name || ''} onChange={(e) => setEditValue(entry.user_id, 'last_name', e.target.value)} placeholder="Last name" />
                          <input className="ui-input" value={edit.username || ''} onChange={(e) => setEditValue(entry.user_id, 'username', e.target.value)} placeholder="Username" />
                        </div>
                      </td>
                      <td>{entry.email}</td>
                      <td>
                        <select className="ui-select" value={edit.role || 'customer'} onChange={(e) => setEditValue(entry.user_id, 'role', e.target.value)}>
                          <option value="customer">Customer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>{new Date(entry.created_at).toLocaleDateString('en-BD')}</td>
                      <td>
                        <div className="row-actions">
                          <button className="ui-btn-ghost" type="button" disabled={savingId === entry.user_id} onClick={() => handleUpdateUser(entry.user_id)}>
                            {savingId === entry.user_id ? 'Saving...' : 'Save'}
                          </button>
                          <button className="ui-btn-ghost danger-text" type="button" disabled={deletingId === entry.user_id || Number(entry.user_id) === Number(currentUser?.user_id)} onClick={() => handleDeleteUser(entry.user_id)}>
                            {deletingId === entry.user_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

export default AdminUsers;
