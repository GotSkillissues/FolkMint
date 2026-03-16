import { useEffect, useState } from 'react';
import { productService } from '../services';
import './PageUI.css';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await productService.getAllProducts({ page: 1, limit: 50 });
        setProducts(response?.data || response?.products || response || []);
      } catch (err) {
        setError(err?.error || err?.message || 'Failed to load products.');
      }
    };

    load();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin · Products</h1>
          <p className="page-subtitle">Browse current catalog entries and product details.</p>
        </div>
      </div>
      {error && <p className="msg-error">{error}</p>}

      <div className="stack">
        {products.map((product) => (
          <div key={product.product_id} className="list-row">
            <strong>{product.name}</strong>
            <p style={{ margin: '0.25rem 0' }}>Price: ${Number(product.base_price || product.price || 0).toFixed(2)}</p>
            <p style={{ margin: '0.25rem 0' }}>Category: {product.category_name || product.category?.name || 'N/A'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProducts;
