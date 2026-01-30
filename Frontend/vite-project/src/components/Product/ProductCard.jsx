import { Link } from 'react-router-dom';
import { useCart } from '../../context';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-image">
        <img 
          src={product.image || '/placeholder-product.jpg'} 
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
