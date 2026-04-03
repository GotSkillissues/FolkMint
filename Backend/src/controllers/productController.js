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

// Keep DECIMAL values as strings on write/read boundaries to avoid JS float issues.
const validateMoneyString = (value) => {
  const str = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return null;
  return str;
};

const buildProductResponse = (row) => ({
  product_id: row.product_id,
  name: row.name,
  description: row.description,
  sku: row.sku,
  price: row.price == null ? null : String(row.price),
  category_id: row.category_id,
  category_name: row.category_name || null,
  category_slug: row.category_slug || null,
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const SIZE_SORT_SQL = `
  CASE
    WHEN size IS NULL THEN 0
    WHEN size = 'XS'  THEN 1
    WHEN size = 'S'   THEN 2
    WHEN size = 'M'   THEN 3
    WHEN size = 'L'   THEN 4
    WHEN size = 'XL'  THEN 5
    WHEN size = 'XXL' THEN 6
    ELSE 7
  END, size ASC
`;

// Normalize a size label — trim, uppercase, null if empty.
// Prevents M and m being stored as different sizes.
const normalizeSize = (value) => {
  const trimmed = String(value || '').trim().toUpperCase();
  return trimmed.length ? trimmed : null;
};

// Fires back_in_stock notifications to all users who wishlisted this variant.
// Called non-blocking — notification failure never affects the main response.
const fireRestockNotifications = async (variantId) => {
  try {
    const users = await pool.query(
      'SELECT user_id FROM wishlist WHERE variant_id = $1',
      [variantId]
    );

    if (users.rows.length === 0) return;

    const productResult = await pool.query(
      `SELECT p.name, pv.size
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       WHERE pv.variant_id = $1`,
      [variantId]
    );

    if (productResult.rows.length === 0) return;

    const { name, size } = productResult.rows[0];
    const sizeLabel = size ? ` (Size: ${size})` : '';
    const title = 'Back in stock';
    const message = `${name}${sizeLabel} is back in stock. Add it to your cart before it sells out.`;

    // Bulk insert all notifications in one query — no loop
    const valuesSql = users.rows
      .map((_, i) => `($${i * 4 + 1}, 'back_in_stock', $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, 'variant')`)
      .join(', ');

    const valuesParams = users.rows.flatMap((u) => [
      u.user_id,
      title,
      message,
      variantId
    ]);

    await pool.query(
      `INSERT INTO notification (user_id, type, title, message, related_id, related_type)
       VALUES ${valuesSql}`,
      valuesParams
    );
  } catch (err) {
    console.error('Restock notification error (non-blocking):', err);
  }
};

// =====================================================================
// PRODUCT QUERIES
// =====================================================================

// GET /api/products
// Public. Paginated with optional filters.
// category can be either a category_id or a category_slug.
// If category is present but invalid, returns an empty list rather than all products.
// Admin users may pass ?include_inactive=true to see draft products.
const getProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = normalizeText(req.query.search);
    const sort = req.query.sort;

    // Admins can request drafts by sending ?include_inactive=true with their JWT.
    // req.user is populated by optionalAuth on this route.
    const isAdmin = req.user?.role === 'admin';
    const includeInactive = isAdmin && req.query.include_inactive === 'true';

    let categoryId = null;
    let categoryRequested = false;

    if (req.query.category !== undefined) {
      categoryRequested = true;
      const rawCategory = normalizeText(req.query.category);

      if (rawCategory) {
        const asInt = parsePositiveInt(rawCategory);

        if (asInt) {
          const exists = await pool.query(
            `SELECT category_id
             FROM category
             WHERE category_id = $1
               AND is_active = true`,
            [asInt]
          );

          if (exists.rows.length > 0) {
            categoryId = exists.rows[0].category_id;
          }
        } else {
          const slugResult = await pool.query(
            `SELECT category_id
             FROM category
             WHERE category_slug = $1
               AND is_active = true`,
            [rawCategory]
          );

          if (slugResult.rows.length > 0) {
            categoryId = slugResult.rows[0].category_id;
          }
        }
      }
    }

    if (categoryRequested && !categoryId) {
      return res.status(200).json({
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      });
    }

    // Only filter by is_active when NOT an admin requesting drafts
    const conditions = includeInactive ? [] : ['p.is_active = true'];
    const params = [];
    let idx = 1;

    if (categoryId) {
      conditions.push(`
        p.category_id IN (
          SELECT descendant_category_id
          FROM category_closure
          WHERE ancestor_category_id = $${idx}
        )
      `);
      params.push(categoryId);
      idx++;
    }

    if (search) {
      conditions.push(
        `(p.name ILIKE $${idx} OR p.description ILIKE $${idx} OR p.sku ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const SORT_MAP = {
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      name_asc: 'p.name ASC',
      name_desc: 'p.name DESC',
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC'
    };

    const orderBy = SORT_MAP[sort] || 'p.created_at DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM product p
       ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
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
         ) AS primary_image,
         get_product_total_stock(p.product_id) AS total_stock
       FROM product p
       LEFT JOIN category c ON c.category_id = p.category_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      products: result.rows.map((row) => ({
        ...buildProductResponse(row),
        primary_image: row.primary_image || null,
        all_images: Array.isArray(row.all_images) ? row.all_images : [],
        total_stock: Number.parseInt(row.total_stock, 10)
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// GET /api/products/:id
// Public. Full product with variants, images, and review summary.
const getProductById = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const result = await pool.query(
      `SELECT
         p.product_id, p.name, p.description, p.sku, p.price,
         p.category_id, p.is_active, p.created_at, p.updated_at,
         c.name AS category_name,
         c.category_slug
       FROM product p
       LEFT JOIN category c ON c.category_id = p.category_id
       WHERE p.product_id = $1
         AND p.is_active = true`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];

    const variantsResult = await pool.query(
      `SELECT variant_id, size, stock_quantity, product_id, created_at
       FROM product_variant
       WHERE product_id = $1
       ORDER BY ${SIZE_SORT_SQL}`,
      [productId]
    );

    const imagesResult = await pool.query(
      `SELECT image_id, image_url, is_primary
       FROM product_image
       WHERE product_id = $1
       ORDER BY is_primary DESC, image_id ASC`,
      [productId]
    );

    const productStatsResult = await pool.query(
      `SELECT
         get_product_total_stock($1) AS total_stock,
         get_product_review_count($1) AS review_count,
         get_product_avg_rating($1) AS avg_rating`,
      [productId]
    );
    const productStats = productStatsResult.rows[0];

    return res.status(200).json({
      product: {
        ...buildProductResponse(product),
        variants: variantsResult.rows,
        images: imagesResult.rows,
        total_stock: Number.parseInt(productStats.total_stock, 10),
        review_count: productStats.review_count,
        avg_rating: productStats.avg_rating
          ? String(productStats.avg_rating)
          : '0.0'
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// GET /api/products/:id/similar
// Public. Products from the same category excluding the current product.
const getSimilarProducts = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);
    const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 8));

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const productResult = await pool.query(
      `SELECT category_id
       FROM product
       WHERE product_id = $1
         AND is_active = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { category_id } = productResult.rows[0];

    const result = await pool.query(
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
         ) AS primary_image,
         get_product_total_stock(p.product_id) AS total_stock
       FROM product p
       LEFT JOIN category c ON c.category_id = p.category_id
       WHERE p.category_id = $1
         AND p.product_id != $2
         AND p.is_active = true
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [category_id, productId, limit]
    );

    return res.status(200).json({
      products: result.rows.map((row) => ({
        ...buildProductResponse(row),
        primary_image: row.primary_image || null,
        total_stock: Number.parseInt(row.total_stock, 10)
      }))
    });
  } catch (error) {
    console.error('Get similar products error:', error);
    return res.status(500).json({ error: 'Failed to fetch similar products' });
  }
};

// GET /api/products/:id/you-may-also-like
// Public. Shows products from sibling categories.
// If the category has no parent (e.g. Gift Cards), returns an empty list.
const getYouMayAlsoLike = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);
    const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 8));

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const productResult = await pool.query(
      `SELECT category_id
       FROM product
       WHERE product_id = $1
         AND is_active = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { category_id } = productResult.rows[0];

    const parentResult = await pool.query(
      `SELECT parent_category
       FROM category
       WHERE category_id = $1`,
      [category_id]
    );

    const parentCategory = parentResult.rows[0]?.parent_category || null;

    if (!parentCategory) {
      return res.status(200).json({ products: [] });
    }

    const result = await pool.query(
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
         ) AS primary_image,
         get_product_total_stock(p.product_id) AS total_stock
       FROM product p
       LEFT JOIN category c ON c.category_id = p.category_id
       WHERE p.category_id IN (
         SELECT category_id
         FROM category
         WHERE parent_category = $1
           AND category_id != $2
       )
         AND p.product_id != $3
         AND p.is_active = true
       ORDER BY RANDOM()
       LIMIT $4`,
      [parentCategory, category_id, productId, limit]
    );

    return res.status(200).json({
      products: result.rows.map((row) => ({
        ...buildProductResponse(row),
        primary_image: row.primary_image || null,
        total_stock: Number.parseInt(row.total_stock, 10)
      }))
    });
  } catch (error) {
    console.error('Get you may also like error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

// GET /api/products/top-rated
// Public. Changed to: "Most Sold All Time" as per user request.
const getTopRatedProducts = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    const result = await pool.query(
      `WITH cat_stats AS (
         SELECT p.category_id, COALESCE(SUM(oi.quantity), 0)::int AS cat_units
         FROM product p
         LEFT JOIN order_item oi ON oi.product_id = p.product_id
         LEFT JOIN orders o ON o.order_id = oi.order_id AND o.status != 'cancelled'
         GROUP BY p.category_id
       ),
       hier_stats AS (
         SELECT ancestor_category_id AS cat_id, SUM(cat_units)::int AS total_units
         FROM category_closure 
         JOIN cat_stats ON descendant_category_id = category_id
         GROUP BY ancestor_category_id
       )
       SELECT
         p.product_id, p.name, p.description, p.sku, p.price,
         p.category_id, p.is_active, p.created_at, p.updated_at,
         c.name AS category_name,
         c.category_slug,
         COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
         COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0.0) AS avg_rating,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image,
         COALESCE((
           SELECT JSON_AGG(image_url ORDER BY is_primary DESC, image_id ASC)
           FROM product_image
           WHERE product_id = p.product_id
         ), '[]') AS all_images,
         get_product_total_stock(p.product_id) AS total_stock,
         COALESCE(hs.total_units, 0) AS category_total_sales
       FROM product p
       LEFT JOIN order_item oi ON oi.product_id = p.product_id
       LEFT JOIN orders o ON o.order_id = oi.order_id AND o.status != 'cancelled'
       LEFT JOIN review r ON r.product_id = p.product_id
       LEFT JOIN category c ON c.category_id = p.category_id
       LEFT JOIN hier_stats hs ON hs.cat_id = p.category_id
       WHERE p.is_active = true
       GROUP BY p.product_id, p.name, p.description, p.sku, p.price, 
                p.category_id, p.is_active, p.created_at, p.updated_at,
                c.name, c.category_slug, hs.total_units
       ORDER BY avg_rating DESC, units_sold DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      products: result.rows.map((row) => ({
        ...buildProductResponse(row),
        primary_image: row.primary_image || null,
        secondary_image: row.secondary_image || null,
        total_stock: Number.parseInt(row.total_stock, 10),
        units_sold: row.units_sold,
        avg_rating: String(row.avg_rating)
      }))
    });
  } catch (error) {
    console.error('Get top rated (all-time sold) error:', error);
    return res.status(500).json({ error: 'Failed to fetch best sellers' });
  }
};

// GET /api/products/popular
// Public. Units sold in current calendar month.
const getPopularProducts = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    const result = await pool.query(
      `WITH cat_stats AS (
         SELECT p.category_id, COALESCE(SUM(oi.quantity), 0)::int AS cat_units
         FROM product p
         LEFT JOIN order_item oi ON oi.product_id = p.product_id
         LEFT JOIN orders o ON o.order_id = oi.order_id 
           AND o.status != 'cancelled'
           AND o.created_at >= date_trunc('month', CURRENT_DATE)
         GROUP BY p.category_id
       ),
       hier_stats AS (
         SELECT ancestor_category_id AS cat_id, SUM(cat_units)::int AS total_units
         FROM category_closure 
         JOIN cat_stats ON descendant_category_id = category_id
         GROUP BY ancestor_category_id
       )
       SELECT
         p.product_id, p.name, p.description, p.sku, p.price,
         p.category_id, p.is_active, p.created_at, p.updated_at,
         c.name AS category_name,
         c.category_slug,
         COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image,
         COALESCE((
           SELECT JSON_AGG(image_url ORDER BY is_primary DESC, image_id ASC)
           FROM product_image
           WHERE product_id = p.product_id
         ), '[]') AS all_images,
         get_product_total_stock(p.product_id) AS total_stock,
         COALESCE(hs.total_units, 0) AS category_total_sales
       FROM product p
       LEFT JOIN order_item oi ON oi.product_id = p.product_id
       LEFT JOIN orders o ON o.order_id = oi.order_id 
          AND o.status != 'cancelled'
          AND o.created_at >= date_trunc('month', CURRENT_DATE)
       LEFT JOIN category c ON c.category_id = p.category_id
       LEFT JOIN hier_stats hs ON hs.cat_id = p.category_id
       WHERE p.is_active = true
       GROUP BY p.product_id, p.name, p.description, p.sku, p.price, 
                p.category_id, p.is_active, p.created_at, p.updated_at,
                c.name, c.category_slug, hs.total_units
       ORDER BY units_sold DESC, category_total_sales DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      products: result.rows.map((row) => ({
        ...buildProductResponse(row),
        primary_image: row.primary_image || null,
        secondary_image: row.secondary_image || null,
        total_stock: Number.parseInt(row.total_stock, 10),
        units_sold: row.units_sold
      }))
    });
  } catch (error) {
    console.error('Get popular products (this month) error:', error);
    return res.status(500).json({ error: 'Failed to fetch popular products' });
  }
};

