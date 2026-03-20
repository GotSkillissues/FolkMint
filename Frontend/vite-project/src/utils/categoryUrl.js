export const getCategoryUrl = (category) => {
  if (!category || typeof category !== 'object') return '/products';

  const hasChildren =
    category.has_children === true ||
    (Array.isArray(category.children) && category.children.length > 0) ||
    (Array.isArray(category.subcategories) && category.subcategories.length > 0);

  if (hasChildren && category.category_id) {
    return `/categories/${category.category_id}`;
  }

  if (category.category_slug) {
    return `/products?category=${encodeURIComponent(category.category_slug)}`;
  }

  if (category.category_id) {
    return `/categories/${category.category_id}`;
  }

  return '/products';
};
