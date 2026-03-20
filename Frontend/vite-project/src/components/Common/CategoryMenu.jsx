import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './CategoryMenu.css';

const CategoryMenu = () => {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/categories/tree`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data.categories || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const selectedCategoryId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromCategoryId = params.get('category_id');
    const fromParentId = params.get('parent_id');
    const fromLegacyCategory = params.get('category');

    if (fromCategoryId && /^\d+$/.test(fromCategoryId)) return Number(fromCategoryId);
    if (fromParentId && /^\d+$/.test(fromParentId)) return Number(fromParentId);
    if (fromLegacyCategory && /^\d+$/.test(fromLegacyCategory)) return Number(fromLegacyCategory);
    return null;
  }, [location.search]);

  const getPathToCategory = (nodes, targetId, path = []) => {
    if (!Array.isArray(nodes) || !targetId) return null;

    for (const node of nodes) {
      const nextPath = [...path, node.category_id];
      if (Number(node.category_id) === Number(targetId)) {
        return nextPath;
      }

      const childPath = getPathToCategory(node.children || [], targetId, nextPath);
      if (childPath) return childPath;
    }

    return null;
  };

  const activePathIds = useMemo(() => {
    const path = getPathToCategory(categories, selectedCategoryId) || [];
    return new Set(path);
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId || categories.length === 0) return;

    const path = getPathToCategory(categories, selectedCategoryId);
    if (!path || path.length < 2) return;

    const ancestorIds = path.slice(0, -1);
    setExpandedCategories((prev) => {
      const next = { ...prev };
      ancestorIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [categories, selectedCategoryId]);

  const buildCategoryUrl = (category) => {
    return `/products?category_id=${encodeURIComponent(category.category_id)}&include_descendants=true&page=1`;
  };

  const renderCategory = (category) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories[category.category_id];
    const isActive = selectedCategoryId !== null && Number(category.category_id) === Number(selectedCategoryId);
    const isInActivePath = activePathIds.has(category.category_id);

    return (
      <div key={category.category_id} className="category-item">
        <div className={`category-header${isActive ? ' active' : ''}${!isActive && isInActivePath ? ' ancestor' : ''}`}>
          {hasChildren && (
            <button
              className={`expand-toggle ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleCategory(category.category_id)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              ▶
            </button>
          )}
          {!hasChildren && <span className="expand-toggle-placeholder"></span>}
          
          <Link 
            to={buildCategoryUrl(category)}
            className={`category-name${isActive ? ' active' : ''}`}
          >
            {category.name}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <div className="category-children">
            {category.children.map((child) => renderCategory(child))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="category-menu loading">Loading categories...</div>;
  }

  if (error) {
    return <div className="category-menu error">Error loading categories: {error}</div>;
  }

  return (
    <div className="category-menu">
      <h2 className="category-menu-title">Shop by Category</h2>
      <nav className="category-list">
        {categories.map((category) => renderCategory(category))}
      </nav>
    </div>
  );
};

export default CategoryMenu;