// GET /api/products/recommended
// Authenticated. Personalised by user signals. Falls back to top rated.
const getRecommendedProducts = async (req, res) => {
  const userId = req.user?.userId;
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

  if (!userId) {
    // Guest: Fallback to Top Rated
    return getTopRatedProducts(req, res);
  }

  try {
    const historyCheck = await pool.query(
      `SELECT 1
       FROM orders
       WHERE user_id = $1
         AND status = 'delivered'
       LIMIT 1`,
      [userId]
    );

    if (historyCheck.rows.length === 0) {
      return getTopRatedProducts(req, res);
    }

    const result = await pool.query(
      `WITH signals AS (
         SELECT p.category_id, (oi.quantity * 10) AS score
         FROM order_item oi
         JOIN orders o ON o.order_id = oi.order_id
         JOIN product p ON p.product_id = oi.product_id
         WHERE o.user_id = $1
           AND o.status != 'cancelled'
         UNION ALL
         SELECT p.category_id, 4 AS score
         FROM review r
         JOIN product p ON p.product_id = r.product_id
         WHERE r.user_id = $1
         UNION ALL
         SELECT p.category_id, 3 AS score
         FROM wishlist w
         JOIN product_variant pv ON pv.variant_id = w.variant_id
         JOIN product p ON p.product_id = pv.product_id
         WHERE w.user_id = $1
         UNION ALL
         SELECT p.category_id, (c.quantity * 2) AS score
         FROM cart c
         JOIN product_variant pv ON pv.variant_id = c.variant_id
         JOIN product p ON p.product_id = pv.product_id
         WHERE c.user_id = $1
       ),
       category_scores AS (
         SELECT category_id, COALESCE(SUM(score), 0)::int AS total_score
         FROM signals
         GROUP BY category_id
       ),
       already_purchased AS (
         SELECT DISTINCT oi.product_id
         FROM order_item oi
         JOIN orders o ON o.order_id = oi.order_id
         WHERE o.user_id = $1
           AND o.status = 'delivered'
       )
       SELECT
         p.product_id, p.name, p.description, p.sku, p.price,
         p.category_id, p.is_active, p.created_at, p.updated_at,
         c.name AS category_name,
         c.category_slug,
         COALESCE(cs.total_score, 0) AS total_score,
         COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image,
         COALESCE((
           SELECT JSON_AGG(image_url ORDER BY is_primary DESC, image_id ASC)
           FROM product_image
           WHERE product_id = p.product_id
         ), '[]') AS all_images,
         get_product_total_stock(p.product_id) AS total_stock
       FROM product p
       LEFT JOIN category_scores cs ON cs.category_id = p.category_id
       LEFT JOIN category c ON c.category_id = p.category_id
       LEFT JOIN order_item oi ON oi.product_id = p.product_id
       WHERE p.is_active = true
         AND p.product_id NOT IN (SELECT product_id FROM already_purchased)
       GROUP BY p.product_id, p.name, p.description, p.sku, p.price, 
                p.category_id, p.is_active, p.created_at, p.updated_at,
                c.name, c.category_slug, cs.total_score
       ORDER BY total_score DESC, p.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    if (result.rows.length === 0) {
      return getTopRatedProducts(req, res);
    }

    return res.status(200).json({
      source: 'personalised',
      products: result.rows.map((row) => ({
        ...buildProductResponse(row),
        primary_image: row.primary_image || null,
        all_images: Array.isArray(row.all_images) ? row.all_images : [],
        total_stock: Number.parseInt(row.total_stock, 10),
        total_score: row.total_score
      }))
    });
  } catch (error) {
    console.error('Get recommended error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

// GET /api/products/:id/can-review
// Authenticated.
const canReview = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const existingReview = await pool.query(
      `SELECT 1
       FROM review
       WHERE user_id = $1
         AND product_id = $2`,
      [userId, productId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(200).json({
        can_review: false,
        reason: 'Already reviewed'
      });
    }

    const purchaseCheck = await pool.query(
      'SELECT has_purchased_product($1, $2) AS can_review',
      [userId, productId]
    );

    const canReviewProduct = Boolean(purchaseCheck.rows[0]?.can_review);

    return res.status(200).json({
      can_review: canReviewProduct,
      reason:
        canReviewProduct
          ? null
          : 'No delivered order found for this product'
    });
  } catch (error) {
    console.error('Can review error:', error);
    return res.status(500).json({ error: 'Failed to check review eligibility' });
  }
};

// =====================================================================
// PRODUCT CRUD (Admin)
// =====================================================================

// POST /api/products
// Admin only.
// Supports draft save via is_active = false.
// Trigger auto-creates the default NULL variant.
const createProduct = async (req, res) => {
  let client;

  try {
    const body = req.body || {};
    const name = normalizeText(body.name);
    const description = normalizeOptionalText(body.description);
    const price = validateMoneyString(body.price);
    const category_id = parsePositiveInt(body.category_id);
    const is_active = body.is_active !== false;

    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!price) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const categoryCheck = await client.query(
      `SELECT category_id
       FROM category
       WHERE category_id = $1
         AND is_active = true`,
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Category not found' });
    }

    const result = await client.query(
      `INSERT INTO product (name, description, price, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING product_id, name, description, sku, price,
                 category_id, is_active, created_at, updated_at`,
      [name, description, price, category_id, is_active]
    );

    const product = result.rows[0];
    const sku = 'FM-' + String(product.product_id).padStart(6, '0');

    const skuUpdate = await client.query(
      `UPDATE product
       SET sku = $1,
           updated_at = NOW()
       WHERE product_id = $2
       RETURNING product_id, name, description, sku, price,
                 category_id, is_active, created_at, updated_at`,
      [sku, product.product_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: is_active
        ? 'Product created successfully'
        : 'Product draft saved successfully',
      product: buildProductResponse(skuUpdate.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Create product error:', error);
    return res.status(500).json({ error: 'Failed to create product' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// PATCH /api/products/:id
// Admin only.
const updateProduct = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const existing = await pool.query(
      `SELECT product_id
       FROM product
       WHERE product_id = $1`,
      [productId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const body = req.body || {};
    const updates = [];
    const params = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = normalizeText(body.name);
      if (!name) {
        return res.status(400).json({ error: 'Product name cannot be empty' });
      }
      updates.push(`name = $${idx}`);
      params.push(name);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      updates.push(`description = $${idx}`);
      params.push(normalizeOptionalText(body.description));
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'price')) {
      const price = validateMoneyString(body.price);
      if (!price) {
        return res.status(400).json({ error: 'Valid price is required' });
      }
      updates.push(`price = $${idx}`);
      params.push(price);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'category_id')) {
      const category_id = parsePositiveInt(body.category_id);

      if (!category_id) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      const categoryCheck = await pool.query(
        `SELECT category_id
         FROM category
         WHERE category_id = $1
           AND is_active = true`,
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Category not found' });
      }

      updates.push(`category_id = $${idx}`);
      params.push(category_id);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
      // Block publishing if the product has no variants or no images
      if (body.is_active === true) {
        const readinessCheck = await pool.query(
          `SELECT
             EXISTS (
               SELECT 1 FROM product_variant WHERE product_id = $1
             ) AS has_variants,
             EXISTS (
               SELECT 1 FROM product_image WHERE product_id = $1
             ) AS has_images`,
          [productId]
        );

        const { has_variants, has_images } = readinessCheck.rows[0];

        if (!has_variants || !has_images) {
          return res.status(400).json({
            error: 'Cannot publish a product without at least one variant and one image. Add them first.'
          });
        }
      }

      updates.push(`is_active = $${idx}`);
      params.push(body.is_active === true);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(productId);

    const result = await pool.query(
      `UPDATE product
       SET ${updates.join(', ')}
       WHERE product_id = $${idx}
       RETURNING product_id, name, description, sku, price,
                 category_id, is_active, created_at, updated_at`,
      params
    );

    return res.status(200).json({
      message: 'Product updated successfully',
      product: buildProductResponse(result.rows[0])
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ error: 'Failed to update product' });
  }
};

// DELETE /api/products/:id
// Admin only. Hard delete of the product and all associated data (images, variants, reviews, cart, wishlist, order items).
const deleteProduct = async (req, res) => {
  let client;
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT product_id FROM product WHERE product_id = $1`,
      [productId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    // Explicitly delete from all related tables to ensure "complete removal"
    // Many have CASCADE, but let's be thorough for any that don't (like order_item).
    
    // 1. Delete reviews
    await client.query('DELETE FROM review WHERE product_id = $1', [productId]);

    // 2. Delete product images
    await client.query('DELETE FROM product_image WHERE product_id = $1', [productId]);

    // 3. Delete from order_item (necessary since FK doesn't CASCADE by default)
    await client.query('DELETE FROM order_item WHERE product_id = $1', [productId]);

    // 4. Delete from cart and wishlist (via variants)
    const variantResult = await client.query('SELECT variant_id FROM product_variant WHERE product_id = $1', [productId]);
    const variantIds = variantResult.rows.map(v => v.variant_id);

    if (variantIds.length > 0) {
      await client.query('DELETE FROM cart WHERE variant_id = ANY($1)', [variantIds]);
      await client.query('DELETE FROM wishlist WHERE variant_id = ANY($1)', [variantIds]);
      await client.query('DELETE FROM product_variant WHERE product_id = $1', [productId]);
    }

    // 5. Finally, delete the product itself
    await client.query('DELETE FROM product WHERE product_id = $1', [productId]);

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Product and all associated records deleted successfully from the database' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Delete product error:', error);
    return res.status(500).json({ error: 'Failed to delete product completely' });
  } finally {
    if (client) client.release();
  }
};


// =====================================================================
// VARIANT CRUD (Admin)
// =====================================================================

// GET /api/products/:id/variants
const getVariants = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const productCheck = await pool.query(
      `SELECT product_id
       FROM product
       WHERE product_id = $1`,
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `SELECT variant_id, size, stock_quantity, product_id, created_at
       FROM product_variant
       WHERE product_id = $1
       ORDER BY ${SIZE_SORT_SQL}`,
      [productId]
    );

    return res.status(200).json({ variants: result.rows });
  } catch (error) {
    console.error('Get variants error:', error);
    return res.status(500).json({ error: 'Failed to fetch variants' });
  }
};

