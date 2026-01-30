// Category Controller - Handle category-related operations
const { pool } = require('../config/database');

// Get all categories (with optional tree structure)
const getCategories = async (req, res) => {
  try {
    const { tree = 'false' } = req.query;

    const result = await pool.query(
      `SELECT c.*, p.name as parent_name 
       FROM category c 
       LEFT JOIN category p ON c.parent_id = p.category_id
       ORDER BY c.parent_id NULLS FIRST, c.name`
    );

    if (tree === 'true') {
      // Build hierarchical tree structure
      const categories = result.rows;
      const categoryMap = {};
      const roots = [];

      categories.forEach(cat => {
        categoryMap[cat.category_id] = { ...cat, children: [] };
      });

      categories.forEach(cat => {
        if (cat.parent_id) {
          categoryMap[cat.parent_id]?.children.push(categoryMap[cat.category_id]);
        } else {
          roots.push(categoryMap[cat.category_id]);
        }
      });

      return res.status(200).json({ categories: roots });
    }

    res.status(200).json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories: ' + error.message });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*, p.name as parent_name,
              COALESCE(json_agg(json_build_object('category_id', ch.category_id, 'name', ch.name)) 
              FILTER (WHERE ch.category_id IS NOT NULL), '[]') as children
       FROM category c
       LEFT JOIN category p ON c.parent_id = p.category_id
       LEFT JOIN category ch ON ch.parent_id = c.category_id
       WHERE c.category_id = $1
       GROUP BY c.category_id, p.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({ category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category: ' + error.message });
  }
};

// Create category (Admin only)
const createCategory = async (req, res) => {
  try {
    const { name, description, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Verify parent exists if provided
    if (parent_id) {
      const parentExists = await pool.query(
        'SELECT category_id FROM category WHERE category_id = $1',
        [parent_id]
      );
      if (parentExists.rows.length === 0) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO category (name, description, parent_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, parent_id]
    );

    res.status(201).json({ message: 'Category created', category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category: ' + error.message });
  }
};

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx}`);
      params.push(name);
      idx++;
    }
    if (description !== undefined) {
      updates.push(`description = $${idx}`);
      params.push(description);
      idx++;
    }
    if (parent_id !== undefined) {
      // Prevent self-referencing
      if (parent_id === parseInt(id)) {
        return res.status(400).json({ error: 'Category cannot be its own parent' });
      }
      updates.push(`parent_id = $${idx}`);
      params.push(parent_id);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE category SET ${updates.join(', ')} WHERE category_id = $${idx}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({ message: 'Category updated', category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category: ' + error.message });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for child categories
    const children = await pool.query(
      'SELECT category_id FROM category WHERE parent_id = $1',
      [id]
    );

    if (children.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with child categories. Delete children first.' 
      });
    }

    // Check for products using this category
    const products = await pool.query(
      'SELECT product_id FROM product WHERE category_id = $1 LIMIT 1',
      [id]
    );

    if (products.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with associated products.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM category WHERE category_id = $1 RETURNING category_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category: ' + error.message });
  }
};

// Get products in category
const getCategoryProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, include_children = 'false' } = req.query;
    const offset = (page - 1) * limit;

    // Verify category exists
    const categoryExists = await pool.query(
      'SELECT category_id FROM category WHERE category_id = $1',
      [id]
    );

    if (categoryExists.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    let categoryIds = [id];

    // Include child categories if requested
    if (include_children === 'true') {
      const children = await pool.query(
        'SELECT category_id FROM category WHERE parent_id = $1',
        [id]
      );
      categoryIds = categoryIds.concat(children.rows.map(c => c.category_id));
    }

    const placeholders = categoryIds.map((_, i) => `$${i + 1}`).join(', ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM product WHERE category_id IN (${placeholders})`,
      categoryIds
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM product p
       JOIN category c ON p.category_id = c.category_id
       WHERE p.category_id IN (${placeholders})
       ORDER BY p.created_at DESC
       LIMIT $${categoryIds.length + 1} OFFSET $${categoryIds.length + 2}`,
      [...categoryIds, limit, offset]
    );

    res.status(200).json({
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products: ' + error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts
};
