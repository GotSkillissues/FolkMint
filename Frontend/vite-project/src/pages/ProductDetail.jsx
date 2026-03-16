import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '../services';
import { useCart } from '../context';
import { Loading } from '../components';
import './ProductDetail.css';

// Default demo image if product has no image
const DEFAULT_IMAGE = '/ed4499261f9f09b4204779485704913d.jpg';

const getProductImage = (item) => {
  if (item?.image) return item.image;
  if (item?.image_url) return item.image_url;

  const firstVariant = item?.variants?.[0];
  const firstImage = firstVariant?.images?.find((img) => img?.is_primary) || firstVariant?.images?.[0];

  return firstImage?.image_url || DEFAULT_IMAGE;
};

const getProductPrice = (item) => Number(item?.price ?? item?.base_price ?? 0);

const getProductStock = (item) => {
  if (typeof item?.stock === 'number') return item.stock;
  if (typeof item?.total_stock === 'number') return item.total_stock;

  const variants = item?.variants || [];
  return variants.reduce((sum, variant) => sum + (variant?.stock_quantity || 0), 0);
};

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
      setProduct(data?.data || data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load product');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      price: getProductPrice(product),
      image: getProductImage(product),
      stock: getProductStock(product),
    }, quantity);
    alert('Product added to cart!');
  };

  const productPrice = getProductPrice(product);
  const productStock = getProductStock(product);

  if (loading) return <Loading message="Loading product..." />;
  
  if (error) return <div className="error-message">{error}</div>;
  
  if (!product) return <div className="error-message">Product not found</div>;

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        <div className="product-images">
          <img 
            src={getProductImage(product)} 
            alt={product.name}
            className="main-image"
          />
        </div>

        <div className="product-details">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-price">${productPrice.toFixed(2)}</p>

          <div className="product-description">
            <p>{product.description || 'No description available.'}</p>
          </div>

          <div className="product-info-item">
            <strong>Category:</strong> {product.category?.name || 'Uncategorized'}
          </div>

          <div className="product-info-item">
            <strong>Stock:</strong> {productStock > 0 ? `${productStock} available` : 'Out of stock'}
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
                max={Math.max(1, productStock)}
              />
              <button 
                onClick={() => setQuantity(Math.min(Math.max(1, productStock), quantity + 1))}
                className="qty-btn"
              >
                +
              </button>
            </div>
          </div>

          <button 
            className="add-to-cart-btn-large"
            onClick={handleAddToCart}
            disabled={productStock <= 0}
          >
            {productStock > 0 ? 'ADD TO CART' : 'OUT OF STOCK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
