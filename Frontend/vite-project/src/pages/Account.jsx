import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, userService, wishlistService } from '../services';
import { useAddresses } from '../hooks';
import { useAuth } from '../context';
import './PageUI.css';

const Account = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { addresses, loading: addressesLoading, formatAddress } = useAddresses();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
  });
  const [activeSection, setActiveSection] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await userService.getProfile();
        const profile = response?.user || user || {};
        setFormData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          username: profile.username || '',
          email: profile.email || '',
        });
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (activeSection !== 'orders') {
      return;
    }

    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const response = await orderService.getUserOrders();
        setOrders(Array.isArray(response?.orders) ? response.orders : []);
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load orders.');
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'wishlist') {
      return;
    }

    const loadWishlist = async () => {
      setWishlistLoading(true);
      try {
        const response = await wishlistService.getWishlist();
        setWishlistItems(Array.isArray(response?.wishlist) ? response.wishlist : []);
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load wishlist.');
      } finally {
        setWishlistLoading(false);
      }
    };

    loadWishlist();
  }, [activeSection]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage('');
    setError('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await userService.updateProfile(formData);
      if (response?.user) {
        updateUser(response.user);
      }
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-shell account-page">Loading profile...</div>;
  }

  const initials = `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || formData.username?.[0] || ''}`.toUpperCase() || 'U';
  const displayName = `${formData.first_name} ${formData.last_name}`.trim() || formData.username || 'User';

  return (
    <div className="page-shell account-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">My Account</h1>
          <p className="page-subtitle">Manage your profile details and keep your account up to date.</p>
        </div>
      </div>

      {message && <p className="msg-success">{message}</p>}
      {error && <p className="msg-error">{error}</p>}

      <div className="account-grid account-dashboard-grid">
        <aside className="ui-card account-summary">
          <div className="account-summary-head">
            <div className="account-avatar">{initials}</div>
            <div>
              <h2>My Account</h2>
              <p className="account-username">{displayName}</p>
            </div>
          </div>

          <div className="account-side-nav">
            <button type="button" className={`ui-chip${activeSection === 'details' ? ' active' : ''}`} onClick={() => setActiveSection('details')}>Account Details</button>
            <button type="button" className={`ui-chip${activeSection === 'orders' ? ' active' : ''}`} onClick={() => setActiveSection('orders')}>Orders</button>
            <button type="button" className={`ui-chip${activeSection === 'addresses' ? ' active' : ''}`} onClick={() => setActiveSection('addresses')}>Addresses</button>
            <button type="button" className={`ui-chip${activeSection === 'wishlist' ? ' active' : ''}`} onClick={() => setActiveSection('wishlist')}>Wishlist</button>
            <button type="button" className="ui-chip account-logout-chip" onClick={handleLogout}>Logout</button>
          </div>
        </aside>

        <section className="ui-card section account-content-panel">
          {activeSection === 'details' && (
            <form className="account-form" onSubmit={onSubmit}>
              <h2 className="section-title">Account Details</h2>

              <div className="ui-grid two">
                <label className="field-label">
                  <span>First Name</span>
                  <input className="ui-input" name="first_name" value={formData.first_name} onChange={onChange} />
                </label>

                <label className="field-label">
                  <span>Last Name</span>
                  <input className="ui-input" name="last_name" value={formData.last_name} onChange={onChange} />
                </label>
              </div>

              <label className="field-label">
                <span>Username</span>
                <input className="ui-input" name="username" value={formData.username} onChange={onChange} required />
              </label>

              <label className="field-label">
                <span>Email</span>
                <input className="ui-input" name="email" type="email" value={formData.email} onChange={onChange} required />
              </label>

              <div className="row-actions account-actions">
                <button className="ui-btn" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'orders' && (
            <div className="stack">
              <h2 className="section-title">Orders</h2>
              {ordersLoading ? (
                <p className="msg-note">Loading orders...</p>
              ) : orders.length ? (
                orders.slice(0, 10).map((order) => (
                  <div key={order.order_id} className="list-row">
                    <strong>Order #{order.order_id}</strong>
                    <p style={{ margin: 0 }}>Status: {orderService.getStatusLabel(order.status)}</p>
                    <p style={{ margin: 0 }}>Amount: ${Number(order.total_amount || 0).toFixed(2)}</p>
                    <p style={{ margin: 0 }}>Date: {orderService.formatOrderDate(order.created_at || order.order_date)}</p>
                  </div>
                ))
              ) : (
                <p className="msg-note">No orders found.</p>
              )}
            </div>
          )}

          {activeSection === 'addresses' && (
            <div className="stack">
              <h2 className="section-title">Addresses</h2>
              {addressesLoading ? (
                <p className="msg-note">Loading addresses...</p>
              ) : addresses.length ? (
                addresses.map((address) => (
                  <div key={address.address_id} className="list-row">
                    <strong>Address #{address.address_id}</strong>
                    <p style={{ margin: 0 }}>{formatAddress(address)}</p>
                  </div>
                ))
              ) : (
                <p className="msg-note">No addresses found.</p>
              )}
            </div>
          )}

          {activeSection === 'wishlist' && (
            <div className="stack">
              <h2 className="section-title">Wishlist</h2>
              {wishlistLoading ? (
                <p className="msg-note">Loading wishlist...</p>
              ) : wishlistItems.length ? (
                wishlistItems.slice(0, 12).map((item) => (
                  <div key={item.wishlist_id} className="list-row">
                    <strong>{item.name}</strong>
                    <p style={{ margin: 0 }}>{item.category_name}</p>
                    <p style={{ margin: 0 }}>${Number(item.min_price || item.base_price || 0).toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p className="msg-note">No wishlist items found.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Account;
