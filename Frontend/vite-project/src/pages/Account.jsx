import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { orderService, userService, wishlistService } from '../services';
import { useAddresses } from '../hooks';
import { useAuth } from '../context';

const STORAGE_KEY = 'folkmint_account_section';
const SECTIONS    = ['details', 'orders', 'addresses', 'wishlist'];
const getSaved    = () => { try { const s = localStorage.getItem(STORAGE_KEY); return SECTIONS.includes(s) ? s : 'details'; } catch { return 'details'; } };

/* ── Icons ── */
const I = {
  User:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Orders:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
  Pin:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  Heart:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Lock:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Logout:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Shield:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Edit:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>,
  Trash:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  Plus:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Star:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>,
  X:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Chevron: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Eye:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  EmptyBox:   () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  EmptyPin:   () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  EmptyHeart: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
};

const Spin = ({ s = 16 }) => <span className="ac-spin" style={{ width: s, height: s }} />;

const Toast = ({ msg, type, onClose }) => (
  <div className={`ac-toast ac-toast-${type}`} role="alert" aria-live="assertive">
    <span className="ac-toast-ico">{type === 'success' ? <I.Check /> : <I.X />}</span>
    <span className="ac-toast-msg">{msg}</span>
    <button type="button" className="ac-toast-close" onClick={onClose} aria-label="Dismiss"><I.X /></button>
  </div>
);

