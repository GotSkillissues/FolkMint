import { Link } from 'react-router-dom';
import { useCart } from '../../context';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  // Default demo image if product has no image
  const DEFAULT_IMAGE = '/ed4499261f9f09b4204779485704913d.jpg';

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-image">
        <img 
          src={product.image || DEFAULT_IMAGE} 
          alt={product.name}
        />
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-price">${product.price?.toFixed(2)}</p>
        
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
