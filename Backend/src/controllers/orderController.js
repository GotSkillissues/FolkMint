// Order Controller - Handle order-related operations
const { pool } = require('../config/database');

// Get all orders (Admin: all, User: own)
const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT o.*, u.username, u.email,
             a.street, a.city, a.state, a.country,
             (SELECT COUNT(*) FROM order_item WHERE order_id = o.order_id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      LEFT JOIN address a ON o.shipping_address_id = a.address_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      query += ` AND o.user_id = $${idx}`;
      params.push(userId);
      idx++;
    }

    if (status) {
      query += ` AND o.status = $${idx}`;
      params.push(status);
      idx++;
    }

    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY o.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders: ' + error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const orderResult = await pool.query(
      `SELECT o.*, u.username, u.email, u.first_name, u.last_name,
              a.street, a.city, a.state, a.postal_code, a.country
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN address a ON o.shipping_address_id = a.address_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check ownership
    if (!isAdmin && order.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order items with product details
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name, p.base_price,
              pv.variant_name, pv.sku,
              (SELECT url FROM product_image WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as image
       FROM order_item oi
       JOIN product p ON oi.product_id = p.product_id
       LEFT JOIN product_variant pv ON oi.variant_id = pv.variant_id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Get payment info
    const paymentResult = await pool.query(
      `SELECT p.*, pm.type as payment_type
       FROM payment p
       LEFT JOIN payment_method pm ON p.payment_method_id = pm.payment_method_id
       WHERE p.order_id = $1`,
      [id]
    );

    res.status(200).json({
      order: {
        ...order,
        items: itemsResult.rows,
        payment: paymentResult.rows[0] || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order: ' + error.message });
  }
};

// Create order from cart
const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.userId;
    const { shipping_address_id, payment_method_id } = req.body;

    if (!shipping_address_id) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    // Verify address belongs to user
    const addressResult = await client.query(
      'SELECT address_id FROM address WHERE address_id = $1 AND user_id = $2',
      [shipping_address_id, userId]
    );

    if (addressResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid shipping address' });
    }

    // Get cart items
    const cartResult = await client.query(
      `SELECT ci.*, p.name, p.base_price, p.stock_quantity,
              pv.variant_id, pv.price_modifier, pv.stock_quantity as variant_stock
       FROM cart c
       JOIN cart_item ci ON c.cart_id = ci.cart_id
       JOIN product p ON ci.product_id = p.product_id
       LEFT JOIN product_variant pv ON ci.variant_id = pv.variant_id
       WHERE c.user_id = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate total and validate stock
    let totalAmount = 0;
    const items = [];

    for (const item of cartResult.rows) {
      const stock = item.variant_id ? item.variant_stock : item.stock_quantity;
      if (stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.name}` 
        });
      }

      const price = parseFloat(item.base_price) + (parseFloat(item.price_modifier) || 0);
      totalAmount += price * item.quantity;
      items.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: price
      });
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_amount, shipping_address_id)
       VALUES ($1, 'pending', $2, $3)
       RETURNING *`,
      [userId, totalAmount, shipping_address_id]
    );

    const orderId = orderResult.rows[0].order_id;

    // Create order items and update stock
    for (const item of items) {
      await client.query(
        `INSERT INTO order_item (order_id, product_id, variant_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.variant_id, item.quantity, item.unit_price]
      );

      // Update stock
      if (item.variant_id) {
        await client.query(
          'UPDATE product_variant SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2',
          [item.quantity, item.variant_id]
        );
      } else {
        await client.query(
          'UPDATE product SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // Create payment record if payment method provided
    if (payment_method_id) {
      await client.query(
        `INSERT INTO payment (order_id, payment_method_id, amount, status)
         VALUES ($1, $2, $3, 'pending')`,
        [orderId, payment_method_id, totalAmount]
      );
    }

    // Clear cart
    const cartId = cartResult.rows[0].cart_id;
    await client.query('DELETE FROM cart_item WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    res.status(201).json({ 
      message: 'Order created', 
      order: orderResult.rows[0],
      items_count: items.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create order: ' + error.message });
  } finally {
    client.release();
  }
};

// Update order status (Admin only)
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If cancelled, restore stock
    if (status === 'cancelled') {
      const items = await pool.query(
        'SELECT product_id, variant_id, quantity FROM order_item WHERE order_id = $1',
        [id]
      );

      for (const item of items.rows) {
        if (item.variant_id) {
          await pool.query(
            'UPDATE product_variant SET stock_quantity = stock_quantity + $1 WHERE variant_id = $2',
            [item.quantity, item.variant_id]
          );
        } else {
          await pool.query(
            'UPDATE product SET stock_quantity = stock_quantity + $1 WHERE product_id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    res.status(200).json({ message: 'Order updated', order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order: ' + error.message });
  }
};

// Cancel order (User can cancel own pending orders)
const cancelOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check permission and status
    if (!isAdmin && order.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!isAdmin && order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    // Update order status
    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2',
      ['cancelled', id]
    );

    // Restore stock
    const items = await client.query(
      'SELECT product_id, variant_id, quantity FROM order_item WHERE order_id = $1',
      [id]
    );

    for (const item of items.rows) {
      if (item.variant_id) {
        await client.query(
          'UPDATE product_variant SET stock_quantity = stock_quantity + $1 WHERE variant_id = $2',
          [item.quantity, item.variant_id]
        );
      } else {
        await client.query(
          'UPDATE product SET stock_quantity = stock_quantity + $1 WHERE product_id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // Update payment status
    await client.query(
      'UPDATE payment SET status = $1 WHERE order_id = $2',
      ['refunded', id]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: 'Order cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel order: ' + error.message });
  } finally {
    client.release();
  }
};

// Delete order (Admin only)
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM orders WHERE order_id = $1 RETURNING order_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order: ' + error.message });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  cancelOrder,
  deleteOrder
};
