// Cart Controller - Handle cart-related operations
const { pool } = require('../config/database');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get or create cart
    let cartResult = await pool.query(
      'SELECT cart_id FROM cart WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      cartResult = await pool.query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING cart_id',
        [userId]
      );
    }

    const cartId = cartResult.rows[0].cart_id;

    // Get cart items with product details
    const itemsResult = await pool.query(
      `SELECT ci.cart_item_id, ci.quantity, ci.added_at,
              p.product_id, p.name, p.base_price, p.stock_quantity,
              p.description, p.artisan_name,
              pv.variant_id, pv.variant_name, pv.price_modifier, pv.sku,
              pv.stock_quantity as variant_stock,
              (SELECT url FROM product_image WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as image
       FROM cart_item ci
       JOIN product p ON ci.product_id = p.product_id
       LEFT JOIN product_variant pv ON ci.variant_id = pv.variant_id
       WHERE ci.cart_id = $1
       ORDER BY ci.added_at DESC`,
      [cartId]
    );

    // Calculate totals
    let totalItems = 0;
    let totalAmount = 0;

    const items = itemsResult.rows.map(item => {
      const price = parseFloat(item.base_price) + (parseFloat(item.price_modifier) || 0);
      const subtotal = price * item.quantity;
      totalItems += item.quantity;
      totalAmount += subtotal;

      return {
        ...item,
        unit_price: price,
        subtotal
      };
    });

    res.status(200).json({
      cart: {
        cart_id: cartId,
        items,
        total_items: totalItems,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart: ' + error.message });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, variant_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Verify product exists and has stock
    const productResult = await pool.query(
      'SELECT product_id, stock_quantity, name FROM product WHERE product_id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let availableStock = productResult.rows[0].stock_quantity;

    // Check variant if provided
    if (variant_id) {
      const variantResult = await pool.query(
        'SELECT variant_id, stock_quantity FROM product_variant WHERE variant_id = $1 AND product_id = $2',
        [variant_id, product_id]
      );

      if (variantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      availableStock = variantResult.rows[0].stock_quantity;
    }

    if (availableStock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Get or create cart
    let cartResult = await pool.query(
      'SELECT cart_id FROM cart WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      cartResult = await pool.query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING cart_id',
        [userId]
      );
    }

    const cartId = cartResult.rows[0].cart_id;

    // Check if item already exists in cart
    const existingItem = await pool.query(
      `SELECT cart_item_id, quantity FROM cart_item 
       WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
      [cartId, product_id, variant_id]
    );

    let result;
    if (existingItem.rows.length > 0) {
      // Update quantity
      const newQuantity = existingItem.rows[0].quantity + quantity;
      if (newQuantity > availableStock) {
        return res.status(400).json({ error: 'Insufficient stock for requested quantity' });
      }

      result = await pool.query(
        'UPDATE cart_item SET quantity = $1 WHERE cart_item_id = $2 RETURNING *',
        [newQuantity, existingItem.rows[0].cart_item_id]
      );
    } else {
      // Insert new item
      result = await pool.query(
        'INSERT INTO cart_item (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
        [cartId, product_id, variant_id, quantity]
      );
    }

    res.status(200).json({ message: 'Item added to cart', item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item: ' + error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Verify cart item belongs to user
    const itemResult = await pool.query(
      `SELECT ci.*, p.stock_quantity, pv.stock_quantity as variant_stock
       FROM cart_item ci
       JOIN cart c ON ci.cart_id = c.cart_id
       JOIN product p ON ci.product_id = p.product_id
       LEFT JOIN product_variant pv ON ci.variant_id = pv.variant_id
       WHERE ci.cart_item_id = $1 AND c.user_id = $2`,
      [id, userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const item = itemResult.rows[0];
    const availableStock = item.variant_id ? item.variant_stock : item.stock_quantity;

    if (quantity === 0) {
      // Remove item
      await pool.query('DELETE FROM cart_item WHERE cart_item_id = $1', [id]);
      return res.status(200).json({ message: 'Item removed from cart' });
    }

    if (quantity > availableStock) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const result = await pool.query(
      'UPDATE cart_item SET quantity = $1 WHERE cart_item_id = $2 RETURNING *',
      [quantity, id]
    );

    res.status(200).json({ message: 'Cart updated', item: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cart: ' + error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM cart_item 
       WHERE cart_item_id = $1 
       AND cart_id IN (SELECT cart_id FROM cart WHERE user_id = $2)
       RETURNING cart_item_id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove item: ' + error.message });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cartResult = await pool.query(
      'SELECT cart_id FROM cart WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length > 0) {
      await pool.query('DELETE FROM cart_item WHERE cart_id = $1', [cartResult.rows[0].cart_id]);
    }

    res.status(200).json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart: ' + error.message });
  }
};

// Sync cart (merge guest cart with user cart)
const syncCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    // Get or create cart
    let cartResult = await pool.query(
      'SELECT cart_id FROM cart WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      cartResult = await pool.query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING cart_id',
        [userId]
      );
    }

    const cartId = cartResult.rows[0].cart_id;

    // Add or update each item
    for (const item of items) {
      const { product_id, variant_id, quantity } = item;

      if (!product_id || !quantity || quantity < 1) continue;

      // Check existing
      const existing = await pool.query(
        `SELECT cart_item_id, quantity FROM cart_item 
         WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
        [cartId, product_id, variant_id]
      );

      if (existing.rows.length > 0) {
        const newQty = existing.rows[0].quantity + quantity;
        await pool.query(
          'UPDATE cart_item SET quantity = $1 WHERE cart_item_id = $2',
          [newQty, existing.rows[0].cart_item_id]
        );
      } else {
        await pool.query(
          'INSERT INTO cart_item (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)',
          [cartId, product_id, variant_id, quantity]
        );
      }
    }

    res.status(200).json({ message: 'Cart synced' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync cart: ' + error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart
};