const STATUS_META = {
  pending:    { label: 'Pending',    color: '#d97706', bg: '#fff7e6', border: '#fcd9a0' },
  confirmed:  { label: 'Confirmed',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  processing: { label: 'Processing', color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd' },
  shipped:    { label: 'Shipped',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  delivered:  { label: 'Delivered',  color: '#15803d', bg: '#f0faf3', border: '#bbe5c8' },
  cancelled:  { label: 'Cancelled',  color: '#9f1239', bg: '#fff2f3', border: '#f5c2c7' },
};
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      border: `1px solid ${m.border}`,
      background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '.04em', whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
};

const PW_RULES = [
  { id: 'len',   label: 'At least 6 characters',    test: v => v.length >= 6 },
  { id: 'upper', label: 'One uppercase letter',      test: v => /[A-Z]/.test(v) },
  { id: 'num',   label: 'One number',                test: v => /[0-9]/.test(v) },
];

const ADDR_BLANK = { street: '', city: '', postal_code: '', country: 'Bangladesh' };

const AddressForm = ({ vals, onChange, onSubmit, busy, submitLabel, onCancel, showDefault = false, isDefault = false, onDefaultChange }) => (
  <form className="ac-addr-form" onSubmit={onSubmit} noValidate>
    <div className="ac-addr-grid">
      <label className="ac-field ac-field-full">
        <span className="ac-label">Street address <em className="ac-req">*</em></span>
        <input className="ac-input" value={vals.street} onChange={e => onChange('street', e.target.value)} placeholder="House no, road, area" maxLength={100} required />
      </label>
      <label className="ac-field">
        <span className="ac-label">City <em className="ac-req">*</em></span>
        <input className="ac-input" value={vals.city} onChange={e => onChange('city', e.target.value)} placeholder="e.g. Dhaka" maxLength={50} required />
      </label>
      <label className="ac-field">
        <span className="ac-label">Postal code</span>
        <input className="ac-input" value={vals.postal_code} onChange={e => onChange('postal_code', e.target.value)} placeholder="e.g. 1207" maxLength={20} />
      </label>
      <label className="ac-field">
        <span className="ac-label">Country <em className="ac-req">*</em></span>
        <input className="ac-input" value={vals.country} readOnly tabIndex={-1} />
      </label>
    </div>
    {showDefault && (
      <label className="ac-check-row">
        <span className={`ac-check-box${isDefault ? ' on' : ''}`} role="checkbox" aria-checked={isDefault} tabIndex={0}
          onKeyDown={e => e.key === ' ' && onDefaultChange(!isDefault)} onClick={() => onDefaultChange(!isDefault)}>
          {isDefault && <I.Check />}
        </span>
        <span className="ac-check-label">Set as default shipping address</span>
      </label>
    )}
    <div className="ac-form-actions">
      <button className="ac-btn-primary" type="submit" disabled={busy}>
        {busy ? <><Spin s={13} /> Saving…</> : submitLabel}
      </button>
      {onCancel && <button className="ac-btn-ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>}
    </div>
  </form>
);

/* ══════════════════════════════════════════════════════
   Account — main component
══════════════════════════════════════════════════════ */
export default function Account() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const {
    addresses, loading: addrLoading,
    addAddress, updateAddress, setDefaultAddress, deleteAddress,
    refetch: refetchAddresses,
  } = useAddresses();

  const [section, setSection] = useState(getSaved);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, section); }, [section]);
  useEffect(() => {
    const forced = location.state?.defaultSection;
    if (!SECTIONS.includes(forced)) return;
    setSection(forced);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [profileLoading, setProfileLoading] = useState(true);
  const [form, setForm]       = useState({ first_name: '', last_name: '' });
  const [formSnap, setSnap]   = useState(null);
  const [editingPro, setEditPro] = useState(false);
  const [savingPro, setSavingPro] = useState(false);

  useEffect(() => {
    (async () => {
      setProfileLoading(true);
      try {
        const res = await userService.getProfile();
        const p   = res?.user || user || {};
        const snap = { first_name: p.first_name || '', last_name: p.last_name || '' };
        setForm(snap); setSnap(snap);
      } catch { showToast('Failed to load profile.', 'error'); }
      finally { setProfileLoading(false); }
    })();
  }, []);

  const [pwForm, setPwForm]     = useState({ password: '', confirm: '' });
  const [showPw, setShowPw]     = useState({ password: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);
  const [pwSection, setPwSection] = useState(false);

  const [orders, setOrders]         = useState([]);
  const [ordersLoading, setOrdLoad] = useState(false);
  const [ordersLoaded, setOrdLoaded] = useState(false);

  useEffect(() => {
    if (section !== 'orders' || ordersLoaded) return;
    (async () => {
      setOrdLoad(true);
      try {
        const res = await orderService.getUserOrders();
        setOrders(Array.isArray(res?.orders) ? res.orders : []);
        setOrdLoaded(true);
      } catch { showToast('Failed to load orders.', 'error'); }
      finally { setOrdLoad(false); }
    })();
  }, [section, ordersLoaded]);

  const [wish, setWish]             = useState([]);
  const [wishLoading, setWishLoad]  = useState(false);
  const [wishLoaded, setWishLoaded] = useState(false);

  useEffect(() => {
    if (section !== 'wishlist' || wishLoaded) return;
    (async () => {
      setWishLoad(true);
      try {
        const res = await wishlistService.getWishlist();
        setWish(Array.isArray(res?.wishlist) ? res.wishlist : []);
        setWishLoaded(true);
      } catch { showToast('Failed to load wishlist.', 'error'); }
      finally { setWishLoad(false); }
    })();
  }, [section, wishLoaded]);

  const [newAddr, setNewAddr]       = useState({ ...ADDR_BLANK });
  const [newAddrDefault, setNewAddrDefault] = useState(false);
  const [addrDrafts, setDrafts]     = useState({});
  const [editAddrId, setEditAddr]   = useState(null);
  const [addrBusy, setAddrBusy]     = useState(null);
  const [addingAddr, setAddingAddr] = useState(false);
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    const d = {};
    addresses.forEach(a => {
      d[a.address_id] = { street: a.street || '', city: a.city || '', postal_code: a.postal_code || '', country: a.country || 'Bangladesh' };
    });
    setDrafts(d);
  }, [addresses]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleSaveProfile = async e => {
    e.preventDefault();
    if (!form.first_name?.trim() || !form.last_name?.trim()) { showToast('First name and last name are required.', 'error'); return; }
    setSavingPro(true);
    try {
      const res = await userService.updateProfile(form);
      if (res?.user) {
        updateUser(res.user);
        const snap = { first_name: res.user.first_name || '', last_name: res.user.last_name || '' };
        setForm(snap); setSnap(snap);
      }
      showToast('Profile updated successfully.'); setEditPro(false);
    } catch (err) { showToast(err?.error || err?.message || 'Update failed.', 'error'); }
    finally { setSavingPro(false); }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    const { password, confirm } = pwForm;
    if (!password) { showToast('Please enter a new password.', 'error'); return; }
    const failing = PW_RULES.find(r => !r.test(password));
    if (failing) { showToast(failing.label + ' required.', 'error'); return; }
    if (password !== confirm) { showToast('Passwords do not match.', 'error'); return; }
    setSavingPw(true);
    try {
      await userService.changePassword({ password });
      showToast('Password changed successfully.');
      setPwForm({ password: '', confirm: '' }); setPwSection(false);
    } catch (err) { showToast(err?.error || err?.message || 'Failed to change password.', 'error'); }
    finally { setSavingPw(false); }
  };

  const handleAddAddr = async e => {
    e.preventDefault();
    if (!newAddr.street?.trim()) { showToast('Street address is required.', 'error'); return; }
    if (!newAddr.city?.trim())   { showToast('City is required.', 'error'); return; }
    setAddingAddr(true);
    try {
      const result = await addAddress({ ...newAddr, is_default: newAddrDefault });
      if (!result.success) throw new Error(result.error);
      showToast('Address added.'); setNewAddr({ ...ADDR_BLANK }); setNewAddrDefault(false); setShowModal(false);
    } catch (err) { showToast(err?.message || 'Failed to add address.', 'error'); }
    finally { setAddingAddr(false); }
  };

  const handleUpdateAddr = async (id) => {
    const d = addrDrafts[id];
    if (!d?.street?.trim()) { showToast('Street address is required.', 'error'); return; }
    if (!d?.city?.trim())   { showToast('City is required.', 'error'); return; }
    setAddrBusy(id);
    try {
      const result = await updateAddress(id, d);
      if (!result.success) throw new Error(result.error);
      showToast('Address updated.'); setEditAddr(null);
    } catch (err) { showToast(err?.message || 'Failed to update address.', 'error'); }
    finally { setAddrBusy(null); }
  };

  const handleSetDefault = async (id) => {
    setAddrBusy(id);
    try {
      const result = await setDefaultAddress(id);
      if (!result.success) throw new Error(result.error);
      showToast('Default address updated.');
    } catch (err) { showToast(err?.message || 'Failed to set default.', 'error'); }
    finally { setAddrBusy(null); }
  };

  const handleDeleteAddr = async (id) => {
    if (!window.confirm('Remove this address?')) return;
    setAddrBusy(id);
    try {
      const result = await deleteAddress(id);
      if (!result.success) throw new Error(result.error);
      showToast('Address removed.');
      if (editAddrId === id) setEditAddr(null);
    } catch (err) { showToast(err?.message || 'Failed to delete address.', 'error'); }
    finally { setAddrBusy(null); }
  };

  const initials = `${form.first_name?.[0] || user?.first_name?.[0] || ''}${form.last_name?.[0] || user?.last_name?.[0] || ''}`.toUpperCase() || 'U';
  const displayName = `${form.first_name} ${form.last_name}`.trim() || user?.email || 'My Account';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-BD', { year: 'numeric', month: 'long' }) : null;

  const NAV = [
    { key: 'details',   label: 'Account Details', Icon: I.User },
    { key: 'orders',    label: 'My Orders',        Icon: I.Orders },
    { key: 'addresses', label: 'Addresses',        Icon: I.Pin },
    { key: 'wishlist',  label: 'Wishlist',         Icon: I.Heart },
  ];

  if (profileLoading) return (
    <div className="ac-loading-screen">
      <Spin s={32} /><p>Loading your account…</p>
    </div>
  );

  return (
    <div className="ac-page">

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page head ── */}
      <div className="ac-page-head">
        <div>
          <p className="ac-eyebrow">My Account</p>
          <h1 className="ac-page-title">Account</h1>
        </div>
        {user?.role === 'admin' && (
          <button className="ac-nav-btn-secondary" onClick={() => navigate('/admin')}>
            <I.Shield /> Admin Dashboard
          </button>
        )}
      </div>

      <div className="ac-layout">

        {/* ══ Sidebar ══ */}
        <aside className="ac-sidebar">

          {/* Profile card */}
          <div className="ac-profile-card">
            <div className="ac-avatar-wrap">
              <div className="ac-avatar">{initials}</div>
              {user?.role === 'admin' && (
                <span className="ac-avatar-badge" title="Administrator"><I.Shield /></span>
              )}
            </div>
            <div className="ac-profile-info">
              <p className="ac-profile-name">{displayName}</p>
              <p className="ac-profile-email">{user?.email}</p>
              {memberSince && <p className="ac-profile-since">Member since {memberSince}</p>}
            </div>
          </div>

          {/* Nav */}
          <nav className="ac-nav" aria-label="Account sections">
            {NAV.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                className={`ac-nav-btn${section === key ? ' is-active' : ''}`}
                onClick={() => setSection(key)}
              >
                <span className="ac-nav-ico"><Icon /></span>
                <span className="ac-nav-lbl">{label}</span>
                <span className="ac-nav-arr"><I.Chevron /></span>
              </button>
            ))}
            <div className="ac-nav-divider" />
            {user?.role === 'admin' && (
              <button type="button" className="ac-nav-btn ac-nav-gold" onClick={() => navigate('/admin')}>
                <span className="ac-nav-ico"><I.Shield /></span>
                <span className="ac-nav-lbl">Admin Dashboard</span>
                <span className="ac-nav-arr"><I.Chevron /></span>
              </button>
            )}
            <button type="button" className="ac-nav-btn ac-nav-danger" onClick={handleLogout}>
              <span className="ac-nav-ico"><I.Logout /></span>
              <span className="ac-nav-lbl">Sign Out</span>
            </button>
          </nav>

        </aside>

        {/* ══ Main ══ */}
        <main className="ac-main" key={section}>

          {/* ─── DETAILS ─── */}
          {section === 'details' && (
            <>
              {/* Profile info */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <div>
                    <h2 className="ac-card-title">Account Details</h2>
                    <p className="ac-card-sub">Your name as it appears on orders</p>
                  </div>
                  {!editingPro && (
                    <button type="button" className="ac-btn-outline" onClick={() => { setSnap(form); setEditPro(true); }}>
                      <I.Edit /> Edit
                    </button>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <div className="ac-callout-gold">
                    <I.Shield />
                    <span>You are signed in as <strong>Administrator</strong>.</span>
                    <button type="button" className="ac-callout-action" onClick={() => navigate('/admin')}>
                      Open Admin Dashboard →
                    </button>
                  </div>
                )}

                {editingPro ? (
                  <form className="ac-form" onSubmit={handleSaveProfile} noValidate>
                    <div className="ac-form-grid">
                      <label className="ac-field">
                        <span className="ac-label">First name <em className="ac-req">*</em></span>
                        <input className="ac-input" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} maxLength={50} autoFocus required />
                      </label>
                      <label className="ac-field">
                        <span className="ac-label">Last name <em className="ac-req">*</em></span>
                        <input className="ac-input" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} maxLength={50} required />
                      </label>
                    </div>
                    <div className="ac-form-actions">
                      <button className="ac-btn-primary" type="submit" disabled={savingPro}>
                        {savingPro ? <><Spin s={13} /> Saving…</> : 'Save changes'}
                      </button>
                      <button className="ac-btn-ghost" type="button" disabled={savingPro} onClick={() => { setForm(formSnap); setEditPro(false); }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="ac-detail-table">
                    {[
                      { label: 'First name', value: form.first_name || user?.first_name },
                      { label: 'Last name',  value: form.last_name  || user?.last_name },
                      { label: 'Email',      value: user?.email },
                      { label: 'Role',       value: user?.role === 'admin' ? 'Administrator' : 'Customer' },
                    ].map(r => (
                      <div key={r.label} className="ac-detail-row">
                        <span className="ac-detail-lbl">{r.label}</span>
                        <span className="ac-detail-val">{r.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="ac-card">
                <div className="ac-card-head">
                  <div>
                    <h2 className="ac-card-title">Password</h2>
                    <p className="ac-card-sub">Must be 6+ chars, 1 uppercase, 1 number</p>
                  </div>
                  {!pwSection && (
                    <button type="button" className="ac-btn-outline" onClick={() => setPwSection(true)}>
                      <I.Lock /> Change
                    </button>
                  )}
                </div>

                {pwSection ? (
                  <form className="ac-form" onSubmit={handleChangePassword} noValidate>
                    <div className="ac-form-grid">
                      {['password', 'confirm'].map(field => (
                        <label key={field} className="ac-field">
                          <span className="ac-label">
                            {field === 'password' ? 'New password' : 'Confirm password'} <em className="ac-req">*</em>
                          </span>
                          <div className="ac-input-wrap">
                            <input
                              className="ac-input ac-input-pw"
                              type={showPw[field] ? 'text' : 'password'}
                              value={pwForm[field]}
                              onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                              autoComplete="new-password"
                              required
                            />
                            <button type="button" className="ac-pw-eye"
                              onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                              aria-label={showPw[field] ? 'Hide password' : 'Show password'}>
                              {showPw[field] ? <I.EyeOff /> : <I.Eye />}
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>

                    {pwForm.password && (
                      <ul className="ac-pw-rules">
                        {PW_RULES.map(r => (
                          <li key={r.id} className={`ac-pw-rule${r.test(pwForm.password) ? ' met' : ''}`}>
                            <span className="ac-pw-rule-dot" />{r.label}
                          </li>
                        ))}
                        {pwForm.confirm && (
                          <li className={`ac-pw-rule${pwForm.password === pwForm.confirm ? ' met' : ''}`}>
                            <span className="ac-pw-rule-dot" />Passwords match
                          </li>
                        )}
                      </ul>
                    )}

                    <div className="ac-form-actions">
                      <button className="ac-btn-primary" type="submit" disabled={savingPw}>
                        {savingPw ? <><Spin s={13} /> Saving…</> : 'Update password'}
                      </button>
                      <button className="ac-btn-ghost" type="button" disabled={savingPw}
                        onClick={() => { setPwForm({ password: '', confirm: '' }); setPwSection(false); }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <p className="ac-pw-placeholder">••••••••••••</p>
                )}
              </div>
            </>
          )}

          {/* ─── ORDERS ─── */}
          {section === 'orders' && (
            <div className="ac-card">
              <div className="ac-card-head">
                <div>
                  <h2 className="ac-card-title">My Orders</h2>
                  <p className="ac-card-sub">Your complete purchase history</p>
                </div>
                {orders.length > 0 && <Link to="/orders" className="ac-btn-outline">View all</Link>}
              </div>

              {ordersLoading ? (
                <div className="ac-loader"><Spin /> Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="ac-empty">
                  <span className="ac-empty-ico"><I.EmptyBox /></span>
                  <p className="ac-empty-title">No orders yet</p>
                  <p className="ac-empty-sub">Your completed orders will appear here.</p>
                  <Link to="/products" className="ac-btn-primary">Start shopping</Link>
                </div>
              ) : (
                <div className="ac-orders-list">
                  {orders.slice(0, 8).map(o => (
                    <div key={o.order_id} className="ac-order-row">
                      <div className="ac-order-left">
                        <p className="ac-order-id">Order <strong>#{o.order_id}</strong></p>
                        <p className="ac-order-date">{orderService.formatOrderDate(o.created_at)}</p>
                      </div>
                      <div className="ac-order-right">
                        <StatusBadge status={o.status} />
                        <p className="ac-order-amount">৳{Number(o.total_amount || 0).toLocaleString('en-BD')}</p>
                      </div>
                    </div>
                  ))}
                  {orders.length > 8 && (
                    <Link to="/orders" className="ac-view-all-link">
                      View all {orders.length} orders <I.Chevron />
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── ADDRESSES ─── */}
          {section === 'addresses' && (
            <div className="ac-card">
              <div className="ac-card-head">
                <div>
                  <h2 className="ac-card-title">Addresses</h2>
                  <p className="ac-card-sub">Saved shipping locations</p>
                </div>
                <button type="button" className="ac-btn-outline" onClick={() => setShowModal(true)}>
                  <I.Plus /> Add address
                </button>
              </div>

              {addrLoading ? (
                <div className="ac-loader"><Spin /> Loading addresses…</div>
              ) : addresses.length === 0 ? (
                <div className="ac-empty">
                  <span className="ac-empty-ico"><I.EmptyPin /></span>
                  <p className="ac-empty-title">No saved addresses</p>
                  <p className="ac-empty-sub">Add a shipping address to speed up checkout.</p>
                  <button type="button" className="ac-btn-primary" onClick={() => setShowModal(true)}>Add your first address</button>
                </div>
              ) : (
                <div className="ac-addr-list">
                  {addresses.map(addr => {
                    const isEditing = editAddrId === addr.address_id;
                    const isBusy    = addrBusy   === addr.address_id;
                    const draft     = addrDrafts[addr.address_id] || {};

                    return (
                      <div key={addr.address_id} className={`ac-addr-card${addr.is_default ? ' is-default' : ''}${isEditing ? ' is-editing' : ''}`}>
                        <div className="ac-addr-card-head">
                          <div className="ac-addr-card-title">
                            {addr.is_default && <span className="ac-default-tag">Default</span>}
                            <span className="ac-addr-city">{addr.city}</span>
                          </div>
                          <div className="ac-addr-card-actions">
                            {isEditing ? (
                              <>
                                <button type="button" className="ac-btn-primary ac-btn-sm" disabled={isBusy} onClick={() => handleUpdateAddr(addr.address_id)}>
                                  {isBusy ? <Spin s={12} /> : 'Save'}
                                </button>
                                <button type="button" className="ac-btn-ghost ac-btn-sm" onClick={() => setEditAddr(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                {!addr.is_default && (
                                  <button type="button" className="ac-btn-ghost ac-btn-sm" disabled={isBusy} onClick={() => handleSetDefault(addr.address_id)} title="Set as default">
                                    {isBusy ? <Spin s={12} /> : 'Set default'}
                                  </button>
                                )}
                                <button type="button" className="ac-ico-btn" title="Edit" disabled={isBusy} onClick={() => setEditAddr(addr.address_id)}><I.Edit /></button>
                                <button type="button" className="ac-ico-btn ac-ico-danger" title="Delete" disabled={isBusy} onClick={() => handleDeleteAddr(addr.address_id)}>
                                  {isBusy ? <Spin s={12} /> : <I.Trash />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <AddressForm
                            vals={draft}
                            onChange={(field, val) => setDrafts(prev => ({ ...prev, [addr.address_id]: { ...prev[addr.address_id], [field]: val } }))}
                            onSubmit={e => { e.preventDefault(); handleUpdateAddr(addr.address_id); }}
                            busy={isBusy} submitLabel="Save changes" onCancel={() => setEditAddr(null)} showDefault={false}
                          />
                        ) : (
                          <div className="ac-addr-body">
                            <p>{addr.street}</p>
                            <p>{[addr.city, addr.postal_code].filter(Boolean).join(', ')}</p>
                            <p className="ac-addr-country">{addr.country}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {showModal && (
                <div className="ac-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add new address"
                  onClick={e => { if (e.target === e.currentTarget && !addingAddr) setShowModal(false); }}>
                  <div className="ac-modal">
                    <div className="ac-modal-head">
                      <h3 className="ac-modal-title">Add New Address</h3>
                      <button type="button" className="ac-modal-close" onClick={() => !addingAddr && setShowModal(false)} aria-label="Close"><I.X /></button>
                    </div>
                    <AddressForm vals={newAddr} onChange={(field, val) => setNewAddr(p => ({ ...p, [field]: val }))}
                      onSubmit={handleAddAddr} busy={addingAddr} submitLabel="Add address"
                      onCancel={() => { if (!addingAddr) setShowModal(false); }}
                      showDefault={true} isDefault={newAddrDefault} onDefaultChange={setNewAddrDefault} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── WISHLIST ─── */}
          {section === 'wishlist' && (
            <div className="ac-card">
              <div className="ac-card-head">
                <div>
                  <h2 className="ac-card-title">Wishlist</h2>
                  <p className="ac-card-sub">Products you've saved</p>
                </div>
              </div>

              {wishLoading ? (
                <div className="ac-loader"><Spin /> Loading wishlist…</div>
              ) : wish.length === 0 ? (
                <div className="ac-empty">
                  <span className="ac-empty-ico"><I.EmptyHeart /></span>
                  <p className="ac-empty-title">Your wishlist is empty</p>
                  <p className="ac-empty-sub">Save items while browsing to find them here.</p>
                  <Link to="/products" className="ac-btn-primary">Browse products</Link>
                </div>
              ) : (
                <div className="ac-wish-grid">
                  {wish.slice(0, 12).map(item => (
                    <Link key={item.wishlist_id} to={`/products/${item.product_id}`} className="ac-wish-card">
                      <div className="ac-wish-img-wrap">
                        {item.primary_image
                          ? <img src={item.primary_image} alt={item.product_name} className="ac-wish-img" />
                          : <span className="ac-wish-no-img"><I.EmptyHeart /></span>
                        }
                        {item.stock_quantity === 0 && <span className="ac-wish-oos">Out of stock</span>}
                      </div>
                      <div className="ac-wish-body">
                        {item.size && <p className="ac-wish-size">Size: {item.size}</p>}
                        <p className="ac-wish-name">{item.product_name}</p>
                        <p className="ac-wish-price">৳{Number(item.price || 0).toLocaleString('en-BD')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <style>{`
        /* ── Spinner ── */
        @keyframes ac-spin { to { transform: rotate(360deg); } }
        .ac-spin {
          display: inline-block; border-radius: 50%;
          border: 2px solid rgba(212,175,55,.2);
          border-top-color: var(--gold);
          animation: ac-spin .65s linear infinite; flex-shrink: 0;
        }

        /* ── Toast ── */
        .ac-toast {
          position: fixed; top: 86px; right: 1.25rem; z-index: 1400;
          width: min(340px, calc(100vw - 2.5rem));
          display: flex; align-items: center; gap: .6rem;
          padding: .85rem 1rem; border-radius: var(--r); border: 1px solid;
          box-shadow: 0 12px 32px rgba(10,17,40,.14);
          font-size: .875rem; animation: ac-toast-in .22s var(--ease) both;
        }
        @keyframes ac-toast-in { from { opacity:0; transform: translateX(14px); } }
        .ac-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ac-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }
        .ac-toast-ico  { display: flex; align-items: center; flex-shrink: 0; }
        .ac-toast-msg  { flex: 1; font-weight: 500; }
        .ac-toast-close {
          display: flex; align-items: center;
          background: none; border: none; cursor: pointer;
          padding: 0; color: inherit; opacity: .55; margin-left: auto; transition: opacity .15s;
        }
        .ac-toast-close:hover { opacity: 1; }

        /* ── Page ── */
        .ac-page {
          width: 100%; padding: 40px 48px 64px;
          display: flex; flex-direction: column; gap: 12px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .ac-loading-screen {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 1rem; min-height: 60vh;
          color: var(--muted); font-size: .95rem;
        }

        /* ── Page head ── */
        .ac-page-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 16px;
        }
        .ac-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .ac-page-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .ac-nav-btn-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: border-color .2s, color .2s;
        }
        .ac-nav-btn-secondary:hover { border-color: var(--gold); color: var(--gold); }

        /* ── Layout ── */
        .ac-layout {
          display: grid; grid-template-columns: 252px 1fr;
          gap: 20px; align-items: start;
        }

        /* ── Sidebar ── */
        .ac-sidebar {
          position: sticky; top: 88px;
          display: flex; flex-direction: column; gap: 12px;
        }

        /* Profile card */
        .ac-profile-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 24px 20px;
          display: flex; flex-direction: column;
          align-items: center; text-align: center; gap: 10px;
        }
        .ac-avatar-wrap { position: relative; margin-bottom: 4px; }
        .ac-avatar {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--gold); color: var(--dark);
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          letter-spacing: .04em;
        }
        .ac-avatar-badge {
          position: absolute; bottom: -2px; right: -2px;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--gold); color: var(--dark);
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--bg-card);
        }
        .ac-profile-info { display: flex; flex-direction: column; gap: 3px; }
        .ac-profile-name { font-weight: 600; font-size: 13.5px; color: var(--dark); margin: 0; }
        .ac-profile-email { font-size: 12px; color: var(--muted); margin: 0; word-break: break-all; }
        .ac-profile-since { font-size: 11px; color: var(--muted); margin: 0; opacity: .7; }

        /* Nav */
        .ac-nav {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
          display: flex; flex-direction: column;
        }
        .ac-nav-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: none; border: none;
          border-bottom: 1px solid var(--border); cursor: pointer;
          width: 100%; text-align: left; font-size: 13.5px; color: var(--text);
          transition: background .14s, color .14s;
        }
        .ac-nav-btn:last-child { border-bottom: none; }
        .ac-nav-btn:hover  { background: var(--bg-alt); color: var(--dark); }
        .ac-nav-btn.is-active { background: var(--bg-alt); color: var(--dark); font-weight: 600; }
        .ac-nav-btn.is-active .ac-nav-ico { color: var(--gold); }
        .ac-nav-ico { display: flex; align-items: center; color: var(--muted); flex-shrink: 0; transition: color .14s; }
        .ac-nav-btn:hover .ac-nav-ico { color: var(--dark); }
        .ac-nav-lbl { flex: 1; }
        .ac-nav-arr { display: flex; align-items: center; color: var(--border); transition: color .14s; }
        .ac-nav-btn:hover .ac-nav-arr,
        .ac-nav-btn.is-active .ac-nav-arr { color: var(--muted); }
        .ac-nav-divider { height: 1px; background: var(--border); }
        .ac-nav-gold .ac-nav-ico { color: var(--gold); }
        .ac-nav-gold:hover { background: var(--gold-muted); }
        .ac-nav-danger { color: #9f1239; }
        .ac-nav-danger .ac-nav-ico { color: #9f1239; }
        .ac-nav-danger:hover { background: #fff2f3; color: #7f0e1d; }

        /* ── Main ── */
        .ac-main { min-width: 0; display: flex; flex-direction: column; gap: 16px; }

        /* ── Card (replaces panel) ── */
        .ac-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 28px 32px;
          animation: ac-card-in .18s ease both;
        }
        @keyframes ac-card-in { from { opacity: 0; transform: translateY(5px); } }

        .ac-card-head {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 16px;
          padding-bottom: 20px; margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .ac-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark); margin: 0 0 4px;
        }
        .ac-card-sub { font-size: 13px; color: var(--muted); margin: 0; }

        /* ── Callout ── */
        .ac-callout-gold {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: var(--gold-muted);
          border: 1px solid var(--gold-lt); border-radius: var(--r);
          font-size: 13.5px; color: var(--dark); margin-bottom: 20px; flex-wrap: wrap;
        }
        .ac-callout-gold svg { color: var(--gold); flex-shrink: 0; }
        .ac-callout-action {
          margin-left: auto; background: none; border: none; padding: 0;
          font-size: 13px; font-weight: 600; color: var(--dark); cursor: pointer;
          text-decoration: underline; text-underline-offset: 2px;
        }

        /* ── Buttons ── */
        .ac-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; text-decoration: none; white-space: nowrap;
          transition: background .2s;
        }
        .ac-btn-primary:hover:not(:disabled) { background: var(--black); }
        .ac-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .ac-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; white-space: nowrap; transition: border-color .2s, background .2s;
        }
        .ac-btn-ghost:hover:not(:disabled) { border-color: var(--dark); background: var(--bg); }
        .ac-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

        .ac-btn-outline {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 8px 16px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 12px; font-weight: 600; color: var(--dark);
          cursor: pointer; text-decoration: none; white-space: nowrap;
          transition: border-color .2s, color .2s;
        }
        .ac-btn-outline:hover { border-color: var(--gold); color: var(--gold); }

        .ac-btn-sm { padding: 6px 12px; font-size: 12px; }

        .ac-ico-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: calc(var(--r) - 2px);
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--muted); cursor: pointer; flex-shrink: 0; transition: all .14s;
        }
        .ac-ico-btn:hover:not(:disabled) { border-color: var(--dark); color: var(--dark); background: var(--bg); }
        .ac-ico-danger:hover:not(:disabled) { border-color: #f5c2c7; color: #9f1239; background: #fff2f3; }
        .ac-ico-btn:disabled { opacity: .45; cursor: not-allowed; }

        /* ── Form elements ── */
        .ac-form { display: flex; flex-direction: column; }
        .ac-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .ac-field { display: flex; flex-direction: column; gap: 6px; }
        .ac-field-full { grid-column: 1 / -1; }
        .ac-label {
          font-size: 11px; font-weight: 700; color: var(--muted);
          text-transform: uppercase; letter-spacing: .06em;
        }
        .ac-req { font-style: normal; color: #b91c1c; margin-left: 2px; }
        .ac-input {
          width: 100%; padding: 10px 14px;
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          background: var(--bg); color: var(--dark); font-family: inherit;
          font-size: 13.5px; outline: none; box-sizing: border-box;
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .ac-input:focus {
          border-color: var(--gold); background: var(--bg-card);
          box-shadow: 0 0 0 3px rgba(212,175,55,.1);
        }
        .ac-input[readonly] { opacity: .55; cursor: default; background: var(--bg-alt); }
        .ac-form-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; }

        /* Password */
        .ac-input-wrap { position: relative; }
        .ac-input-pw   { padding-right: 44px; }
        .ac-pw-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 0;
          color: var(--muted); display: flex; align-items: center; transition: color .14s;
        }
        .ac-pw-eye:hover { color: var(--dark); }
        .ac-pw-rules {
          list-style: none; display: flex; flex-direction: column;
          gap: 6px; margin: 10px 0 16px; padding: 0;
        }
        .ac-pw-rule {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: var(--muted); transition: color .2s;
        }
        .ac-pw-rule.met { color: #15803d; }
        .ac-pw-rule-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--border); flex-shrink: 0; transition: background .2s;
        }
        .ac-pw-rule.met .ac-pw-rule-dot { background: #16a34a; }
        .ac-pw-placeholder {
          font-size: 18px; color: var(--muted); letter-spacing: .12em;
          margin: 4px 0 0; opacity: .5;
        }

        /* ── Detail table ── */
        .ac-detail-table { border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
        .ac-detail-row {
          display: flex; align-items: baseline; gap: 16px;
          padding: 13px 16px; border-bottom: 1px solid var(--border); transition: background .12s;
        }
        .ac-detail-row:last-child { border-bottom: none; }
        .ac-detail-row:hover { background: var(--bg); }
        .ac-detail-lbl {
          width: 100px; flex-shrink: 0; font-size: 10px; font-weight: 700;
          color: var(--muted); text-transform: uppercase; letter-spacing: .08em;
        }
        .ac-detail-val { font-size: 13.5px; font-weight: 500; color: var(--dark); }

        /* ── Checkbox ── */
        .ac-check-row { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; margin-bottom: 8px; }
        .ac-check-box {
          width: 18px; height: 18px; border-radius: 4px;
          border: 2px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: border-color .14s, background .14s; cursor: pointer;
        }
        .ac-check-box.on { border-color: var(--gold); background: var(--gold); color: var(--dark); }
        .ac-check-label { font-size: 13.5px; color: var(--text); }

        /* ── Orders ── */
        .ac-orders-list { display: flex; flex-direction: column; }
        .ac-order-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border);
        }
        .ac-order-row:first-child { padding-top: 0; }
        .ac-order-row:last-of-type { border-bottom: none; }
        .ac-order-id { font-size: 13.5px; font-weight: 500; color: var(--dark); margin: 0 0 3px; }
        .ac-order-date { font-size: 12px; color: var(--muted); margin: 0; }
        .ac-order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .ac-order-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px; font-weight: 700; color: var(--dark); margin: 0;
        }
        .ac-view-all-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 600; color: var(--dark);
          text-decoration: none; padding: 14px 0 0; transition: color .14s;
        }
        .ac-view-all-link:hover { color: var(--gold); }

        /* ── Addresses ── */
        .ac-addr-list { display: flex; flex-direction: column; gap: 12px; }
        .ac-addr-card {
          border: 1px solid var(--border); border-radius: var(--r);
          padding: 16px 20px; background: var(--bg-card);
          transition: border-color .18s, box-shadow .18s;
        }
        .ac-addr-card:hover { border-color: var(--border-hover); box-shadow: var(--sh-sm); }
        .ac-addr-card.is-default { border-color: var(--gold); background: var(--gold-muted); }
        .ac-addr-card.is-editing { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,175,55,.1); }
        .ac-addr-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .ac-addr-card-title { display: flex; align-items: center; gap: 8px; }
        .ac-addr-city { font-weight: 600; font-size: 13.5px; color: var(--dark); }
        .ac-addr-card-actions { display: flex; align-items: center; gap: 6px; }
        .ac-default-tag {
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
          padding: 2px 8px; border-radius: 999px; background: var(--gold); color: var(--dark);
        }
        .ac-addr-body { display: flex; flex-direction: column; gap: 3px; }
        .ac-addr-body p { font-size: 13.5px; color: var(--muted); margin: 0; }
        .ac-addr-country { font-size: 12px !important; text-transform: uppercase; letter-spacing: .04em; }
        .ac-addr-form { margin-top: 12px; }
        .ac-addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

        /* ── Modal ── */
        .ac-modal-backdrop {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(10,17,40,.52); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .ac-modal {
          width: min(560px, 100%); max-height: calc(100vh - 2rem); overflow-y: auto;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); box-shadow: 0 28px 60px rgba(10,17,40,.22);
          padding: 28px 32px; animation: ac-modal-in .2s var(--ease) both;
        }
        @keyframes ac-modal-in { from { opacity:0; transform: scale(.96) translateY(8px); } }
        .ac-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--border);
        }
        .ac-modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .ac-modal-close {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: calc(var(--r) - 2px);
          border: 1px solid var(--border); background: none; color: var(--muted);
          cursor: pointer; transition: border-color .14s, color .14s;
        }
        .ac-modal-close:hover { border-color: var(--dark); color: var(--dark); }

        /* ── Wishlist grid ── */
        .ac-wish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 14px; }
        .ac-wish-card {
          border: 1px solid var(--border); border-radius: var(--r);
          overflow: hidden; background: var(--bg-card); text-decoration: none;
          display: flex; flex-direction: column;
          transition: border-color .2s, box-shadow .2s, transform .2s;
        }
        .ac-wish-card:hover { border-color: var(--gold-lt); box-shadow: var(--sh-md); transform: translateY(-3px); }
        .ac-wish-img-wrap { aspect-ratio: 4/5; background: var(--bg-alt); overflow: hidden; position: relative; }
        .ac-wish-img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
        .ac-wish-card:hover .ac-wish-img { transform: scale(1.04); }
        .ac-wish-no-img { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--border); }
        .ac-wish-oos {
          position: absolute; top: 8px; left: 8px;
          background: rgba(10,17,40,.72); color: #fff;
          font-size: 10px; font-weight: 600; padding: 3px 8px;
          border-radius: 4px; letter-spacing: .03em;
        }
        .ac-wish-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
        .ac-wish-size { font-size: 10px; color: var(--muted); margin: 0; text-transform: uppercase; letter-spacing: .05em; }
        .ac-wish-name { font-size: 13px; font-weight: 600; color: var(--dark); margin: 0; line-height: 1.3; }
        .ac-wish-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px; font-weight: 700; color: var(--gold); margin: 0;
        }

        /* ── Empty states ── */
        .ac-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 8px; padding: 56px 24px; text-align: center;
        }
        .ac-empty-ico {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--bg-alt); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); margin-bottom: 6px;
        }
        .ac-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .ac-empty-sub { font-size: 13.5px; color: var(--muted); margin: 0 0 10px; max-width: 260px; }

        /* ── Loader ── */
        .ac-loader {
          display: flex; align-items: center; gap: 10px;
          padding: 40px 0; color: var(--muted); font-size: 13.5px;
        }

        /* ── Responsive ── */
        @media (max-width: 1100px) { .ac-page { padding: 32px 28px 56px; } }
        @media (max-width: 860px) {
          .ac-page { padding: 24px 20px 48px; }
          .ac-layout { grid-template-columns: 1fr; }
          .ac-sidebar { position: static; }
          .ac-profile-card { flex-direction: row; text-align: left; padding: 16px 20px; }
          .ac-avatar-wrap { flex-shrink: 0; }
          .ac-avatar { width: 52px; height: 52px; font-size: 1.1rem; }
          .ac-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
          .ac-nav-btn { border-bottom: none; border-right: 1px solid var(--border); padding: 10px 12px; }
          .ac-nav-arr { display: none; }
          .ac-nav-divider { display: none; }
          .ac-page-head { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 600px) {
          .ac-card { padding: 20px; }
          .ac-form-grid { grid-template-columns: 1fr; }
          .ac-addr-grid  { grid-template-columns: 1fr; }
          .ac-wish-grid  { grid-template-columns: repeat(2, 1fr); }
          .ac-nav { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 380px) {
          .ac-wish-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}