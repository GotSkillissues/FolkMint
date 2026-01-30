import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '../services';
import { useCart } from '../context';
import { Loading } from '../components';
import './ProductDetail.css';

// Default demo image if product has no image
const DEFAULT_IMAGE = '/ed4499261f9f09b4204779485704913d.jpg';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getProductById(id);
      setProduct(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load product');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    alert('Product added to cart!');
  };

  if (loading) return <Loading message="Loading product..." />;
  
  if (error) return <div className="error-message">{error}</div>;
  
  if (!product) return <div className="error-message">Product not found</div>;

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        <div className="product-images">
          <img 
            src={product.image || DEFAULT_IMAGE} 
            alt={product.name}
            className="main-image"
          />
        </div>

        <div className="product-details">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-price">${product.price?.toFixed(2)}</p>

          <div className="product-description">
            <p>{product.description || 'No description available.'}</p>
          </div>

          <div className="product-info-item">
            <strong>Category:</strong> {product.category?.name || 'Uncategorized'}
          </div>

          <div className="product-info-item">
            <strong>Stock:</strong> {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
          </div>

          <div className="quantity-selector">
            <label htmlFor="quantity">Quantity:</label>
            <div className="quantity-controls">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="qty-btn"
              >
                -
              </button>
              <input 
                type="number" 
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={product.stock}
              />
              <button 
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="qty-btn"
              >
                +
              </button>
            </div>
          </div>

          <button 
            className="add-to-cart-btn-large"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
