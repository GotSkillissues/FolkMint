import { Link } from 'react-router-dom';
import { useCart } from '../../context';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  const imageUrl = product?.image || product?.image_url || '';

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-image">
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