// POST /api/products/:id/variants
// Admin only. Adds a new variant.
// If this is the first sized variant, deletes the auto-created NULL variant.
const createVariant = async (req, res) => {
  let client;

  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const size = normalizeSize(req.body?.size);
    const stock_quantity = Number.parseInt(req.body?.stock_quantity, 10) || 0;

    if (stock_quantity < 0) {
      return res.status(400).json({ error: 'Stock quantity cannot be negative' });
    }

    const productCheck = await pool.query(
      `SELECT product_id
       FROM product
       WHERE product_id = $1`,
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Block adding a NULL-size variant if sized variants already exist
    if (size === null) {
      const sizedCheck = await client.query(
        `SELECT 1 FROM product_variant
         WHERE product_id = $1
           AND size IS NOT NULL
         LIMIT 1`,
        [productId]
      );
      if (sizedCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Cannot add an unsized variant to a product that already has sized variants.'
        });
      }
    }

    if (size !== null) {
      const nullVariant = await client.query(
        `SELECT variant_id
         FROM product_variant
         WHERE product_id = $1
           AND size IS NULL`,
        [productId]
      );

      if (nullVariant.rows.length > 0) {
        const nullVariantId = nullVariant.rows[0].variant_id;

        const nullOrdered = await client.query(
          `SELECT 1
           FROM order_item
           WHERE variant_id = $1
           LIMIT 1`,
          [nullVariantId]
        );

        const variantCount = await client.query(
          `SELECT COUNT(*)::int AS count
           FROM product_variant
           WHERE product_id = $1`,
          [productId]
        );

        if (nullOrdered.rows.length === 0 && variantCount.rows[0].count === 1) {
          await client.query(
            `DELETE FROM product_variant
             WHERE variant_id = $1`,
            [nullVariantId]
          );
        }
      }
    }

    const result = await client.query(
      `INSERT INTO product_variant (product_id, size, stock_quantity)
       VALUES ($1, $2, $3)
       RETURNING variant_id, size, stock_quantity, product_id, created_at`,
      [productId, size, stock_quantity]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Variant created successfully',
      variant: result.rows[0]
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A variant with this size already exists for this product'
      });
    }

    console.error('Create variant error:', error);
    return res.status(500).json({ error: 'Failed to create variant' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// PATCH /api/products/variants/:variantId
// Admin only. Updates size or stock.
// Fires back_in_stock notifications if stock crosses 0 → positive.
const updateVariant = async (req, res) => {
  try {
    const variantId = parsePositiveInt(req.params.variantId);

    if (!variantId) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    // Fetch previous stock_quantity and product_id — needed for restock check
    const existing = await pool.query(
      `SELECT variant_id, stock_quantity, product_id
       FROM product_variant
       WHERE variant_id = $1`,
      [variantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const previousStock = Number(existing.rows[0].stock_quantity);
    const productId = existing.rows[0].product_id;

    const body = req.body || {};
    const updates = [];
    const params = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'size')) {
      const normalizedSize = normalizeSize(body.size);

      // Block setting size to NULL if other sized variants exist
      if (normalizedSize === null) {
        const sizedCheck = await pool.query(
          `SELECT 1 FROM product_variant
           WHERE product_id = $1
             AND size IS NOT NULL
             AND variant_id != $2
           LIMIT 1`,
          [productId, variantId]
        );
        if (sizedCheck.rows.length > 0) {
          return res.status(400).json({
            error: 'Cannot set size to null while other sized variants exist. Remove them first.'
          });
        }
      }

      updates.push(`size = $${idx}`);
      params.push(normalizedSize);
      idx++;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'stock_quantity')) {
      const stock_quantity = Number.parseInt(body.stock_quantity, 10);

      if (Number.isNaN(stock_quantity) || stock_quantity < 0) {
        return res.status(400).json({
          error: 'Stock quantity must be a non-negative integer'
        });
      }

      updates.push(`stock_quantity = $${idx}`);
      params.push(stock_quantity);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(variantId);

    const result = await pool.query(
      `UPDATE product_variant
       SET ${updates.join(', ')}
       WHERE variant_id = $${idx}
       RETURNING variant_id, size, stock_quantity, product_id, created_at`,
      params
    );

    const updated = result.rows[0];
    const newStock = Number(updated.stock_quantity);

    // Fire restock notifications non-blocking if stock crossed 0 → positive
    if (previousStock === 0 && newStock > 0) {
      fireRestockNotifications(variantId).catch(() => {});
    }

    return res.status(200).json({
      message: 'Variant updated successfully',
      variant: updated
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A variant with this size already exists for this product'
      });
    }

    console.error('Update variant error:', error);
    return res.status(500).json({ error: 'Failed to update variant' });
  }
};

// DELETE /api/products/variants/:variantId
// Admin only. Blocked only if it is the last variant.
const deleteVariant = async (req, res) => {
  try {
    const variantId = parsePositiveInt(req.params.variantId);

    if (!variantId) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const existing = await pool.query(
      `SELECT variant_id, product_id
       FROM product_variant
       WHERE variant_id = $1`,
      [variantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const { product_id } = existing.rows[0];

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM product_variant
       WHERE product_id = $1`,
      [product_id]
    );

    if (countResult.rows[0].count <= 1) {
      return res.status(409).json({
        error: 'Cannot delete the last variant. A product must have at least one variant.'
      });
    }

    await pool.query(
      `DELETE FROM product_variant
       WHERE variant_id = $1`,
      [variantId]
    );

    return res.status(200).json({ message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Delete variant error:', error);
    return res.status(500).json({ error: 'Failed to delete variant' });
  }
};

// =====================================================================
// IMAGE CRUD (Admin)
// =====================================================================

// GET /api/products/:id/images
const getImages = async (req, res) => {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const productCheck = await pool.query(
      `SELECT product_id
       FROM product
       WHERE product_id = $1`,
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `SELECT image_id, image_url, is_primary
       FROM product_image
       WHERE product_id = $1
       ORDER BY is_primary DESC, image_id ASC`,
      [productId]
    );

    return res.status(200).json({ images: result.rows });
  } catch (error) {
    console.error('Get images error:', error);
    return res.status(500).json({ error: 'Failed to fetch images' });
  }
};

// POST /api/products/:id/images
// Admin only. First image is always primary.
const addImage = async (req, res) => {
  let client;

  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const image_url = normalizeText(req.body?.image_url);
    const is_primary = req.body?.is_primary === true;

    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }

    const productCheck = await pool.query(
      `SELECT product_id
       FROM product
       WHERE product_id = $1`,
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existingImages = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM product_image
       WHERE product_id = $1`,
      [productId]
    );

    const isFirst = existingImages.rows[0].count === 0;
    const makesPrimary = is_primary || isFirst;

    if (makesPrimary) {
      await client.query(
        `UPDATE product_image
         SET is_primary = false
         WHERE product_id = $1`,
        [productId]
      );
    }

    const result = await client.query(
      `INSERT INTO product_image (product_id, image_url, is_primary)
       VALUES ($1, $2, $3)
       RETURNING image_id, image_url, is_primary, product_id`,
      [productId, image_url, makesPrimary]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Image added successfully',
      image: result.rows[0]
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }

    console.error('Add image error:', error);
    return res.status(500).json({ error: 'Failed to add image' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// PATCH /api/products/images/:imageId/primary
// Admin only.
const setPrimaryImage = async (req, res) => {
  let client;

  try {
    const imageId = parsePositiveInt(req.params.imageId);

    if (!imageId) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const existing = await pool.query(
      `SELECT image_id, product_id
       FROM product_image
       WHERE image_id = $1`,
      [imageId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { product_id } = existing.rows[0];

    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(
      `UPDATE product_image
       SET is_primary = false
       WHERE product_id = $1`,
      [product_id]
    );

    const result = await client.query(
      `UPDATE product_image
       SET is_primary = true
       WHERE image_id = $1
       RETURNING image_id, image_url, is_primary, product_id`,
      [imageId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Primary image updated successfully',
      image: result.rows[0]
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }

    console.error('Set primary image error:', error);
    return res.status(500).json({ error: 'Failed to set primary image' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// DELETE /api/products/images/:imageId
// Admin only. Blocked if it is the only image.
// If the primary image is deleted, promotes the next image automatically.
const deleteImage = async (req, res) => {
  let client;

  try {
    const imageId = parsePositiveInt(req.params.imageId);

    if (!imageId) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const existing = await pool.query(
      `SELECT image_id, product_id, is_primary
       FROM product_image
       WHERE image_id = $1`,
      [imageId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { product_id, is_primary } = existing.rows[0];

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM product_image
       WHERE product_id = $1`,
      [product_id]
    );

    if (countResult.rows[0].count <= 1) {
      return res.status(409).json({
        error: 'Cannot delete the only image. A product must have at least one image.'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM product_image
       WHERE image_id = $1`,
      [imageId]
    );

    if (is_primary) {
      await client.query(
        `UPDATE product_image
         SET is_primary = true
         WHERE image_id = (
           SELECT image_id
           FROM product_image
           WHERE product_id = $1
           ORDER BY image_id ASC
           LIMIT 1
         )`,
        [product_id]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }

    console.error('Delete image error:', error);
    return res.status(500).json({ error: 'Failed to delete image' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  // Public
  getProducts,
  getProductById,
  getSimilarProducts,
  getYouMayAlsoLike,
  getTopRatedProducts,
  getPopularProducts,
  getRecommendedProducts,
  canReview,

  // Product CRUD
  createProduct,
  updateProduct,
  deleteProduct,

  // Variant CRUD
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,

  // Image CRUD
  getImages,
  addImage,
  setPrimaryImage,
  deleteImage
};