import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategoryTree } from '../../hooks/useCategories';
import { getCategoryUrl } from '../../utils';

const FloatingCategoriesPanel = () => {
  const { tree, loading } = useCategoryTree();
  const [forceClosed, setForceClosed] = useState(false);

  const getChildren = (node) => {
    if (Array.isArray(node?.children)) return node.children;
    if (Array.isArray(node?.subcategories)) return node.subcategories;
    return [];
  };

  const sortedChildren = (node) => getChildren(node)
    .filter((child) => child && typeof child === 'object');

  const rootCategories = (Array.isArray(tree) ? tree : [])
    .filter((category) => category && typeof category === 'object');

  const renderNode = (node) => {
    const children = sortedChildren(node);

    return (
      <li key={node.category_id || node.name} className="floating-categories-item">
        {children.length > 0 ? (
          <Link
            className="floating-categories-parent-link"
            to={getCategoryUrl({ ...node, has_children: true })}
            onClick={() => setForceClosed(true)}
          >
            {node.name || `Category ${node.category_id}`}
          </Link>
        ) : (
          <Link
            to={getCategoryUrl({ ...node, has_children: false })}
            onClick={() => setForceClosed(true)}
          >
            {node.name || `Category ${node.category_id}`}
          </Link>
        )}

        {children.length > 0 && (
          <ul className="floating-categories-children">
            {children.map((child) => (
              <li key={child.category_id || child.name}>
                <Link
                  to={getCategoryUrl({ ...child, has_children: sortedChildren(child).length > 0 })}
                  onClick={() => setForceClosed(true)}
                >
                  {child.name || `Category ${child.category_id}`}
                </Link>

                {sortedChildren(child).length > 0 && (
                  <ul className="floating-categories-children">
                    {sortedChildren(child).map((grandchild) => renderNode(grandchild))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

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
        ) : rootCategories.length ? (
          <ul className="floating-categories-list">
            {rootCategories.map((root) => renderNode(root))}
          </ul>
        ) : (
          <p className="floating-categories-note">No categories available.</p>
        )}
      </div>
    </aside>
  );
};

export default FloatingCategoriesPanel;
