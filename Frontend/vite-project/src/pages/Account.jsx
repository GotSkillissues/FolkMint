import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderService, userService, wishlistService } from '../services';
import { useAddresses } from '../hooks';
import { useAuth } from '../context';
import './PageUI.css';

const ACCOUNT_SECTION_STORAGE_KEY = 'folkmint_account_active_section';
const ACCOUNT_ALLOWED_SECTIONS = ['details', 'orders', 'addresses', 'wishlist'];

const getInitialAccountSection = () => {
  try {
    const saved = localStorage.getItem(ACCOUNT_SECTION_STORAGE_KEY);
    return ACCOUNT_ALLOWED_SECTIONS.includes(saved) ? saved : 'details';
  } catch {
    return 'details';
  }
};

const Account = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const {
    addresses,
    loading: addressesLoading,
    formatAddress,
    addAddress,
    updateAddress,
    deleteAddress,
  } = useAddresses();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
  });
  const [activeSection, setActiveSection] = useState(getInitialAccountSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [newAddress, setNewAddress] = useState({
    first_name: '',
    last_name: '',
    street: '',
    apartment: '',
    city: '',
    district: '',
    postal_code: '',
    country: 'Bangladesh',
    is_default: false,
  });
  const [addressDrafts, setAddressDrafts] = useState({});
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressBusyId, setAddressBusyId] = useState(null);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsSnapshot, setDetailsSnapshot] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const drafts = {};
    addresses.forEach((address) => {
      drafts[address.address_id] = {
        first_name: address.first_name || '',
        last_name: address.last_name || '',
        street: address.street || '',
        apartment: address.apartment || '',
        city: address.city || '',
        district: address.district || '',
        postal_code: address.postal_code || '',
        country: address.country || '',
        is_default: !!address.is_default,
      };
    });
    setAddressDrafts(drafts);
  }, [addresses]);

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
        setDetailsSnapshot({
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

  useEffect(() => {
    localStorage.setItem(ACCOUNT_SECTION_STORAGE_KEY, activeSection);
  }, [activeSection]);

  useEffect(() => {
    const forcedSection = location.state?.defaultSection;
    if (!ACCOUNT_ALLOWED_SECTIONS.includes(forcedSection)) {
      return;
    }

    setActiveSection(forcedSection);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setMessage('');
    }, 3000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [message]);

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

    if (!formData.first_name?.trim() || !formData.last_name?.trim() || !formData.username?.trim() || !formData.email?.trim()) {
      setError('Please fill all required fields before saving.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await userService.updateProfile(formData);
      if (response?.user) {
        updateUser(response.user);
        const nextProfile = {
          first_name: response.user.first_name || '',
          last_name: response.user.last_name || '',
          username: response.user.username || '',
          email: response.user.email || '',
        };
        setFormData(nextProfile);
        setDetailsSnapshot(nextProfile);
      }
      setMessage('Profile updated successfully.');
      setEditingDetails(false);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const openDetailsEdit = () => {
    setDetailsSnapshot(formData);
    setEditingDetails(true);
    setMessage('');
    setError('');
  };

  const cancelDetailsEdit = () => {
    if (detailsSnapshot) {
      setFormData(detailsSnapshot);
    }
    setEditingDetails(false);
    setError('');
  };

  const onNewAddressChange = (field, value) => {
    setNewAddress((prev) => ({ ...prev, [field]: value }));
  };

  const onAddressDraftChange = (addressId, field, value) => {
    setAddressDrafts((prev) => ({
      ...prev,
      [addressId]: {
        ...prev[addressId],
        [field]: value,
      },
    }));
  };

  const handleCreateAddress = async (event) => {
    event.preventDefault();

    if (!newAddress.first_name?.trim() || !newAddress.last_name?.trim() || !newAddress.street?.trim() || !newAddress.city?.trim() || !newAddress.district?.trim() || !newAddress.country?.trim()) {
      setError('Please fill all required address fields.');
      return;
    }

    setCreatingAddress(true);
    setMessage('');
    setError('');

    try {
      const result = await addAddress({
        first_name: newAddress.first_name,
        last_name: newAddress.last_name,
        street: newAddress.street,
        apartment: newAddress.apartment,
        city: newAddress.city,
        district: newAddress.district,
        postal_code: newAddress.postal_code,
        country: newAddress.country,
        is_default: newAddress.is_default,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add address.');
      }

      setMessage('Address added successfully.');
      setNewAddress({
        first_name: '',
        last_name: '',
        street: '',
        apartment: '',
        city: '',
        district: '',
        postal_code: '',
        country: 'Bangladesh',
        is_default: false,
      });
      setShowAddAddressModal(false);
    } catch (err) {
      setError(err?.message || 'Failed to add address.');
    } finally {
      setCreatingAddress(false);
    }
  };

  const handleUpdateAddress = async (addressId) => {
    const addressNumber = addresses.findIndex((address) => address.address_id === addressId) + 1;
    const draft = addressDrafts[addressId];
    if (!draft) return;
    const currentAddress = addresses.find((address) => address.address_id === addressId);

    if (!draft.first_name?.trim() || !draft.last_name?.trim() || !draft.street?.trim() || !draft.city?.trim() || !draft.district?.trim() || !draft.country?.trim()) {
      setError('Please fill all required address fields before saving.');
      return;
    }

    setAddressBusyId(addressId);
    setMessage('');
    setError('');

    try {
      const result = await updateAddress(addressId, {
        first_name: draft.first_name,
        last_name: draft.last_name,
        street: draft.street,
        apartment: draft.apartment,
        city: draft.city,
        district: draft.district,
        postal_code: draft.postal_code,
        country: draft.country,
        is_default: draft.is_default,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update address.');
      }

      if (draft.is_default && !currentAddress?.is_default) {
        setMessage('Default shipping address updated.');
      } else {
        setMessage(addressNumber > 0 ? `Address ${addressNumber} updated.` : 'Address updated.');
      }
      setEditingAddressId(null);
    } catch (err) {
      setError(err?.message || 'Failed to update address.');
    } finally {
      setAddressBusyId(null);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    const addressNumber = addresses.findIndex((address) => address.address_id === addressId) + 1;
    const confirmed = window.confirm(addressNumber > 0 ? `Delete address ${addressNumber}?` : 'Delete this address?');
    if (!confirmed) return;

    setAddressBusyId(addressId);
    setMessage('');
    setError('');

    try {
      const result = await deleteAddress(addressId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete address.');
      }

      setMessage(addressNumber > 0 ? `Address ${addressNumber} deleted.` : 'Address deleted.');
      if (editingAddressId === addressId) {
        setEditingAddressId(null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete address.');
    } finally {
      setAddressBusyId(null);
    }
  };

  const openAddAddressModal = () => {
    setError('');
    setMessage('');
    setShowAddAddressModal(true);
  };

  const closeAddAddressModal = () => {
    if (creatingAddress) return;
    setShowAddAddressModal(false);
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

      {message && (
        <div className="account-toast" role="status" aria-live="polite">
          <p className="account-toast__text">Success: {message}</p>
          <button className="ui-btn-ghost" type="button" onClick={() => setMessage('')}>OK</button>
        </div>
      )}
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
            {user?.role === 'admin' && (
              <button type="button" className="ui-chip" onClick={() => navigate('/admin')}>Admin Dashboard</button>
            )}
            <button type="button" className="ui-chip account-logout-chip" onClick={handleLogout}>Logout</button>
          </div>
        </aside>

        <section className="ui-card section account-content-panel">
          {activeSection === 'details' && (
            <form className="account-form" onSubmit={onSubmit}>
              <h2 className="section-title">Account Details</h2>

              {user?.role === 'admin' && (
                <div className="msg-note">
                  You are signed in as admin. Use the admin area to manage users, orders, and products.
                  <div className="row-actions" style={{ marginTop: '.5rem' }}>
                    <button className="ui-btn-ghost" type="button" onClick={() => navigate('/admin')}>Open Admin Dashboard</button>
                  </div>
                </div>
              )}

              {editingDetails ? (
                <>
                  <div className="ui-grid two">
                    <label className="field-label">
                      <span>First Name <span style={{ color: '#c62828' }}>*</span></span>
                      <input className="ui-input" name="first_name" value={formData.first_name} onChange={onChange} required />
                    </label>

                    <label className="field-label">
                      <span>Last Name <span style={{ color: '#c62828' }}>*</span></span>
                      <input className="ui-input" name="last_name" value={formData.last_name} onChange={onChange} required />
                    </label>
                  </div>

                  <label className="field-label">
                    <span>Username <span style={{ color: '#c62828' }}>*</span></span>
                    <input className="ui-input" name="username" value={formData.username} onChange={onChange} required />
                  </label>

                  <label className="field-label">
                    <span>Email <span style={{ color: '#c62828' }}>*</span></span>
                    <input className="ui-input" name="email" type="email" value={formData.email} onChange={onChange} required />
                  </label>

                  <div className="row-actions account-actions">
                    <button className="ui-btn" type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="ui-btn-ghost" type="button" onClick={cancelDetailsEdit} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="list-row">
                  <p style={{ margin: 0 }}><strong>First Name:</strong> {formData.first_name || '—'}</p>
                  <p style={{ margin: 0 }}><strong>Last Name:</strong> {formData.last_name || '—'}</p>
                  <p style={{ margin: 0 }}><strong>Username:</strong> {formData.username || '—'}</p>
                  <p style={{ margin: 0 }}><strong>Email:</strong> {formData.email || '—'}</p>
                  <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="ui-btn-ghost" type="button" onClick={openDetailsEdit}>Edit Account details</button>
                  </div>
                </div>
              )}
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
                (() => {
                  const defaultAddress = addresses.find((address) => address.is_default) || addresses[0];

                  return (
                    <div className="stack">
                      <div className="list-row">
                        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                          <strong>Saved addresses</strong>
                          <button className="ui-btn-ghost" type="button" onClick={openAddAddressModal}>Click to add another address</button>
                        </div>
                        <p className="admin-muted" style={{ margin: 0 }}>
                          The following addresses will be used on the checkout page by default.
                        </p>
                      </div>

                      {addresses.map((address) => {
                        const isDefault = address.address_id === defaultAddress.address_id;

                        return (
                          <div key={address.address_id} className="list-row">
                            <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                              <strong>
                                Shipping address
                                {isDefault && <span style={{ marginLeft: '.45rem', color: '#156238' }}>· Default address</span>}
                              </strong>
                              <div className="row-actions">
                                {editingAddressId === address.address_id ? (
                                  <>
                                    <button className="ui-btn-ghost" type="button" disabled={addressBusyId === address.address_id} onClick={() => handleUpdateAddress(address.address_id)}>
                                      {addressBusyId === address.address_id ? 'Saving...' : 'Save'}
                                    </button>
                                    <button className="ui-btn-ghost" type="button" onClick={() => setEditingAddressId(null)}>Cancel</button>
                                  </>
                                ) : (
                                  <button className="ui-btn-ghost" type="button" onClick={() => setEditingAddressId(address.address_id)}>
                                    Edit Shipping address
                                  </button>
                                )}
                                <button className="ui-btn-ghost danger-text" type="button" disabled={addressBusyId === address.address_id} onClick={() => handleDeleteAddress(address.address_id)}>
                                  {addressBusyId === address.address_id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>

                            {editingAddressId === address.address_id ? (
                              <div className="ui-grid two">
                                <label className="field-label">
                                  <span>First Name <span style={{ color: '#c62828' }}>*</span></span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.first_name || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'first_name', e.target.value)} required />
                                </label>
                                <label className="field-label">
                                  <span>Last Name <span style={{ color: '#c62828' }}>*</span></span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.last_name || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'last_name', e.target.value)} required />
                                </label>
                                <label className="field-label">
                                  <span>Street <span style={{ color: '#c62828' }}>*</span></span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.street || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'street', e.target.value)} required />
                                </label>
                                <label className="field-label">
                                  <span>Apartment / Suite</span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.apartment || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'apartment', e.target.value)} />
                                </label>
                                <label className="field-label">
                                  <span>City <span style={{ color: '#c62828' }}>*</span></span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.city || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'city', e.target.value)} required />
                                </label>
                                <label className="field-label">
                                  <span>District <span style={{ color: '#c62828' }}>*</span></span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.district || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'district', e.target.value)} required />
                                </label>
                                <label className="field-label">
                                  <span>Postal Code</span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.postal_code || ''} onChange={(e) => onAddressDraftChange(address.address_id, 'postal_code', e.target.value)} />
                                </label>
                                <label className="field-label">
                                  <span>Country <span style={{ color: '#c62828' }}>*</span></span>
                                  <input className="ui-input" value={addressDrafts[address.address_id]?.country || ''} readOnly required />
                                </label>
                                <label className="radio-item" style={{ gridColumn: '1 / -1' }}>
                                  <input type="checkbox" checked={!!addressDrafts[address.address_id]?.is_default} onChange={(e) => onAddressDraftChange(address.address_id, 'is_default', e.target.checked)} />
                                  <span>Set as default address</span>
                                </label>
                              </div>
                            ) : (
                              <>
                                <p style={{ margin: 0 }}>{[address.first_name, address.last_name].filter(Boolean).join(' ')}</p>
                                <p style={{ margin: 0 }}>{address.street}{address.apartment ? `, ${address.apartment}` : ''}</p>
                                <p style={{ margin: 0 }}>{address.city}</p>
                                <p style={{ margin: 0 }}>{address.district || ''}</p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="msg-note">
                  <p style={{ margin: 0 }}>You don't have any saved address. Click to add one.</p>
                  <div className="row-actions" style={{ marginTop: '.5rem' }}>
                    <button className="ui-btn-ghost" type="button" onClick={openAddAddressModal}>Add New Address</button>
                  </div>
                </div>
              )}

              {showAddAddressModal && (
                <div className="account-modal-overlay" role="dialog" aria-modal="true" aria-label="Add new address">
                  <div className="account-modal-card">
                    <div className="account-modal-head">
                      <h3 className="section-title" style={{ margin: 0 }}>Add New Address</h3>
                      <button className="ui-btn-ghost" type="button" onClick={closeAddAddressModal} disabled={creatingAddress}>Close</button>
                    </div>

                    <form className="stack" onSubmit={handleCreateAddress}>
                      <div className="ui-grid two">
                        <label className="field-label">
                          <span>First Name <span style={{ color: '#c62828' }}>*</span></span>
                          <input className="ui-input" value={newAddress.first_name} onChange={(e) => onNewAddressChange('first_name', e.target.value)} required />
                        </label>
                        <label className="field-label">
                          <span>Last Name <span style={{ color: '#c62828' }}>*</span></span>
                          <input className="ui-input" value={newAddress.last_name} onChange={(e) => onNewAddressChange('last_name', e.target.value)} required />
                        </label>
                        <label className="field-label">
                          <span>Street <span style={{ color: '#c62828' }}>*</span></span>
                          <input className="ui-input" value={newAddress.street} onChange={(e) => onNewAddressChange('street', e.target.value)} required />
                        </label>
                        <label className="field-label">
                          <span>Apartment / Suite</span>
                          <input className="ui-input" value={newAddress.apartment} onChange={(e) => onNewAddressChange('apartment', e.target.value)} />
                        </label>
                        <label className="field-label">
                          <span>City <span style={{ color: '#c62828' }}>*</span></span>
                          <input className="ui-input" value={newAddress.city} onChange={(e) => onNewAddressChange('city', e.target.value)} required />
                        </label>
                        <label className="field-label">
                          <span>District <span style={{ color: '#c62828' }}>*</span></span>
                          <input className="ui-input" value={newAddress.district} onChange={(e) => onNewAddressChange('district', e.target.value)} required />
                        </label>
                        <label className="field-label">
                          <span>Postal Code</span>
                          <input className="ui-input" value={newAddress.postal_code} onChange={(e) => onNewAddressChange('postal_code', e.target.value)} />
                        </label>
                        <label className="field-label">
                          <span>Country <span style={{ color: '#c62828' }}>*</span></span>
                          <input className="ui-input" value={newAddress.country} readOnly required />
                        </label>
                      </div>
                      <label className="radio-item">
                        <input type="checkbox" checked={newAddress.is_default} onChange={(e) => onNewAddressChange('is_default', e.target.checked)} />
                        <span>Set as default address</span>
                      </label>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="ui-btn" type="submit" disabled={creatingAddress}>{creatingAddress ? 'Adding...' : 'Add Address'}</button>
                      </div>
                    </form>
                  </div>
                </div>
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
