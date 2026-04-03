import { Link } from 'react-router-dom';
import { useCart, useWishlist } from '../../context';
import { getCardImageUrl } from '../../utils';
import './ProductCard.css';

const ProductCard = ({ p }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  const product = p; // preserve naming if needed, but 'p' is conventional here

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  const handleWishlistToggle = async (e) => {
    e.preventDefault(); // Prevent navigating to product detail
    await toggleWishlist(product.product_id);
  };

  const imageUrl = getCardImageUrl(product, { width: 540, height: 680, crop: 'limit' });
  const isLoved = isInWishlist(product.product_id);

  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-image">
        <button 
          className={`wishlist-toggle-btn ${isLoved ? 'active' : ''}`}
          onClick={handleWishlistToggle}
          disabled={loading}
          aria-label={isLoved ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isLoved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.1 5.1 0 0 0-7.2 0L12 6.2l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2l1.6 1.6L12 20.6l7.2-7.2 1.6-1.6a5.1 5.1 0 0 0 0-7.2z" />
          </svg>
        </button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="product-image-empty">Image unavailable</div>
        )}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">৳{product.price?.toFixed(2)}</p>
        
        <button 
          className="add-to-cart-btn" 
          onClick={handleAddToCart}
        >
          ADD TO CART
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
