import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CategorySection from '../components/Product/CategorySection';
import { categoryService } from '../services';
import { Loading } from '../components';
import { getCategoryUrl } from '../utils';
import './CategoryLanding.css';

const CategoryLanding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const breadcrumbPath = Array.isArray(category?.breadcrumb_path)
    ? category.breadcrumb_path
    : category
      ? [category]
      : [];

  useEffect(() => {
    let isMounted = true;

    const fetchCategoryLanding = async () => {
      setLoading(true);
      setError('');

      try {
        const [categoryResponse, childrenResponse] = await Promise.all([
          categoryService.getCategoryById(id),
          categoryService.getChildrenWithProducts(id, 8),
        ]);

        if (!isMounted) return;

        const singleCategory = categoryResponse?.category || childrenResponse?.category || null;
        const childRows = Array.isArray(childrenResponse?.children) ? childrenResponse.children : [];

        setCategory(singleCategory);
        setChildren(childRows);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.error || err?.message || 'Failed to load category page.');
        setCategory(null);
        setChildren([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategoryLanding();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (loading || error || !category) return;

    const hasChildren =
      category.has_children === true ||
      (Array.isArray(children) && children.length > 0);

    if (!hasChildren) {
      const targetUrl = getCategoryUrl({ ...category, has_children: false });
      if (targetUrl && targetUrl !== `/categories/${category.category_id}`) {
        navigate(targetUrl, { replace: true });
      }
    }
  }, [loading, error, category, children, navigate]);

  if (loading) {
    return <Loading message="Loading category..." />;
  }

  return (
    <div className="category-landing-page">
      <div className="category-landing-inner">
        <nav className="category-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {breadcrumbPath.map((node, index) => {
            const isLast = index === breadcrumbPath.length - 1;
            return (
              <span key={`crumb-${node?.category_id || index}`}>
                / {isLast ? (node?.name || 'Category') : <Link to={getCategoryUrl(node)}>{node?.name}</Link>}
              </span>
            );
          })}
        </nav>

        <header className="category-landing-header">
          <h1>{category?.name || 'Category'}</h1>
          {category?.description ? <p>{category.description}</p> : null}
        </header>

        {error ? <p className="msg-error">{error}</p> : null}

        {!error && !children.length ? (
          <p className="msg-note">No subcategories found for this category.</p>
        ) : null}

        {!error && children.length > 0 ? (
          <div className="category-landing-sections">
            {children.map((child) => (
              <CategorySection
                key={child.category_id}
                category={child}
                products={Array.isArray(child.products) ? child.products : []}
                loading={false}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CategoryLanding;
