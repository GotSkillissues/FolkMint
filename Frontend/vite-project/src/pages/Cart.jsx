import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context';

const getCartItemId = (item) => item?.cartItemId || item?.variant_id || item?.product_id || item?._id || item?.id;

const IconTrash     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
const IconBag       = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IconChevron   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconImgFallback = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const itemCount = cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div className="cr-page">

      <div className="cr-head">
        <div>
          <p className="cr-eyebrow">Shopping</p>
          <h1 className="cr-title">Your Cart</h1>
        </div>
        {cartItems.length > 0 && (
          <button className="cr-btn-ghost" onClick={clearCart}>Clear cart</button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="cr-empty">
          <div className="cr-empty-ico"><IconBag /></div>
          <p className="cr-empty-title">Your cart is empty</p>
          <p className="cr-empty-sub">Browse our collection of handcrafted artisan products.</p>
          <Link to="/products" className="cr-btn-primary">Explore Collection</Link>
        </div>
      ) : (
        <div className="cr-layout">

          {/* Items */}
          <div className="cr-items-card">
            <div className="cr-items-head">
              <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </div>

            {cartItems.map(item => {
              const id       = getCartItemId(item);
              const price    = Number(item.price) || 0;
              const subtotal = price * item.quantity;

              return (
                <div key={id} className="cr-item">
                  <div className="cr-item-img-wrap">
                    {item.image && item.image !== '/placeholder-product.jpg'
                      ? <img src={item.image} alt={item.name} className="cr-item-img" />
                      : <div className="cr-item-img-ph"><IconImgFallback /></div>
                    }
                  </div>

                  <div className="cr-item-info">
                    <p className="cr-item-name">{item.name}</p>
                    {item.size && <p className="cr-item-meta">Size: {item.size}</p>}
                    {item.sku  && <p className="cr-item-meta">SKU: {item.sku}</p>}
                    <p className="cr-item-unit">৳{price.toLocaleString('en-BD')} each</p>
                  </div>

                  <div className="cr-qty">
                    <button className="cr-qty-btn" onClick={() => updateQuantity(id, item.quantity - 1)} aria-label="Decrease">−</button>
                    <span className="cr-qty-num">{item.quantity}</span>
                    <button className="cr-qty-btn" onClick={() => updateQuantity(id, item.quantity + 1)} aria-label="Increase">+</button>
                  </div>

                  <p className="cr-item-subtotal">৳{subtotal.toLocaleString('en-BD')}</p>

                  <button className="cr-remove-btn" onClick={() => removeFromCart(id)} aria-label="Remove" title="Remove">
                    <IconTrash />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="cr-summary">
            <h2 className="cr-summary-title">Order Summary</h2>

            <div className="cr-summary-rows">
              <div className="cr-summary-row">
                <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                <span>৳{cartTotal.toLocaleString('en-BD')}</span>
              </div>
              <div className="cr-summary-row">
                <span>Shipping</span>
                <span className="cr-muted-sm">At checkout</span>
              </div>
            </div>

            <div className="cr-summary-total">
              <span>Total</span>
              <span className="cr-total-val">৳{cartTotal.toLocaleString('en-BD')}</span>
            </div>

            <button className="cr-btn-checkout" onClick={() => navigate('/checkout')}>
              Proceed to Checkout <IconChevron />
            </button>

            <Link to="/products" className="cr-continue-link">← Continue Shopping</Link>
          </div>
        </div>
      )}

      <style>{`
        .cr-page {
          width: 100%; padding: 40px 48px 64px;
          display: flex; flex-direction: column; gap: 12px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .cr-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 16px;
        }
        .cr-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .cr-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }

        /* Empty */
        .cr-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 80px 24px; text-align: center;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r);
        }
        .cr-empty-ico {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--bg-alt); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); margin-bottom: 8px;
        }
        .cr-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .cr-empty-sub { font-size: 13.5px; color: var(--muted); margin: 0 0 8px; max-width: 280px; }

        /* Layout */
        .cr-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }

        /* Items card */
        .cr-items-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
        }
        .cr-items-head {
          padding: 13px 24px; border-bottom: 1px solid var(--border); background: var(--bg-alt);
          font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
        }

        /* Item row */
        .cr-item {
          display: grid; grid-template-columns: 80px 1fr auto auto auto;
          gap: 18px; align-items: center;
          padding: 18px 24px; border-bottom: 1px solid var(--border); transition: background .15s;
        }
        .cr-item:last-child { border-bottom: none; }
        .cr-item:hover { background: var(--bg); }

        .cr-item-img-wrap {
          width: 80px; height: 80px; border-radius: calc(var(--r) - 2px);
          overflow: hidden; background: var(--bg-alt); border: 1px solid var(--border); flex-shrink: 0;
        }
        .cr-item-img { width: 100%; height: 100%; object-fit: cover; }
        .cr-item-img-ph {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; color: var(--border);
        }
        .cr-item-info { min-width: 0; }
        .cr-item-name {
          font-size: 13.5px; font-weight: 600; color: var(--dark); margin: 0 0 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cr-item-meta { font-size: 11.5px; color: var(--muted); margin: 0 0 2px; }
        .cr-item-unit {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px; font-weight: 700; color: var(--gold); margin: 5px 0 0;
        }

        /* Qty */
        .cr-qty {
          display: flex; align-items: center; gap: 0;
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          overflow: hidden; flex-shrink: 0;
        }
        .cr-qty-btn {
          width: 30px; height: 30px; background: var(--bg-card); border: none;
          cursor: pointer; font-size: 15px; color: var(--dark); transition: background .15s;
          display: flex; align-items: center; justify-content: center;
        }
        .cr-qty-btn:hover { background: var(--bg-alt); color: var(--gold); }
        .cr-qty-num {
          min-width: 32px; text-align: center; font-size: 13px; font-weight: 700; color: var(--dark);
          border-left: 1px solid var(--border); border-right: 1px solid var(--border); line-height: 30px;
        }

        /* Subtotal */
        .cr-item-subtotal {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px; font-weight: 700; color: var(--dark);
          white-space: nowrap; flex-shrink: 0; min-width: 76px; text-align: right; margin: 0;
        }

        /* Remove */
        .cr-remove-btn {
          width: 30px; height: 30px; border-radius: calc(var(--r) - 2px);
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--muted); cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; transition: all .15s;
        }
        .cr-remove-btn:hover { border-color: #f5c2c7; color: #9f1239; background: #fff2f3; }

        /* Summary */
        .cr-summary {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 28px 24px;
          position: sticky; top: 20px; display: flex; flex-direction: column;
        }
        .cr-summary-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark);
          margin: 0 0 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border);
        }
        .cr-summary-rows { display: flex; flex-direction: column; }
        .cr-summary-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 0; border-bottom: 1px solid var(--border);
          font-size: 13.5px; color: var(--text);
        }
        .cr-muted-sm { color: var(--muted); font-size: 12px; }
        .cr-summary-total {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 0 20px; font-size: 14px; font-weight: 600; color: var(--dark);
        }
        .cr-total-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 700; color: var(--dark);
        }

        /* Buttons */
        .cr-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; text-decoration: none; white-space: nowrap; transition: background .2s;
        }
        .cr-btn-primary:hover { background: var(--black); }
        .cr-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: border-color .2s, color .2s;
        }
        .cr-btn-ghost:hover { border-color: #f5c2c7; color: #9f1239; }
        .cr-btn-checkout {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 14px 24px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; transition: background .2s;
        }
        .cr-btn-checkout:hover { background: var(--black); }
        .cr-continue-link {
          display: block; text-align: center; margin-top: 14px;
          font-size: 12.5px; font-weight: 600; color: var(--muted);
          text-decoration: none; transition: color .15s;
        }
        .cr-continue-link:hover { color: var(--dark); }

        /* Responsive */
        @media (max-width: 1100px) { .cr-page { padding: 32px 28px 56px; } }
        @media (max-width: 900px) {
          .cr-page { padding: 24px 20px 48px; }
          .cr-layout { grid-template-columns: 1fr; }
          .cr-summary { position: static; }
          .cr-head { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 600px) {
          .cr-item { grid-template-columns: 72px 1fr auto; gap: 12px; }
          .cr-item-subtotal { grid-column: 2; margin: 0; font-size: 15px; }
          .cr-remove-btn { grid-column: 3; grid-row: 1; }
          .cr-qty { grid-column: 2; }
        }
      `}</style>
    </div>
  );
};

export default Cart;