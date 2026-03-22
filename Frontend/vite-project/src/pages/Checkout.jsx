import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart, useAuth } from '../context';
import { useAddresses, usePaymentMethods } from '../hooks';
import { orderService } from '../services';

const PAYMENT_TYPES = [
  { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
  { value: 'bkash', label: 'bKash', desc: 'Pay via bKash mobile banking' },
  { value: 'visa', label: 'Visa', desc: 'Pay with Visa card' },
  { value: 'mastercard', label: 'Mastercard', desc: 'Pay with Mastercard' },
  { value: 'amex', label: 'Amex', desc: 'Pay with American Express' },
];

const ADDR_BLANK = { street: '', city: '', postal_code: '', country: 'Bangladesh' };

const Spin = ({ s = 14 }) => (
  <span style={{ display: 'inline-block', width: s, height: s, borderRadius: '50%', border: '2px solid rgba(212,175,55,.2)', borderTopColor: 'var(--gold)', animation: 'ck-spin .65s linear infinite', flexShrink: 0 }} />
);

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { addresses, loading: addrLoading, addAddress } = useAddresses();
  const { paymentMethods, loading: pmLoading, addPaymentMethod } = usePaymentMethods();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState('cod');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(null);

  const [showNewAddr, setShowNewAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ ...ADDR_BLANK });
  const [addingAddr, setAddingAddr] = useState(false);

  const [showNewPm, setShowNewPm] = useState(false);
  const [newPmType, setNewPmType] = useState('bkash');
  const [addingPm, setAddingPm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validAddresses = addresses.filter(a => a?.address_id && !a.is_deleted);

  // Auto-select default address
  useEffect(() => {
    if (addrLoading || selectedAddressId) return;
    const def = validAddresses.find(a => a.is_default) || validAddresses[0];
    if (def) setSelectedAddressId(def.address_id);
    else setShowNewAddr(true);
  }, [addrLoading, validAddresses]);

  // Auto-select default payment method if user has saved ones
  useEffect(() => {
    if (pmLoading) return;
    const def = paymentMethods.find(p => p.is_default) || paymentMethods[0];
    if (def) setSelectedPaymentMethodId(def.payment_method_id);
  }, [pmLoading, paymentMethods]);

  // ADD this new useEffect right after the existing pm auto-select useEffect
useEffect(() => {
    if (selectedPaymentMethodId) return;
    const first = paymentMethods[0];
    if (first) setSelectedPaymentMethodId(first.payment_method_id);
  }, [paymentMethods]);
  
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddr.street.trim()) { setError('Street address is required.'); return; }
    if (!newAddr.city.trim()) { setError('City is required.'); return; }
    setAddingAddr(true); setError('');
    try {
      const result = await addAddress({ ...newAddr, is_default: validAddresses.length === 0 });
      if (!result.success) throw new Error(result.error);
      setSelectedAddressId(result.address?.address_id);
      setNewAddr({ ...ADDR_BLANK });
      setShowNewAddr(false);
    } catch (err) {
      setError(err?.message || 'Failed to add address.');
    } finally {
      setAddingAddr(false);
    }
  };


  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    setAddingPm(true); setError('');
    try {
      const result = await addPaymentMethod({ type: newPmType, is_default: paymentMethods.length === 0 });
      if (!result.success) throw new Error(result.error);
      const newId = result.method?.payment_method_id;
      if (newId) {
        setSelectedPaymentMethodId(newId);
        setSelectedPaymentType(newPmType);
      }
      setShowNewPm(false);
    } catch (err) {
      setError(err?.message || 'Failed to add payment method.');
    } finally {
      setAddingPm(false);
    }
  };

  const handlePlaceOrder = async () => {
    setError(''); setSuccess('');
    if (!cartItems.length) { setError('Your cart is empty.'); return; }
    if (!selectedAddressId) { setError('Please select a shipping address.'); return; }
    if (!selectedPaymentMethodId) { setError('Please select or add a payment method before placing your order.'); return; }

    setSubmitting(true);
    try {
      const res = await orderService.createOrder({
        address_id: selectedAddressId,
        payment_method_id: selectedPaymentMethodId || null,
      });

      await clearCart();
      setSuccess('Order placed successfully!');
      setTimeout(() => navigate('/orders', { state: { newOrderId: res?.order?.order_id } }), 1200);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAddr = validAddresses.find(a => a.address_id === selectedAddressId);
  const itemCount = cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div className="ck-page">

      {/* Head */}
      <div className="ck-head">
        <div>
          <p className="ck-eyebrow">Secure Checkout</p>
          <h1 className="ck-title">Checkout</h1>
        </div>
        <Link to="/cart" className="ck-btn-ghost">← Back to Cart</Link>
      </div>

      {error && <div className="ck-alert ck-alert-error">{error}</div>}
      {success && <div className="ck-alert ck-alert-success">{success}</div>}

      {!cartItems.length ? (
        <div className="ck-empty">
          <p className="ck-empty-title">Your cart is empty</p>
          <Link to="/products" className="ck-btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="ck-layout">

          {/* ── Left column ── */}
          <div className="ck-left">

            {/* Shipping address */}
            <div className="ck-card">
              <div className="ck-card-head">
                <h2 className="ck-card-title">Shipping Address</h2>
                {validAddresses.length > 0 && (
                  <button className="ck-btn-link" onClick={() => setShowNewAddr(v => !v)}>
                    {showNewAddr ? 'Cancel' : '+ New address'}
                  </button>
                )}
              </div>

              {addrLoading ? (
                <div className="ck-loading"><Spin /> Loading addresses…</div>
              ) : showNewAddr ? (
                <form className="ck-form" onSubmit={handleAddAddress} noValidate>
                  <div className="ck-form-grid">
                    <label className="ck-field ck-field-full">
                      <span className="ck-label">Street address <em className="ck-req">*</em></span>
                      <input className="ck-input" value={newAddr.street} onChange={e => setNewAddr(p => ({ ...p, street: e.target.value }))} placeholder="House no, road, area" required />
                    </label>
                    <label className="ck-field">
                      <span className="ck-label">City <em className="ck-req">*</em></span>
                      <input className="ck-input" value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Dhaka" required />
                    </label>
                    <label className="ck-field">
                      <span className="ck-label">Postal code</span>
                      <input className="ck-input" value={newAddr.postal_code} onChange={e => setNewAddr(p => ({ ...p, postal_code: e.target.value }))} placeholder="e.g. 1207" />
                    </label>
                    <label className="ck-field ck-field-full">
                      <span className="ck-label">Country</span>
                      <input className="ck-input" value={newAddr.country} readOnly tabIndex={-1} />
                    </label>
                  </div>
                  <div className="ck-form-actions">
                    <button className="ck-btn-primary" type="submit" disabled={addingAddr}>
                      {addingAddr ? <><Spin /> Saving…</> : 'Save Address'}
                    </button>
                    {validAddresses.length > 0 && (
                      <button className="ck-btn-ghost" type="button" onClick={() => setShowNewAddr(false)}>Cancel</button>
                    )}
                  </div>
                </form>
              ) : validAddresses.length === 0 ? (
                <p className="ck-muted">No saved addresses. Add one above.</p>
              ) : (
                <div className="ck-addr-list">
                  {validAddresses.map(addr => (
                    <label
                      key={addr.address_id}
                      className={`ck-addr-option${selectedAddressId === addr.address_id ? ' selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="address"
                        className="ck-radio"
                        checked={selectedAddressId === addr.address_id}
                        onChange={() => setSelectedAddressId(addr.address_id)}
                      />
                      <div className="ck-addr-option-body">
                        <p className="ck-addr-line">{addr.street}</p>
                        <p className="ck-addr-line ck-muted">
                          {[addr.city, addr.postal_code, addr.country].filter(Boolean).join(', ')}
                        </p>
                        {addr.is_default && <span className="ck-default-chip">Default</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="ck-card">
              <div className="ck-card-head">
                <h2 className="ck-card-title">Payment Method</h2>
              </div>

              {/* Saved payment methods */}
              {!pmLoading && paymentMethods.length > 0 && (
                <div className="ck-pm-list">
                  <p className="ck-label" style={{ marginBottom: 8 }}>Saved methods</p>
                  {paymentMethods.map(pm => (
                    <label key={pm.payment_method_id} className={`ck-pm-option${selectedPaymentMethodId === pm.payment_method_id ? ' selected' : ''}`}>
                      <input type="radio" name="savedpm" className="ck-radio"
                        checked={selectedPaymentMethodId === pm.payment_method_id}
                        onChange={() => { setSelectedPaymentMethodId(pm.payment_method_id); setSelectedPaymentType(pm.type); }}
                      />
                      <span className="ck-pm-label">
                        {PAYMENT_TYPES.find(t => t.value === pm.type)?.label || pm.type}
                        {pm.is_default && <span className="ck-default-chip" style={{ marginLeft: 8 }}>Default</span>}
                      </span>
                    </label>
                  ))}
                  <button className="ck-btn-link" style={{ marginTop: 8 }} onClick={() => setShowNewPm(v => !v)}>
                    {showNewPm ? 'Cancel' : '+ Add payment method'}
                  </button>
                </div>
              )}

              {/* New payment method form */}
              {(showNewPm || paymentMethods.length === 0) && (
                <form className="ck-form" onSubmit={handleAddPaymentMethod} style={{ marginTop: paymentMethods.length > 0 ? 12 : 0 }}>
                  {paymentMethods.length === 0 && <p className="ck-label" style={{ marginBottom: 8 }}>Select payment type</p>}
                  <div className="ck-pm-type-grid">
                    {PAYMENT_TYPES.map(pt => (
                      <label key={pt.value} className={`ck-pm-type-opt${newPmType === pt.value ? ' selected' : ''}`}>
                        <input type="radio" name="pmtype" className="ck-radio"
                          checked={newPmType === pt.value}
                          onChange={() => setNewPmType(pt.value)}
                        />
                        <div>
                          <p className="ck-pm-type-name">{pt.label}</p>
                          <p className="ck-pm-type-desc">{pt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button className="ck-btn-primary" type="submit" disabled={addingPm} style={{ marginTop: 12 }}>
                    {addingPm ? <><Spin /> Saving…</> : paymentMethods.length > 0 ? 'Save Method' : 'Use This Method'}
                  </button>
                </form>
              )}

              {/* If has saved methods and not adding new, show type selection for this order */}
              {!showNewPm && paymentMethods.length > 0 && (
                <p className="ck-muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Selected: <strong>{PAYMENT_TYPES.find(t => t.value === selectedPaymentType)?.label || selectedPaymentType}</strong>
                </p>
              )}
            </div>

          </div>

          {/* ── Right column — order summary ── */}
          <div className="ck-right">
            <div className="ck-summary-card">
              <h2 className="ck-card-title" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                Order Summary
              </h2>

              {/* Items */}
              <div className="ck-items-list">
                {cartItems.map((item, i) => {
                  const id = item?.cartItemId || item?.variant_id || item?.product_id || i;
                  const price = Number(item?.price || 0);
                  const subtotal = price * Number(item?.quantity || 0);
                  return (
                    <div key={id} className="ck-item-row">
                      <div className="ck-item-img-wrap">
                        {item.image && item.image !== '/placeholder-product.jpg'
                          ? <img src={item.image} alt={item.name} className="ck-item-img" />
                          : <div className="ck-item-img-ph" />
                        }
                        <span className="ck-item-qty-badge">{item.quantity}</span>
                      </div>
                      <div className="ck-item-info">
                        <p className="ck-item-name">{item.name}</p>
                        {item.size && <p className="ck-item-meta">Size: {item.size}</p>}
                      </div>
                      <p className="ck-item-subtotal">৳{subtotal.toLocaleString('en-BD')}</p>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="ck-totals">
                <div className="ck-total-row">
                  <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                  <span>৳{cartTotal.toLocaleString('en-BD')}</span>
                </div>
                <div className="ck-total-row">
                  <span>Shipping</span>
                  <span className="ck-muted">Free</span>
                </div>
              </div>

              <div className="ck-grand-total">
                <span>Total</span>
                <span className="ck-grand-val">৳{cartTotal.toLocaleString('en-BD')}</span>
              </div>

              {/* Ship to summary */}
              {selectedAddr && (
                <div className="ck-ship-to">
                  <p className="ck-ship-to-label">Shipping to</p>
                  <p className="ck-ship-to-addr">{selectedAddr.street}, {selectedAddr.city}</p>
                </div>
              )}

              <button
                className="ck-btn-place-order"
                onClick={handlePlaceOrder}
                disabled={submitting || !selectedAddressId}
              >
                {submitting ? <><Spin s={16} /> Placing Order…</> : 'Place Order'}
              </button>

              <p className="ck-secure-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Secure checkout. Your data is protected.
              </p>
            </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes ck-spin { to { transform: rotate(360deg); } }

        .ck-page {
          width: 100%; padding: 100px 48px 64px;
          display: flex; flex-direction: column; gap: 20px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .ck-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 4px;
        }
        .ck-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .ck-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }

        /* Alerts */
        .ck-alert {
          padding: 12px 16px; border-radius: var(--r); border: 1px solid;
          font-size: 13.5px; font-weight: 500;
        }
        .ck-alert-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }
        .ck-alert-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }

        /* Empty */
        .ck-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 64px 24px; text-align: center;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r);
        }
        .ck-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark); margin: 0;
        }

        /* Layout */
        .ck-layout { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }
        .ck-left  { display: flex; flex-direction: column; gap: 16px; }

        /* Card */
        .ck-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 24px 28px;
        }
        .ck-card-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 20px;
        }
        .ck-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600; color: var(--dark); margin: 0;
        }

        /* Loading */
        .ck-loading { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--muted); }

        /* Form */
        .ck-form { display: flex; flex-direction: column; gap: 0; }
        .ck-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .ck-field { display: flex; flex-direction: column; gap: 5px; }
        .ck-field-full { grid-column: 1 / -1; }
        .ck-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
        .ck-req   { font-style: normal; color: #b91c1c; margin-left: 2px; }
        .ck-input {
          padding: 10px 14px; border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px); background: var(--bg);
          color: var(--dark); font-family: inherit; font-size: 13.5px;
          outline: none; box-sizing: border-box; width: 100%;
          transition: border-color .15s, box-shadow .15s;
        }
        .ck-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,175,55,.1); }
        .ck-input[readonly] { opacity: .55; cursor: default; background: var(--bg-alt); }
        .ck-form-actions { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
        .ck-muted { color: var(--muted); font-size: 13px; margin: 0; }

        /* Address options */
        .ck-addr-list { display: flex; flex-direction: column; gap: 8px; }
        .ck-addr-option {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px); cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .ck-addr-option.selected { border-color: var(--gold); background: var(--gold-muted); }
        .ck-addr-option-body { flex: 1; }
        .ck-addr-line { font-size: 13.5px; color: var(--dark); margin: 0 0 2px; }
        .ck-default-chip {
          display: inline-flex; align-items: center;
          padding: 1px 8px; border-radius: 999px;
          background: var(--gold); color: var(--dark);
          font-size: 10px; font-weight: 700;
        }
        .ck-radio { accent-color: var(--gold); margin: 0; flex-shrink: 0; margin-top: 2px; }

        /* Payment method saved */
        .ck-pm-list { display: flex; flex-direction: column; gap: 6px; }
        .ck-pm-option {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px); cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .ck-pm-option.selected { border-color: var(--gold); background: var(--gold-muted); }
        .ck-pm-label { font-size: 13.5px; font-weight: 600; color: var(--dark); }

        /* Payment type grid */
        .ck-pm-type-grid { display: flex; flex-direction: column; gap: 6px; }
        .ck-pm-type-opt {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px); cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .ck-pm-type-opt.selected { border-color: var(--gold); background: var(--gold-muted); }
        .ck-pm-type-name { font-size: 13.5px; font-weight: 600; color: var(--dark); margin: 0 0 2px; }
        .ck-pm-type-desc { font-size: 12px; color: var(--muted); margin: 0; }

        /* Buttons */
        .ck-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; text-decoration: none; white-space: nowrap; transition: background .2s;
        }
        .ck-btn-primary:hover:not(:disabled) { background: var(--black); }
        .ck-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
        .ck-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; text-decoration: none; transition: border-color .2s, color .2s;
        }
        .ck-btn-ghost:hover { border-color: var(--gold); color: var(--gold); }
        .ck-btn-link {
          background: none; border: none; padding: 0;
          font-size: 13px; font-weight: 600; color: var(--gold);
          cursor: pointer; transition: color .15s; text-align: left;
        }
        .ck-btn-link:hover { color: var(--dark); }

        /* Summary card */
        .ck-summary-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 24px 28px;
          position: sticky; top: 20px;
        }

        /* Items */
        .ck-items-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .ck-item-row { display: flex; align-items: center; gap: 12px; }
        .ck-item-img-wrap { position: relative; flex-shrink: 0; }
        .ck-item-img {
          width: 56px; height: 56px; border-radius: calc(var(--r) - 2px);
          object-fit: cover; border: 1px solid var(--border);
        }
        .ck-item-img-ph {
          width: 56px; height: 56px; border-radius: calc(var(--r) - 2px);
          background: var(--bg-alt); border: 1px solid var(--border);
        }
        .ck-item-qty-badge {
          position: absolute; top: -6px; right: -6px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--dark); color: var(--gold);
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .ck-item-info { flex: 1; min-width: 0; }
        .ck-item-name {
          font-size: 13px; font-weight: 600; color: var(--dark); margin: 0 0 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ck-item-meta { font-size: 11.5px; color: var(--muted); margin: 0; }
        .ck-item-subtotal {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px; font-weight: 700; color: var(--dark);
          white-space: nowrap; margin: 0; flex-shrink: 0;
        }

        /* Totals */
        .ck-totals { border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; gap: 0; }
        .ck-total-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 0; border-bottom: 1px solid var(--border);
          font-size: 13.5px; color: var(--text);
        }
        .ck-grand-total {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 0 18px; font-size: 14px; font-weight: 600; color: var(--dark);
        }
        .ck-grand-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; font-weight: 700; color: var(--dark);
        }

        /* Ship to */
        .ck-ship-to {
          padding: 12px 14px; background: var(--bg-alt);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          margin-bottom: 16px;
        }
        .ck-ship-to-label {
          font-size: 10px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--muted); margin: 0 0 4px;
        }
        .ck-ship-to-addr { font-size: 13px; color: var(--dark); margin: 0; }

        /* Place order button */
        .ck-btn-place-order {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 15px 24px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 14px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; transition: background .2s; margin-bottom: 12px;
        }
        .ck-btn-place-order:hover:not(:disabled) { background: var(--black); }
        .ck-btn-place-order:disabled { opacity: .5; cursor: not-allowed; }

        .ck-secure-note {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 12px; color: var(--muted); margin: 0; text-align: center;
        }

        /* Responsive */
        @media (max-width: 1100px) { .ck-page { padding: 88px 28px 56px; } }
        @media (max-width: 900px) {
          .ck-page { padding: 80px 20px 48px; }
          .ck-layout { grid-template-columns: 1fr; }
          .ck-summary-card { position: static; }
          .ck-head { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 520px) {
          .ck-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Checkout;