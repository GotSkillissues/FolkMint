import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CategorySection from '../components/Product/CategorySection';
import { categoryService } from '../services';
import { getCategoryUrl } from '../utils';

const Spin = () => (
  <span style={{
    display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
    border: '2px solid rgba(212,175,55,.2)', borderTopColor: 'var(--gold)',
    animation: 'cl-spin .65s linear infinite',
  }} />
);

const CategoryLanding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const breadcrumbPath = Array.isArray(category?.breadcrumb_path)
    ? category.breadcrumb_path
    : category ? [category] : [];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [catRes, childRes] = await Promise.all([
          categoryService.getCategoryById(id),
          categoryService.getChildrenWithProducts(id, 8),
        ]);
        if (!mounted) return;
        setCategory(catRes?.category || childRes?.category || null);
        setChildren(Array.isArray(childRes?.children) ? childRes.children : []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.error || err?.message || 'Failed to load category.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (loading || error || !category) return;
    const hasChildren = category.has_children === true || (Array.isArray(children) && children.length > 0);
    if (!hasChildren) {
      const url = getCategoryUrl({ ...category, has_children: false });
      if (url && url !== `/categories/${category.category_id}`) navigate(url, { replace: true });
    }
  }, [loading, error, category, children, navigate]);

  return (
    <div className="cl-page">

      {loading ? (
        <div className="cl-loading"><Spin /><p>Loading category…</p></div>
      ) : error ? (
        <div className="cl-error">{error}</div>
      ) : (
        <>
          {/* Breadcrumb */}
          <nav className="cl-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {breadcrumbPath.map((node, i) => {
              const isLast = i === breadcrumbPath.length - 1;
              return (
                <span key={node?.category_id || i} className="cl-crumb-seg">
                  <span className="cl-crumb-sep">/</span>
                  {isLast ? <span>{node?.name}</span> : <Link to={getCategoryUrl(node)}>{node?.name}</Link>}
                </span>
              );
            })}
          </nav>

          {/* Head */}
          <div className="cl-head">
            <p className="cl-eyebrow">Category</p>
            <h1 className="cl-title">{category?.name || 'Category'}</h1>
            {category?.description && <p className="cl-desc">{category.description}</p>}
          </div>

          {/* Children sections */}
          {!children.length ? (
            <div className="cl-empty">
              <p className="cl-empty-title">No subcategories found</p>
              <Link to="/products" className="cl-btn-primary">Browse all products</Link>
            </div>
          ) : (
            <div className="cl-sections">
              {children.map(child => (
                <CategorySection
                  key={child.category_id}
                  category={child}
                  products={Array.isArray(child.products) ? child.products : []}
                  loading={false}
                />
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes cl-spin { to { transform: rotate(360deg); } }

        .cl-page {
          width: 100%; padding: 100px 48px 64px;
          display: flex; flex-direction: column; gap: 20px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .cl-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 16px; padding: 80px 24px; color: var(--muted); font-size: 14px;
        }
        .cl-error {
          padding: 12px 16px; background: #fff2f3;
          border: 1px solid #f5c2c7; color: #9f1239;
          border-radius: var(--r); font-size: 13.5px;
        }
        .cl-breadcrumb {
          display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
          font-size: 12px; color: var(--muted);
        }
        .cl-breadcrumb a { color: var(--muted); text-decoration: none; transition: color .15s; }
        .cl-breadcrumb a:hover { color: var(--dark); }
        .cl-crumb-sep { margin: 0 2px; opacity: .4; }
        .cl-head { display: flex; flex-direction: column; gap: 6px; }
        .cl-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0;
        }
        .cl-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .cl-desc { font-size: 14px; color: var(--muted); margin: 0; max-width: 680px; line-height: 1.7; }
        .cl-sections { display: flex; flex-direction: column; gap: 32px; }
        .cl-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 64px 24px; text-align: center;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r);
        }
        .cl-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark); margin: 0;
        }
        .cl-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r);
          font-size: 13px; font-weight: 700; letter-spacing: .06em;
          cursor: pointer; text-decoration: none; transition: background .2s;
        }
        .cl-btn-primary:hover { background: var(--black); }

        @media (max-width: 1100px) { .cl-page { padding: 88px 28px 56px; } }
        @media (max-width: 860px) { .cl-page { padding: 80px 20px 48px; } }
      `}</style>
    </div>
  );
};

export default CategoryLanding;