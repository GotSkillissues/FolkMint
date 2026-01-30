import { useState, useEffect } from 'react';
import { ProductCard, Loading } from '../components';
import { productService } from '../services';
import './Home.css';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts({ limit: 8 });
      setProducts(data.products || data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading products..." />;
  
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Crafted by Nature<br/>Inspired by Earth</h1>
          <p className="hero-description">
            Explore our collections of handcrafted ceramics, where organic
            textures and natural tones celebrate the beauty of the world around us.
          </p>
          <button className="hero-btn">SHOP THE BESTSELLERS</button>
        </div>
        <div className="hero-image">
          <img src="/hero-image.jpg" alt="Ceramic products" />
        </div>
        <div className="promo-banner">20% OFF SITEWIDE</div>
      </section>

      {/* Back in Stock Section */}
      <section className="products-section">
        <h2 className="section-title">BACK IN STOCK</h2>
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Sunrise Collection Section */}
      <section className="collection-section">
        <div className="collection-content">
          <h2 className="collection-title">Sunrise</h2>
          <p className="collection-description">
            Capture  the warmth and vibrancy of the early morning light, with shades that
            radiate energy and renewal. Immerse yourself in the alluring beauty of the limited Sunrise
            Tableware Collection.
          </p>
          <button className="collection-btn">DISCOVER THE SUNRISE COLLECTION</button>
        </div>
        <div className="collection-image">
          <img src="/sunrise-collection.jpg" alt="Sunrise Collection" />
        </div>
      </section>
    </div>
  );
};

export default Home;
