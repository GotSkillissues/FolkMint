import { useEffect, useState } from 'react';
import { userService } from '../services';
import './PageUI.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await userService.getAllUsers({ page: 1, limit: 50 });
        setUsers(response?.users || response?.data || []);
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load users.');
      }
    };

    load();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin · Users</h1>
          <p className="page-subtitle">Review all registered users and their roles.</p>
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}

      <div className="stack">
        {users.map((user) => (
          <div key={user.user_id} className="list-row">
            <strong>{user.username}</strong>
            <p style={{ margin: '0.25rem 0' }}>{user.email}</p>
            <p style={{ margin: '0.25rem 0' }}>Role: {user.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
