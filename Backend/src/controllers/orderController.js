const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
];

// Forward-only transitions for non-cancel status changes.
// Cancellation is handled separately as allowed from any non-cancelled status.
const VALID_FORWARD_TRANSITIONS = {
  pending: ['confirmed'],
  confirmed: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

const buildOrderResponse = (row) => ({
  order_id: row.order_id,
  status: row.status,
  total_amount: row.total_amount == null ? null : String(row.total_amount),
  user_id: row.user_id,
  address_id: row.address_id,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const buildOrderItemResponse = (row) => ({
  order_item_id: row.order_item_id,
  quantity: row.quantity,
  unit_price: row.unit_price == null ? null : String(row.unit_price),
  product_id: row.product_id,
  variant_id: row.variant_id,
  product_name: row.product_name,
  sku: row.sku,
  size: row.size,
  primary_image: row.primary_image || null
});

const buildPaymentResponse = (row) => {
  if (!row) return null;

  return {
    payment_id: row.payment_id,
    amount: row.amount == null ? null : String(row.amount),
    status: row.status,
    created_at: row.created_at,
    payment_type: row.payment_type || null
  };
};

// String-based money helpers to avoid JS float math.
const moneyStringToCents = (value) => {
  const str = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error(`Invalid money value: ${str}`);
  }

  const [whole, fraction = ''] = str.split('.');
  const paddedFraction = (fraction + '00').slice(0, 2);
  return Number.parseInt(whole, 10) * 100 + Number.parseInt(paddedFraction, 10);
};

const centsToMoneyString = (cents) => {
  const safe = Number.isInteger(cents) ? cents : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
};

// Internal helper — fire order notification non-blocking
const fireOrderNotification = async (userId, type, title, message, orderId) => {
  try {
    await pool.query(
      `INSERT INTO notification (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, 'order')`,
      [userId, type, title, message, orderId]
    );
  } catch (err) {
    console.error('Order notification error (non-blocking):', err);
  }
};

// =====================================================================
// GET ORDERS
// =====================================================================

// GET /api/orders
// Admin: all orders paginated with optional status filter
// Customer: own orders only
const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { status } = req.query;

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const conditions = [];
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`o.user_id = $${idx}`);
      params.push(userId);
      idx++;
    }

    if (status) {
      conditions.push(`o.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders o ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT
         o.order_id, o.status, o.total_amount,
         o.user_id, o.address_id,
         o.created_at, o.updated_at,
         u.email,
         u.first_name, u.last_name,
         a.street, a.city, a.postal_code, a.country,
         COUNT(oi.order_item_id)::int AS item_count
       FROM orders o
       JOIN users u ON u.user_id = o.user_id
       LEFT JOIN address a ON a.address_id = o.address_id
       LEFT JOIN order_item oi ON oi.order_id = o.order_id
       ${whereClause}
       GROUP BY
         o.order_id,
         u.email, u.first_name, u.last_name,
         a.street, a.city, a.postal_code, a.country
       ORDER BY o.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      orders: result.rows.map((row) => ({
        ...buildOrderResponse(row),
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        address: {
          street: row.street,
          city: row.city,
          postal_code: row.postal_code,
          country: row.country
        },
        item_count: row.item_count
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// GET /api/orders/:id
// Admin can fetch any order. Customer can only fetch their own.
const getOrderById = async (req, res) => {
  try {
    const orderId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const orderResult = await pool.query(
      `SELECT
         o.order_id, o.status, o.total_amount,
         o.user_id, o.address_id,
         o.created_at, o.updated_at,
         u.email, u.first_name, u.last_name,
         a.street, a.city, a.postal_code, a.country
       FROM orders o
       JOIN users u ON u.user_id = o.user_id
       LEFT JOIN address a ON a.address_id = o.address_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (!isAdmin && order.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const itemsResult = await pool.query(
      `SELECT
         oi.order_item_id,
         oi.quantity,
         oi.unit_price,
         oi.product_id,
         oi.variant_id,
         p.name AS product_name,
         p.sku,
         pv.size,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image
       FROM order_item oi
       JOIN product p ON p.product_id = oi.product_id
       LEFT JOIN product_variant pv ON pv.variant_id = oi.variant_id
       WHERE oi.order_id = $1
       ORDER BY oi.order_item_id ASC`,
      [orderId]
    );

    const paymentResult = await pool.query(
      `SELECT
         pay.payment_id,
         pay.amount,
         pay.status,
         pay.created_at,
         pm.type AS payment_type
       FROM payment pay
       LEFT JOIN payment_method pm ON pm.payment_method_id = pay.payment_method_id
       WHERE pay.order_id = $1`,
      [orderId]
    );

    return res.status(200).json({
      order: {
        ...buildOrderResponse(order),
        email: order.email,
        first_name: order.first_name,
        last_name: order.last_name,
        address: {
          street: order.street,
          city: order.city,
          postal_code: order.postal_code,
          country: order.country
        },
        items: itemsResult.rows.map(buildOrderItemResponse),
        payment: buildPaymentResponse(paymentResult.rows[0] || null)
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// =====================================================================
// CREATE ORDER
// =====================================================================

// POST /api/orders
// Authenticated. Creates order from current cart.
// Entire operation is wrapped in a transaction.
const createOrder = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const address_id = parsePositiveInt(req.body?.address_id);
    const payment_method_id = parsePositiveInt(req.body?.payment_method_id) || null;

    if (!address_id) {
      return res.status(400).json({ error: 'address_id is required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const addressCheck = await client.query(
      `SELECT address_id
       FROM address
       WHERE address_id = $1
         AND user_id = $2
         AND is_deleted = false`,
      [address_id, userId]
    );

    if (addressCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid shipping address' });
    }

    if (payment_method_id) {
      const pmCheck = await client.query(
        `SELECT payment_method_id
         FROM payment_method
         WHERE payment_method_id = $1
           AND user_id = $2`,
        [payment_method_id, userId]
      );

      if (pmCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid payment method' });
      }
    }

    const cartResult = await client.query(
      `SELECT
         c.variant_id,
         c.quantity,
         pv.product_id,
         pv.size,
         pv.stock_quantity,
         p.name,
         p.price
       FROM cart c
       JOIN product_variant pv ON pv.variant_id = c.variant_id
       JOIN product p ON p.product_id = pv.product_id
       WHERE c.user_id = $1
         AND p.is_active = true`,
      [userId]
    );

    // Count total cart rows regardless of product active status
    const totalCartCount = await client.query(
      'SELECT COUNT(*)::int AS count FROM cart WHERE user_id = $1',
      [userId]
    );

    if (totalCartCount.rows[0].count === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'All items in your cart are currently unavailable. Please review your cart before checking out.'
      });
    }

    // Block if any cart items were skipped due to inactive products
    if (cartResult.rows.length < totalCartCount.rows[0].count) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Some items in your cart are no longer available. Please review your cart and remove unavailable items before checking out.'
      });
    }

    // Guard against schema conflict:
    // order_item has UNIQUE (order_id, product_id), so the cart cannot contain
    // two different variants of the same product for one checkout.
    const seenProducts = new Set();
    for (const item of cartResult.rows) {
      if (seenProducts.has(item.product_id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Your cart contains multiple variants of the same product. Please keep only one size per product before checkout.'
        });
      }
      seenProducts.add(item.product_id);
    }

    const variantIds = cartResult.rows.map((r) => r.variant_id);

    const lockedVariants = await client.query(
      `SELECT variant_id, stock_quantity
       FROM product_variant
       WHERE variant_id = ANY($1)
       FOR UPDATE`,
      [variantIds]
    );

    const stockMap = {};
    lockedVariants.rows.forEach((v) => {
      stockMap[v.variant_id] = v.stock_quantity;
    });

    for (const item of cartResult.rows) {
      const available = stockMap[item.variant_id] ?? 0;
      if (available < item.quantity) {
        await client.query('ROLLBACK');
        const sizeLabel = item.size ? ` (Size: ${item.size})` : '';
        return res.status(400).json({
          error: `Insufficient stock for ${item.name}${sizeLabel}. Available: ${available}, requested: ${item.quantity}.`
        });
      }
    }

    // String/integer-cents based total calculation.
    const totalCents = cartResult.rows.reduce((sum, item) => {
      return sum + (moneyStringToCents(item.price) * Number(item.quantity));
    }, 0);
    const total_amount = centsToMoneyString(totalCents);

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, status, total_amount)
       VALUES ($1, $2, 'pending', $3)
       RETURNING order_id, status, total_amount, user_id, address_id, created_at, updated_at`,
      [userId, address_id, total_amount]
    );

    const order = orderResult.rows[0];

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_item (order_id, product_id, variant_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.order_id,
          item.product_id,
          item.variant_id,
          item.quantity,
          String(item.price)
        ]
      );

      await client.query(
        `UPDATE product_variant
         SET stock_quantity = stock_quantity - $1
         WHERE variant_id = $2`,
        [item.quantity, item.variant_id]
      );
    }

    await client.query(
      `INSERT INTO payment (order_id, payment_method_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [order.order_id, payment_method_id, total_amount]
    );

    await client.query(
      `DELETE FROM cart
       WHERE user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    fireOrderNotification(
      userId,
      'order_placed',
      'Order placed',
      `Your order #${order.order_id} has been placed successfully. Total: ৳${total_amount}.`,
      order.order_id
    );

    return res.status(201).json({
      message: 'Order placed successfully',
      order: buildOrderResponse(order)
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Create order error:', error);
    return res.status(500).json({ error: 'Failed to place order' });
  } finally {
    if (client) client.release();
  }
};

// =====================================================================
// UPDATE ORDER STATUS (Admin)
// =====================================================================

// PATCH /api/orders/:id/status
// Admin only.
// Forward flow: pending -> confirmed -> processing -> shipped -> delivered
// Cancellation: any non-cancelled status -> cancelled
const updateOrderStatus = async (req, res) => {
  let client;

  try {
    const orderId = parsePositiveInt(req.params.id);
    const newStatus = req.body?.status;

    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    if (!newStatus || !ORDER_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT order_id, status, user_id
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const currentStatus = order.status;

    if (currentStatus === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cancelled orders cannot be updated further.' });
    }

    const isCancellation = newStatus === 'cancelled';
    const isForwardAllowed =
      VALID_FORWARD_TRANSITIONS[currentStatus]?.includes(newStatus) || false;

    if (!isCancellation && !isForwardAllowed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot transition order from '${currentStatus}' to '${newStatus}'.`
      });
    }

    if (isCancellation) {
      const items = await client.query(
        `SELECT variant_id, quantity
         FROM order_item
         WHERE order_id = $1`,
        [orderId]
      );

      for (const item of items.rows) {
        if (item.variant_id) {
          await client.query(
            `UPDATE product_variant
             SET stock_quantity = stock_quantity + $1
             WHERE variant_id = $2`,
            [item.quantity, item.variant_id]
          );
        }
      }

      await client.query(
        `UPDATE payment
         SET status = 'refunded',
             updated_at = NOW()
         WHERE order_id = $1
           AND status != 'refunded'`,
        [orderId]
      );
    }

    if (newStatus === 'delivered') {
      await client.query(
        `UPDATE payment
         SET status = 'completed',
             updated_at = NOW()
         WHERE order_id = $1
           AND status = 'pending'`,
        [orderId]
      );
    }

    const result = await client.query(
      `UPDATE orders
       SET status = $1,
           updated_at = NOW()
       WHERE order_id = $2
       RETURNING order_id, status, total_amount, user_id, address_id, created_at, updated_at`,
      [newStatus, orderId]
    );

    await client.query('COMMIT');

    const NOTIFICATION_MAP = {
      confirmed: ['order_confirmed', 'Order confirmed', `Your order #${orderId} has been confirmed and is being prepared.`],
      processing: ['order_confirmed', 'Order processing', `Your order #${orderId} is being processed.`],
      shipped: ['order_shipped', 'Order shipped', `Your order #${orderId} is on its way.`],
      delivered: ['order_delivered', 'Order delivered', `Your order #${orderId} has been delivered. Enjoy your purchase!`],
      cancelled: ['order_cancelled', 'Order cancelled', `Your order #${orderId} has been cancelled.`]
    };

    if (NOTIFICATION_MAP[newStatus]) {
      const [type, title, message] = NOTIFICATION_MAP[newStatus];
      fireOrderNotification(order.user_id, type, title, message, orderId);
    }

    return res.status(200).json({
      message: `Order status updated to '${newStatus}'`,
      order: buildOrderResponse(result.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Update order status error:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    if (client) client.release();
  }
};

// =====================================================================
// CANCEL ORDER (Customer)
// =====================================================================

// POST /api/orders/:id/cancel
// Customer can cancel their own pending orders only.
const cancelOrder = async (req, res) => {
  let client;

  try {
    const orderId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT order_id, status, user_id
       FROM orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Only pending orders can be cancelled. This order is '${order.status}'.`
      });
    }

    const items = await client.query(
      `SELECT variant_id, quantity
       FROM order_item
       WHERE order_id = $1`,
      [orderId]
    );

    for (const item of items.rows) {
      if (item.variant_id) {
        await client.query(
          `UPDATE product_variant
           SET stock_quantity = stock_quantity + $1
           WHERE variant_id = $2`,
          [item.quantity, item.variant_id]
        );
      }
    }

    await client.query(
      `UPDATE payment
       SET status = 'refunded',
           updated_at = NOW()
       WHERE order_id = $1
         AND status != 'refunded'`,
      [orderId]
    );

    const result = await client.query(
      `UPDATE orders
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE order_id = $1
       RETURNING order_id, status, total_amount, user_id, address_id, created_at, updated_at`,
      [orderId]
    );

    await client.query('COMMIT');

    fireOrderNotification(
      userId,
      'order_cancelled',
      'Order cancelled',
      `Your order #${orderId} has been cancelled.`,
      orderId
    );

    return res.status(200).json({
      message: 'Order cancelled successfully',
      order: buildOrderResponse(result.rows[0])
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Cancel order error:', error);
    return res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder
};