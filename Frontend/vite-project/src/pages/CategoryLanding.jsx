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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const breadcrumbPath = Array.isArray(category?.breadcrumb_path)
    ? category.breadcrumb_path
    : category ? [category] : [];

  const filteredChildren = children.filter(child => 
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError('');
      setSearchTerm('');
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
          <div className="cl-header-row">
            <div className="cl-head">
              <p className="cl-eyebrow">Category</p>
              <h1 className="cl-title">{category?.name || 'Category'}</h1>
              {category?.description && <p className="cl-desc">{category.description}</p>}
            </div>

            {children.length > 0 && (
              <div className="cl-search-container">
                <div className="cl-search-inner">
                  <svg className="cl-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="cl-search-input"
                    placeholder={`Search in ${category?.name || 'subcategories'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  />
                  {searchTerm && (
                    <button className="cl-search-clear" onClick={() => setSearchTerm('')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                {isSearchFocused && filteredChildren.length > 0 && (
                  <div className="cl-search-dropdown">
                    {filteredChildren.map(child => (
                      <Link 
                        key={child.category_id} 
                        to={getCategoryUrl(child)}
                        className="cl-search-dropdown-item"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Children sections */}
          {filteredChildren.length === 0 ? (
            <div className="cl-empty">
              <p className="cl-empty-title">
                {searchTerm ? `No matches for "${searchTerm}"` : 'No subcategories found'}
              </p>
              {searchTerm ? (
                <button className="cl-btn-primary" onClick={() => setSearchTerm('')}>Clear search</button>
              ) : (
                <Link to="/products" className="cl-btn-primary">Browse all products</Link>
              )}
            </div>
          ) : (
            <div className="cl-sections">
              {filteredChildren.map(child => (
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
          width: 100%; padding: 20px 48px 64px;
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
        
        .cl-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 8px;
        }

        .cl-head { display: flex; flex-direction: column; gap: 6px; flex: 1; }
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

        .cl-search-container {
          width: 300px;
          position: relative;
        }

        .cl-search-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 250px;
          overflow-y: auto;
          z-index: 50;
          display: flex;
          flex-direction: column;
          padding: 6px;
        }

        .cl-search-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .cl-search-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .cl-search-dropdown::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 6px;
        }
        .cl-search-dropdown::-webkit-scrollbar-thumb:hover {
          background: var(--muted);
        }

        .cl-search-dropdown-item {
          padding: 10px 12px;
          text-decoration: none;
          color: var(--dark);
          font-size: 13.5px;
          border-radius: 6px;
          transition: background 0.2s, color 0.2s;
        }

        .cl-search-dropdown-item:hover {
          background: var(--bg-alt);
          color: var(--gold);
        }

        .cl-search-inner {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0 12px;
          transition: all 0.3s ease;
          box-shadow: var(--sh-sm);
        }

        .cl-search-inner:focus-within {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(196, 146, 42, 0.1);
          transform: translateY(-1px);
        }

        .cl-search-icon {
          color: var(--muted);
          flex-shrink: 0;
        }

        .cl-search-input {
          width: 100%;
          height: 44px;
          border: none;
          background: transparent;
          padding: 0 10px;
          font-size: 13.5px;
          color: var(--dark);
          outline: none;
        }

        .cl-search-clear {
          background: var(--bg-alt);
          border: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--muted);
          transition: all 0.2s;
          padding: 0;
          flex-shrink: 0;
        }

        .cl-search-clear:hover {
          background: #eee;
          color: var(--dark);
        }

        @media (max-width: 768px) {
          .cl-header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .cl-search-container {
            width: 100%;
          }
        }
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

        @media (max-width: 1100px) { .cl-page { padding: 20px 28px 56px; } }
        @media (max-width: 860px) { .cl-page { padding: 20px 20px 48px; } }
      `}</style>
    </div>
  );
};

export default CategoryLanding;