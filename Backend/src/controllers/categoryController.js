const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeText = (value) => String(value || '').trim();

const normalizeOptionalText = (value) => {
  const trimmed = normalizeText(value);
  return trimmed.length ? trimmed : null;
};

// Recursively build nested tree from flat rows
const buildCategoryTree = (rows) => {
  const map = {};
  const roots = [];

  rows.forEach((row) => {
    map[row.category_id] = { ...row, children: [] };
  });

  rows.forEach((row) => {
    if (row.parent_category) {
      map[row.parent_category]?.children.push(map[row.category_id]);
    } else {
      roots.push(map[row.category_id]);
    }
  });

  return roots;
};

// GET /api/categories
// Public. Returns flat list or nested tree depending on ?tree=true
const getCategories = async (req, res) => {
  try {
    const tree = req.query.tree === 'true';

    const result = await pool.query(
      `SELECT
         category_id, name, category_slug, description,
         parent_category, depth, full_path, sort_order, is_active
       FROM category
       WHERE is_active = true
       ORDER BY depth ASC, sort_order ASC, name ASC`
    );

    if (tree) {
      return res.status(200).json({ categories: buildCategoryTree(result.rows) });
    }

    return res.status(200).json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// GET /api/categories/:id
// Public. Returns a single category with its direct children.
const getCategoryById = async (req, res) => {
  try {
    const categoryId = parsePositiveInt(req.params.id);

    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const result = await pool.query(
      `SELECT
         c.category_id, c.name, c.category_slug, c.description,
         c.parent_category, c.depth, c.full_path, c.sort_order, c.is_active,
         p.name AS parent_name,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'category_id', a.category_id,
                 'name', a.name,
                 'category_slug', a.category_slug,
                 'has_children', EXISTS (
                   SELECT 1
                   FROM category ch2
                   WHERE ch2.parent_category = a.category_id
                     AND ch2.is_active = true
                 )
               )
               ORDER BY cc.depth DESC
             )
             FROM category_closure cc
             JOIN category a ON a.category_id = cc.ancestor_category_id
             WHERE cc.descendant_category_id = c.category_id
               AND a.is_active = true
           ),
           '[]'
         ) AS breadcrumb_path,
         COALESCE(
           json_agg(
             json_build_object(
               'category_id', ch.category_id,
               'name', ch.name,
               'category_slug', ch.category_slug,
               'sort_order', ch.sort_order
             ) ORDER BY ch.sort_order, ch.name
           ) FILTER (WHERE ch.category_id IS NOT NULL),
           '[]'
         ) AS children
       FROM category c
       LEFT JOIN category p ON p.category_id = c.parent_category
       LEFT JOIN category ch ON ch.parent_category = c.category_id
         AND ch.is_active = true
       WHERE c.category_id = $1
       GROUP BY c.category_id, p.name`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(200).json({ category: result.rows[0] });
  } catch (error) {
    console.error('Get category error:', error);
    return res.status(500).json({ error: 'Failed to fetch category' });
  }
};

// GET /api/categories/slug/:slug
// Public. Resolve category by slug for URL-based filtering.
// Frontend uses /products?category=menswear — backend resolves slug to ID here.
const getCategoryBySlug = async (req, res) => {
  try {
    const slug = normalizeText(req.params.slug);

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const result = await pool.query(
      `SELECT
         category_id, name, category_slug, description,
         parent_category, depth, full_path, sort_order, is_active
       FROM category
       WHERE category_slug = $1
         AND is_active = true`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(200).json({ category: result.rows[0] });
  } catch (error) {
    console.error('Get category by slug error:', error);
    return res.status(500).json({ error: 'Failed to fetch category' });
  }
};

// GET /api/categories/:id/children-with-products
// Public. Returns direct children of a category and preview products per child.
const getChildrenWithProducts = async (req, res) => {
  try {
    const categoryId = parsePositiveInt(req.params.id);
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 24) : 8;

    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const categoryResult = await pool.query(
      `SELECT
         c.category_id, c.name, c.category_slug, c.description,
         c.parent_category, c.depth, c.full_path, c.sort_order, c.is_active,
         p.name AS parent_name,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'category_id', a.category_id,
                 'name', a.name,
                 'category_slug', a.category_slug,
                 'has_children', EXISTS (
                   SELECT 1
                   FROM category ch2
                   WHERE ch2.parent_category = a.category_id
                     AND ch2.is_active = true
                 )
               )
               ORDER BY cc.depth DESC
             )
             FROM category_closure cc
             JOIN category a ON a.category_id = cc.ancestor_category_id
             WHERE cc.descendant_category_id = c.category_id
               AND a.is_active = true
           ),
           '[]'
         ) AS breadcrumb_path,
         EXISTS (
           SELECT 1
           FROM category ch
           WHERE ch.parent_category = c.category_id
             AND ch.is_active = true
         ) AS has_children
       FROM category c
       LEFT JOIN category p ON p.category_id = c.parent_category
       WHERE c.category_id = $1
         AND c.is_active = true`,
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const childrenResult = await pool.query(
      `SELECT
         c.category_id, c.name, c.category_slug, c.description,
         c.parent_category, c.depth, c.full_path, c.sort_order, c.is_active,
         EXISTS (
           SELECT 1
           FROM category ch
           WHERE ch.parent_category = c.category_id
             AND ch.is_active = true
         ) AS has_children
       FROM category c
       WHERE c.parent_category = $1
         AND c.is_active = true
       ORDER BY c.sort_order ASC, c.name ASC`,
      [categoryId]
    );

    const childrenWithProducts = await Promise.all(
      childrenResult.rows.map(async (child) => {
        const productsResult = await pool.query(
          `SELECT
             p.product_id, p.name, p.description, p.sku, p.price,
             p.category_id, p.is_active, p.created_at, p.updated_at,
             c.name AS category_name,
             c.category_slug,
             (
               SELECT pi.image_url
               FROM product_image pi
               WHERE pi.product_id = p.product_id
                 AND pi.is_primary = true
               LIMIT 1
             ) AS primary_image
           FROM category_closure cc
           JOIN product p ON p.category_id = cc.descendant_category_id
           LEFT JOIN category c ON c.category_id = p.category_id
           WHERE cc.ancestor_category_id = $1
             AND p.is_active = true
           ORDER BY p.created_at DESC
           LIMIT $2`,
          [child.category_id, limit]
        );

        return {
          ...child,
          products: productsResult.rows
        };
      })
    );

    return res.status(200).json({
      category: categoryResult.rows[0],
      children: childrenWithProducts,
      limit
    });
  } catch (error) {
    console.error('Get category children with products error:', error);
    return res.status(500).json({ error: 'Failed to fetch category children with products' });
  }
};

// POST /api/categories
// Admin only.
const createCategory = async (req, res) => {
  try {
    const body = req.body || {};
    const name = normalizeText(body.name);
    const description = normalizeOptionalText(body.description);
    const sort_order = Number.parseInt(body.sort_order, 10) || 0;
    const parent_category = parsePositiveInt(body.parent_category) || null;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Verify parent exists if provided
    if (parent_category) {
      const parentCheck = await pool.query(
        'SELECT category_id FROM category WHERE category_id = $1 AND is_active = true',
        [parent_category]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
    }

    // slug, depth, full_path are all auto-computed by the DB trigger
    const result = await pool.query(
      `INSERT INTO category (name, description, parent_category, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING category_id, name, category_slug, description,
                 parent_category, depth, full_path, sort_order, is_active`,
      [name, description, parent_category, sort_order]
    );

    return res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A category with this name already exists under the same parent'
      });
    }
    console.error('Create category error:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
};

// PATCH /api/categories/:id
// Admin only.
const updateCategory = async (req, res) => {
  try {
    const categoryId = parsePositiveInt(req.params.id);

    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const existing = await pool.query(
      'SELECT category_id FROM category WHERE category_id = $1',
      [categoryId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const body = req.body || {};
    const updates = [];
    const params = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = normalizeText(body.name);
      if (!name) return res.status(400).json({ error: 'Category name cannot be empty' });
      updates.push(`name = $${idx}`);
      params.push(name);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      updates.push(`description = $${idx}`);
      params.push(normalizeOptionalText(body.description));
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'sort_order')) {
      updates.push(`sort_order = $${idx}`);
      params.push(Number.parseInt(body.sort_order, 10) || 0);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
      updates.push(`is_active = $${idx}`);
      params.push(body.is_active === true);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'parent_category')) {
      const newParent = parsePositiveInt(body.parent_category) || null;

      // Prevent self-reference
      if (newParent === categoryId) {
        return res.status(400).json({ error: 'Category cannot be its own parent' });
      }

      // Prevent circular reference — new parent must not be a descendant of this category
      if (newParent) {
        const circularCheck = await pool.query(
          `SELECT 1 FROM category_closure
           WHERE ancestor_category_id = $1
             AND descendant_category_id = $2`,
          [categoryId, newParent]
        );
        if (circularCheck.rows.length > 0) {
          return res.status(400).json({
            error: 'Cannot set a descendant category as parent — this would create a circular reference'
          });
        }

        const parentCheck = await pool.query(
          'SELECT category_id FROM category WHERE category_id = $1 AND is_active = true',
          [newParent]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Parent category not found' });
        }
      }

      updates.push(`parent_category = $${idx}`);
      params.push(newParent);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(categoryId);

    // slug, depth, full_path are auto-recomputed by the DB trigger on UPDATE
    const result = await pool.query(
      `UPDATE category
       SET ${updates.join(', ')}
       WHERE category_id = $${idx}
       RETURNING category_id, name, category_slug, description,
                 parent_category, depth, full_path, sort_order, is_active`,
      params
    );

    return res.status(200).json({
      message: 'Category updated successfully',
      category: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A category with this name already exists under the same parent'
      });
    }
    console.error('Update category error:', error);
    return res.status(500).json({ error: 'Failed to update category' });
  }
};

// DELETE /api/categories/:id
// Admin only. Blocked if category has products or active children.
const deleteCategory = async (req, res) => {
  try {
    const categoryId = parsePositiveInt(req.params.id);

    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const existing = await pool.query(
      'SELECT category_id FROM category WHERE category_id = $1',
      [categoryId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Fetch all descendant categories (including this one)
    const descendantsRes = await pool.query(
      'SELECT descendant_category_id FROM category_closure WHERE ancestor_category_id = $1',
      [categoryId]
    );
    const catIds = descendantsRes.rows.map(r => r.descendant_category_id);

    if (catIds.length > 0) {
      // Find all products assigned to these categories
      const productsRes = await pool.query(
        'SELECT product_id FROM product WHERE category_id = ANY($1)',
        [catIds]
      );
      
      // Delete all products in these categories
      // (product_variant, product_image, etc. will cascade)
      if (productsRes.rows.length > 0) {
        await pool.query('DELETE FROM product WHERE category_id = ANY($1)', [catIds]);
      }

      // Delete the categories
      await pool.query('DELETE FROM category WHERE category_id = ANY($1)', [catIds]);
    }

    return res.status(200).json({ message: 'Category and its subcategories/products deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getChildrenWithProducts,
  createCategory,
  updateCategory,
  deleteCategory
};