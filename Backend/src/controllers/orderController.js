// Order Controller - Handle order-related operations
const { pool } = require('../config/database');
const { createNotificationInternal } = require('./notificationController');

// Get all orders (Admin: all, User: own)
const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    const whereClauses = ['1=1'];
    const countParams = [];
    let countIdx = 1;

    let query = `
      SELECT o.*, u.username, u.email,
             a.street, a.city, a.country,
             (SELECT COUNT(*) FROM order_item WHERE order_id = o.order_id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      LEFT JOIN address a ON o.address_id = a.address_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      query += ` AND o.user_id = $${idx}`;
      params.push(userId);
      whereClauses.push(`o.user_id = $${countIdx}`);
      countParams.push(userId);
      countIdx++;
      idx++;
    }

    if (status) {
      query += ` AND o.status = $${idx}`;
      params.push(status);
      whereClauses.push(`o.status = $${countIdx}`);
      countParams.push(status);
      countIdx++;
      idx++;
    }

    const countQuery = `SELECT COUNT(*) FROM orders o WHERE ${whereClauses.join(' AND ')}`;
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows?.[0]?.count || '0', 10);

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
              a.street, a.city, a.postal_code, a.country
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN address a ON o.address_id = a.address_id
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
              (SELECT pi.image_url FROM product_image pi
               JOIN product_variant pv2 ON pi.variant_id = pv2.variant_id
               WHERE pv2.product_id = p.product_id AND pi.is_primary = true LIMIT 1) as image
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
    const { shipping_address_id, payment_method_id, coupon_code } = req.body;

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
          `SELECT ci.*, p.name, p.base_price,
            pv.variant_id, pv.price as variant_price, pv.stock_quantity as variant_stock
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
      if (!item.variant_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Product ${item.name} does not have a valid purchasable variant`
        });
      }

      const stock = Number(item.variant_stock || 0);
      if (stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.name}` 
        });
      }

      const price = parseFloat(item.variant_price ?? item.base_price ?? 0);
      totalAmount += price * item.quantity;
      items.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: price
      });
    }

    // --- Coupon validation and discount ---
    let discountAmount = 0;
    let appliedCoupon = null;

    if (coupon_code) {
      const couponResult = await client.query(
        'SELECT * FROM coupon WHERE code = $1',
        [coupon_code.toUpperCase()]
      );
      if (couponResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid coupon code' });
      }
      const coupon = couponResult.rows[0];
      if (!coupon.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Coupon is no longer active' });
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Coupon has expired' });
      }
      if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Coupon usage limit reached' });
      }
      if (totalAmount < parseFloat(coupon.min_order_amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Minimum order amount of ${coupon.min_order_amount} required for this coupon`
        });
      }
      if (coupon.type === 'percentage') {
        discountAmount = (totalAmount * parseFloat(coupon.value)) / 100;
        if (coupon.max_discount_amount) {
          discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
        }
      } else {
        discountAmount = Math.min(parseFloat(coupon.value), totalAmount);
      }
      discountAmount = parseFloat(discountAmount.toFixed(2));
      totalAmount = parseFloat((totalAmount - discountAmount).toFixed(2));
      appliedCoupon = coupon;
      await client.query(
        'UPDATE coupon SET used_count = used_count + 1 WHERE coupon_id = $1',
        [coupon.coupon_id]
      );
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_amount, address_id)
       VALUES ($1, 'pending', $2, $3)
       RETURNING *`,
      [userId, totalAmount, shipping_address_id]
    );

    const orderId = orderResult.rows[0].order_id;

    if (appliedCoupon) {
      await client.query(
        `INSERT INTO order_coupon (order_id, coupon_id, discount_amount)
         VALUES ($1, $2, $3)`,
        [orderId, appliedCoupon.coupon_id, discountAmount]
      );
    }

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

    // Fire notification (non-blocking)
    createNotificationInternal(
      userId, 'order_placed', 'Order Placed',
      `Your order #${orderId} has been placed. Total: ${totalAmount}.`,
      orderId, 'order'
    ).catch(() => {});

    res.status(201).json({
      message: 'Order created',
      order: orderResult.rows[0],
      items_count: items.length,
      ...(appliedCoupon && { coupon_applied: appliedCoupon.code, discount_amount: discountAmount })
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
        }
      }
    }

    // Fire notification based on new status (non-blocking)
    const notifMap = {
      shipped:   ['order_shipped',   'Order Shipped',   `Your order #${id} has been shipped!`],
      delivered: ['order_delivered', 'Order Delivered', `Your order #${id} has been delivered.`],
      cancelled: ['order_cancelled', 'Order Cancelled', `Your order #${id} was cancelled by our team.`],
      confirmed: ['order_confirmed', 'Order Confirmed', `Your order #${id} is confirmed and being prepared.`]
    };
    if (notifMap[status]) {
      const [type, title, message] = notifMap[status];
      createNotificationInternal(result.rows[0].user_id, type, title, message, parseInt(id), 'order')
        .catch(() => {});
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
      }
    }

    // Update payment status
    await client.query(
      'UPDATE payment SET status = $1 WHERE order_id = $2',
      ['refunded', id]
    );

    await client.query('COMMIT');

    // Fire notification (non-blocking)
    createNotificationInternal(
      order.user_id, 'order_cancelled', 'Order Cancelled',
      `Your order #${id} has been cancelled. Any payment will be refunded.`,
      parseInt(id), 'order'
    ).catch(() => {});

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
