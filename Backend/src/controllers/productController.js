// Product Controller - Handle product-related operations
const { pool } = require('../config/database');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get product with all its variants and images
 */
const getProductWithDetails = async (productId) => {
  // Get product basic info with category
  const productResult = await pool.query(
    `SELECT p.*, c.name as category_name, c.parent_category
     FROM product p
     LEFT JOIN category c ON p.category_id = c.category_id
     WHERE p.product_id = $1`,
    [productId]
  );

  if (productResult.rows.length === 0) return null;

  const product = productResult.rows[0];

  // Get all variants for this product
  const variantsResult = await pool.query(
    `SELECT * FROM product_variant WHERE product_id = $1 ORDER BY variant_id`,
    [productId]
  );

  // Get images for all variants
  const variantIds = variantsResult.rows.map(v => v.variant_id);
  let images = [];
  if (variantIds.length > 0) {
    const imagesResult = await pool.query(
      `SELECT * FROM product_image WHERE variant_id = ANY($1)`,
      [variantIds]
    );
    images = imagesResult.rows;
  }

  // Attach images to their variants
  const variants = variantsResult.rows.map(variant => ({
    ...variant,
    images: images.filter(img => img.variant_id === variant.variant_id)
  }));

  // Calculate stock and price info
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  const prices = variants.map(v => parseFloat(v.price));
  const minPrice = prices.length > 0 ? Math.min(...prices) : parseFloat(product.base_price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : parseFloat(product.base_price);

  return {
    ...product,
    _id: product.product_id, // For frontend compatibility
    price: minPrice,
    variants,
    totalStock,
    minPrice,
    maxPrice,
    inStock: totalStock > 0,
    category: {
      id: product.category_id,
      name: product.category_name
    }
  };
};

/**
 * Build WHERE clause from filters
 */
const buildFilters = (params) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (params.category_id) {
    conditions.push(`p.category_id = $${paramIndex}`);
    values.push(params.category_id);
    paramIndex++;
  }

  if (params.search) {
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    values.push(`%${params.search}%`);
    paramIndex++;
  }

  if (params.minPrice) {
    conditions.push(`p.base_price >= $${paramIndex}`);
    values.push(params.minPrice);
    paramIndex++;
  }

  if (params.maxPrice) {
    conditions.push(`p.base_price <= $${paramIndex}`);
    values.push(params.maxPrice);
    paramIndex++;
  }

  return { conditions, values, paramIndex };
};

