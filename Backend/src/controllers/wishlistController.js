const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildWishlistResponse = (row) => ({
  wishlist_id:    row.wishlist_id,
  user_id:        row.user_id,
  variant_id:     row.variant_id,
  created_at:     row.created_at,
  product_id:     row.product_id     || null,
  product_name:   row.product_name   || null,
  product_sku:    row.product_sku    || null,
  price:          row.price != null ? String(row.price) : null,
  size:           row.size           || null,
  stock_quantity: row.stock_quantity != null ? row.stock_quantity : null,
  primary_image:  row.primary_image  || null
});

// GET /api/wishlist
// Authenticated. Returns all wishlist items for the current user
// with full product and variant details.
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page   = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM wishlist WHERE user_id = $1',
      [userId]
    );
    const total = countResult.rows[0].count;

    const result = await pool.query(
      `SELECT
         w.wishlist_id,
         w.user_id,
         w.variant_id,
         w.created_at,
         p.product_id,
         p.name    AS product_name,
         p.sku     AS product_sku,
         p.price,
         pv.size,
         pv.stock_quantity,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image
       FROM wishlist w
       JOIN product_variant pv ON pv.variant_id = w.variant_id
       JOIN product p ON p.product_id = pv.product_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.status(200).json({
      wishlist: result.rows.map(buildWishlistResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
};

// GET /api/wishlist/check/:variantId
// Authenticated. Checks if a specific variant is in the user's wishlist.
// Frontend uses this to show filled/unfilled wishlist icon on product page.
const checkWishlist = async (req, res) => {
  try {
    const userId    = req.user.userId;
    const variantId = parsePositiveInt(req.params.variantId);

    if (!variantId) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const result = await pool.query(
      'SELECT wishlist_id FROM wishlist WHERE user_id = $1 AND variant_id = $2',
      [userId, variantId]
    );

    return res.status(200).json({
      in_wishlist: result.rows.length > 0,
      wishlist_id: result.rows[0]?.wishlist_id || null
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    return res.status(500).json({ error: 'Failed to check wishlist' });
  }
};

// POST /api/wishlist
// Authenticated. Adds a variant to the wishlist.
// Only allowed when stock_quantity = 0.
// If item is in stock the user should add to cart instead.
const addToWishlist = async (req, res) => {
  try {
    const userId    = req.user.userId;
    const variantId = parsePositiveInt(req.body?.variant_id);

    if (!variantId) {
      return res.status(400).json({ error: 'variant_id is required' });
    }

    // Verify variant exists and belongs to an active product
    const variantResult = await pool.query(
      `SELECT
         pv.variant_id,
         pv.stock_quantity,
         pv.size,
         p.name AS product_name
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       WHERE pv.variant_id = $1
         AND p.is_active = true`,
      [variantId]
    );

    if (variantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product variant not found' });
    }

    const variant = variantResult.rows[0];

    // Block if item is in stock — user should add to cart instead
    if (variant.stock_quantity > 0) {
      return res.status(400).json({
        error: 'This item is in stock. Add it to your cart instead.'
      });
    }

    const result = await pool.query(
      `INSERT INTO wishlist (user_id, variant_id)
       VALUES ($1, $2)
       RETURNING wishlist_id, user_id, variant_id, created_at`,
      [userId, variantId]
    );

    return res.status(201).json({
      message: 'Added to wishlist. We will notify you when this item is back in stock.',
      item: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Item is already in your wishlist' });
    }
    console.error('Add to wishlist error:', error);
    return res.status(500).json({ error: 'Failed to add to wishlist' });
  }
};

// DELETE /api/wishlist/:wishlistId
// Authenticated. Removes an item from the wishlist.
const removeFromWishlist = async (req, res) => {
  try {
    const userId     = req.user.userId;
    const wishlistId = parsePositiveInt(req.params.wishlistId);

    if (!wishlistId) {
      return res.status(400).json({ error: 'Invalid wishlist ID' });
    }

    const result = await pool.query(
      `DELETE FROM wishlist
       WHERE wishlist_id = $1
         AND user_id = $2
       RETURNING wishlist_id`,
      [wishlistId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    return res.status(200).json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
};

// DELETE /api/wishlist/variant/:variantId
// Authenticated. Removes by variant_id instead of wishlist_id.
// Useful when frontend only has the variant_id
// e.g. toggling the wishlist icon on a product page.
const removeFromWishlistByVariant = async (req, res) => {
  try {
    const userId    = req.user.userId;
    const variantId = parsePositiveInt(req.params.variantId);

    if (!variantId) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const result = await pool.query(
      `DELETE FROM wishlist
       WHERE user_id = $1
         AND variant_id = $2
       RETURNING wishlist_id`,
      [userId, variantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    return res.status(200).json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist by variant error:', error);
    return res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
};

// DELETE /api/wishlist
// Authenticated. Clears the entire wishlist.
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query('DELETE FROM wishlist WHERE user_id = $1', [userId]);

    return res.status(200).json({ message: 'Wishlist cleared' });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    return res.status(500).json({ error: 'Failed to clear wishlist' });
  }
};

// POST /api/wishlist/:wishlistId/move-to-cart
// Authenticated. Moves a wishlist item to cart when it comes back in stock.
// Removes from wishlist after adding to cart.
const moveToCart = async (req, res) => {
  let client;

  try {
    const userId     = req.user.userId;
    const wishlistId = parsePositiveInt(req.params.wishlistId);

    if (!wishlistId) {
      return res.status(400).json({ error: 'Invalid wishlist ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Get wishlist item
    const wishlistResult = await client.query(
      `SELECT w.wishlist_id, w.variant_id
       FROM wishlist w
       WHERE w.wishlist_id = $1
         AND w.user_id = $2`,
      [wishlistId, userId]
    );

    if (wishlistResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    const { variant_id } = wishlistResult.rows[0];

    // Verify variant is now in stock
    const variantResult = await client.query(
      `SELECT pv.stock_quantity, pv.size, p.name
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       WHERE pv.variant_id = $1
         AND p.is_active = true`,
      [variant_id]
    );

    if (variantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product variant no longer available' });
    }

    const variant = variantResult.rows[0];

    if (variant.stock_quantity === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'This item is still out of stock'
      });
    }

    // Upsert into cart
    const existingCart = await client.query(
      'SELECT cart_id, quantity FROM cart WHERE user_id = $1 AND variant_id = $2',
      [userId, variant_id]
    );

    if (existingCart.rows.length > 0) {
      const newQuantity = existingCart.rows[0].quantity + 1;

      if (newQuantity > variant.stock_quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Only ${variant.stock_quantity} units available. You already have ${existingCart.rows[0].quantity} in your cart.`
        });
      }

      await client.query(
        `UPDATE cart
         SET quantity = $1, updated_at = NOW()
         WHERE user_id = $2 AND variant_id = $3`,
        [newQuantity, userId, variant_id]
      );
    } else {
      await client.query(
        `INSERT INTO cart (user_id, variant_id, quantity)
         VALUES ($1, $2, 1)`,
        [userId, variant_id]
      );
    }

    // Remove from wishlist
    await client.query(
      'DELETE FROM wishlist WHERE wishlist_id = $1',
      [wishlistId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Item moved to cart successfully'
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Move to cart error:', error);
    return res.status(500).json({ error: 'Failed to move item to cart' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getWishlist,
  checkWishlist,
  addToWishlist,
  removeFromWishlist,
  removeFromWishlistByVariant,
  clearWishlist,
  moveToCart
};