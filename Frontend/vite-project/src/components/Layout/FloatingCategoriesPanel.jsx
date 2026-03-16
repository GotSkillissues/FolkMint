import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';

const FloatingCategoriesPanel = () => {
  const { categories, loading } = useCategories();
  const [forceClosed, setForceClosed] = useState(false);

  const allCategories = Array.isArray(categories)
    ? categories
      .filter((category) => category && typeof category === 'object')
      .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
    : [];

  return (
    <aside
      className={`floating-categories${forceClosed ? ' force-closed' : ''}`}
      aria-label="All categories"
      onMouseLeave={() => setForceClosed(false)}
    >
      <button
        type="button"
        className="floating-categories-tab"
        aria-label="Browse categories"
        onClick={(event) => event.currentTarget.blur()}
      >
        <span />
        <span />
        <span />
      </button>
      <div className="floating-categories-panel">
        <h3>All Categories</h3>
        {loading ? (
          <p className="floating-categories-note">Loading...</p>
        ) : allCategories.length ? (
          <ul className="floating-categories-list">
            {allCategories.map((category) => (
              <li key={category.category_id || category.name}>
                <Link
                  to={`/products?category=${encodeURIComponent(category.name || category.category_id)}`}
                  onClick={() => setForceClosed(true)}
                >
                  {category.name || `Category ${category.category_id}`}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="floating-categories-note">No categories available.</p>
        )}
      </div>
    </aside>
  );
};

export default FloatingCategoriesPanel;
