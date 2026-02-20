// Wishlist Controller - Handle user wishlist operations
const { pool } = require('../config/database');

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM wishlist WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT w.wishlist_id, w.created_at,
              p.product_id, p.name, p.description, p.base_price,
              c.name as category_name,
              (SELECT pi.image_url FROM product_image pi
               JOIN product_variant pv ON pi.variant_id = pv.variant_id
               WHERE pv.product_id = p.product_id LIMIT 1) as image_url,
              (SELECT MIN(pv.price) FROM product_variant pv WHERE pv.product_id = p.product_id) as min_price,
              (SELECT SUM(pv.stock_quantity) FROM product_variant pv WHERE pv.product_id = p.product_id) as total_stock
       FROM wishlist w
       JOIN product p ON w.product_id = p.product_id
       JOIN category c ON p.category_id = c.category_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.status(200).json({
      wishlist: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist: ' + error.message });
  }
};

// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    // Verify product exists
    const productCheck = await pool.query(
      'SELECT product_id FROM product WHERE product_id = $1',
      [product_id]
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `INSERT INTO wishlist (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING
       RETURNING *`,
      [userId, product_id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Product already in wishlist' });
    }

    res.status(201).json({ message: 'Added to wishlist', item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to wishlist: ' + error.message });
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM wishlist WHERE wishlist_id = $1 AND user_id = $2 RETURNING wishlist_id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.status(200).json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist: ' + error.message });
  }
};

// Clear entire wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.query('DELETE FROM wishlist WHERE user_id = $1', [userId]);
    res.status(200).json({ message: 'Wishlist cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear wishlist: ' + error.message });
  }
};

// Move wishlist item to cart
const moveToCart = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const { id } = req.params;
    const { variant_id } = req.body;

    if (!variant_id) {
      return res.status(400).json({ error: 'variant_id is required' });
    }

    // Get wishlist item
    const wishlistResult = await client.query(
      'SELECT w.*, p.product_id FROM wishlist w JOIN product p ON w.product_id = p.product_id WHERE w.wishlist_id = $1 AND w.user_id = $2',
      [id, userId]
    );

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    const { product_id } = wishlistResult.rows[0];

    // Validate variant belongs to product and has stock
    const variantResult = await client.query(
      'SELECT * FROM product_variant WHERE variant_id = $1 AND product_id = $2',
      [variant_id, product_id]
    );

    if (variantResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid variant for this product' });
    }

    if (variantResult.rows[0].stock_quantity < 1) {
      return res.status(400).json({ error: 'This variant is out of stock' });
    }

    // Get or create cart
    let cartResult = await client.query(
      'SELECT cart_id FROM cart WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      cartResult = await client.query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING cart_id',
        [userId]
      );
    }

    const cartId = cartResult.rows[0].cart_id;

    // Add to cart (or increment quantity if already exists)
    await client.query(
      `INSERT INTO cart_item (cart_id, variant_id, quantity)
       VALUES ($1, $2, 1)
       ON CONFLICT (cart_id, variant_id) DO UPDATE
       SET quantity = cart_item.quantity + 1, updated_at = NOW()`,
      [cartId, variant_id]
    );

    // Remove from wishlist
    await client.query('DELETE FROM wishlist WHERE wishlist_id = $1', [id]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Item moved to cart' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to move item to cart: ' + error.message });
  } finally {
    client.release();
  }
};

// Check if a product is in the user's wishlist
const checkWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id } = req.params;

    const result = await pool.query(
      'SELECT wishlist_id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );

    res.status(200).json({ in_wishlist: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check wishlist: ' + error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart,
  checkWishlist
};