// ==================== GET ALL PRODUCTS ====================
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category_id, search, sort, minPrice, maxPrice } = req.query;
    const offset = (page - 1) * limit;

    // Build dynamic query
    const { conditions, values, paramIndex } = buildFilters({ category_id, search, minPrice, maxPrice });
    
    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.base_price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.base_price DESC';
    else if (sort === 'name_asc') orderBy = 'ORDER BY p.name ASC';
    else if (sort === 'name_desc') orderBy = 'ORDER BY p.name DESC';
    else if (sort === 'newest') orderBy = 'ORDER BY p.created_at DESC';
    else if (sort === 'oldest') orderBy = 'ORDER BY p.created_at ASC';

    // Count total products
    const countQuery = `SELECT COUNT(*) FROM product p ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get products with category info
    const query = `
      SELECT p.*, c.name as category_name
      FROM product p
      LEFT JOIN category c ON p.category_id = c.category_id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, [...values, limit, offset]);

    // Get variants for all products
    const productIds = result.rows.map(p => p.product_id);
    let variantsMap = {};
    let imagesMap = {};

    if (productIds.length > 0) {
      const variantsResult = await pool.query(
        `SELECT * FROM product_variant WHERE product_id = ANY($1)`,
        [productIds]
      );

      // Group variants by product_id
      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
        variantsMap[v.product_id].push(v);
      });

      // Get images for all variants
      const variantIds = variantsResult.rows.map(v => v.variant_id);
      if (variantIds.length > 0) {
        const imagesResult = await pool.query(
          `SELECT * FROM product_image WHERE variant_id = ANY($1)`,
          [variantIds]
        );
        imagesResult.rows.forEach(img => {
          if (!imagesMap[img.variant_id]) imagesMap[img.variant_id] = [];
          imagesMap[img.variant_id].push(img);
        });
      }
    }

    // Build response
    const products = result.rows.map(product => {
      const variants = (variantsMap[product.product_id] || []).map(v => ({
        ...v,
        images: imagesMap[v.variant_id] || []
      }));

      const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
      const prices = variants.map(v => parseFloat(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : parseFloat(product.base_price);

      return {
        ...product,
        _id: product.product_id,
        price: minPrice,
        stock: totalStock,
        variants,
        category: {
          id: product.category_id,
          name: product.category_name
        }
      };
    });

    res.status(200).json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET PRODUCT BY ID ====================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await getProductWithDetails(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get reviews for this product
    const reviewsResult = await pool.query(
      `SELECT r.*, u.username, u.first_name, u.last_name
       FROM review r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    // Calculate average rating
    const reviews = reviewsResult.rows;
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.status(200).json({
      ...product,
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET PRODUCTS BY CATEGORY ====================
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 12, sort } = req.query;

    // Also get products from subcategories
    const categoryResult = await pool.query(
      `WITH RECURSIVE category_tree AS (
        SELECT category_id FROM category WHERE category_id = $1
        UNION ALL
        SELECT c.category_id FROM category c
        JOIN category_tree ct ON c.parent_category = ct.category_id
      )
      SELECT category_id FROM category_tree`,
      [categoryId]
    );

    const categoryIds = categoryResult.rows.map(r => r.category_id);

    if (categoryIds.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Forward to getProducts with category filter
    req.query.category_id = categoryIds;
    // Modify query to use ANY
    const offset = (page - 1) * limit;

    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.base_price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.base_price DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM product WHERE category_id = ANY($1)`,
      [categoryIds]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM product p
       LEFT JOIN category c ON p.category_id = c.category_id
       WHERE p.category_id = ANY($1)
       ${orderBy}
       LIMIT $2 OFFSET $3`,
      [categoryIds, limit, offset]
    );

    // Get variants (simplified)
    const productIds = result.rows.map(p => p.product_id);
    let variantsMap = {};

    if (productIds.length > 0) {
      const variantsResult = await pool.query(
        `SELECT * FROM product_variant WHERE product_id = ANY($1)`,
        [productIds]
      );
      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
        variantsMap[v.product_id].push(v);
      });
    }

    const products = result.rows.map(product => {
      const variants = variantsMap[product.product_id] || [];
      const prices = variants.map(v => parseFloat(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : parseFloat(product.base_price);
      const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

      return {
        ...product,
        _id: product.product_id,
        price: minPrice,
        stock: totalStock,
        variants,
        category: { id: product.category_id, name: product.category_name }
      };
    });

    res.status(200).json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== SEARCH PRODUCTS ====================
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = `%${q.trim()}%`;
    const offset = (page - 1) * limit;

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM product 
       WHERE name ILIKE $1 OR description ILIKE $1`,
      [searchTerm]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get products
    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM product p
       LEFT JOIN category c ON p.category_id = c.category_id
       WHERE p.name ILIKE $1 OR p.description ILIKE $1
       ORDER BY p.name ASC
       LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset]
    );

    // Get variants
    const productIds = result.rows.map(p => p.product_id);
    let variantsMap = {};

    if (productIds.length > 0) {
      const variantsResult = await pool.query(
        `SELECT * FROM product_variant WHERE product_id = ANY($1)`,
        [productIds]
      );
      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
        variantsMap[v.product_id].push(v);
      });
    }

    const products = result.rows.map(product => {
      const variants = variantsMap[product.product_id] || [];
      const prices = variants.map(v => parseFloat(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : parseFloat(product.base_price);
      const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

      return {
        ...product,
        _id: product.product_id,
        price: minPrice,
        stock: totalStock,
        variants,
        category: { id: product.category_id, name: product.category_name }
      };
    });

    res.status(200).json({
      products,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET FEATURED PRODUCTS ====================
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Featured = products with most reviews or highest rated
    const result = await pool.query(
      `SELECT p.*, c.name as category_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(r.review_id) as review_count
       FROM product p
       LEFT JOIN category c ON p.category_id = c.category_id
       LEFT JOIN review r ON p.product_id = r.product_id
       GROUP BY p.product_id, c.name
       ORDER BY review_count DESC, avg_rating DESC
       LIMIT $1`,
      [limit]
    );

    // Get variants
    const productIds = result.rows.map(p => p.product_id);
    let variantsMap = {};

    if (productIds.length > 0) {
      const variantsResult = await pool.query(
        `SELECT * FROM product_variant WHERE product_id = ANY($1)`,
        [productIds]
      );
      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
        variantsMap[v.product_id].push(v);
      });
    }

    const products = result.rows.map(product => {
      const variants = variantsMap[product.product_id] || [];
      const prices = variants.map(v => parseFloat(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : parseFloat(product.base_price);
      const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

      return {
        ...product,
        _id: product.product_id,
        price: minPrice,
        stock: totalStock,
        variants,
        category: { id: product.category_id, name: product.category_name }
      };
    });

    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== GET NEW ARRIVALS ====================
const getNewArrivals = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const result = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM product p
       LEFT JOIN category c ON p.category_id = c.category_id
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    // Get variants
    const productIds = result.rows.map(p => p.product_id);
    let variantsMap = {};

    if (productIds.length > 0) {
      const variantsResult = await pool.query(
        `SELECT * FROM product_variant WHERE product_id = ANY($1)`,
        [productIds]
      );
      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
        variantsMap[v.product_id].push(v);
      });
    }

    const products = result.rows.map(product => {
      const variants = variantsMap[product.product_id] || [];
      const prices = variants.map(v => parseFloat(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : parseFloat(product.base_price);
      const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

      return {
        ...product,
        _id: product.product_id,
        price: minPrice,
        stock: totalStock,
        variants,
        category: { id: product.category_id, name: product.category_name }
      };
    });

    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== CREATE PRODUCT (Admin) ====================
const createProduct = async (req, res) => {
  try {
    const { name, description, base_price, category_id } = req.body;

    // Validation
    if (!name || !base_price || !category_id) {
      return res.status(400).json({ 
        error: 'Name, base_price, and category_id are required' 
      });
    }

    // Check if category exists
    const categoryCheck = await pool.query(
      'SELECT category_id FROM category WHERE category_id = $1',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category_id' });
    }

    // Create product
    const result = await pool.query(
      `INSERT INTO product (name, description, base_price, category_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, base_price, category_id]
    );

    const product = result.rows[0];

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        ...product,
        _id: product.product_id,
        price: parseFloat(product.base_price),
        variants: []
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== UPDATE PRODUCT (Admin) ====================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, base_price, category_id } = req.body;

    // Check if product exists
    const existingProduct = await pool.query(
      'SELECT * FROM product WHERE product_id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    if (base_price !== undefined) {
      updates.push(`base_price = $${paramIndex}`);
      values.push(base_price);
      paramIndex++;
    }
    if (category_id !== undefined) {
      // Verify category exists
      const categoryCheck = await pool.query(
        'SELECT category_id FROM category WHERE category_id = $1',
        [category_id]
      );
      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category_id' });
      }
      updates.push(`category_id = $${paramIndex}`);
      values.push(category_id);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE product SET ${updates.join(', ')} WHERE product_id = $${paramIndex} RETURNING *`,
      values
    );

    const product = await getProductWithDetails(id);

    res.status(200).json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== DELETE PRODUCT (Admin) ====================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await pool.query(
      'SELECT * FROM product WHERE product_id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product (variants and images will cascade delete)
    await pool.query('DELETE FROM product WHERE product_id = $1', [id]);

    res.status(200).json({
      message: 'Product deleted successfully',
      productId: id
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== VARIANT OPERATIONS ====================

// Get variants for a product
const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT pv.*, 
              COALESCE(json_agg(pi.*) FILTER (WHERE pi.image_id IS NOT NULL), '[]') as images
       FROM product_variant pv
       LEFT JOIN product_image pi ON pv.variant_id = pi.variant_id
       WHERE pv.product_id = $1
       GROUP BY pv.variant_id
       ORDER BY pv.variant_id`,
      [productId]
    );

    res.status(200).json({ variants: result.rows });
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create variant
const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, color, stock_quantity = 0, price } = req.body;

    if (!price) {
      return res.status(400).json({ error: 'Price is required' });
    }

    // Check if product exists
    const productCheck = await pool.query(
      'SELECT product_id FROM product WHERE product_id = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `INSERT INTO product_variant (size, color, stock_quantity, price, product_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [size || null, color || null, stock_quantity, price, productId]
    );

    res.status(201).json({
      message: 'Variant created successfully',
      variant: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'This size/color combination already exists' });
    }
    console.error('Error creating variant:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update variant
const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { size, color, stock_quantity, price } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (size !== undefined) {
      updates.push(`size = $${paramIndex}`);
      values.push(size);
      paramIndex++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(color);
      paramIndex++;
    }
    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramIndex}`);
      values.push(stock_quantity);
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      values.push(price);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE product_variant SET ${updates.join(', ')} WHERE variant_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.status(200).json({
      message: 'Variant updated successfully',
      variant: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating variant:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update variant stock
const updateVariantStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    if (stock_quantity === undefined || stock_quantity < 0) {
      return res.status(400).json({ error: 'Valid stock_quantity is required' });
    }

    const result = await pool.query(
      `UPDATE product_variant SET stock_quantity = $1 WHERE variant_id = $2 RETURNING *`,
      [stock_quantity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.status(200).json({
      message: 'Stock updated successfully',
      variant: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete variant
const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM product_variant WHERE variant_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.status(200).json({
      message: 'Variant deleted successfully',
      variantId: id
    });
  } catch (error) {
    console.error('Error deleting variant:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== IMAGE OPERATIONS ====================

// Add image to variant
const addVariantImage = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }

    // Check if variant exists
    const variantCheck = await pool.query(
      'SELECT variant_id FROM product_variant WHERE variant_id = $1',
      [variantId]
    );

    if (variantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const result = await pool.query(
      `INSERT INTO product_image (image_url, variant_id)
       VALUES ($1, $2)
       RETURNING *`,
      [image_url, variantId]
    );

    res.status(201).json({
      message: 'Image added successfully',
      image: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding image:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete image
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM product_image WHERE image_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.status(200).json({
      message: 'Image deleted successfully',
      imageId: id
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // Product CRUD
  getProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getNewArrivals,
  createProduct,
  updateProduct,
  deleteProduct,
  // Variant operations
  getProductVariants,
  createVariant,
  updateVariant,
  updateVariantStock,
  deleteVariant,
  // Image operations
  addVariantImage,
  deleteImage
};
