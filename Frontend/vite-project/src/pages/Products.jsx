import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { productService } from '../services';
import { Loading } from '../components';
import './PageUI.css';

const getProductImage = (product) => {
  if (product?.image_url) return product.image_url;
  const firstVariant = product?.variants?.[0];
  const firstImage = firstVariant?.images?.find((img) => img?.is_primary) || firstVariant?.images?.[0];
  return firstImage?.image_url || '/placeholder-product.jpg';
};

const getProductPrice = (product) => Number(product?.price ?? product?.base_price ?? 0);

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';

  useEffect(() => {
    setSearchText(query);
  }, [query]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await productService.getAllProducts({
          q: query || undefined,
          category: category || undefined,
        });

        const items = response?.data || response?.products || response || [];
        setProducts(Array.isArray(items) ? items : []);
      } catch (err) {
        setError(err?.message || 'Failed to load products.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [query, category]);

  const onSearchSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);

    if (searchText.trim()) {
      params.set('q', searchText.trim());
    } else {
      params.delete('q');
    }

    navigate(`/products?${params.toString()}`);
  };

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = getProductPrice(a);
    const priceB = getProductPrice(b);

    if (sortBy === 'price_low') return priceA - priceB;
    if (sortBy === 'price_high') return priceB - priceA;
    if (sortBy === 'name_asc') return (a?.name || '').localeCompare(b?.name || '');

    return 0;
  });

  if (loading) return <Loading message="Loading products..." />;

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Discover handcrafted collections curated for every style.</p>
        </div>
      </div>

      <form className="ui-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="ui-input"
          type="text"
          placeholder="Search products, e.g. saree, pottery, necklace..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div className="row-actions">
          <select className="ui-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="name_asc">Name: A-Z</option>
          </select>
          <button className="ui-btn" type="submit">Search</button>
        </div>
      </form>

      {(query || category) && (
        <p className="msg-note">
          Showing results{query ? ` for "${query}"` : ''}{category ? ` in ${category}` : ''}
        </p>
      )}

      {error && <p className="msg-error" role="alert">{error}</p>}

      {!error && !sortedProducts.length && <p className="msg-note">No products found.</p>}

      <div className="product-grid">
        {sortedProducts.map((product) => {
          const productId = product?.product_id || product?.id;
          const price = getProductPrice(product);

          return (
            <Link
              key={productId}
              to={`/products/${productId}`}
              className="product-card"
            >
              <img src={getProductImage(product)} alt={product?.name} />
              <div className="product-card-body">
                <h3 className="product-name">{product?.name}</h3>
                <p className="product-price">${price.toFixed(2)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Products;
