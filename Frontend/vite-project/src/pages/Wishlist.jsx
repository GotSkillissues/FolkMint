import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wishlistService } from '../services';
import './PageUI.css';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWishlist = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await wishlistService.getWishlist();
      setWishlistItems(response?.wishlist || []);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to load wishlist.');
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (wishlistId) => {
    try {
      await wishlistService.removeFromWishlist(wishlistId);
      setWishlistItems((prev) => prev.filter((item) => item.wishlist_id !== wishlistId));
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to remove item.');
    }
  };

  const handleClear = async () => {
    try {
      await wishlistService.clearWishlist();
      setWishlistItems([]);
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to clear wishlist.');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Wishlist</h1>
          <p className="page-subtitle">Save favorite products and revisit them anytime.</p>
        </div>
      </div>

      {loading && <p className="msg-note">Loading wishlist...</p>}
      {error && <p className="msg-error">{error}</p>}

      {!loading && !wishlistItems.length && <p className="msg-note">Your wishlist is empty.</p>}

      {!!wishlistItems.length && (
        <>
          <button className="ui-btn-ghost" type="button" onClick={handleClear} style={{ marginBottom: '1rem' }}>
            Clear Wishlist
          </button>

          <div className="stack">
            {wishlistItems.map((item) => (
              <div key={item.wishlist_id} className="list-row">
                <strong>{item.name}</strong>
                <p style={{ margin: 0 }}>{item.category_name}</p>
                <p style={{ margin: 0 }}>৳{Number(item.min_price || item.base_price || 0).toFixed(2)}</p>
                <div className="row-actions">
                  <Link to={`/products/${item.product_id}`}>View Product</Link>
                  <button className="ui-btn-ghost" type="button" onClick={() => handleRemove(item.wishlist_id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;
