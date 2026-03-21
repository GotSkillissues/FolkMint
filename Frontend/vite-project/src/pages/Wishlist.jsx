import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistService } from '../services';
import { useAuth } from '../context';

const IconHeart     = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconTrash     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
const IconCart      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IconImgFallback = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;

const Spin = () => (
  <span style={{
    display: 'inline-block', width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(212,175,55,.2)', borderTopColor: 'var(--gold)',
    animation: 'wl-spin .65s linear infinite', flexShrink: 0,
  }} />
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div className={`wl-toast wl-toast-${type}`}>
      <span style={{ flex: 1, fontWeight: 500 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .6, padding: 0 }}>✕</button>
    </div>
  );
};

const Wishlist = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });
  const [busyId, setBusyId]     = useState(null);
  const [movingId, setMovingId] = useState(null);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wishlistService.getWishlist();
      setItems(Array.isArray(res?.wishlist) ? res.wishlist : []);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load wishlist.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const handleRemove = async (wishlistId) => {
    setBusyId(wishlistId);
    try {
      await wishlistService.removeFromWishlist(wishlistId);
      setItems(prev => prev.filter(i => i.wishlist_id !== wishlistId));
      showToast('Removed from wishlist.');
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to remove item.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveToCart = async (wishlistId, productName) => {
    setMovingId(wishlistId);
    try {
      await wishlistService.moveToCart(wishlistId);
      setItems(prev => prev.filter(i => i.wishlist_id !== wishlistId));
      showToast(`"${productName}" moved to cart.`);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to move to cart.', 'error');
    } finally {
      setMovingId(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear your entire wishlist?')) return;
    try {
      await wishlistService.clearWishlist();
      setItems([]);
      showToast('Wishlist cleared.');
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to clear wishlist.', 'error');
    }
  };

  return (
    <div className="wl-page">

      <div className="wl-head">
        <div>
          <p className="wl-eyebrow">Saved Items</p>
          <h1 className="wl-title">Wishlist</h1>
        </div>
        {items.length > 0 && (
          <button className="wl-btn-ghost" onClick={handleClear}>Clear wishlist</button>
        )}
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />

      {!isAuthenticated ? (
        <div className="wl-empty">
          <div className="wl-empty-ico"><IconHeart /></div>
          <p className="wl-empty-title">Sign in to view your wishlist</p>
          <p className="wl-empty-sub">Save out-of-stock items and get notified when they're back.</p>
          <button className="wl-btn-primary" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      ) : loading ? (
        <div className="wl-loading">
          <Spin /> Loading wishlist…
        </div>
      ) : items.length === 0 ? (
        <div className="wl-empty">
          <div className="wl-empty-ico"><IconHeart /></div>
          <p className="wl-empty-title">Your wishlist is empty</p>
          <p className="wl-empty-sub">
            Wishlist is for out-of-stock items. When a product you want is unavailable, save it here and we'll notify you when it's back in stock.
          </p>
          <Link to="/products" className="wl-btn-primary">Browse Products</Link>
        </div>
      ) : (
        <>
          <div className="wl-info-banner">
            <span>
              Items here are currently <strong>out of stock</strong>. You'll be notified when they're back. If an item is now available, click "Move to Cart".
            </span>
          </div>

          <div className="wl-grid">
            {items.map(item => {
              const isBusy   = busyId   === item.wishlist_id;
              const isMoving = movingId === item.wishlist_id;
              const isBack   = Number(item.stock_quantity) > 0;

              return (
                <div key={item.wishlist_id} className="wl-card">
                  {/* Image */}
                  <Link to={`/products/${item.product_id}`} className="wl-card-img-wrap">
                    {item.primary_image
                      ? <img src={item.primary_image} alt={item.product_name} className="wl-card-img" />
                      : <div className="wl-card-img-ph"><IconImgFallback /></div>
                    }
                    {isBack
                      ? <span className="wl-badge wl-badge-back">Back in stock</span>
                      : <span className="wl-badge wl-badge-oos">Out of stock</span>
                    }
                  </Link>

                  {/* Body */}
                  <div className="wl-card-body">
                    <Link to={`/products/${item.product_id}`} className="wl-card-name">
                      {item.product_name}
                    </Link>
                    {item.size && <p className="wl-card-meta">Size: {item.size}</p>}
                    {item.product_sku && <p className="wl-card-meta">SKU: {item.product_sku}</p>}
                    <p className="wl-card-price">
                      ৳{Number(item.price || 0).toLocaleString('en-BD')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="wl-card-actions">
                    {isBack && (
                      <button
                        className="wl-btn-move"
                        disabled={isMoving || isBusy}
                        onClick={() => handleMoveToCart(item.wishlist_id, item.product_name)}
                      >
                        {isMoving ? <Spin /> : <IconCart />}
                        {isMoving ? 'Moving…' : 'Move to Cart'}
                      </button>
                    )}
                    <button
                      className="wl-btn-remove"
                      disabled={isBusy || isMoving}
                      onClick={() => handleRemove(item.wishlist_id)}
                      title="Remove"
                    >
                      {isBusy ? <Spin /> : <IconTrash />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes wl-spin { to { transform: rotate(360deg); } }

        .wl-page {
          width: 100%; padding: 40px 48px 64px;
          display: flex; flex-direction: column; gap: 16px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .wl-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 8px;
        }
        .wl-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .wl-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }

        /* Toast */
        .wl-toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--r); border: 1px solid;
          font-size: 13.5px; animation: wl-fade .2s ease;
        }
        @keyframes wl-fade { from { opacity: 0; transform: translateY(-4px); } }
        .wl-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .wl-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        /* Loading */
        .wl-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 48px; color: var(--muted); font-size: 13.5px;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r);
        }

        /* Empty */
        .wl-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 80px 24px; text-align: center;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r);
        }
        .wl-empty-ico {
          width: 80px; height: 80px; border-radius: 50%;
          background: var(--bg-alt); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); margin-bottom: 8px;
        }
        .wl-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .wl-empty-sub { font-size: 13.5px; color: var(--muted); margin: 0 0 8px; max-width: 340px; line-height: 1.6; }

        /* Info banner */
        .wl-info-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: #eff6ff;
          border: 1px solid #bfdbfe; border-radius: var(--r);
          font-size: 13px; color: #1d4ed8; line-height: 1.6;
        }

        /* Grid */
        .wl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        /* Card */
        .wl-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
          display: flex; flex-direction: column;
          transition: box-shadow .2s, border-color .2s;
        }
        .wl-card:hover { box-shadow: var(--sh-md); border-color: var(--gold-lt); }

        .wl-card-img-wrap {
          display: block; aspect-ratio: 4/5; position: relative;
          background: var(--bg-alt); overflow: hidden; text-decoration: none;
        }
        .wl-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s var(--ease); }
        .wl-card:hover .wl-card-img { transform: scale(1.04); }
        .wl-card-img-ph {
          width: 100%; height: 100%; display: flex;
          align-items: center; justify-content: center; color: var(--border);
        }

        /* Badges */
        .wl-badge {
          position: absolute; top: 10px; left: 10px;
          font-size: 10px; font-weight: 700; letter-spacing: .06em;
          padding: 3px 9px; border-radius: 999px;
        }
        .wl-badge-oos { background: rgba(10,17,40,.72); color: #fff; }
        .wl-badge-back { background: var(--gold); color: var(--dark); }

        /* Body */
        .wl-card-body { padding: 14px 16px 10px; flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .wl-card-name {
          font-size: 13.5px; font-weight: 600; color: var(--dark); margin: 0 0 2px;
          text-decoration: none; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .wl-card-name:hover { color: var(--gold); }
        .wl-card-meta { font-size: 11.5px; color: var(--muted); margin: 0; }
        .wl-card-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; font-weight: 700; color: var(--gold); margin: 6px 0 0;
        }

        /* Actions */
        .wl-card-actions {
          padding: 10px 14px 14px;
          display: flex; gap: 8px; align-items: center;
        }
        .wl-btn-move {
          display: inline-flex; align-items: center; gap: 6px; flex: 1;
          padding: 8px 12px; background: var(--dark); color: var(--gold);
          border: none; border-radius: calc(var(--r) - 2px);
          font-size: 12px; font-weight: 700; cursor: pointer; transition: background .2s;
          justify-content: center;
        }
        .wl-btn-move:hover:not(:disabled) { background: var(--black); }
        .wl-btn-move:disabled { opacity: .5; cursor: not-allowed; }
        .wl-btn-remove {
          width: 32px; height: 32px; border-radius: calc(var(--r) - 2px);
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--muted); cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; transition: all .15s;
        }
        .wl-btn-remove:hover:not(:disabled) { border-color: #f5c2c7; color: #9f1239; background: #fff2f3; }
        .wl-btn-remove:disabled { opacity: .45; cursor: not-allowed; }

        /* Shared buttons */
        .wl-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; text-decoration: none; transition: background .2s;
        }
        .wl-btn-primary:hover { background: var(--black); }
        .wl-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: border-color .2s, color .2s;
        }
        .wl-btn-ghost:hover { border-color: #f5c2c7; color: #9f1239; }

        /* Responsive */
        @media (max-width: 1100px) { .wl-page { padding: 32px 28px 56px; } }
        @media (max-width: 860px) {
          .wl-page { padding: 24px 20px 48px; }
          .wl-head { flex-direction: column; align-items: flex-start; }
          .wl-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
        }
        @media (max-width: 520px) {
          .wl-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};

export default Wishlist;