import { Link } from 'react-router-dom';
import { getCardImageUrl, getCategoryUrl } from '../../utils';
import './CategorySection.css';

const ProductSkeleton = () => (
  <div className="category-section-card category-section-skeleton" aria-hidden="true">
    <div className="category-section-skeleton-image" />
    <div className="category-section-skeleton-line" />
    <div className="category-section-skeleton-line short" />
  </div>
);

const CategorySection = ({ category, products = [], loading = false }) => {
  const categoryUrl = getCategoryUrl(category);
  const categoryName = category?.name || 'Category';

  return (
    <section className="category-section" aria-label={categoryName}>
      <div className="category-section-header">
        <h3 className="category-section-title">
          <Link to={categoryUrl}>{categoryName}</Link>
        </h3>
        <Link to={categoryUrl} className="category-section-view-all">View All</Link>
      </div>

      <div className="category-section-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={`sk-${index}`} />)
          : products.slice(0, 8).map((product) => {
              const productId = product?.product_id;
              const imageUrl = getCardImageUrl(product, { width: 540, height: 680, crop: 'limit' });
              return (
                <Link key={productId} to={`/products/${productId}`} className="category-section-card">
                  <div className="category-section-image-wrap">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product?.name || 'Product'} loading="lazy" />
                    ) : (
                      <div className="category-section-image-empty">No image</div>
                    )}
                  </div>
                  <p className="category-section-product-name">{product?.name || 'Unnamed product'}</p>
                  <p className="category-section-product-price">BDT {Number(product?.price || 0).toFixed(2)}</p>
                </Link>
              );
            })}

        {!loading && products.length === 0 ? (
          <p className="category-section-empty">No products found in this category yet.</p>
        ) : null}
      </div>
    </section>
  );
};

export default CategorySection;
