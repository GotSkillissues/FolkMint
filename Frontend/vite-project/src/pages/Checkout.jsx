import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context';
import { useAddresses, usePaymentMethods } from '../hooks';
import { cartService, orderService } from '../services';
import './PageUI.css';

const BKASH_GATEWAY_URL = import.meta.env.VITE_BKASH_GATEWAY_URL || 'https://www.bkash.com/';
const SSLCOMMERZ_GATEWAY_URL = import.meta.env.VITE_SSLCOMMERZ_GATEWAY_URL || 'https://sandbox.sslcommerz.com/';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const {
    addresses,
    selectedAddress,
    selectAddress,
    addAddress,
    loading: addressesLoading,
  } = useAddresses();
  const {
    paymentMethods,
    selectedMethod,
    selectMethod,
    loading: methodsLoading,
  } = usePaymentMethods();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [shipToAnotherLocation, setShipToAnotherLocation] = useState(false);
  const [checkoutPaymentOption, setCheckoutPaymentOption] = useState('cash_on_delivery');
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', postal_code: '', country: 'Bangladesh' });

  const validAddresses = addresses.filter((address) => address?.address_id);

  useEffect(() => {
    if (addressesLoading) {
      return;
    }

    if (!validAddresses.length) {
      setShipToAnotherLocation(true);
      return;
    }

    if (!selectedAddress?.address_id && shipToAnotherLocation) {
      setShipToAnotherLocation(false);
    }

    if (!selectedAddress?.address_id) {
      selectAddress(validAddresses[0].address_id);
    }
  }, [addressesLoading, validAddresses, selectedAddress, shipToAnotherLocation, selectAddress]);

  const requiresAddressForm = !validAddresses.length || shipToAnotherLocation;

  const mapCartForSync = () => {
    return cartItems
      .map((item) => ({
        product_id: item.product_id || item.id || item._id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
      }))
      .filter((item) => item.product_id && item.quantity > 0);
  };

  const redirectToGateway = (gatewayBaseUrl, order) => {
    const orderId = order?.order_id;
    const amount = Number(order?.total_amount || cartTotal || 0).toFixed(2);
    const returnUrl = `${window.location.origin}/orders`;

    const gatewayUrl = new URL(gatewayBaseUrl);
    gatewayUrl.searchParams.set('order_id', String(orderId || ''));
    gatewayUrl.searchParams.set('amount', String(amount));
    gatewayUrl.searchParams.set('return_url', returnUrl);

    window.location.assign(gatewayUrl.toString());
  };

  const handleCreateOrder = async () => {
    setError('');
    setMessage('');

    if (!cartItems.length) {
      setError('Your cart is empty.');
      return;
    }

    if (requiresAddressForm) {
      setError('Please add the shipping address first.');
      return;
    }

    if (!selectedAddress?.address_id) {
      setError('Please select a shipping address.');
      return;
    }

    setSubmitting(true);

    try {
      const syncItems = mapCartForSync();
      await cartService.syncCart(syncItems);

      const response = await orderService.createOrder({
        shipping_address_id: selectedAddress.address_id,
        payment_method_id: selectedMethod?.payment_method_id,
        checkout_payment_option: checkoutPaymentOption,
      });

      clearCart();
      const createdOrder = response?.order;

      if (checkoutPaymentOption === 'cash_on_delivery') {
        setMessage('Your order has been placed.');
        setTimeout(() => navigate('/orders', { state: { createdOrder } }), 900);
        return;
      }

      if (checkoutPaymentOption === 'bkash') {
        setMessage('Redirecting to bKash payment gateway...');
        setTimeout(() => redirectToGateway(BKASH_GATEWAY_URL, createdOrder), 250);
        return;
      }

      setMessage('Redirecting to SSLCommerz payment gateway...');
      setTimeout(() => redirectToGateway(SSLCOMMERZ_GATEWAY_URL, createdOrder), 250);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAddress = async (event) => {
    event.preventDefault();
    const result = await addAddress(newAddress);
    if (result.success && result.address?.address_id) {
      selectAddress(result.address.address_id);
      setShipToAnotherLocation(false);
      setNewAddress({ street: '', city: '', postal_code: '', country: 'Bangladesh' });
      setMessage('Address added.');
      setError('');
    } else {
      setError(result.error || 'Failed to add address.');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Checkout</h1>
          <p className="page-subtitle">Finalize your order details before placing it.</p>
        </div>
      </div>
      {message && <p className="msg-success">{message}</p>}
      {error && <p className="msg-error">{error}</p>}

      <div className="ui-grid two">
        <div className="stack">
          <section className="ui-card section">
            <h2 className="section-title">Billing & Shipping Address Details</h2>
            {addressesLoading ? (
              <p>Loading addresses...</p>
            ) : validAddresses.length && !shipToAnotherLocation ? (
              <>
                <div className="list-row">
                  <strong>Shipping To</strong>
                  <p style={{ margin: 0 }}>
                    {selectedAddress?.street || validAddresses[0]?.street}, {selectedAddress?.city || validAddresses[0]?.city}, {selectedAddress?.country || validAddresses[0]?.country}
                  </p>
                </div>

                <label className="radio-item" style={{ marginTop: '.75rem' }}>
                  <input
                    type="checkbox"
                    checked={shipToAnotherLocation}
                    onChange={(event) => {
                      setShipToAnotherLocation(event.target.checked);
                      setError('');
                      setMessage('');
                    }}
                  />
                  <span>Ship to another location?</span>
                </label>
              </>
            ) : (
              <>
                {validAddresses.length > 0 && (
                  <label className="radio-item" style={{ marginBottom: '.75rem' }}>
                    <input
                      type="checkbox"
                      checked={shipToAnotherLocation}
                      onChange={(event) => {
                        setShipToAnotherLocation(event.target.checked);
                        setError('');
                        setMessage('');
                      }}
                    />
                    <span>Ship to another location?</span>
                  </label>
                )}

                {!validAddresses.length && <p>No address found. Please add your shipping address.</p>}
              </>
            )}

            {requiresAddressForm && (
              <form className="stack" onSubmit={handleAddAddress} style={{ marginTop: '1rem' }}>
                <input className="ui-input" placeholder="Street" value={newAddress.street} onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))} required />
                <input className="ui-input" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))} required />
                <input className="ui-input" placeholder="Postal Code" value={newAddress.postal_code} onChange={(e) => setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))} />
                <input className="ui-input" placeholder="Country" value={newAddress.country} onChange={(e) => setNewAddress((prev) => ({ ...prev, country: e.target.value }))} required />
                <div className="row-actions">
                  <button className="ui-btn-ghost" type="submit">Add Address</button>
                </div>
              </form>
            )}
          </section>

          <section className="ui-card section">
            <h2 className="section-title">Payment Information</h2>

            <div className="radio-list">
              <label className={`radio-item${checkoutPaymentOption === 'cash_on_delivery' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="checkoutPaymentOption"
                  checked={checkoutPaymentOption === 'cash_on_delivery'}
                  onChange={() => setCheckoutPaymentOption('cash_on_delivery')}
                />
                <span>Cash on delivery</span>
              </label>

              <label className={`radio-item${checkoutPaymentOption === 'bkash' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="checkoutPaymentOption"
                  checked={checkoutPaymentOption === 'bkash'}
                  onChange={() => setCheckoutPaymentOption('bkash')}
                />
                <span>
                  bKash Payment
                  <small style={{ display: 'block', color: 'var(--muted)' }}>Pay via bKash</small>
                </span>
              </label>

              <label className={`radio-item${checkoutPaymentOption === 'pay_online' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="checkoutPaymentOption"
                  checked={checkoutPaymentOption === 'pay_online'}
                  onChange={() => setCheckoutPaymentOption('pay_online')}
                />
                <span>Pay Online(Credit/Debit Card/MobileBanking/NetBanking/bKash)</span>
              </label>
            </div>

            <p className="msg-note" style={{ marginTop: '1rem' }}>
              Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
            </p>

            <label className="radio-item" style={{ marginTop: '.75rem' }}>
              <input
                type="checkbox"
                checked={subscribeNewsletter}
                onChange={(event) => setSubscribeNewsletter(event.target.checked)}
              />
              <span>Subscribe to our Newsletter</span>
            </label>

            {methodsLoading ? (
              <p className="msg-note" style={{ marginTop: '.75rem' }}>Loading saved payment methods...</p>
            ) : paymentMethods.length ? (
              <div className="radio-list" style={{ marginTop: '.75rem' }}>
                {paymentMethods.map((method) => (
                  <label key={method.payment_method_id} className={`radio-item${selectedMethod?.payment_method_id === method.payment_method_id ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="savedPaymentMethod"
                      checked={selectedMethod?.payment_method_id === method.payment_method_id}
                      onChange={() => selectMethod(method.payment_method_id)}
                    />
                    <span>{method.provider} ({method.type})</span>
                  </label>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <section className="ui-card section">
          <h2 className="section-title">Product Description</h2>
          {!cartItems.length ? (
            <p className="msg-note">Your cart is empty.</p>
          ) : (
            <div className="stack">
              {cartItems.map((item, index) => {
                const itemId = item?.cartItemId || item?.variant_id || item?.product_id || item?._id || item?.id || index;
                const unitPrice = Number(item?.price || 0);
                const subtotal = unitPrice * Number(item?.quantity || 0);

                return (
                  <div key={itemId} className="list-row">
                    <strong>{item?.name || 'Product'}</strong>
                    {item?.description && <p style={{ margin: 0, color: 'var(--muted)' }}>{item.description}</p>}
                    <p style={{ margin: 0 }}>Quantity: {item?.quantity || 0}</p>
                    <p style={{ margin: 0 }}>Unit Price: ${unitPrice.toFixed(2)}</p>
                    <p style={{ margin: 0, fontWeight: 700 }}>Subtotal: ${subtotal.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="ui-card section" style={{ marginTop: '1rem' }}>
        <h2 className="section-title">Order Summary</h2>
        <p>Items: {cartItems.length}</p>
        <p>Total: ${cartTotal.toFixed(2)}</p>
        <button className="ui-btn" type="button" disabled={submitting} onClick={handleCreateOrder}>
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </section>
    </div>
  );
};

export default Checkout;
